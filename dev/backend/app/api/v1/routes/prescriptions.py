"""Prescription OCR capture + My Medications CRUD (Priority 1)."""
import logging
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_patient
from app.core.config import settings
from app.core.database import get_db
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.din_resolution import DinResolutionResult
from app.schemas.prescription import PrescriptionOut, PrescriptionUpdate, PrescriptionUploadResponse
from app.services import ocr_service, prescription_matching, prescription_parser, prescription_service
from app.services.patient_service import get_patient_by_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

_404 = {"error": {"code": "NOT_FOUND", "message": "Prescription not found."}}
_NO_PROFILE = {"error": {"code": "NOT_FOUND", "message": "Patient profile not found."}}


async def _get_patient_or_404(db: AsyncSession, user: User):
    patient = await get_patient_by_user_id(db, user.id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_PROFILE)
    return patient


# Placeholder text used ONLY when OCR_PIPELINE_ENABLED=false — an explicit,
# operator-controlled demo mode, never a substitute for a failed real read.
# Any response built from this text must carry status="synthetic_demo" so no
# downstream consumer can mistake it for an actual OCR result.
_SYNTHETIC_DEMO_RAW_TEXT = "Metformin HCl 500mg — twice daily with meals. Dr. A. Chen. Refills: 2."

_OCR_FAILED_MESSAGE = (
    "We could not reliably read this prescription. Please retake the photo "
    "in good lighting, or enter the medication details manually."
)
_SYNTHETIC_DEMO_MESSAGE = (
    "OCR is disabled on this server — these are placeholder demo values, "
    "not a real reading of your photo."
)


def _ocr_failed(response: Response) -> PrescriptionUploadResponse:
    response.status_code = status.HTTP_200_OK
    return PrescriptionUploadResponse(
        status="ocr_failed", message=_OCR_FAILED_MESSAGE, raw_text=None, parsed=None
    )


@router.post("", response_model=PrescriptionUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_prescription(
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
    response: Response,
    image: UploadFile = File(...),
) -> PrescriptionUploadResponse:
    patient = await _get_patient_or_404(db, current_user)

    image_bytes = await image.read()
    upload_subdir = os.path.join(settings.UPLOAD_DIR, "prescriptions", patient.id)
    os.makedirs(upload_subdir, exist_ok=True)
    ext = os.path.splitext(image.filename or "")[1] or ".jpg"
    saved_name = f"{uuid.uuid4()}{ext}"
    saved_path = os.path.join(upload_subdir, saved_name)
    with open(saved_path, "wb") as fh:
        fh.write(image_bytes)

    synthetic = False
    if settings.OCR_PIPELINE_ENABLED:
        try:
            # PaddleOCR inference is a slow, synchronous, CPU-bound call — run it
            # off the event loop so it doesn't freeze every other request (other
            # users' logins, page loads, etc.) for the duration of this scan.
            raw_text = await run_in_threadpool(ocr_service.extract_text, image_bytes)
        except ocr_service.OcrUnavailableError as exc:
            logger.warning("OCR pipeline unavailable: %s", exc)
            return _ocr_failed(response)
        except Exception as exc:
            # A bad/corrupt/non-image upload must surface as a handled failure,
            # never silently substitute a plausible-looking prescription.
            logger.warning("OCR extraction failed: %s", exc)
            return _ocr_failed(response)

        if not raw_text.strip():
            logger.warning("OCR returned empty text for patient %s", patient.id)
            return _ocr_failed(response)
    else:
        raw_text = _SYNTHETIC_DEMO_RAW_TEXT
        synthetic = True

    medications = prescription_parser.parse_medications(raw_text)
    records = [
        Prescription(
            patient_id=patient.id,
            drug_name=med.drug_name,
            dosage=med.dosage,
            frequency_text=med.frequency_text,
            frequency_type=med.frequency_type,
            time_slots=med.time_slots,
            specific_times=med.specific_times,
            with_food=med.with_food,
            purpose=med.purpose,
            max_daily_dose=med.max_daily_dose,
            image_path=saved_path,
        )
        for med in medications
    ]
    db.add_all(records)
    await db.flush()

    return PrescriptionUploadResponse(
        status="synthetic_demo" if synthetic else "ok",
        message=_SYNTHETIC_DEMO_MESSAGE if synthetic else None,
        raw_text=None,
        parsed=records,
    )


@router.get("/me", response_model=list[PrescriptionOut])
async def list_my_prescriptions(
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Prescription]:
    patient = await _get_patient_or_404(db, current_user)
    return await prescription_service.list_active_for_patient(db, patient.id)


@router.get("/{prescription_id}/image")
async def get_prescription_image(
    prescription_id: str,
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    patient = await _get_patient_or_404(db, current_user)
    prescription = await prescription_service.get_owned(db, prescription_id, patient.id)
    if not prescription or not prescription.image_path or not os.path.exists(prescription.image_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_404)
    return FileResponse(prescription.image_path)


@router.patch("/{prescription_id}", response_model=PrescriptionOut)
async def update_prescription(
    prescription_id: str,
    payload: PrescriptionUpdate,
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Prescription:
    patient = await _get_patient_or_404(db, current_user)
    prescription = await prescription_service.get_owned(db, prescription_id, patient.id)
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_404)
    return await prescription_service.update_prescription(db, prescription, payload)


@router.post("/{prescription_id}/resolve-din", response_model=DinResolutionResult)
async def resolve_prescription_din(
    prescription_id: str,
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DinResolutionResult:
    patient = await _get_patient_or_404(db, current_user)
    prescription = await prescription_service.get_owned(db, prescription_id, patient.id)
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_404)
    return await prescription_matching.resolve_din(
        db, prescription.drug_name, prescription.dosage
    )


@router.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prescription(
    prescription_id: str,
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    patient = await _get_patient_or_404(db, current_user)
    prescription = await prescription_service.get_owned(db, prescription_id, patient.id)
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_404)
    await prescription_service.soft_delete(db, prescription)
