# Data Model: Neighborhood Explorer (v0.1)

Three entities. Neighborhood is the only one persisted server-side; UserPrefs lives in localStorage; Comparison is computed on demand (no persistence per PRD non-goals).

## Entity 1: Neighborhood (server-side, SQLite)

| Field | Type | Notes |
|---|---|---|
| `id` | string | URL-safe slug, e.g. `maplewood-austin-tx`. Used as primary key. |
| `name` | string | Display name, e.g. `Maplewood` |
| `city` | string | e.g. `Austin` |
| `state` | string | 2-letter US state code, e.g. `TX` |
| `lat` | float | Latitude |
| `lng` | float | Longitude |
| `parks_score` | float (0–10) | Composite of nearby-park count + walking distance + kid-features |
| `schools_score` | float (0–10) | Composite of nearby-school count + ratings + walking distance |
| `safety_score` | float (0–10) | Composite of crime stats + traffic incident density + pedestrian safety |
| `parks_data` | JSON | `[{name, distance_m, features: [playground, splash_pad, ...]}]` |
| `schools_data` | JSON | `[{name, rating, distance_m, grades_served}]` |
| `safety_data` | JSON | `{violent_per_100k, property_per_100k, traffic_incidents_per_year, year}` |
| `vibe_short` | string | AI-generated ~15 word tagline for Table tab |
| `vibe_full` | text | AI-generated 3-paragraph description for Detail tab |
| `vibe_generated_at` | timestamp | When vibe was last regenerated (cache TTL) |
| `cached` | bool | `true` if all 6 scores + data + vibe present; `false` if partial |

### Storage

- SQLite table: `neighborhoods` with `id` as primary key.
- JSON columns stored as serialized TEXT (SQLite has no native JSON type; we serialize/deserialize in the service layer).
- Cache strategy: `vibe_generated_at` checked against `MAX_CACHE_AGE_DAYS=7` (configurable). Expired entries re-call MiniMax on next access.

### Seed data (v0.1)

v0.1 ships with ~10 hand-curated Austin neighborhoods (matching PRD scope: one city at a time). Seed file at `backend/data/neighborhoods_seed.json`. Phase 3 reads this on startup if the SQLite table is empty.

## Entity 2: UserPrefs (client-side, localStorage)

| Field | Type | Notes |
|---|---|---|
| `weights.parks` | float (0–1) | Default 0.40 |
| `weights.schools` | float (0–1) | Default 0.35 |
| `weights.safety` | float (0–1) | Default 0.25 |
| `shortlist` | string[] | List of neighborhood IDs, max 3 |
| `last_updated` | timestamp | For cache busting if we add auth later |

### Storage

- localStorage key: `ne_explorer_prefs_v1`
- JSON-serialized
- Read on app load; written on every change
- No server sync (per PRD non-goals: no auth, no cross-session persistence beyond this user's browser)

## Entity 3: RankingResult (computed on demand, not persisted)

This is the response shape of `POST /api/compare`. Never stored; recomputed each request.

| Field | Type | Notes |
|---|---|---|
| `ranking` | array | `[{neighborhood_id, score, explanation}]` ordered by score desc |
| `weights_used` | object | The weights that produced this ranking (echo back for client confirmation) |
| `generated_at` | timestamp | When LLM generated the explanation |

### Per-result object

```json
{
  "neighborhood_id": "maplewood-austin-tx",
  "score": 8.7,
  "explanation": "Maplewood ranks highest because its parks score (9.1) and schools score (8.5) both exceed Riverside and Oak Hill, while its safety score (8.3) is on par. With your weight split favoring parks + schools, Maplewood's combined advantage in those areas gives it the top spot."
}
```

The `explanation` is LLM-generated with the actual numeric scores as input — this is the SDD move that prevents hallucination (the LLM can't make up scores; they're passed in).

## Relationships

```
UserPrefs.shortlist (string[])  ─references─►  Neighborhood.id (string)
POST /api/compare request body ─references─►  Neighborhood.id (string)
RankingResult.ranking[].neighborhood_id ─references─►  Neighborhood.id (string)
```

No foreign keys in SQLite (we keep the schema simple for v0.1); the service layer validates IDs exist before returning data.

## Why this shape

- **Neighborhood as the only persisted entity** keeps the data layer minimal. Everything else is derived.
- **UserPrefs in localStorage** matches PRD non-goal (no auth). When we add auth in v0.2, this moves server-side as a `users.prefs` column.
- **RankingResult never persisted** — recomputation is cheap, and stale rankings would create UX confusion ("why is this ranked differently from when I last looked?").
- **Scores are pre-computed** (in seed data) rather than fetched live per request. This is a v0.1 trade-off — live Places API calls per request would burn through the $200/mo Maps credit fast. Phase 9 stretch goal: live recomputation on cache miss.

## Open questions for v0.2

- Multi-city support: does `Neighborhood.id` include city? (current yes, slug format `name-city-state`).
- User accounts: where do `UserPrefs` move to?
- Live data: when do we re-call Maps APIs vs trust cached scores?