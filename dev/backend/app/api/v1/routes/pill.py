"""Pill identification via OpenCV colour/shape + PaddleOCR imprint + DIN lookup (Priority 6)."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_patient
from app.core.database import get_db
from app.models.user import User
from app.services import claude_service, ocr_service, pill_detection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


class DinCandidate(BaseModel):
    din: str
    product: str
    active_ingredient: str | None
    strength: str | None
    colour: str | None
    shape: str | None
    imprint: str | None
    confidence: float


class PillAnalysisResponse(BaseModel):
    detected_color: str
    detected_shape: str
    detected_imprint: str | None
    candidates: list[DinCandidate]
    claude_description: str | None


@router.post("/pill", response_model=PillAnalysisResponse)
async def analyze_pill(
    _: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
    image: UploadFile = File(...),
) -> PillAnalysisResponse:
    image_bytes = await image.read()

    try:
        # OpenCV colour/shape math is synchronous and CPU-bound — keep it off
        # the event loop so it doesn't freeze every other request meanwhile.
        color, shape = await run_in_threadpool(pill_detection.detect_color_and_shape, image_bytes)
    except pill_detection.CvUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={"error": {"code": "CV_UNAVAILABLE", "message": str(exc)}},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "NO_PILL_DETECTED", "message": str(exc)}},
        ) from exc

    imprint: str | None = None
    try:
        text = (await run_in_threadpool(ocr_service.extract_text, image_bytes)).strip()
        imprint = text or None
    except ocr_service.OcrUnavailableError:
        imprint = None
    except Exception as exc:
        # Imprint OCR is best-effort on top of colour/shape detection — never let
        # a bad/undecodable image abort the whole pill analysis.
        logger.warning("Imprint OCR failed, continuing without imprint: %s", exc)
        imprint = None

    din_rows = await pill_detection.lookup_din_candidates(db, color, shape, imprint)
    candidates = [
        DinCandidate(
            din=row.din,
            product=row.product,
            active_ingredient=row.active_ingredient,
            strength=row.strength,
            colour=row.colour,
            shape=row.shape,
            imprint=row.imprint,
            confidence=row.confidence,
        )
        for row in din_rows
    ]

    claude_description = None
    if not candidates or not imprint:
        claude_description = await claude_service.generate_pill_guidance(
            color, shape, imprint, [c.model_dump() for c in candidates]
        )

    return PillAnalysisResponse(
        detected_color=color,
        detected_shape=shape,
        detected_imprint=imprint,
        candidates=candidates,
        claude_description=claude_description,
    )
