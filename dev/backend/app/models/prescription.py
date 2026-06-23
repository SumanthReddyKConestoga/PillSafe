import uuid
from datetime import date, datetime
from sqlalchemy import String, Boolean, Date, DateTime, Integer, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )

    drug_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    time_slots: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    specific_times: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    prescribing_doctor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    refills_remaining: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="prescriptions")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Prescription id={self.id} drug={self.drug_name}>"
