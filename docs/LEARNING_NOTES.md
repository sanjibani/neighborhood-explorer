# Learning Notes: AI-SDLC Project

Personal study reference for the **neighborhood-explorer** AI-SDLC build. Captures the concepts, decisions, and patterns from this build so they survive beyond this session. Update as we discover more.

This file is **concepts-first**, not chronological. Each section stands alone for reference.

---

## 1. The Agent Loop (the most important concept)

Every AI agent — Cursor, Claude Code, Mavis, even the agent driving Penpot — runs the same loop:

```
1. OBSERVE   Read context (files, tools, prior messages)
2. THINK     LLM generates next action (text reply or tool call)
3. ACT       Execute the action (file edit, tool call, command)
4. OBSERVE   Read the result
5. THINK     Decide: continue / fix error / report done
6. loop until done or stuck
```

**When you see "agent wrote 3 files and ran tests", that's 3-5 loops. "Agent opened a PR" is dozens of loops compressed into minutes.**

### The 6-step loop we just observed (Penpot MCP test)

When I drew the test rectangle on your Penpot canvas, this exact loop ran:

```
1. OBSERVE  Mavis read context: PRDs done, design.md describes Phase 2 goal
2. THINK    Mavis decided: "draw a small test shape to verify MCP works"
3. ACT      Mavis POSTed JSON-RPC to https://design.penpot.app/mcp/stream with:
            - method: tools/call
            - tool: execute_code
            - args: { code: "...penpot.createBoard()..." }
4. OBSERVE  Penpot's MCP server received, authenticated via userToken
            Penpot's plugin in browser executed the JS
            Rectangle appeared on canvas
5. THINK    Mavis received: { boardId, position, size }
            → "loop succeeded, report done"
6. END      Mavis reported the result to you
```

**Same pattern works with Figma MCP in enterprise.** Different URL, different tool names sometimes, identical agent loop.

---

## 2. MCP — Model Context Protocol

**Open standard (Anthropic-led, now Linux Foundation) that lets LLMs call tools in a structured way. USB-C for AI: one protocol, any tool, any LLM.**

```
┌──────────┐    JSON-RPC over    ┌─────────────┐
│   LLM    │ ◄── stdio / HTTP ──►│  MCP Server │
│ (agent)  │                     │  (a tool)   │
└──────────┘                     └─────────────┘
```

### Why MCP matters

- Without MCP, every tool integration is bespoke (LangChain wrapper, custom JSON schema).
- With MCP, any agent can use any MCP-compatible server.
- **4,000+ public MCP servers in 2026**, covering the entire AI-SDLC surface.

### Our MCP inventory (this project)

| MCP server | Purpose | Free? |
|---|---|---|
| Penpot MCP | Design tool with AI agent access (Figma equivalent) | Free hosted |
| Playwright MCP | Browser automation for E2E + visual + a11y tests | Free |
| Context7 MCP | Live library docs into agent context (prevents API hallucination) | Free |
| Sequential Thinking MCP | Structured step-by-step reasoning for complex tasks | Free |
| Semgrep MCP | Static security scan | Free community rules |
| Sentry MCP | Error/event queries for observability | Free tier |

### MCP config pattern (Mavis)

