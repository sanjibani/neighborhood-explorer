"""
Pydantic model for ranking results (POST /api/compare response).

The score is DETERMINISTIC and computed server-side BEFORE the LLM call.
This is the SDD anti-hallucination move: the LLM can't reorder neighborhoods
based on vibes, only write an explanation that cites the pre-computed ranking.
"""
from datetime import datetime

from pydantic import BaseModel, Field

from backend.models.user_prefs import Weights


class RankEntry(BaseModel):
    """One neighborhood's ranked position with explanation.

    `score` is the deterministic weighted composite:
        parks_score × parks + schools_score × schools + safety_score × safety
    Rounded to 1 decimal place.

    `explanation` is LLM-generated with the actual scores as input, citing
    numbers it can't fabricate (per the prompt strategy in docs/api.md).
    """
    neighborhood_id: str = Field(..., description="The neighborhood's id")
    score: float = Field(..., ge=0, le=10, description="Weighted composite score, 0-10, 1 decimal place")
    explanation: str = Field(
        ...,
        description="LLM-generated explanation citing the actual numeric scores and weight split. No fact invention.",
    )


class RankingResult(BaseModel):
    """The full POST /api/compare response body.

    Note: ranking is NOT persisted server-side (per data-model.md, no DB table).
    Recomputed each request: cheap, and avoids 'stale ranking' UX confusion.
    """
    ranking: list[RankEntry] = Field(..., description="Ordered best-first; length matches request's neighborhood_ids")
    weights_used: Weights = Field(..., description="Echoed back for client confirmation")
    generated_at: datetime = Field(..., description="LLM-generated explanation timestamp")
