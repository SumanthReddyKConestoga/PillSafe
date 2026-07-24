"""Safety Records — read-only view over past scans (Priority 3 /dashboard/safety).

Derives data from the existing `analyses` table (written by /analyze) joined
live against the patient's active prescriptions for a match status. No new
write path — this endpoint only reads.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_patient
from app.core.database import get_db
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.scan import ScanRecord
from app.services import prescription_service
from app.services.patient_service import get_patient_by_user_id

router = APIRouter(prefix="/scans", tags=["scans"])


@router.get("/me", response_model=list[ScanRecord])
async def list_my_scans(
    current_user: Annotated[User, Depends(get_current_patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> list[ScanRecord]:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
    )
    analyses = list(result.scalars().all())

    active_drug_names: set[str] = set()
    patient = await get_patient_by_user_id(db, current_user.id)
    if patient:
        prescriptions = await prescription_service.list_active_for_patient(db, patient.id)
        active_drug_names = {p.drug_name.strip().casefold() for p in prescriptions}

    records: list[ScanRecord] = []
    for row in analyses:
        drug_name = (row.label_info or {}).get("drug_name")
        if row.safety_alerts:
            match_status = "warning"
        elif drug_name and drug_name.strip().casefold() in active_drug_names:
            match_status = "matched"
        else:
            match_status = "unmatched"

        records.append(
            ScanRecord(
                id=row.id,
                created_at=row.created_at,
                drug_name=drug_name,
                match_status=match_status,
                action_taken="Guidance shown" if row.guidance else "Logged",
                image_filename=row.image_filename,
            )
        )
    return records