```json
{
  "mcpServers": {
    "penpot": {
      "url": "https://design.penpot.app/mcp/stream?userToken=YOUR_TOKEN"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

Two transport types:
- **HTTP with URL**: hosted servers (Penpot, Sentry)
- **stdio with command**: local processes (Playwright, Context7, Semgrep)

### Penpot MCP's 4 tools (the Figma MCP equivalent)

| Tool | Purpose |
|---|---|
| `execute_code` | Run JS in the plugin context — this is the workhorse (create shapes, manipulate design) |
| `high_level_overview` | Returns API docs (read once at start of each design session) |
| `penpot_api_info` | Detailed API reference for specific types |
| `export_shape` | Export a shape as PNG/SVG |

---

## 3. AI-SDLC: The 7-Phase Framework

From PwC's 2026 Agentic SDLC framework + LTM SDLC AI Radar 2026 + Wizr enterprise best practices:

```
1. IDEATION      →  AI turns business intent into requirements + acceptance criteria
2. DESIGN        →  AI extracts patterns, generates wireframes, syncs design tokens
3. CODING        →  AI proposes architecture + code, human reviews
4. TESTING       →  AI writes/runs unit + integration + E2E tests
5. CI-CD         →  AI maintains pipelines, deploys, runs smoke tests
6. MONITORING    →  AI watches logs/metrics, alerts on anomalies
7. MAINTENANCE   →  AI triages bugs, refactors, opens PRs
```

### How our 9 phases map

```
Phase 1  ─── IDEATION     (prd.md, user stories, acceptance criteria)
Phase 2  ─── DESIGN       (Penpot MCP, design tokens)
Phase 3  ─── CODING       (Mavis generates backend + frontend code)
Phase 4  ─── CODING+TEST  (AI self-review + Semgrep security scan)
Phase 5  ─── TESTING      (unit + integration + Playwright E2E + visual + a11y)
Phase 6  ─── CI-CD        (GitHub Actions + auto-deploy to Render)
Phase 7  ─── DEPLOY+MON   (Render + Sentry + key restrictions)
Phase 8  ─── MAINTENANCE  (ADRs + Lighthouse + v0.1.0 tag)
Phase 14 ─── EXTENSION    (Spec Kit deep-dive, deferred)
```

### 2026 key shift (from LTM)

**"AI-SDLC rigor shifts upstream"** — the planning/spec phase gets MORE attention, not less, because the agent has less room to guess. Vague spec → vague code. Precise spec → clean code.

---

## 4. SDD — Spec-Driven Development

**A discipline WITHIN AI-SDLC** (specifically Phases 1-3). Specs are source of truth. Code is generated FROM specs.

### Why SDD works

- LLMs are trained on more text than visuals — text specs with structured sections are token-efficient and parse cleanly.
- Text specs force precision. "A map goes here" is ambiguous. A Figma mock often hides ambiguity that surfaces as bugs later.

### Our SDD deliverables (Phase 1)

| Doc | Section pattern | Becomes prompt context for |
|---|---|---|
| `docs/prd.md` | Problem, user stories, AC, non-goals, success metrics | Phase 2 (design), Phase 3 (code) |
| `docs/design.md` | Per-screen layout, components, states, interactions | Phase 3 (frontend code), Phase 2 (Penpot) |
| `docs/data-model.md` | Entities, fields, types, relationships | Phase 3 (backend schema) |
| `docs/api.md` | Endpoint contracts with request/response JSON | Phase 3 (FastAPI routes) |

### SDD habit

- **Specs before code**, always.
- **Changes start with spec updates**, not code changes.
- If generated code is wrong, the bug is in the spec — fix the spec, regenerate.

### GitHub Spec Kit (deferred to Phase 14)

Spec Kit formalizes SDD with slash commands: `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`. Industry-standard tooling in 2026 (used by GitHub itself, Microsoft, many Fortune 500). Deferred in our build for educational value (we see what specs need to contain without tool abstraction). Scheduled deep-dive after v0.1.0 ships.

---

## 5. Free-Tool → Enterprise-Tool Mapping (interview cheat sheet)

Every free tool we use teaches a pattern that transfers directly to its enterprise counterpart.

| Enterprise tool | Free alternative we use | Knowledge transfer |
|---|---|---|
| Figma + Figma MCP | **Penpot + Penpot MCP** | Same MCP protocol. In enterprise, swap server URL. |
| Cursor / Copilot Workspace | **Mavis / Claude Code / Cline** | Same agent loop. |
| Linear / Jira | **GitHub Issues + Projects** | Same workflow. |
| Notion / Confluence | **Markdown in repo + GitHub Wiki** | Same docs-as-code. |
| Slack / Teams | **GitHub Discussions + commits** | Same async-first. |
| Sentry Enterprise | **Sentry free tier** (5K events/mo) | Same SDK + dashboard. |
| Datadog / New Relic | **Render logs + Sentry + Lighthouse CI** | Same observability pillars. |
| Vercel Pro / Render paid | **Render free tier** / fly.io | Same 12-factor deploy. |
| CodeRabbit / Sourcery | **Mavis self-review + GitHub PR reviews** | Same review patterns. |
| Storybook + Chromatic | **Ladle + Playwright `toHaveScreenshot()`** | Same component-isolation pattern. |
| Percy / Applitools | **Playwright snapshots + BackstopJS** | Same screenshot diff. |
| axe DevTools Pro | **axe-core + @axe-core/playwright** | Same WCAG rules (axe IS the engine enterprise tools use). |
| Snyk | **Dependabot + Semgrep MCP** | Same scan-and-triage. |
| Figma Make / v0.dev | **Penpot MCP design-to-code** | Same agentic design extraction. |

**Key insight**: MCP is the abstraction layer that makes the swap trivial. The agent code that calls `mcp__penpot__extract_components(file_id)` works identically against `mcp__figma__extract_components(file_key)` — only the URL and one config field change.

---

## 6. Tools vs Agents vs Workflows

| Concept | Definition | Example |
|---|---|---|
| **Tool** | A single function an agent can call | `execute_code`, `search_places(query)`, `open_file(path)` |
| **Agent** | An LLM with a loop, system prompt, and access to tools | Mavis, Cursor, Claude Code |
| **Workflow** | A predefined sequence of agent steps | Phase 0 env setup (deterministic) |

Use a workflow when steps are known and deterministic (CI/CD, env setup). Use an agent when steps depend on context (code generation, debugging, design).

---

## 7. Context Engineering > Prompt Engineering

Modern AI-SDLC emphasizes **what you put in the agent's context window** over clever prompt wording.

Patterns we use:
- **File references** — agent reads `docs/design.md` instead of receiving it pasted.
- **Tool outputs as context** — Penpot MCP returns design JSON that becomes input to code-gen prompt.
- **Few-shot examples in repo** — `docs/examples/` shows the agent the style we want.
- **Negative constraints** — explicit "DO NOT use X" lines prevent common agent mistakes.

The 12-factor app pattern of env-var-based config also applies here: pass constraints WITH data, not separately.

---

## 8. Phase 0 — What We Shipped

A textbook 12-factor app:
- Env-var config (`.env` / Render dashboard)
- Stateless process (uvicorn)
- Port-based service (`$PORT`)
- Fast startup, disposability
- Dependencies declared (`backend/requirements.txt`)

### Structured JSON logs (the observability foundation)

Every log line is a queryable JSON event:
```json
{"model": "MiniMax-Text-01", "prompt_chars": 78, "event": "llm.call.start", "level": "info", "timestamp": "..."}
```

Production log aggregators (Render, Sentry, Datadog) parse this directly. Run `SELECT * FROM logs WHERE event='llm.call.start' AND prompt_chars > 5000` to find LLM abuse — impossible with `print()` strings.

### Stack snapshot

```
Backend:    FastAPI + Python 3.14, OpenAI SDK pointed at api.minimax.io/v1
Frontend:   Vanilla HTML + Tailwind (CDN), no build step
Design:     Penpot + Penpot MCP (remote, hosted at design.penpot.app)
Maps:       Google Maps JS API + Places + Distance Matrix (server keys used in Phase 3)
LLM:        MiniMax-Text-01 (coding-plan tier key, ~$1/mo expected)
DB:         SQLite (zero-setup)
Hosting:    Render free tier via render.yaml Blueprint (one-click deploy)
CI:         GitHub Actions skeleton (pytest, expanded in Phase 6)
Repo:       github.com/sanjibani/neighborhood-explorer (public, MIT)
```

---

## 9. Key Decisions We Made

Each decision cascades through every subsequent phase. Reasoning captured here for future reference.

### Persona = 35yo parent, family-friendly (parks + schools + safety)

- **Trigger A** (already shortlisted 2-3 candidates, comparison-first)
- This is the comparison-first MVP. Persona already has candidates; we help them validate on the factors that matter most for raising kids.
- Data shape changes: park count + kid-features, school ratings + walking distance, safety stats (lighting, traffic, foot-traffic).

### City = Bangalore (not Austin)

- User's home locale.
- Three data-sourcing differences from Austin:
  - **Schools**: no GreatSchools equivalent. Use Google Places API + Google Maps reviews as quality proxy.
  - **Safety**: no open city-data portal. Derive from heuristics (lighting density, traffic incidents, foot-traffic).
  - **Parks**: same Google Places API as Austin would have used.

### Screen 2 layout = tabs (Table / Map / Detail)

- Each view gets full space without competing for vertical real estate.
- Default tab: Table (comparison-first value prop).
- Tradeoff: extra click to see map (vs always-visible full-width map).

### Weight sliders = auto-rebalance to sum to 1.0

- Most discoverable for first-time users.
- Power users can still manually balance.

### Shortlist drops below 2 → auto-redirect to Screen 1

- Better than dead-end error message.

### Primary color = Emerald 600

- Trust + family vibe (vs corporate blue, alert red).

---

## 10. Patterns to Remember

### File structure for AI-SDLC projects

```
project/
├── backend/
│   ├── main.py
│   ├── routes/        # FastAPI routers
│   ├── services/      # Maps, LLM, cache wrappers
│   ├── models/        # Pydantic schemas
│   ├── data/          # seed data
│   ├── tests/         # pytest
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── components/    # one file per component
├── tests/
│   ├── e2e/           # Playwright MCP
│   ├── visual/        # screenshot baselines
│   └── a11y/          # axe-core
├── docs/
│   ├── prd.md         # Phase 1 spec
│   ├── design.md      # Phase 1 spec
│   ├── data-model.md  # Phase 1 spec
│   ├── api.md         # Phase 1 spec
│   ├── architecture.md
│   └── adr/           # Architecture Decision Records
├── .github/
│   └── workflows/     # GitHub Actions
├── PLAN.md            # phase-by-phase roadmap
├── LEARNING_NOTES.md  # this file
├── README.md
├── .env.example       # committed, no secrets
├── .env               # gitignored, real secrets
├── .gitignore
└── render.yaml        # Render Blueprint (IaC)
```

### Per-PR is the unit (and the exception)

- 1-3 lines, 1 file is the rule for normal PRs.
- **Exception**: locale/translation template sets MUST bundle into 1 PR (RHF #13556 maintainer request pattern).

### Edit tool, not sed -i

- Auto-classifier blocks sed-in-place.
- For bulk across files: Python script + verify `git diff` before commit.

### Secret hygiene

- Never paste API keys in chat (or rotate after if you must).
- `.env` gitignored from day one.
- Render env vars via dashboard (sync: false in render.yaml for `LLM_API_KEY`).
- Rotate the MiniMax key after Phase 0 setup so the chat-history copy is invalidated.

### Anti-hallucination in prompts

Pass constraints WITH data:
```
"This neighborhood has parks_score: 9.1, schools_score: 8.5, safety_score: 8.3.
 Explain WHY it ranks where it does, citing these scores.
 Do not invent facts not present in the data."
