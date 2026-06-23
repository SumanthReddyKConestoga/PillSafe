from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    drug_name: str
    dosage: str | None
    frequency_text: str | None
    time_slots: list[str]
    specific_times: list[str]
    prescribing_doctor: str | None
    refills_remaining: int | None
    expiry_date: date | None
    is_active: bool
    image_path: str | None
    created_at: datetime
    updated_at: datetime


class PrescriptionUpdate(BaseModel):
    drug_name: str | None = None
    dosage: str | None = None
    frequency_text: str | None = None
    time_slots: list[str] | None = None
    specific_times: list[str] | None = None
    prescribing_doctor: str | None = None
    refills_remaining: int | None = None
    expiry_date: date | None = None
    is_active: bool | None = None
