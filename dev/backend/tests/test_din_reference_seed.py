import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.din_pill import DinPill
from app.services.din_reference_seed import seed_din_reference_if_empty


async def _count(db_session: AsyncSession) -> int:
    result = await db_session.execute(select(func.count()).select_from(DinPill))
    return result.scalar_one()


@pytest.mark.asyncio
async def test_seed_din_reference_populates_din_pills(db_session: AsyncSession):
    assert await _count(db_session) == 0
    await seed_din_reference_if_empty(db_session)
    assert await _count(db_session) == 7055


@pytest.mark.asyncio
async def test_seed_din_reference_is_idempotent(db_session: AsyncSession):
    await seed_din_reference_if_empty(db_session)
    first_count = await _count(db_session)

    await seed_din_reference_if_empty(db_session)
    second_count = await _count(db_session)

    assert first_count == second_count == 7055
