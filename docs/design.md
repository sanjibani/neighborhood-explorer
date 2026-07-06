# Design: Neighborhood Explorer (v0.1)

## Screen architecture — 2 screens

We're going with **2 screens**, not 3, because the persona already has their shortlist when they arrive. No browse/discovery needed.

- **Screen 1 — Shortlist** (entry): search + add up to 3 neighborhoods
- **Screen 2 — Compare** (main app): side-by-side + ranking + map

User flow: Screen 1 → "Compare" CTA (active when ≥2 added) → Screen 2 → "Edit shortlist" → back to Screen 1.

---

## Screen 1 — Shortlist (entry point)

### Purpose
User types/selects 2–3 neighborhoods they want to compare. The "Compare" CTA activates at ≥2.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Header:  Neighborhood Explorer                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Find neighborhoods to compare                        │
│  ┌──────────────────────────┐  ┌─────────────────┐  │
│  │ Type a neighborhood...   │  │   Add to list   │  │
│  └──────────────────────────┘  └─────────────────┘  │
│                                                      │
│  Your shortlist (0/3)                                │
│  ┌─────────────────────────────────────────────┐    │
│  │  No neighborhoods yet. Add 2-3 to compare.  │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────┐                        │
│  │  Compare (disabled)     │   ← Active when ≥2    │
│  └─────────────────────────┘                        │
└─────────────────────────────────────────────────────┘
```

### Components used
- `SearchInput` (with autocomplete dropdown)
- `Button` (primary)
- `ShortlistCard` (per neighborhood, thumbnail + X to remove)
- `EmptyState` (when list is empty)
- `CounterBadge` ("0/3", "1/3", etc.)

### States

| State | Trigger | UI |
|---|---|---|
| Empty | No neighborhoods added | Empty state message + disabled CTA |
| 1 added | User added 1 neighborhood | Card shown, CTA still disabled (need ≥2) |
| 2–3 added | ≥2 neighborhoods | Cards shown, CTA enabled |
| Loading | Geocoding/searching | Spinner inside search input |
| Error | Network/API failure | Red banner with retry button |

### Data displayed
Per neighborhood card: name, city, small map thumbnail, "remove" button.

### Interactions
- Type in search → autocomplete dropdown shows matches
- Click autocomplete result → add to shortlist
- Click X on card → remove from shortlist
- Click "Compare" → navigate to Screen 2

---

## Screen 2 — Compare (main app)

### Purpose
Side-by-side comparison of 2–3 shortlisted neighborhoods with parks/schools/safety scores, AI ranking, and map context.

### Layout

Screen 2 uses **tabs** (Table / Map / Detail) so each view gets full space without competing for vertical real estate. Default tab: **Table** (the comparison-first value prop). User can switch freely; ranking + sliders stay visible above the tabs.

```
┌──────────────────────────────────────────────────────────────────┐
│  Header:  Neighborhood Explorer    [Edit shortlist]              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Ranking priorities (weights auto-rebalance to sum to 1.0):       │
│  Parks:   [====------] 0.40                                        │
│  Schools: [======----] 0.35                                        │
│  Safety:  [===-------] 0.25                                        │
│                                                                   │
│  Best for your priorities:                                        │
│  🥇 Maplewood  (8.7/10)                                            │
│  🥈 Riverside  (8.2/10)                                            │
│  🥉 Oak Hill   (7.5/10)                                            │
│                                                                   │
│  ┌──────────┬──────────┬──────────┐                              │
│  │  Table   │   Map    │  Detail  │   ← tab nav                  │
│  └──────────┴──────────┴──────────┘                              │
│                                                                   │
│  ── Table tab (default) ──                                        │
│  ┌─────────────┬─────────────┬─────────────┐                    │
│  │ Maplewood   │ Riverside   │ Oak Hill    │                      │
│  │ Parks 9.1   │ Parks 8.5   │ Parks 7.8   │                      │
│  │ ████████▓░  │ ████████░░  │ ███████░░░  │                      │
│  │ Schools 8.5 │ Schools 8.0 │ Schools 7.2 │                      │
│  │ Safety 8.3  │ Safety 8.0  │ Safety 7.6  │                      │
│  │ "Quiet,     │ "Walkable,  │ "Spacious,  │                      │
│  │  family..."  │  diverse..."│  newer..."  │                      │
│  └─────────────┴─────────────┴─────────────┘                    │
│                                                                   │
│  ── Map tab ──                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ●Maplewood  ●Riverside  ●Oak Hill                          │  │
│  │  [Toggle: parks layer] [Toggle: schools layer]              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ── Detail tab ──                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  View: [Maplewood ▾]   ← dropdown to switch                 │  │
│  │                                                            │  │
│  │  Full AI vibe description (3 paragraphs):                  │  │
│  │  "Maplewood is a quiet, tree-lined neighborhood in..."    │  │
│  │                                                            │  │
│  │  Nearby parks (5):                                        │  │
│  │   • Riverside Park (0.3 mi) — playground, splash pad       │  │
│  │   • ...                                                    │  │
│  │                                                            │  │
│  │  Nearby schools (4):                                      │  │
│  │   • Maplewood Elementary (0.5 mi) — rating 8/10           │  │
│  │   • ...                                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Components used
- `WeightSlider` × 3 (auto-rebalance on change)
- `RankingResult` (per neighborhood, with medal + score)
- `Tabs` (nav with Table / Map / Detail panels)
- `CompareColumn` (per neighborhood, used inside Table tab)
- `ScoreBar` (numeric 0–10 with visual bar)
- `VibeTag` (AI-generated short description, used in Table tab)
- `MapView` (full-screen with 3 pins + layer toggles, used in Map tab)
- `NeighborhoodDetail` (deep profile for one neighborhood, used in Detail tab)
- `Select` (dropdown for Detail tab neighborhood picker)
- `Button` (secondary — "Edit shortlist")

