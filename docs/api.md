# API Contract: Neighborhood Explorer (v0.1)

Three endpoints. All JSON over HTTPS. No auth (per PRD non-goals).

Base URL (local): `http://localhost:8000`
Base URL (prod): `https://neighborhood-explorer.onrender.com`

All errors return `{ "error": "<code>", "message": "<human-readable>", "details": <optional> }` with appropriate 4xx/5xx status codes.

---

## `GET /api/neighborhoods/search`

Autocomplete suggestions for the shortlist search input. Returns up to 10 matches ordered by relevance.

### Request

```
GET /api/neighborhoods/search?q=maplew&city=austin
```

| Query param | Type | Required | Notes |
|---|---|---|---|
| `q` | string | yes | Search query, min 2 chars |
| `city` | string | no | Restrict to one city (PRD v0.1 is single-city; this param is for v0.2) |

### Response (200)

```json
{
  "results": [
    {
      "id": "maplewood-austin-tx",
      "name": "Maplewood",
      "city": "Austin",
      "state": "TX",
      "lat": 30.289,
      "lng": -97.742
    },
    {
      "id": "maple-ridge-austin-tx",
      "name": "Maple Ridge",
      "city": "Austin",
      "state": "TX",
      "lat": 30.301,
      "lng": -97.755
    }
  ]
}
```

### Errors

- `400` — `q` missing or <2 chars
- `503` — backend service unavailable (DB not seeded, etc.)

### Performance

- Sub-100ms target for local SQLite queries.
- Frontend debounces input by 200ms before calling.

---

## `GET /api/neighborhoods/{id}`

Fetch full neighborhood profile. Triggers AI vibe generation if cache expired.

### Request

```
GET /api/neighborhoods/maplewood-austin-tx
```

### Response (200)

```json
{
  "id": "maplewood-austin-tx",
  "name": "Maplewood",
  "city": "Austin",
  "state": "TX",
  "lat": 30.289,
  "lng": -97.742,
  "parks_score": 9.1,
  "schools_score": 8.5,
  "safety_score": 8.3,
  "parks_data": [
    { "name": "Riverside Park", "distance_m": 480, "features": ["playground", "splash_pad", "restrooms"] },
    { "name": "Maple Greenbelt", "distance_m": 720, "features": ["trails", "no_playground"] }
  ],
  "schools_data": [
    { "name": "Maplewood Elementary", "rating": 8.5, "distance_m": 800, "grades_served": "K-5" },
    { "name": "Lamar Middle School", "rating": 7.2, "distance_m": 1400, "grades_served": "6-8" }
  ],
  "safety_data": {
    "violent_per_100k": 245,
    "property_per_100k": 1820,
    "traffic_incidents_per_year": 12,
    "year": 2025
  },
  "vibe_short": "Quiet, family-oriented neighborhood with tree-lined streets and strong elementary schools.",
  "vibe_full": "Maplewood is a quiet, family-oriented neighborhood in central Austin... (3 paragraphs)",
  "vibe_generated_at": "2026-07-06T18:00:00Z"
}
```

### Errors

- `404` — `id` not found
- `503` — LLM call failed AND no cached vibe exists

### Performance

- Cache hit (within 7 days): ~50ms
- Cache miss (LLM call): ~2-3 seconds (MiniMax round-trip). Frontend shows skeleton during this time.

### Caching behavior

- If `vibe_generated_at` > 7 days ago: re-call MiniMax with `vibe_short` + `vibe_full` prompts in parallel, update DB, return new vibe.
- If LLM call fails: fall back to cached vibe (even if expired) and log warning.

---

## `POST /api/compare`

Rank 2–3 neighborhoods by user-specified weights. LLM generates a per-neighborhood explanation citing the actual scores.

### Request

```
POST /api/compare
Content-Type: application/json

{
  "neighborhood_ids": ["maplewood-austin-tx", "riverside-austin-tx", "oak-hill-austin-tx"],
  "weights": {
    "parks": 0.4,
    "schools": 0.35,
    "safety": 0.25
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `neighborhood_ids` | string[] | yes | 2 or 3 IDs |
| `weights.parks` | float | yes | 0–1 |
| `weights.schools` | float | yes | 0–1 |
| `weights.safety` | float | yes | 0–1; sum must be ≈1.0 (±0.01 tolerance) |

### Response (200)

```json
{
  "ranking": [
    {
      "neighborhood_id": "maplewood-austin-tx",
      "score": 8.7,
      "explanation": "Maplewood ranks highest because its parks score (9.1) and schools score (8.5) both exceed Riverside (8.5, 8.0) and Oak Hill (7.8, 7.2). With your weight split favoring parks + schools (0.75 combined), Maplewood's advantage in those areas gives it the top spot despite its safety score (8.3) being only marginally higher than the alternatives."
    },
    {
      "neighborhood_id": "riverside-austin-tx",
      "score": 8.2,
      "explanation": "..."
    },
    {
      "neighborhood_id": "oak-hill-austin-tx",
      "score": 7.5,
      "explanation": "..."
    }
  ],
  "weights_used": {
    "parks": 0.4,
    "schools": 0.35,
    "safety": 0.25
  },
  "generated_at": "2026-07-06T18:30:00Z"
}
```

### Errors

- `400` — `neighborhood_ids` length not 2 or 3
- `400` — `weights` don't sum to ≈1.0
- `404` — any ID not found
- `503` — LLM call failed

### Performance

- ~2-3 seconds (LLM round-trip for explanations).
- Numeric score is computed deterministically server-side; only the explanation is LLM-generated. This means the *ranking order* is fast and stable; only the explanation text takes time.

### Score formula (deterministic, computed first)

```
score = (parks_score × weight.parks) + (schools_score × weight.schools) + (safety_score × weight.safety)
```

Rounded to 1 decimal place. This is computed BEFORE the LLM call, so we can sort and pass the top neighborhood to the LLM as ground truth — prevents the LLM from re-ordering based on vibes.

### LLM prompt strategy (anti-hallucination)

The LLM prompt for explanation includes:
1. The numeric scores (passed in as ground truth)
2. The weight split (so the explanation cites "your 0.4 parks weight")
3. Instruction: *"Explain WHY this neighborhood ranks where it does, citing the scores. Do not invent facts not present in the data."*

This is the same SDD discipline from Phase 1: the agent sees the spec, not just the data. Pass constraints with data = constrained generation = fewer hallucinations.

---

## Endpoint summary

| Endpoint | Method | Purpose | Latency target |
|---|---|---|---|
| `/api/neighborhoods/search` | GET | Autocomplete | <100ms |
| `/api/neighborhoods/{id}` | GET | Full profile (triggers AI vibe if cached) | <100ms cached / 2-3s cold |
| `/api/compare` | POST | Rank 2-3 with explanation | <3s (LLM-bound) |

Three endpoints. Clean. Each maps to a specific UI action: search → add → compare.

---

## What's NOT in the API (intentional, v0.1 scope)

- `POST /api/neighborhoods/{id}/regenerate-vibe` — not exposed in v0.1; vibe regenerates automatically on cache miss. Can add in v0.2 if user feedback wants manual regen.
- `GET /api/cities` — not needed; v0.1 is single-city (Austin). Add when multi-city lands.
- `POST /api/auth/login` — no auth in v0.1.
- `GET /api/comparisons/history` — no persistence in v0.1.

These are all in the v0.2 backlog. Mention if any of them feels critical for your persona — we'd cut something else to fit.