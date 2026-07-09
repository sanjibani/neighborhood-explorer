"""
Routes for neighborhood queries.

GET /api/neighborhoods/search?q=&limit=     autocomplete by name/id substring
GET /api/neighborhoods/{id}                 full Neighborhood profile, vibe-regenerates if TTL expired

The cache layer does NOT know about the LLM (separation of concerns).
The route is the orchestrator: cache -> TTL check -> LLM (if needed) -> cache.upsert.
This keeps each layer testable in isolation (LEARNING_NOTES §18).

Why return stripped search results: the Shortlist screen only needs id/name/city/state
+ lat/lng (for the future Map view). Returning parks/schools arrays for every hit
would over-fetch and bloat the autocomplete dropdown payload.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.dependencies import get_cache
from backend.models.neighborhood import Neighborhood, VibeData
from backend.services.cache import NeighborhoodCache
from backend.services.llm import generate_neighborhood_vibe
from backend.services.logging import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/api/neighborhoods", tags=["neighborhoods"])


def _to_search_result(nb: Neighborhood) -> dict:
    """Strip a Neighborhood to the autocomplete-friendly subset."""
    return {
        "id": nb.id,
        "name": nb.name,
        "city": nb.city,
        "state": nb.state,
        "lat": nb.lat,
        "lng": nb.lng,
    }


@router.get("/search")
def search(
    q: str = Query(..., min_length=2, description="Substring to match against name or id (case-insensitive)."),
    limit: int = Query(10, ge=1, le=50, description="Max results to return."),
    cache: NeighborhoodCache = Depends(get_cache),
) -> dict:
    """Autocomplete search across seeded neighborhoods.

    Returns the stripped shape (no parks/schools/vibe) to keep autocomplete fast.
    """
    hits = cache.search(q, limit=limit)
    log.info("neighborhoods.search", query=q, limit=limit, hits=len(hits))
    return {"results": [_to_search_result(nb) for nb in hits], "count": len(hits)}


@router.get("/{neighborhood_id}")
def get_by_id(
    neighborhood_id: str,
    cache: NeighborhoodCache = Depends(get_cache),
) -> dict:
    """Fetch a full Neighborhood profile by id.

    If the cached vibe is older than VIBE_CACHE_TTL_DAYS, the LLM regenerates
    short+full descriptions and the cache is updated in place. Subsequent reads
    within the TTL return the LLM-generated text without another LLM call.
    """
    nb = cache.get(neighborhood_id)
    if nb is None:
        log.info("neighborhoods.not_found", id=neighborhood_id)
        raise HTTPException(status_code=404, detail={"error": "neighborhood_not_found", "id": neighborhood_id})

    # Vibe regeneration path. The route is the orchestrator; the cache stays LLM-agnostic.
    if NeighborhoodCache.is_vibe_expired(nb):
        log.info("neighborhoods.vibe.expired", id=nb.id, generated_at=nb.vibe.vibe_generated_at.isoformat())
        try:
            new_short, new_full = generate_neighborhood_vibe(nb)
        except Exception as exc:
            # The LLM helper already returns a deterministic fallback on its own errors,
            # but if something unexpected bubbles up here, we still return the stale
            # vibe rather than 500ing. Stale > broken.
            log.error("neighborhoods.vibe.regen_failed", id=nb.id, error=str(exc), exc_info=True)
            return nb.model_dump(mode="json")

        nb = nb.model_copy(update={
            "vibe": VibeData(
                vibe_short=new_short,
                vibe_full=new_full,
                vibe_generated_at=datetime.now(timezone.utc),
            ),
            "cached": True,
        })
        cache.upsert(nb)
        log.info("neighborhoods.vibe.regenerated", id=nb.id)

    return nb.model_dump(mode="json")