### States

| State | Trigger | UI |
|---|---|---|
| Loading | Initial fetch | Skeleton placeholders for columns |
| Loaded | Data ready | Full UI as above |
| Sliders changed | User moves weight | Re-rank live (debounced) |
| Error | API failure on initial load | Red banner + retry, link back to Screen 1 |
| AI vibe loading | LLM still generating | Skeleton on vibe text |
| AI vibe error | LLM failure | "Description unavailable" placeholder |

### Data displayed
Per neighborhood column:
- Name + mini map preview
- Parks score (1–10) + visual bar
- Schools score (1–10) + visual bar
- Safety score (1–10) + visual bar
- Vibe description (~15 words, AI-condensed from full 3-paragraph version)
- AI ranking position (🥇/🥈/🥉)

### Interactions
- Move weight slider → re-rank instantly, sliders auto-rebalance to sum to 1.0 (debounced ~200ms)
- Click tab (Table / Map / Detail) → switch active panel; default tab is Table
- In Detail tab: select different neighborhood from dropdown → reload deep profile
- In Map tab: toggle parks/schools layers on/off; click pin → switch to Detail tab with that neighborhood selected
- Click "Edit shortlist" → navigate to Screen 1
- If user removes a neighborhood and shortlist drops below 2 → auto-redirect to Screen 1
- Click park/school layer on map → popup with name + rating (Phase 2+)

---

## Component inventory

Components needed for v0.1:

| # | Component | Purpose | Phase 3 file |
|---|---|---|---|
| 1 | `SearchInput` | Autocomplete text input | `frontend/components/SearchInput.js` |
| 2 | `ShortlistCard` | Neighborhood card + remove button | `frontend/components/ShortlistCard.js` |
| 3 | `CounterBadge` | "N/3" indicator | `frontend/components/CounterBadge.js` |
| 4 | `EmptyState` | Reusable empty-state | `frontend/components/EmptyState.js` |
| 5 | `WeightSlider` | Slider with label + auto-rebalance | `frontend/components/WeightSlider.js` |
| 6 | `RankingResult` | Ranking row with medal | `frontend/components/RankingResult.js` |
| 7 | `CompareColumn` | Per-neighborhood column (Table tab) | `frontend/components/CompareColumn.js` |
| 8 | `ScoreBar` | Numeric + visual score | `frontend/components/ScoreBar.js` |
| 9 | `VibeTag` | AI-generated short description | `frontend/components/VibeTag.js` |
| 10 | `MapView` | Google Map with pins + layer toggles (Map tab) | `frontend/components/MapView.js` |
| 11 | `NeighborhoodDetail` | Deep profile for one neighborhood (Detail tab) | `frontend/components/NeighborhoodDetail.js` |
| 12 | `Tabs` | Tab nav with panel switching | `frontend/components/Tabs.js` |
| 13 | `Select` | Dropdown picker | `frontend/components/Select.js` |
| 14 | `Button` | Primary/secondary button | `frontend/components/Button.js` |

**14 components.** Each gets a Phase 3 file + a Phase 5 test.

---

## Design tokens (placeholder for Phase 2 Penpot MCP export)

Phase 2 will define these in Penpot and export to `docs/design-tokens.json`. For now, Tailwind defaults with persona-flavored adjustments:

| Token | Value | Why |
|---|---|---|
| Primary color | Emerald 600 | Trust + family (vs blue=corporate, red=alert) |
| Neutral | Slate 50–900 | Calm, professional |
| Accent | Amber 500 | Used sparingly for "Best for you" medal |
| Font | ui-sans-serif (system) | Fast, accessible, no external load |
| Border radius | 0.5rem (`rounded-lg`) | Friendly, not corporate |

---

## Open UX questions

~~1. Map placement~~ — **resolved: tabs** (Table / Map / Detail).
~~2. Weight slider constraint~~ — **resolved: auto-rebalance** (move X, others shrink proportionally).
~~3. Empty state for Screen 2~~ — **resolved: auto-redirect to Screen 1** when shortlist drops below 2.

### Remaining questions to revisit during/after Phase 3

- **Tab default persistence**: should the active tab persist across sessions, or always default to Table?
- **Detail tab neighborhood picker UX**: dropdown vs left/right arrows vs clickable list?
- **Mobile breakpoints**: do tabs collapse to a hamburger drawer, or stay as tabs?