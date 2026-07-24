import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.din_pill import DinPill
from app.services import prescription_matching
from app.services.din_reference_seed import seed_din_reference_if_empty


@pytest.mark.asyncio
async def test_resolve_din_exact_single_match_is_confirm(db_session: AsyncSession):
    db_session.add(DinPill(
        din="00004596", product="IMURAN", active_ingredient="AZATHIOPRINE",
        strength="50 MG", colour="yellow", shape="other",
    ))
    await db_session.flush()

    result = await prescription_matching.resolve_din(db_session, "Imuran", "50mg")

    assert result.status == "confirm"
    assert result.total_candidate_count == 1
    assert result.candidates[0].din == "00004596"


@pytest.mark.asyncio
async def test_resolve_din_a_few_candidates_is_pick_list(db_session: AsyncSession):
    for i in range(3):
        db_session.add(DinPill(
            din=f"0000000{i}", product=f"BRAND{i} LORATADINE", active_ingredient="LORATADINE",
            strength="10 MG", colour="white", shape="round",
        ))
    await db_session.flush()

    result = await prescription_matching.resolve_din(db_session, "Loratadine", None)

    assert result.status == "pick_list"
    assert result.total_candidate_count == 3


@pytest.mark.asyncio
async def test_resolve_din_strength_narrowing_reduces_candidates(db_session: AsyncSession):
    db_session.add(DinPill(
        din="00000001", product="APO-IBUPROFEN 200", active_ingredient="IBUPROFEN",
        strength="200 MG",
    ))
    db_session.add(DinPill(
        din="00000002", product="APO-IBUPROFEN 400", active_ingredient="IBUPROFEN",
        strength="400 MG",
    ))
    await db_session.flush()

    # Without dosage, both 200mg and 400mg products match "Ibuprofen".
    unnarrowed = await prescription_matching.resolve_din(db_session, "Ibuprofen", None)
    assert unnarrowed.total_candidate_count == 2

    # With dosage, strength narrowing should leave exactly the 200mg product.
    narrowed = await prescription_matching.resolve_din(db_session, "Ibuprofen", "200mg")
    assert narrowed.status == "confirm"
    assert narrowed.total_candidate_count == 1
    assert narrowed.candidates[0].din == "00000001"


@pytest.mark.asyncio
async def test_resolve_din_caps_large_candidate_lists(db_session: AsyncSession):
    for i in range(12):
        db_session.add(DinPill(
            din=f"000000{i:02d}", product=f"GENERIC ACETAMINOPHEN {i}",
            active_ingredient="ACETAMINOPHEN", strength="500 MG",
        ))
    await db_session.flush()

    result = await prescription_matching.resolve_din(db_session, "Acetaminophen", "500mg")

    assert result.status == "too_many_candidates"
    assert result.total_candidate_count == 12
    assert len(result.candidates) == prescription_matching.CANDIDATE_CAP


@pytest.mark.asyncio
async def test_resolve_din_no_match_is_not_found(db_session: AsyncSession):
    db_session.add(DinPill(
        din="00000001", product="IMURAN", active_ingredient="AZATHIOPRINE", strength="50 MG",
    ))
    await db_session.flush()

    result = await prescription_matching.resolve_din(db_session, "Zzyzxqvlmnop", None)

    assert result.status == "not_found"
    assert result.total_candidate_count == 0


@pytest.mark.asyncio
async def test_resolve_din_hcl_substring_does_not_outrank_correct_drug(db_session: AsyncSession):
    """Regression guard for a real danger case found during planning: fuzzy
    scoring 'Metformin HCl' against an unrelated '*HCl' drug name must not
    let the wrong drug outscore (or come withing a competitive margin of) the
    correct one, purely from the shared 'HCl' substring."""
    db_session.add(DinPill(
        din="00000001", product="METFORMIN", active_ingredient="METFORMIN HYDROCHLORIDE",
        strength="500 MG",
    ))
    db_session.add(DinPill(
        din="00000002", product="PMS TRAZODONE HCL TAB 50MG",
        active_ingredient="TRAZODONE HYDROCHLORIDE", strength="50 MG",
    ))
    await db_session.flush()

    result = await prescription_matching.resolve_din(db_session, "Metformin HCl", "500mg")

    # Strength narrowing (500mg) alone should already exclude the 50mg trazodone row.
    assert result.status == "confirm"
    assert result.candidates[0].din == "00000001"
    assert all(c.active_ingredient != "TRAZODONE HYDROCHLORIDE" for c in result.candidates)


@pytest.mark.asyncio
async def test_resolve_din_real_reference_data_acetaminophen_matches_pre_registered_count(
    db_session: AsyncSession,
):
    """Pre-registered acceptance number from the DIN-linking plan's validation
    run against the real reference data: Acetaminophen/500mg produced 54
    candidates after strength narrowing -> too_many_candidates. A different
    number here means the algorithm or reference data drifted — investigate,
    don't just update this assertion."""
    await seed_din_reference_if_empty(db_session)

    result = await prescription_matching.resolve_din(db_session, "Acetaminophen", "500mg")

    assert result.status == "too_many_candidates"
    assert result.total_candidate_count == 54
