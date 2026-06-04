"""
Analyze endpoint — stub for the ML pipeline (Sprint 4).

Real implementation replaces the stub response with:
  1. YOLOv8 segmentation of pill regions from the uploaded image
  2. CNN + FAISS nearest-neighbour pill identification
  3. NER label parsing (drug name, dosage, frequency, expiry)
  4. Generative AI (LLM) guidance synthesis
"""
from typing import Annotated, Any
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/analyze", tags=["analyze"])


class PillInfo(BaseModel):
    pill_id: str
    name: str
    confidence: float
    color: str
    shape: str
    imprint: str | None


class LabelInfo(BaseModel):
    drug_name: str | None
    dosage: str | None
    frequency: str | None
    refills_remaining: int | None
    expiry_date: str | None


class AnalyzeResponse(BaseModel):
    request_id: str
    status: str
    pills_detected: list[PillInfo]
    label: LabelInfo
    guidance: str
    safety_alerts: list[str]
    ml_pipeline_enabled: bool


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def analyze_medication(
    current_user: Annotated[User, Depends(get_current_user)],
    image: UploadFile = File(...),
):
    if not settings.ML_PIPELINE_ENABLED:
        # Stub response — remove this block and plug in the real pipeline in Sprint 4
        import uuid
        return AnalyzeResponse(
            request_id=str(uuid.uuid4()),
            status="stub",
            pills_detected=[
                PillInfo(
                    pill_id="STUB-001",
                    name="Metformin 500mg (demo)",
                    confidence=0.97,
                    color="white",
                    shape="oval",
                    imprint="M500",
                )
            ],
            label=LabelInfo(
                drug_name="Metformin HCl",
                dosage="500 mg",
                frequency="twice daily with meals",
                refills_remaining=2,
                expiry_date="2026-12",
            ),
            guidance=(
                "This is a demo response. Metformin is commonly prescribed for type 2 diabetes. "
                "Take with food to reduce stomach upset. This tool provides decision support only — "
                "always confirm with your pharmacist or physician."
            ),
            safety_alerts=[],
            ml_pipeline_enabled=False,
        )

    # Real ML pipeline entry point (Sprint 4)
    # from app.ml.pipeline import run_pipeline
    # return await run_pipeline(image, current_user)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"error": {"code": "NOT_IMPLEMENTED", "message": "ML pipeline not yet configured.", "details": {}}},
    )
