from typing import Literal

from pydantic import BaseModel


class DinTextMatchCandidate(BaseModel):
    din: str
    product: str
    active_ingredient: str | None
    strength: str | None
    colour: str | None
    shape: str | None
    score: float


class DinResolutionResult(BaseModel):
    status: Literal["confirm", "pick_list", "too_many_candidates", "not_found"]
    candidates: list[DinTextMatchCandidate]
    total_candidate_count: int
