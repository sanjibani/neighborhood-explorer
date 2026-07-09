"""
Pydantic models for the Neighborhood entity.

This file maps 1:1 to docs/data-model.md (the SDD contract).
Every field's description becomes part of the OpenAPI schema
(/docs on the running server): that IS the auto-generated API doc.

Used by:
- routes/neighborhoods.py: request/response typing
- routes/compare.py: references Neighborhood.id for matching
- services/cache.py: SQLite persistence layer
- services/llm.py: vibe-generation prompt template
"""
from datetime import datetime

from pydantic import BaseModel, Field


class ParkItem(BaseModel):
    """A nearby park POI (point of interest) within walking distance.

    Used by the Detail tab in the frontend (Phase 3.8).
    """
    name: str = Field(..., description="Park display name, e.g. 'Cubbon Park'")
    distance_m: int = Field(..., ge=0, description="Walking distance in meters")
    features: list[str] = Field(
        default_factory=list,
        description="Kid-friendly features. Common values: 'playground', 'splash_pad', 'walking_path', 'restrooms', 'trails'",
    )


class SchoolItem(BaseModel):
    """A nearby school with public rating.

    Bangalore v0.1 has no GreatSchools equivalent; we derive rating from
    Google Maps reviews (1-5 stars) normalized to 0-10. See LEARNING_NOTES
    for the data-sourcing rationale.
    """
    name: str = Field(..., description="School display name")
    rating: float = Field(..., ge=0, le=10, description="Composite 0-10 rating (Google Maps reviews normalized)")
    distance_m: int = Field(..., ge=0, description="Walking distance in meters")
    grades_served: str = Field(..., description="Grade range, e.g. 'K-5', '6-12', '1-10'")


class SafetyData(BaseModel):
    """Crime and traffic safety signals.

    Bangalore v0.1 has no open crime-data portal; we derive these heuristically
    (lighting density, transit-station count, foot-traffic from cafe density).
    Real production would use Karnataka State Police data or a vendor.
    """
    violent_per_100k: float = Field(..., ge=0, description="Violent crimes per 100k residents (annual)")
    property_per_100k: float = Field(..., ge=0, description="Property crimes per 100k residents (annual)")
    traffic_incidents_per_year: int = Field(..., ge=0, description="Reported traffic incidents in the area, annual")
    year: int = Field(..., ge=2020, le=2100, description="Year the data was sourced")


class VibeData(BaseModel):
    """AI-generated vibe descriptions for this neighborhood.

    Cached for 7 days; re-generated on access if expired.
    See docs/api.md for cache behavior.
    """
    vibe_short: str = Field(..., max_length=200, description="~15 word tagline for Table tab column view")
    vibe_full: str = Field(..., description="3-paragraph description for Detail tab (no length cap; LLM-generated)")
    vibe_generated_at: datetime = Field(..., description="When last generated; cache TTL is 7 days")


class Neighborhood(BaseModel):
    """Top-level entity: a full neighborhood profile.

    id is a URL-safe slug used in API paths: /api/neighborhoods/{id}.
    Scores are pre-computed (not live per-request) to save Maps API quota.
    """
    id: str = Field(
        ...,
        pattern=r"^[a-z0-9-]+$",
        description="URL-safe slug, e.g. 'indiranagar-bangalore-ka'. Format: name-city-state, lowercase, dashes only.",
    )
    name: str = Field(..., description="Display name, e.g. 'Indiranagar'")
    city: str = Field(..., description="City name, e.g. 'Bangalore'")
    state: str = Field(..., min_length=2, max_length=2, description="2-letter state code, e.g. 'KA' for Karnataka")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")

    # Composite scores: pre-computed, not derived per request (quotas concern)
    parks_score: float = Field(..., ge=0, le=10, description="Composite: count + walking-distance + kid-features")
    schools_score: float = Field(..., ge=0, le=10, description="Composite: count + ratings + walking-distance")
    safety_score: float = Field(..., ge=0, le=10, description="Composite: crime stats + traffic + pedestrian safety")

    # Detail data (optional for early seed entries; required for served profiles)
    parks_data: list[ParkItem] = Field(default_factory=list)
    schools_data: list[SchoolItem] = Field(default_factory=list)
    safety_data: SafetyData

    # AI vibe (cached)
    vibe: VibeData

    # Status flag: True once all required fields are populated
    cached: bool = Field(
        default=False,
        description="True when all scores, detail data, AND vibe are present. Used by routes to decide whether to enrich on read.",
    )
