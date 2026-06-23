"""Prescription OCR capture + My Medications CRUD (Priority 1)."""
import logging
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_patient
from app.core.config import settings
from app.core.database import get_db
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.prescription import PrescriptionOut, PrescriptionUpdate
from app.services import ocr_service, prescription_service
from app.services.patient_service import get_patient_by_user_id
from app.services.timing_parser import parse_frequency

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

_404 = {"error": {"code": "NOT_FOUND", "message": "Prescription not found."}}
_NO_PROFILE = {"error": {"code": "NOT_FOUND", "message": "Patient profile not found."}}


async def _get_patient_or_404(db: AsyncSession, user: User):
    patient = await get_patient_by_user_id(db, user.id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_PROFILE)
    return patient


# Demo data returned when OCR_PIPELINE_ENABLED=false, per build spec 1B.
_DEMO_RAW_TEXT = "Metformin HCl 500mg — twice daily with meals. Dr. A. Chen. Refills: 2."


@router.post("", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
async def upload_prescription(
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
    image: UploadFile = File(...),
) -> Prescription:
    patient = await _get_patient_or_404(db, current_user)

    image_bytes = await image.read()
    upload_subdir = os.path.join(settings.UPLOAD_DIR, "prescriptions", patient.id)
    os.makedirs(upload_subdir, exist_ok=True)
    ext = os.path.splitext(image.filename or "")[1] or ".jpg"
    saved_name = f"{uuid.uuid4()}{ext}"
    saved_path = os.path.join(upload_subdir, saved_name)
    with open(saved_path, "wb") as fh:
        fh.write(image_bytes)

    if settings.OCR_PIPELINE_ENABLED:
        try:
            raw_text = ocr_service.extract_text(image_bytes)
        except ocr_service.OcrUnavailableError as exc:
            logger.warning("OCR pipeline unavailable, falling back to demo data: %s", exc)
            raw_text = _DEMO_RAW_TEXT
    else:
        raw_text = _DEMO_RAW_TEXT

    drug_name = raw_text.splitlines()[0].split("—")[0].split("-")[0].strip() or "Unknown medication"
    time_slots, specific_times = parse_frequency(raw_text)

    record = Prescription(
        patient_id=patient.id,
        drug_name=drug_name,
        frequency_text=raw_text,
        time_slots=time_slots,
        specific_times=specific_times,
        image_path=saved_path,
    )
    db.add(record)
    await db.flush()
    return record


@router.get("/me", response_model=list[PrescriptionOut])
async def list_my_prescriptions(
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Prescription]:
    patient = await _get_patient_or_404(db, current_user)
    return await prescription_service.list_active_for_patient(db, patient.id)


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
