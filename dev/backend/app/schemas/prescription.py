from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    drug_name: str
    dosage: str | None
    frequency_text: str | None
    frequency_type: str | None
    time_slots: list[str]
    specific_times: list[str]
    with_food: bool
    purpose: str | None
    max_daily_dose: int | None
    prescribing_doctor: str | None
    refills_remaining: int | None
    expiry_date: date | None
    is_active: bool
    image_path: str | None
    din: str | None
    created_at: datetime
    updated_at: datetime


class PrescriptionUploadResponse(BaseModel):
    """Envelope for POST /prescriptions.

    `status="ocr_failed"` means no rows were created — `parsed` is null.
    `status="synthetic_demo"` means rows *were* created but from placeholder
    text (OCR_PIPELINE_ENABLED=false), never from a real photo read — the
    caller must not present `parsed` as a genuine OCR result in that case.
    """

    status: Literal["ok", "synthetic_demo", "ocr_failed"]
    message: str | None = None
    raw_text: str | None = None
    parsed: list[PrescriptionOut] | None = None


class PrescriptionUpdate(BaseModel):
    drug_name: str | None = None
    dosage: str | None = None
    frequency_text: str | None = None
    frequency_type: str | None = None
    time_slots: list[str] | None = None
    specific_times: list[str] | None = None
    with_food: bool | None = None
    purpose: str | None = None
    max_daily_dose: int | None = None
    prescribing_doctor: str | None = None
    refills_remaining: int | None = None
    expiry_date: date | None = None
    is_active: bool | None = None
    din: str | None = None
