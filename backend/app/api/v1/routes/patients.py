from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.patient import PatientRead, PatientUpdate
from app.services.patient_service import PatientNotFound, get_patient_by_user_id, update_patient

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/me", response_model=PatientRead)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        return await get_patient_by_user_id(db, current_user.id)
    except PatientNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient profile not found.", "details": {}}},
        )


@router.patch("/me", response_model=PatientRead)
async def update_my_profile(
    payload: PatientUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        return await update_patient(db, current_user.id, payload)
    except PatientNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "PATIENT_NOT_FOUND", "message": "Patient profile not found.", "details": {}}},
        )