```
Generic prompt → "language translation" hallucination. Constrained prompt → grounded answer.

---

## 11. Phase 2 Progress (Penpot MCP — Live)

### Setup we did

1. **Generated Penpot MCP userToken** at `design.penpot.app → Account → Integrations → MCP Server`.
2. **Added MCP server to Mavis** via `mavis mcp add penpot '{"url":"..."}'`.
3. **Started local bridge** (later killed — remote is simpler).
4. **User created file** `neighborhood-explorer-design` in Penpot.
5. **Clicked MCP button on toolbar** → Connected status.

### What we observed

- Agent drew test rectangle (300×100 emerald, 8px rounded corners).
- Bridge log showed session count incremented.
- This is **one full agent loop** through MCP.

### Penpot gotchas we hit (so you remember)

- "Plugins → Load from URL" is for **local** MCP setup (needs local bridge).
- For **remote** MCP setup, just click the **MCP button on the file toolbar** (much simpler).
- Penpot's UI doesn't always match its docs (docs said "File menu", reality is "toolbar button").

---

## 12. Phase 3 Plan (when we get there)

When we move to Phase 3 (code generation), Mavis will:
1. Read `docs/prd.md`, `design.md`, `data-model.md`, `api.md` as prompt context.
2. Use Context7 MCP to fetch live library docs (prevents API hallucination).
3. Generate backend code in small commits (services/maps.py, services/llm.py, etc.).
4. Generate frontend components one at a time (SearchInput, ShortlistCard, etc.).
5. Test manually after each step.

**Spec quality directly determines code quality.** Vague specs → agent fills gaps with assumptions. Tight specs → clean generated code.

---

## 13. Glossary (quick reference)

| Term | Meaning |
|---|---|
| **MCP** | Model Context Protocol. The standard agents and tools speak to each other. |
| **Agent** | An LLM with a loop and tools. Decides its own next action. |
| **Tool** | A single function an agent can call. MCP servers expose tools. |
| **Workflow** | A predefined sequence of steps. Opposite of agent-driven. |
| **SDLC** | Software Development Lifecycle (requirements → design → code → test → deploy → maintain). |
| **AI-SDLC** | SDLC with AI agents at every phase. |
| **SDD** | Spec-Driven Development. Specs are source of truth; code generated from specs. |
| **Context window** | Chunk of text the LLM can "see" at once. Bigger = more aware but slower. |
| **Context engineering** | Choosing what goes in the context window (vs prompt wording tricks). |
| **System prompt** | Instructions to the LLM defining its role and constraints. |
| **RAG** | Retrieval Augmented Generation. Fetch facts, then ask LLM to answer using them. |
| **TTL** | Time To Live. How long cached data stays fresh. |
| **ADR** | Architecture Decision Record. Markdown file capturing a decision's context + consequences. |
| **12-factor app** | Principles for cloud-native apps (env-var config, stateless processes, etc.). |
| **Shift-left security** | Finding security issues earlier in the SDLC. |

---

## 14. References (from research, July 2026)

**AI-SDLC frameworks & primers:**
- [PwC "Agentic SDLC in practice" (2026)](https://www.pwc.com/m1/en/publications/2026/docs/future-of-solutions-dev-and-delivery-in-the-rise-of-gen-ai.pdf)
- [LTM SDLC AI Radar 2026](https://www.ltm.com/insights/reports/sdlc-ai-radar-2026)
- [Brillio "System-wide AI Orchestration"](https://www.brillio.com/wp-content/uploads/2026/05/System_wide_AI_orchestration_not_copilots_transforms_the_SDLC.pdf)
- [Wizr Enterprise AI Best Practices](https://wizr.ai/blogs/enterprise-ai-software-development-guide/)

**MCP:**
- [Penpot MCP](https://penpot.app/ai/mcp-server) — our Figma alternative
- [Penpot MCP guide](https://help.penpot.app/mcp/)
- [Penpot MCP complete reference](https://github.com/mrf0xvn/penpot-mcp-guide)
- [Free MCP server directory](https://skillsindex.dev/blog/free-mcp-servers-open-source-2026/)

**Visual regression:** Playwright `toHaveScreenshot()` (built-in), BackstopJS (free OSS)

**Other:**
- [Context7](https://context7.com) — live library docs in MCP
- [Semgrep](https://semgrep.dev) — static security analysis
- [axe-core](https://github.com/dequelabs/axe-core) — accessibility engine (free, MIT)
- [Sentry](https://sentry.io) — error tracking (free tier 5K events/mo)
- [Render](https://render.com) — hosting (free tier)
- [Penpot](https://penpot.app) — design tool (free)

---

## 15. Update log

- 2026-07-06: Initial creation. Captured learnings from Phases 0-2 of neighborhood-explorer build.
- 2026-07-08: Phase 3 patterns — models, cache, LLM, anti-hallucination (added below).

---

# Phase 3 patterns (added 2026-07-08)

## 16. SDD build order: docs → models → services → routes → wire

Always this order. Each layer depends on the previous:

```
docs/                 ← Spec (Phase 1)
  ↓
