from datetime import datetime
from pydantic import BaseModel


class ScanRecord(BaseModel):
    id: str
    created_at: datetime
    drug_name: str | None
    match_status: str  # matched | unmatched | warning
    action_taken: str
    image_filename: str | None
