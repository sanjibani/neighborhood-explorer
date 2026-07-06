# PRD: Neighborhood Explorer (v0.1)

## 1. Problem

A 35-year-old parent relocating with their family has shortlisted 2–3 candidate neighborhoods in a target city. They want to validate their shortlist against the factors that matter most for raising kids: **parks** (kid-friendly, walkable), **schools** (ratings, distance), and **safety** (crime, traffic).

Today they cobble this together across Zillow (median prices, sometimes crime), GreatSchools (school ratings), Google Maps (commute + nearby places), and word-of-mouth. The result is fragmented, slow, and emotionally exhausting — they're making a decision that affects their kids' childhoods on incomplete information.

## 2. User stories

**Story 1 — Shortlist:** As a 35-year-old parent, I want to type the names of 2–3 neighborhoods I'm considering and add them to a comparison list, so I don't have to keep mental track of which is which.

**Story 2 — Compare side-by-side:** As a 35-year-old parent, I want to see all shortlisted neighborhoods side-by-side with parks, schools, and safety data on the same screen, so I can spot tradeoffs without flipping between tabs.

**Story 3 — AI ranking:** As a 35-year-old parent, I want the app to rank the neighborhoods by my stated priorities (parks, schools, safety weighted by my preference), so I don't have to do the mental math myself.

**Story 4 — Map context:** As a 35-year-old parent, I want to see each neighborhood on a map with parks and schools marked, so I can visually verify the "10-minute walk to a playground" claim.

## 3. Acceptance criteria

**Story 1 (Shortlist):**
- Typing a neighborhood name shows autocomplete suggestions from a known list.
- I can add up to 3 neighborhoods to the compare list.
- The compare list persists across page reloads (localStorage).

**Story 2 (Compare):**
- Shortlisted neighborhoods render as columns, each with parks, schools, safety scores.
- Scores are numeric (1–10) with a one-line explanation of what they mean.
- I can hide/show score categories I don't care about.

**Story 3 (AI ranking):**
- I can adjust sliders for parks / schools / safety weights (must sum to 1.0).
- The ranking updates live as I move sliders.
- The ranking explanation tells me *why* this neighborhood won, citing specific data.

**Story 4 (Map):**
- Each neighborhood shows on a map with parks + schools as visible layers.
- Clicking a park/school shows its name and (where available) rating.
- The map centers/zooms when I switch the active neighborhood in the compare list.

## 4. Non-goals (v0.1)

- **NOT** a discovery/browse tool. The user has already shortlisted; we don't help them find candidates.
- **NOT** a real-estate listing tool. No Zillow/Redfin integration, no home prices, no rentals.
- **NOT** a school-choice decision tool. No enrollment data, no district-boundary maps beyond the neighborhood.
- **NOT** a multi-city comparator. v0.1 assumes one city at a time.
- **NOT** mobile-optimized. Responsive desktop-first; mobile is a stretch goal.
- **NOT** authenticated. No user accounts in v0.1; preferences stored in localStorage.
- **NOT** a long-term watchlist. No saved comparisons across sessions; the compare list resets each visit.

## 5. Success metrics

- **Time-to-comparison**: A new user goes from app open to side-by-side comparison in under 2 minutes.
- **Decision confidence**: After using the app, the user reports "I trust this data more than Googling" (qualitative, n=3 user tests).
- **AI ranking acceptance**: 80%+ of users keep the default ranking weights vs. moving every slider to extremes (means the default is reasonable).
- **Zero hallucinations**: AI vibe descriptions contain zero made-up facts (no fake park names, no fake school names, no fake crime stats). Validated by human review of 20 random descriptions.

## Open questions for v0.2

- Multi-city support?
- Mobile-first redesign?
- Save comparisons across sessions (user accounts)?
- Integration with school district APIs for boundary data?
- Real-estate price overlay (Zillow API)?