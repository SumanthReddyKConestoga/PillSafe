from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional
import uuid


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    preferred_language: str = "en"
    phone_number: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    preferred_language: Optional[str] = None
    phone_number: Optional[str] = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date
    preferred_language: str
    phone_number: Optional[str]
    medications_analyzed: int
    last_scan_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
