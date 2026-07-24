"""Resolves an OCR'd prescription's drug_name (+ dosage) to candidate DINs.

Reuses BB3's calibrated scorer (fuzz.WRatio + rapidfuzz.utils.default_process,
threshold 80 — see Pillsafe_Muthu/Deliverables/BB3/bb3/resolver.py) but NOT its
family-root collapsing: BB3 collapses matches to count *distinct drugs mentioned*
(safe when the output is a DIN-set union for retrieval scoping). This module needs
*distinct dispensable products*, since the output is a single DIN a patient confirms
and later verifies a photographed pill against — collapsing would silently discard
the very distinctions that matter here (see the DIN-linking plan's validation
notes: real generic ingredients span 50+ same-strength DINs from different
manufacturers, most with no appearance data, so they cannot be safely merged).

Deliberately does not cache reference rows across calls — this queries the DB
(not a static file), and a process-global cache would serve stale/cross-session
data across the per-test AsyncSession fixtures this app's test suite uses.

Never auto-accepts: the caller always requires an explicit patient confirmation
before persisting a `din`, regardless of how confident a single top match looks.
"""
import re

from rapidfuzz import fuzz, utils
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.din_pill import DinPill
from app.schemas.din_resolution import DinResolutionResult, DinTextMatchCandidate

FUZZY_THRESHOLD = 80
CANDIDATE_CAP = 8

_WHITESPACE_RE = re.compile(r"\s+")


def _normalize_strength(value: str | None) -> str | None:
    if not value:
        return None
    return _WHITESPACE_RE.sub("", value).strip().lower()


async def resolve_din(
    db: AsyncSession, drug_name: str, dosage: str | None
) -> DinResolutionResult:
    rows = (await db.execute(select(DinPill))).scalars().all()

    scored: list[tuple[float, DinPill]] = []
    for row in rows:
        score_product = fuzz.WRatio(drug_name, row.product, processor=utils.default_process)
        score_ai = fuzz.WRatio(
            drug_name, row.active_ingredient or "", processor=utils.default_process
        )
        score = max(score_product, score_ai)
        if score >= FUZZY_THRESHOLD:
            scored.append((score, row))

    if not scored:
        return DinResolutionResult(status="not_found", candidates=[], total_candidate_count=0)

    dosage_norm = _normalize_strength(dosage)
    if dosage_norm:
        narrowed = [
            (score, row) for score, row in scored
            if _normalize_strength(row.strength) == dosage_norm
        ]
        if narrowed:
            scored = narrowed

    scored.sort(key=lambda pair: -pair[0])
    total = len(scored)

    if total == 1:
        status = "confirm"
    elif total <= CANDIDATE_CAP:
        status = "pick_list"
    else:
        status = "too_many_candidates"

    candidates = [
        DinTextMatchCandidate(
            din=row.din,
            product=row.product,
            active_ingredient=row.active_ingredient,
            strength=row.strength,
            colour=row.colour,
            shape=row.shape,
            score=score,
        )
        for score, row in scored[:CANDIDATE_CAP]
    ]

    return DinResolutionResult(
        status=status, candidates=candidates, total_candidate_count=total
    )
