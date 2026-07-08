"""
Pydantic model for user preferences (rank weights + shortlist).

Persisted in localStorage on the client (per docs/data-model.md and the
PRD non-goal of "no auth"). Sent verbatim to /api/compare as the request body.
"""
from pydantic import BaseModel, Field


class Weights(BaseModel):
    """Ranking-priority slider values.

    Must sum to 1.0 ±0.01 (validated at compare route; auto-rebalanced
    on the frontend when a slider moves).
    """
    parks: float = Field(..., ge=0, le=1, description="Weight for parks score, 0-1")
    schools: float = Field(..., ge=0, le=1, description="Weight for schools score, 0-1")
    safety: float = Field(..., ge=0, le=1, description="Weight for safety score, 0-1")


class UserPrefs(BaseModel):
    """The full UserPrefs payload from localStorage.

    Sent as-is to /api/compare. We don't persist this server-side in v0.1
    (PRD non-goal: no auth), but the model is the request schema.
    """
    weights: Weights = Field(
        default_factory=lambda: Weights(parks=0.40, schools=0.35, safety=0.25),
        description="Default: parks 0.40, schools 0.35, safety 0.25 (per design.md weight defaults)",
    )
    shortlist: list[str] = Field(
        default_factory=list,
        max_length=3,
        description="Neighborhood IDs in the compare list, max 3 per PRD non-goal",
    )
