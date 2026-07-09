"""
Route for the neighborhood comparison action.

POST /api/compare
  Body: UserPrefs (shortlist[2-3], weights{parks+schools+safety = 1.0})
  Returns: RankingResult (sorted ranking + per-entry LLM explanation)

Architectural rules baked in here (LEARNING_NOTES §25):
- The numeric score is deterministic math. The LLM NEVER reorders.
- The LLM only writes the explanation text; the route does the ranking.
- If the LLM fails, we still return the deterministic ranking with a fallback
  explanation so the user gets a usable answer instead of a 500.

Why validate shortlist length and weight sum here (not just on UserPrefs):
  UserPrefs is a generic model reused for storage too (where 0-3 shortlist is fine).
  The compare endpoint enforces the 2-3 + sum-to-1.0 invariants specific to it.
  This keeps the model flexible and the route strict.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.dependencies import get_cache
from backend.models.neighborhood import Neighborhood
from backend.models.ranking import RankEntry, RankingResult
from backend.models.user_prefs import Weights
from backend.services.cache import NeighborhoodCache
from backend.services.llm import generate_ranking_explanation
from backend.services.logging import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/api/compare", tags=["compare"])


class CompareRequest(BaseModel):
    """Strict compare body: 2-3 shortlist IDs and weights that sum to 1.0.

    Distinct from UserPrefs (which is more permissive and reused elsewhere).
    """

    shortlist: list[str] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="2 or 3 neighborhood IDs to compare.",
    )
    weights: Weights = Field(
        ...,
        description="Importance weights; must sum to 1.0 within plus or minus 0.01.",
    )


def _compute_score(nb: Neighborhood, weights: Weights) -> float:
    """Deterministic weighted score in the 0-10 range.

    Note: a more rigorous impl would normalize parks_score/schools_score/safety_score
    to the same scale first. For v0.1 we trust the seed values to all be on the
    0-10 scale (they are). A Phase 8 hardening will add normalization + unit tests.
    """
    return round(
        nb.parks_score * weights.parks
        + nb.schools_score * weights.schools
        + nb.safety_score * weights.safety,
        2,
    )


@router.post("", response_model=RankingResult)
def compare(
    req: CompareRequest,
    cache: NeighborhoodCache = Depends(get_cache),
) -> RankingResult:
    """Rank 2-3 neighborhoods by the user's weights, with LLM-written explanations.

    Numeric ranking is deterministic. The LLM only writes prose.
    """
    shortlist: list[str] = req.shortlist
    weights = req.weights

    # Defensive weight-sum check. The UI sliders auto-balance, but curl / mobile
    # clients could send anything. Catching it here gives a clear 400 instead of
    # silently producing a misleading ranking.
    wsum = round(weights.parks + weights.schools + weights.safety, 4)
    if abs(wsum - 1.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "weights_must_sum_to_one",
                "received_sum": wsum,
                "tolerance": 0.01,
            },
        )

    # Fetch each neighborhood. 404 if any ID is unknown: fail loud, not partial.
    neighborhoods: list[Neighborhood] = []
    for nid in shortlist:
        nb = cache.get(nid)
        if nb is None:
            raise HTTPException(
                status_code=404,
                detail={"error": "neighborhood_not_found", "id": nid},
            )
        neighborhoods.append(nb)

    # Deterministic ranking: the LLM cannot reorder this list.
    scored = sorted(
        [(nb, _compute_score(nb, weights)) for nb in neighborhoods],
        key=lambda pair: pair[1],
        reverse=True,
    )

    # LLM call per entry to write the explanation. Sorted order is preserved.
    ranking: list[RankEntry] = []
    for nb, score in scored:
        try:
            explanation = generate_ranking_explanation(
                target=nb,
                weights=weights,
                computed_score=score,
                others=neighborhoods,
            )
        except Exception as exc:
            # Fallback inside generate_ranking_explanation already handles LLM errors,
            # but anything unexpected here yields a deterministic, non-fabricating
            # placeholder rather than a 500.
            log.error("compare.explanation_failed", id=nb.id, error=str(exc), exc_info=True)
            explanation = (
                f"Ranks by computed score {score}/10 with weights "
                f"parks={weights.parks}, schools={weights.schools}, safety={weights.safety}."
            )
        ranking.append(RankEntry(
            neighborhood_id=nb.id,
            score=score,
            explanation=explanation,
        ))

    log.info(
        "compare.complete",
        shortlist=shortlist,
        weights=weights.model_dump(),
        top_id=ranking[0].neighborhood_id,
        top_score=ranking[0].score,
    )

    return RankingResult(
        ranking=ranking,
        weights_used=weights,
        generated_at=datetime.now(timezone.utc),
    )