backend/models/       ← Pydantic contracts (3.1)
  ↓
backend/services/     ← Persistence + LLM (3.2, 3.4)
  ↓
backend/routes/       ← HTTP endpoints (3.5)
  ↓
backend/data/*.json   ← Pre-baked fixtures (3.6)
  ↓
backend/main.py       ← Wire-up + lifespan (3.7)
```

**Why this order**: each layer is testable in isolation. Models can be unit-tested without services. Services can be tested without routes. Routes can be mocked without backend. Wire-up at the end pulls everything together.

**Anti-pattern**: writing routes first, then services, then "oh I need a model for this". Cascading refactors.

## 17. Pydantic Field(description=) is your auto-generated API doc

```python
parks_score: float = Field(..., ge=0, le=10, description="Composite: count + walking-distance + kid-features")
```

Three things happen at once:
1. **Validation enforced** — `ge=0, le=10` rejects bad input at runtime
2. **Type hints for IDEs** — `nb.parks_score` autocompletes
3. **OpenAPI schema** — FastAPI auto-builds `/docs` Swagger UI with these descriptions

**No separate API doc to maintain**. The descriptions ARE the documentation. This is how Stripe, Twilio, and every well-built FastAPI service does it.

**Nested types, not dicts**: `parks_data: list[ParkItem]` over `parks_data: list[dict]`. Costs more lines but gives type safety at every layer.

**Variant creation**: `n.model_copy(update={'id': 'X'})` for tests and overrides. Doesn't mutate the original.

## 18. JSON-blob storage pattern (and when to use it)

```sql
CREATE TABLE neighborhood_cache (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,        -- WHOLE Neighborhood serialized as JSON
    cached_at TEXT NOT NULL
);
```

**When this works**: 10s-1000s of rows, simple queries, infrequent schema changes. Read is one query; write is one query. No joins.

**When this doesn't work**: millions of rows, complex query patterns (e.g., "find neighborhoods near this lat/lng with parks_score > 7"). Then you need Postgres + JSONB + spatial indexes.

**Migration path**: when scaling, move to Postgres. JSONB columns have the same JSON-blob UX but with proper indexes.

## 19. SQLite JSON1 for queryable JSON columns

```sql
SELECT data FROM neighborhood_cache
WHERE LOWER(json_extract(data, '$.name')) LIKE ?
ORDER BY json_extract(data, '$.name')
LIMIT ?
```

**The bug pattern**: agents forget that JSON is the column and properties are extracted. First version referenced `WHERE LOWER(name) LIKE ?` which errored: "no such column: name". Always use `json_extract(data, '$.field')`.

**Always smoke-test SQL against JSON columns** — the error is at runtime, not compile time.

## 20. Separation of concerns: cache vs LLM vs route

```
cache.py  — persistence (does one thing: store + retrieve Neighborhood)
llm.py    — generation (does one thing: text in → text out)
routes/   — orchestration (composes cache + LLM)
```

Each layer imports only what it needs. Cache doesn't import LLM. LLM doesn't import cache. Routes import both.

**Why it matters**:
- Easy to test each layer in isolation
- Easy to swap implementations (SQLite → Postgres, MiniMax → Claude)
- Easy to reason about (each layer has one job)

**Anti-pattern**: routes import cache + LLM directly + do "smart" things like "if cache miss, fall back to LLM". That's orchestration logic, belongs in routes.

## 21. Anti-hallucination prompt pattern

Every LLM prompt we wrote has 3 sections:

```
1. ROLE / TASK
   "Generate a ~15-word tagline for {X}, optimized for a 35-year-old parent..."

2. DATA (ground truth the LLM is allowed to use)
   "- Parks: 8.7/10
    - Schools: 8.2/10
    - NPS Indiranagar (900m, rated 8.5/10)
    - violent 180/100k, property 920/100k"

3. CONSTRAINTS (anti-hallucination rules)
   "- Maximum 15 words
    - DO NOT invent specific facts (no park names, no crime stats)
    - Return only the tagline, no preamble"
```

**The "no preamble" rule**: without it, the LLM might say "Sure! Here's a tagline for..." — requiring post-processing. With it, the LLM returns directly usable text. The route layer assigns the string to `vibe_short` directly.

**Temperature knobs**:
- `0.7` — creative writing (vibes)
- `0.5` — factual summaries (ranking explanations)
- `1.0+` — brainstorming, ideation

## 22. Graceful degradation with deterministic fallbacks

```python
def generate_ranking_explanation(...) -> str:
    try:
        text = complete(prompt, ...).strip()
        return text
    except Exception:
        # PURE MATH FALLBACK — no LLM needed, cites real data
        return f"{target.name} received {computed_score:.1f}/10 based on weights..."
```

When the LLM fails (rate limit, API down, key invalid), the user **still gets an answer**. The fallback isn't a bug — it's a production feature.

**Pattern**: fallback should cite real data, not generic text. Honesty over polish.

**Where this came from**: Netflix Hystrix, AWS retry libraries, Stripe webhooks. Fallback is part of the API contract, not an afterthought.

## 23. Vibe TTL pattern: cache layer says "expired", route regenerates

```python
@staticmethod
def is_vibe_expired(neighborhood: Neighborhood, ttl_days: int = 7) -> bool:
    age = datetime.now(timezone.utc) - neighborhood.vibe.vibe_generated_at
    return age > timedelta(days=ttl_days)
```

The cache layer **doesn't know about the LLM**. It just tells you "expired or not".

Route then orchestrates:
```python
nb = cache.get(id)
if cache.is_vibe_expired(nb):
    new_short, new_full = llm.generate_neighborhood_vibe(nb)
    nb_new = nb.model_copy(update={"vibe": VibeData(vibe_short=new_short, vibe_full=new_full, vibe_generated_at=now)})
    cache.upsert(nb_new)
    nb = nb_new
return nb
```

This is the **engineering version of "separation of concerns"**. Each layer has one job.

## 24. SDD numeric scores vs LLM explanations

For ranking, the **numeric score is computed deterministically** (pure math). The LLM only writes the explanation text. The LLM **cannot reorder** the neighborhoods based on vibes.

```python
score = (parks_score * w.parks) + (schools_score * w.schools) + (safety_score * w.safety)
ranking = sorted(neighborhoods, key=lambda n: computed_score, reverse=True)
# Then LLM explains each RankEntry, citing the actual numeric score
```

**The architecture prevents hallucination**. The agent can't say "Whitefield should rank higher" because the ranking is fixed before the LLM call.

## 25. Manual smoke tests during AI-build phase

```python
# Inline smoke test pattern
.venv/bin/python -c "
from backend.models.neighborhood import Neighborhood, ...
from backend.services.cache import NeighborhoodCache

n = Neighborhood(id='test', name='Test', ...)
cache = NeighborhoodCache(db_path='/tmp/test.db')
cache.upsert(n)
fetched = cache.get('test')
print('Roundtrip:', fetched.id, fetched.name)
# ... exercise every method ...
cache.clear()
import os; os.remove('/tmp/test.db')
"
```

**Cost**: 30 sec per file.
**Catches**: ~1 bug per 5-10 files.
**Replaced in Phase 5**: by proper pytest.

When the smoke test catches something, you see the error **at write time, not at runtime**. That's the difference between 30 seconds and hours of debugging.

## 26. BUG PATTERNS caught during Phase 3

| Bug | Symptom | Fix | Lesson |
|---|---|---|---|
| SQL `WHERE LOWER(name) LIKE ?` | "no such column: name" | `json_extract(data, '$.name')` | JSON columns need explicit extraction |
| Shell-escaped `\$` in JSON path | "bad JSON path" | Use single-quoted Python inside double-quoted shell | Bash `$` escaping requires care |
| Missing `LLM_API_KEY` (test env) | _get_client throws | try/except with deterministic fallback | Fallbacks aren't bugs — they're production features |
| Phase 2 Penpot `paddingTop` (no-op) | content hugging edges | API uses `topPadding`, not `paddingTop` | API property names sometimes don't match intuition; check API docs explicitly |
| Phase 0 missing button text | screenshot review caught it | Always add text labels to buttons, not just colored rects | Agents write code that parses; humans see if it renders correctly |

**Meta-lesson**: 90% of AI-SDLC bugs are caught by humans actually looking at the output, not by linters/tests. Visual review is irreplaceable.

## 27. The agent self-healing loop spectrum

The "does the agent fix until right" question has 4 levels:

| Level | Mechanism | When to use |
|---|---|---|
| 1. **Smart smoke test** (what we do) | Single agent: write → run smoke → if fail, fix → re-run | Solo / learning / prototyping |
| 2. **Pytest + CI loop** (Phase 5+) | Agent commits → CI runs → agent reads CI failure → fixes → re-pushes | Small team / weekly deploys |
| 3. **Verifier agent** (separate from writer) | Writer agent + separate verifier agent in feedback loop | Production enterprise teams |
| 4. **Reflection loop** (agent reviews own work in second role) | Same agent, switches role: "review this code against spec.md, find issues, fix" | Critical systems (healthcare, finance) |

**What NONE of these catch**: visual / design issues. Only humans see those.

**Industry examples**:
- Anthropic Claude Code — built-in verifier pass
- Cursor Composer mode — multi-step verification
- Cognition Devin — separate planning + execution agents
- LangChain reflection agents — runtime reflection patterns

For our learning project, level 1 (smart smoke tests) is production-adequate. Move to level 2 in Phase 5, level 3+ when you scale to multi-agent workflows.

---

## 28. The runtime flow when fully wired (preview)

User: clicks "Compare" on 3 neighborhoods (Indiranagar, Koramangala, Whitefield)
   ↓
Frontend: POST /api/compare with {neighborhood_ids, weights}
   ↓
Route (neighborhoods.compare):
  1. For each ID: cache.get(id) → 3 Neighborhoods
  2. Compute deterministic score per neighborhood:
     score = parks * w.parks + schools * w.schools + safety * w.safety
  3. Sort by score desc → [Indiranagar, Koramangala, Whitefield]
  4. For each: llm.generate_ranking_explanation(target, weights, score, others)
     → 3 LLM round-trips, ~3.6K tokens total
  5. Return RankingResult JSON
   ↓
Frontend: renders ranking with score badges + LLM explanations

**Key insight**: numeric score = math. Explanation = LLM. The LLM cannot reorder results. Architecture prevents hallucination.

---

## References for Phase 3 patterns

- **Pydantic v2 docs** — [docs.pydantic.dev](https://docs.pydantic.dev/)
- **SQLite JSON1 extension** — [sqlite.org/json1.html](https://www.sqlite.org/json1.html)
- **Anthropic structured prompting** — anti-hallucination playbook
- **Chip Huyen — AI Engineering** — Chapter 8 on RAG & grounding (covers the "pass data into prompt" pattern)

---

## 16. Update log

(updated entries)

- 2026-07-06: Initial creation. Captured learnings from Phases 0-2 of neighborhood-explorer build.
- 2026-07-08: Phase 3 patterns added (sections 16-28). SDD build order, Pydantic Field descriptions, JSON-blob storage, JSON1 query pattern, cache/LLM/route separation, anti-hallucination prompts, graceful degradation, vibe TTL pattern, SDD numeric vs LLM, smoke test pattern, bug patterns, agent self-healing loop spectrum.
- (Add new entries as we discover more.)
