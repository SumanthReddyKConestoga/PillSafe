import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.patient import Patient
from app.schemas.patient import PatientUpdate

logger = logging.getLogger(__name__)


class PatientNotFound(Exception):
    pass


async def get_patient_by_user_id(db: AsyncSession, user_id: uuid.UUID) -> Patient:
    result = await db.execute(
        select(Patient).where(Patient.user_id == user_id, Patient.is_active == True)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise PatientNotFound(f"Patient profile not found for user {user_id}")
    return patient


async def update_patient(db: AsyncSession, user_id: uuid.UUID, payload: PatientUpdate) -> Patient:
    patient = await get_patient_by_user_id(db, user_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    await db.flush()
    logger.info("Patient profile updated", extra={"user_id": str(user_id)})
    return patient
