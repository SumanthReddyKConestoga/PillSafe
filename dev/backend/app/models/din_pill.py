import uuid
from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class DinPill(Base):
    """Health Canada DIN physical-characteristics lookup table (Priority 6).

    Seeded empty — populate from the real Health Canada Drug Product
    Database (DPD) extract before relying on candidate matches.
    """

    __tablename__ = "din_pills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    din: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(255), nullable=False)
    active_ingredient: Mapped[str | None] = mapped_column(String(255), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(100), nullable=True)

    colour: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    shape: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    scoring: Mapped[str | None] = mapped_column(String(50), nullable=True)
    coating: Mapped[str | None] = mapped_column(String(50), nullable=True)
    imprint: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    def __repr__(self) -> str:
        return f"<DinPill din={self.din} product={self.product}>"
