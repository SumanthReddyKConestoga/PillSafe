import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)
    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    pills_detected: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    label_info: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    guidance: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_alerts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    ml_pipeline_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="analyses")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} user_id={self.user_id}>"
