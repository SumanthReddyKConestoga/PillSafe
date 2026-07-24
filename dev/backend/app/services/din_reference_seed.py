"""Seeds `din_pills` from the committed reference CSV (app/data/din_reference_seed.csv),
exported once from the real Health Canada DIN appearance dataset — see
scripts/export_din_reference_seed.py. Runs unconditionally at startup (every
environment needs this reference data, not just development); idempotent — a
populated table is left untouched.
"""
import csv
import logging
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.din_pill import DinPill

logger = logging.getLogger(__name__)

_CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "din_reference_seed.csv"


async def seed_din_reference_if_empty(db: AsyncSession) -> None:
    """Flushes seed rows onto `db` but does NOT commit — callers own the
    transaction boundary. (Tests share a rollback-isolated session across the
    suite; committing here would leak 7,055 real rows past that isolation.
    The real startup caller in main.py's lifespan commits explicitly.)
    """
    count = (await db.execute(select(func.count()).select_from(DinPill))).scalar_one()
    if count > 0:
        return

    if not _CSV_PATH.exists():
        logger.warning("DIN reference seed CSV not found at %s — skipping seed", _CSV_PATH)
        return

    with open(_CSV_PATH, newline="", encoding="utf-8") as fh:
        rows = [
            DinPill(
                din=row["din"],
                product=row["product"],
                active_ingredient=row["active_ingredient"] or None,
                strength=row["strength"] or None,
                colour=row["colour"] or None,
                shape=row["shape"] or None,
                imprint=row["imprint"] or None,
            )
            for row in csv.DictReader(fh)
        ]

    db.add_all(rows)
    await db.flush()
    logger.info("Seeded %d DIN reference rows into din_pills", len(rows))
