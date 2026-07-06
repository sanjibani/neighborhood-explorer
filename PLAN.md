# Neighborhood Explorer — AI-SDLC Learning Project

A working project designed to **teach the modern AI-SDLC pipeline by building through it**. Every phase pairs "what to ship" with "why this matters in AI-SDLC", so you finish with both a deployed app and a mental model of how AI agents build software today — using tools that are free now and map 1:1 to enterprise tools you'll use later.

---

## 1. What We're Building

A **neighborhood comparison tool**:

1. User searches or clicks any neighborhood on a Google Map.
2. Backend pulls live data: nearby places (cafes, transit, parks), commute time to a "work" address the user sets, walkability heuristics.
3. Backend calls **MiniMax** to generate a 3-paragraph vibe description + 5 vibe tags + 3 "best for" tags.
4. User picks a second (or third) neighborhood to compare side-by-side.
5. AI rank-orders them by user-defined priority (commute vs vibe vs walkability).

Scope is deliberately small — one screen, one comparison flow, one AI call per neighborhood. Small enough to ship in a few sessions, rich enough to exercise every phase of AI-SDLC.

### Why a neighborhood app, specifically

- **Map UI** forces integration of an external API (Google Maps) — the most common real-world integration pattern.
- **AI-generated descriptions** are a *good* LLM task (creative, summarization, structured output) and visible end-to-end.
- **Side-by-side comparison** is a natural RAG-flavored workflow (retrieve facts, then synthesize a recommendation).
- **Free tier**: Google Maps gives $200/mo credit, Maps JS API works in the browser with referrer-restricted keys.

---

## 2. Free-Tool → Enterprise-Tool Mapping (the key table)

This is the table that answers "what am I actually learning?". Every free tool below teaches a pattern that transfers directly to its enterprise counterpart. The implementation steps are nearly identical — only the vendor URL changes.

| Enterprise tool | What it does | Free alternative we'll use | Knowledge transfer |
|---|---|---|---|
| Figma + Figma MCP | Design tool with AI agent access | **Penpot + Penpot MCP** ([penpot.app/ai/mcp-server](https://penpot.app/ai/mcp-server)) | Same MCP protocol. In enterprise, swap the MCP server URL from Penpot to Figma, agent code unchanged. |
| Cursor / Copilot Workspace | AI-native IDE | **Mavis (this assistant) + Claude Code + Cline** | Same agent loop (observe → think → act), same prompt patterns, same file/shell tools. |
| Linear / Jira | Issue tracking, sprints | **GitHub Issues + Projects** (free) | Same workflow: issue → branch → PR → close. |
| Notion / Confluence | Docs | **Markdown in repo + GitHub Wiki** | Same docs-as-code pattern, version-controlled. |
| Slack / Teams | Async chat | **GitHub Discussions + commit messages** | Same async-first, threaded-by-default. |
| Sentry Enterprise | Error tracking | **Sentry free tier** (5K events/mo, [sentry.io](https://sentry.io)) | Same SDK integration, same dashboard concepts. |
| Datadog / New Relic | Metrics + APM | **Render built-in logs + Sentry + Lighthouse CI** | Same observability pillars: logs, errors, performance. |
| Vercel Pro / Render paid | Hosting | **Render free tier** ([render.com](https://render.com)) or **fly.io free tier** | Same 12-factor app pattern, env-var-based config. |
| CodeRabbit / Sourcery | AI PR review | **Mavis self-review in CI + GitHub PR reviews** | Same review-prompt pattern, same checklist structure. |
| Storybook + Chromatic | Component docs + visual regression | **Ladle + Playwright `toHaveScreenshot()`** | Same component-isolation pattern, same baseline-snapshot diff. |
| Percy / Applitools | Visual regression SaaS | **Playwright snapshots + BackstopJS** | Same screenshot diff pattern, no vendor lock-in. |
| axe DevTools Pro | Accessibility | **axe-core (free)** + `@axe-core/playwright` | Same WCAG rule set (axe IS the engine enterprise tools use). |
| Snyk | Dependency scan | **GitHub Dependabot + Semgrep MCP (free)** | Same scan-and-triage pattern. |
| Custom RAG stack | AI search/retrieval | **Our backend calls MiniMax directly** (free) | Same RAG pattern, just a simpler vector store (SQLite). |
| Figma Make / v0.dev | Design-to-code | **Penpot MCP design-to-code** | Same agentic design extraction, same HTML/CSS output. |
| TalentLMS / Workramp | Internal training | This project IS the training | We dogfood what we learn. |

**Key insight**: MCP is the abstraction layer that makes the swap trivial. The agent code that calls `mcp__penpot__extract_components(file_id)` works identically against `mcp__figma__extract_components(file_key)` — only the URL and one config field change.

---

## 3. Stack — What and Why

| Layer | Choice | Rationale |
|---|---|---|
| Backend | **FastAPI** (Python 3.11+) | Async, type-safe, easy LLM glue, one-file deploy. Pydantic for data contracts. |
| Frontend | **Vanilla HTML + Tailwind (CDN) + plain JS** | No build step, single deploy with backend. Tailwind keeps styling productive. |
| Design | **Penpot** (free, [penpot.app](https://penpot.app)) + **Penpot MCP** | Figma-equivalent UX, free, MCP-native. |
| Maps | **Google Maps JavaScript API + Places API + Distance Matrix API** | You have the key. JS API on frontend (referrer-restricted), Places + Distance Matrix proxied through backend. |
| LLM | **MiniMax-Text-01** via `api.minimax.io/v1` | Already configured in your Mavis env. OpenAI-compatible SDK. |
| DB | **SQLite** (file-based) | Zero setup. User prefs, cached descriptions, comparison history. |
| Browser tests | **Playwright MCP** | Drives real browser via MCP — agent loop made visible. |
| Unit tests | **pytest** | Standard Python. |
| Visual regression | **Playwright `toHaveScreenshot()`** | Built-in, free, no extra vendor. |
| Accessibility | **axe-core + @axe-core/playwright** | Free, same engine as enterprise tools. |
| Security scan | **Semgrep MCP + Dependabot** | Free, runs in CI. |
| Observability | **Sentry free tier + structured JSON logs** | Free, 5K events/mo. |
| CI/CD | **GitHub Actions** | Free for public repos (unlimited minutes). |
| Hosting | **Render.com** free tier | $0 cost, sleeps after 15min idle (fine for learning). |
| Repo | **GitHub** (`sanjibani/neighborhood-explorer`) | Public so we can demo AI-SDLC commits over time. |
| Component playground | **Ladle** (alt to Storybook) | Free, lightweight, runs alongside frontend. |

### What we're explicitly NOT using

- **No paid SaaS** anywhere. Render, Sentry, GitHub, Penpot, MCP servers, axe, Playwright, Semgrep — all free.
- **No Docker initially** — Render builds from `requirements.txt`. Add only if a problem forces it.
- **No paid observability** — Render logs + Sentry free tier.
- **No Figma** — replaced by Penpot (functionally equivalent for learning).
- **No build pipeline** — no Vite, no Webpack, no npm. Tailwind via CDN.

---

## 4. Free-Tier Budget

| Resource | Free quota | Our expected use | Cost |
|---|---|---|---|
| Google Maps (all APIs) | $200/mo credit | ~$1-3/mo for a learning app | **$0** |
| MiniMax via Mavis | Pay-as-you-go (very cheap for text) | ~5K calls/mo | **~$0.50-1/mo** |
| Render.com Web Service | 750 hrs/mo free | 720 hrs/mo | **$0** |
| SQLite | Unlimited local | ~MB | **$0** |
| GitHub (public repo) | Unlimited | — | **$0** |
| Penpot | Unlimited hosted | 1 file | **$0** |
| Sentry | 5K events/mo | ~1K/mo | **$0** |
| Playwright | Free OSS | local | **$0** |
| axe-core | Free OSS | local | **$0** |
| Semgrep | Free community rules | CI | **$0** |
| GitHub Actions | 2,000 min/mo (public) | ~100 min/mo | **$0** |
| **Total new monthly cost** | | | **~$0-1** |

Hard cap: `MAX_LLM_CALLS_PER_DAY=100` so a runaway agent loop can't burn through MiniMax credits.

---

## 5. AI-SDLC Concept Primer

Read once before Phase 0. Re-skim before each phase.

### 5.1 The 7 enterprise AI-SDLC phases (PwC 2026 framework)

```
1. IDEATION      →  AI turns business intent into requirements + acceptance criteria
2. DESIGN        →  AI extracts patterns, generates wireframes, syncs design tokens
3. CODING        →  AI proposes architecture + code, human reviews
4. TESTING       →  AI writes/runs unit + integration + E2E tests
5. CI-CD         →  AI maintains pipelines, deploys, runs smoke tests
6. MONITORING    →  AI watches logs/metrics, alerts on anomalies
7. MAINTENANCE   →  AI triages bugs, refactors, opens PRs
```

This project's 9 phases (see §7) map directly: Phase 1=Ideation, Phase 2=Design, Phase 3=Coding, Phase 4=Review, Phase 5=Testing, Phase 6=CI-CD, Phase 7=Deploy+Observability, Phase 8=Maintenance/Polish.

### 5.2 The Agent Loop (memorize this — it runs 1000s of times per phase)

```
1. OBSERVE   Read context (files, tools, prior messages)
2. THINK     LLM generates next action (text reply OR tool call)
3. ACT       Execute the action (file edit, tool call, shell command)
4. OBSERVE   Read the result
5. THINK     Decide: continue / fix error / report done
6. ... loop until done or stuck
```

When you see "agent wrote 3 files and ran tests", that's 3-5 loops. When you see "agent opened a PR", that's dozens of loops in minutes.

### 5.3 MCP — Model Context Protocol (the most important concept)

MCP is an open standard (Anthropic-led, now under Linux Foundation governance) that lets LLMs call **tools** in a structured way. **USB-C for AI**: one protocol, any tool, any LLM.

```
┌──────────┐    JSON-RPC over    ┌─────────────┐
│   LLM    │ ◄── stdio / HTTP ──►│  MCP Server │
│ (agent)  │                     │  (a tool)   │
└──────────┘                     └─────────────┘
                                       │
                                       ▼
                                 real-world action
                                 (browser, file, API, db)
```

**Why MCP matters for your learning:**

- Without MCP, every tool integration is bespoke. With MCP, any agent can use any MCP server.
- The 4,000+ public MCP servers in 2026 cover the entire AI-SDLC surface.
- **Penpot MCP, Playwright MCP, GitHub MCP, Semgrep MCP, Context7 MCP, Sentry MCP** — all free, all work with Mavis/Claude Code.
- The tool *author* writes the MCP server once. You configure which servers your agent has access to via a `mcp.json` config.

### 5.4 Tools vs Agents vs Workflows

- **Tool** = a single function an agent can call (`search_places(query)`, `navigate(url)`, `run_command(cmd)`).
- **Agent** = an LLM with a loop, a system prompt, and access to a set of tools. Mavis, Cursor, Claude Code are agents.
- **Workflow** = a predefined sequence of agent steps. Use when steps are deterministic. Use an agent when steps depend on context.

### 5.5 Context engineering > prompt engineering

Modern AI-SDLC emphasizes **context engineering** over clever prompts. What you put in the agent's context window determines output quality more than prompt wording. Patterns we use:

- **File references** — agent reads `docs/design.md` instead of receiving it pasted.
- **Tool outputs as context** — Penpot MCP returns design JSON that becomes input to the code-gen prompt.
- **Few-shot examples in repo** — `docs/examples/` shows the agent the style we want.
- **Negative constraints** — explicit "DO NOT use X" lines prevent common agent mistakes.

---

## 6. MCP Server Inventory (what we'll wire up)

We will configure these MCP servers in Mavis's `mcp.json`. All free.

| MCP server | Purpose | Phase introduced | Free tier |
|---|---|---|---|
| **Penpot MCP** | Read/write designs, extract components, design-to-code | Phase 2 | Free hosted at design.penpot.app |
| **Filesystem MCP** | Read/write local files | Built-in (most agents ship with it) | Free |
| **Git MCP** | git status, diff, commit, log | Built-in | Free |
| **GitHub MCP** | Open PRs, manage issues, comment | Phase 6 | Free with GitHub PAT |
| **Playwright MCP** | Drive a real browser: navigate, click, fill, screenshot, get a11y tree | Phase 5 | Free, needs Chromium installed |
| **Context7 MCP** | Inject live, version-specific library docs into context (prevents API hallucination) | Phase 3 | Free |
| **Sequential Thinking MCP** | Structured step-by-step reasoning for complex tasks | Phase 3 | Free |
| **Semgrep MCP** | Static security scan, surface vuln patterns | Phase 4 | Free community rules |
| **DDGS MCP** (DuckDuckGo) | Free web search without API keys | Optional, ad-hoc | Free |
| **Sentry MCP** | Query errors and events from your Sentry project | Phase 7 | Free tier |

**MCP config snippet (Phase 2 onward):**

```json
{
  "mcpServers": {
    "penpot": { "url": "https://design.penpot.app/mcp/stream?userToken=YOUR_KEY" },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "context7": { "url": "https://mcp.context7.com/sse" },
    "semgrep": { "command": "npx", "args": ["-y", "@semgrep/mcp"] },
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." } }
  }
}
```

---

## 7. The Phases

Each phase: **Goal → AI-SDLC concept → Steps → Deliverable → Pitfalls**.

A phase is "done" when its deliverable is committed to git on a branch and pushed to GitHub.

---

### Phase 0 — Foundations & Deploy Skeleton

**Goal**: a runnable empty FastAPI + Tailwind site, deployed to Render, with both API keys wired and zero cost.

**AI-SDLC concept**: Workflow vs agent — env setup is a workflow because steps are deterministic. Knowing *when* to use each is part of the SDLC skill.

**Steps:**

1. Install Python 3.11+, Node 20+ (for Playwright/Playwright MCP), git, gh CLI.
2. Create GitHub repo `sanjibani/neighborhood-explorer`, public, with `README.md` and `.gitignore` (Python + Node).
3. Local structure:
   ```
   neighborhood-explorer/
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
   │   └── ladle/         # component playground (alt to Storybook)
   ├── tests/
   │   ├── e2e/           # Playwright MCP tests
   │   ├── visual/        # screenshot baselines
   │   └── a11y/          # axe-core tests
   ├── docs/
   │   ├── prd.md         # Phase 1
   │   ├── design.md      # Phase 1
   │   ├── data-model.md  # Phase 1
   │   ├── api.md         # Phase 1
   │   ├── architecture.md
   │   └── adr/           # Architecture Decision Records
   ├── .github/
   │   └── workflows/     # GitHub Actions
   ├── PLAN.md  (this file)
   ├── README.md
   ├── .env.example
   └── .gitignore
   ```
4. venv, `pip install fastapi uvicorn httpx pydantic python-dotenv structlog pytest`, freeze.
5. Minimal `backend/main.py` — `/` returns "hello", `/api/health` returns `{"status":"ok"}`.
6. Minimal `frontend/index.html` — Tailwind CDN, centered "Neighborhood Explorer" hero.
7. **Wire MiniMax**: `backend/services/llm.py` with `complete(prompt: str) -> str` using OpenAI SDK pointed at `https://api.minimax.io/v1`. Add `LLM_API_KEY` to `.env`. Add `/api/echo-llm` endpoint to test.
8. **Wire Google Maps**: `MAPS_BROWSER_KEY` and `MAPS_SERVER_KEY` in `.env`. Document restriction strategy in README.
9. **Wire structured logging**: `structlog` with JSON output, request IDs, ready to ship to Sentry later.
10. **Render deploy**: connect repo, set start command `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. Set env vars. Verify URL.

**Deliverable**: live URL returning "Neighborhood Explorer", `/api/health` ok, `/api/echo-llm` returns model output. Both keys wired. Structured logs in JSON.

**Pitfalls**:

- Render free tier sleeps after 15min idle — first request after sleep is slow (~30s). Acceptable.
- Don't commit `.env` to git. `.gitignore` from day one.
- Confirm `https://api.minimax.io/v1` (NOT `.chat`) — that's the Chinese service and 401s.

---

### Phase 1 — Requirements & Spec (Inception)

**Goal**: a `docs/prd.md` + `docs/design.md` + `docs/data-model.md` + `docs/api.md` set precise enough that an AI agent can generate the UI and backend without further questions.

**AI-SDLC concept**: The spec doc IS the contract between human intent and agent execution. Vague spec → vague code. Precise spec → clean code. **In 2026, AI-SDLC rigor shifts upstream** (LTM SDLC AI Radar 2026): the planning/spec phase gets MORE attention, not less, because the agent has less room to guess.

This phase is **SDD (Spec-Driven Development) in action**: specs first, code second, specs are source of truth. We're doing the discipline manually here for educational value — you see what a good spec actually contains. **GitHub Spec Kit** adoption is deferred to **§14** so we can do a proper deep-dive after v0.1.0 ships.

**Steps:**

1. `docs/prd.md`:
   - Problem statement (1 paragraph)
   - User stories (3-5, in "As a X, I want Y, so Z" format)
   - Acceptance criteria per story (testable conditions)
   - Non-goals (what we're explicitly NOT building)
   - Success metrics (what "done" looks like)
2. `docs/design.md` (text-based wireframes for the agent):
   - One section per screen with: Layout (ASCII), Components, States (loading/empty/error/success), Data, Interactions
   - Component inventory (every UI element we'll build)
3. `docs/data-model.md`:
   - `Neighborhood`, `UserPrefs`, `Comparison` entities with field types
4. `docs/api.md`:
   - `GET /api/neighborhoods/search?q=`
   - `GET /api/neighborhoods/{id}`
   - `POST /api/compare`
   - Request/response JSON examples
5. **Self-review**: re-read each doc, ask "could a junior dev (or agent) build this without asking me a question?" Fix gaps.
6. Commit and push.

**Deliverable**: 4 markdown files committed. These become prompt context for Phases 2-3.

**Pitfalls**:

- Don't over-specify (pixel-perfect ASCII = overkill). Don't under-specify ("a map goes here" → agent guesses).
- Each screen should fit on one printed page. Split if longer.
- Data model must match API contract exactly. Mismatches = bugs in Phase 3.

---

### Phase 2 — Design with Penpot MCP

**Goal**: a real Penpot design for our 3 screens, and a verified end-to-end Penpot MCP → agent → code loop working on at least one component.

**AI-SDLC concept**: **Penpot MCP is the Figma MCP pattern** — same JSON-RPC, same conceptual tools (read design, extract components, write tokens). When you move to enterprise and your team uses Figma, only the MCP server URL changes. The agent's code that calls `mcp__penpot__get_design(file_id)` works against `mcp__figma__get_file(file_key)` unchanged.

This is the MCP abstraction superpower. **Learn it once, swap the vendor forever.**

**Steps:**

1. **Penpot account** (free): sign up at [penpot.app](https://penpot.app), create a team.
2. **Enable MCP**: account → Integrations → MCP Server (Beta) → Enable → Generate MCP Key. Save the URL (it's shown once).
3. **Install Penpot plugin** in your browser: Plugins → Load from URL → `http://localhost:4400/manifest.json` (after starting the local MCP server).
4. **Start the local MCP bridge** (lets the agent talk to your Penpot file):
   ```bash
   npx @penpot/mcp@stable
   ```
5. **Add Penpot MCP to Mavis** in `mcp.json`:
   ```json
   { "penpot": { "url": "https://design.penpot.app/mcp/stream?userToken=YOUR_KEY" } }
   ```
6. **Design the 3 screens** in Penpot (Home, Neighborhood Detail, Compare):
   - Use Penpot's component system to define reusable tokens
   - Use auto-layout for spacing (matches how code will lay out)
   - Apply design tokens (colors, spacing, typography) at the system level
7. **Verify the MCP loop**: prompt Mavis — "Get the home screen layout from my Penpot file and generate the HTML for the hero section." Watch the agent:
   - Call `mcp__penpot__list_files`
   - Call `mcp__penpot__get_design(file_id)`
   - Reason about the structure
   - Write the HTML
   - This is the **design-to-code MCP loop** — same as Figma MCP, same as any future vendor.
8. **Export design tokens** to `docs/design-tokens.json` (Penpot exports this natively). Commit.

**Deliverable**: Penpot file with 3 screens, design tokens JSON in repo, one verified Penpot MCP → code generation.

**Pitfalls**:

- Penpot MCP is Beta — API may change. Pin the version.
- The hosted MCP server requires the file to be **open in your browser** for the agent to read it during the session.
- Self-hosting Penpot MCP (`npx @penpot/mcp@stable`) requires Node 20+ and the local plugin server running. It's two processes — keep both alive.
- Don't use Penpot freehand drawing for the initial design — use rectangles, text, auto-layout. Hand-drawn shapes don't extract cleanly.

---

### Phase 3 — AI Code Generation (Construction)

**Goal**: a working MVP built primarily through Mavis (this assistant) acting as the code agent, with you in the architect role.

**AI-SDLC concept**: How code agents work — context window, file tools, command tools, iter-and-fix loop. Context7 MCP keeps library docs live so the agent doesn't hallucinate APIs.

**Steps:**

1. **Add Context7 MCP** (free, [context7.com](https://context7.com)) — injects version-specific library docs into the agent's context on demand. Prevents "FastAPI doesn't have a `Query()` validator" hallucinations.
2. **Add Sequential Thinking MCP** (free) — helps the agent break complex tasks into structured steps.
3. **Build the backend in this order** (small commits, each ships):
   - `services/maps.py` — Google Places + Distance Matrix wrappers (uses server key)
   - `services/llm.py` — MiniMax wrapper with prompt templates for description + ranking
   - `services/cache.py` — SQLite layer (table `neighborhood_cache`, TTL 7 days)
   - `models/` — Pydantic schemas matching `docs/api.md`
   - `routes/neighborhoods.py` — search, get-by-id (with cache)
   - `routes/compare.py` — LLM-ranked comparison
   - `main.py` — wire it up, CORS for frontend
4. **Build the frontend**:
   - `index.html` — Tailwind CDN, Google Maps JS API script tag (browser key)
   - `app.js` — vanilla JS, fetches backend, hash-based routing, three views
   - `ladle/` — component playground so we can develop components in isolation (alt to Storybook)
5. **Test manually** at each step. Use Mavis to run `uvicorn` and verify endpoints with `curl`.
6. **Commit per logical unit**. Each commit message references which doc from Phase 1 it implements.

**Prompt structure for every agent invocation:**

```
Goal: <one-sentence outcome>
Context: <which files in repo are relevant; reference docs/design.md by path>
Constraints: <stack, libs, no-X-allowed>
Deliverable: <file paths, what they should do>
Test: <how I'll know it works>
```

**Deliverable**: a working MVP on `localhost`, two neighborhoods comparable side-by-side, AI description visible. All endpoints in `docs/api.md` implemented.

**Pitfalls**:

- Agents produce too much code at once. If a prompt yields >200 lines, split it. Smallest atomic change per prompt.
- Agents forget constraints. Restate them in each prompt.
- Agents hallucinate APIs. Context7 MCP solves this — but verify the generated code against actual Google Maps / MiniMax docs anyway.
- No tests yet. Don't run pytest in Phase 3 — that's Phase 5.

---

### Phase 4 — AI Code Review & Security Scan

**Goal**: a clean, PR-ready codebase with no dead code, security smells, or unused imports — verified by automated scans.

**AI-SDLC concept**: Self-review with agents catches a different class of bug than the original generation. Pair it with automated security scanning (Semgrep) for the shift-left security pattern.

**Steps:**

1. **Add Semgrep MCP** (free community rules) — static analysis for security anti-patterns.
2. **Add GitHub Dependabot** — `.github/dependabot.yml` config to scan Python deps weekly.
3. **Run Mavis self-review** on the whole codebase:
   > "Review this codebase like a senior engineer about to merge a PR. Find: dead code, security issues, unused imports, unclear naming, missing error handling, places where the agent cut corners."
4. **Run Semgrep MCP** on the backend:
   > "Scan the backend with the security-audit and python rulesets. Report findings."
5. **Address every finding** in small commits.
6. **Run Semgrep again** — should pass with no critical findings.
7. **Document security posture** in `docs/security.md` — what we scan, what we restrict, what we don't yet cover.

**Deliverable**: Semgrep + Dependabot configs, all findings addressed, `docs/security.md` published.

**Pitfalls**:

- Semgrep community rules produce false positives. Apply judgment — fix real issues, document false positives.
- Don't let the agent rewrite working code for "cleanliness". Review diff carefully.
- API key security is the biggest real risk: confirm both Maps keys are restricted in Google Cloud Console.

---

### Phase 5 — Test Pyramid (unit + integration + E2E + visual + a11y)

**Goal**: a layered test suite covering backend logic, browser behavior, visual regression, and accessibility — with Playwright MCP driving the browser layer.

**AI-SDLC concept**: **Playwright MCP is where the agent loop becomes visible.** You'll watch the agent call `mcp__playwright__navigate(url)`, then `mcp__playwright__snapshot()` to read the accessibility tree, then decide what to click. This is the *same* mechanism the agent uses for Figma/Penpot, just a different MCP server.

**The test pyramid:**

```
           /\
          /  \        E2E + Visual + A11y (Playwright MCP)
         /----\       -10 tests, browser-driven, slow
        /      \
       /--------\     Integration (pytest)
      /----------\    -20 tests, real backend, in-process DB
     /============\   Unit (pytest)
    /--------------\  -50 tests, pure functions, fast
```

**Steps:**

1. **Unit tests** (`backend/tests/unit/`):
   - Maps service mocks (no real API calls)
   - LLM service mocks
   - Cache layer (SQLite, in-memory mode)
2. **Integration tests** (`backend/tests/integration/`):
   - Real FastAPI app via `httpx.AsyncClient`
   - Real SQLite (test DB file)
   - Maps + LLM calls mocked
3. **Install Playwright MCP**: `npx @playwright/mcp@latest` + `npx playwright install chromium`.
4. **E2E tests** (`tests/e2e/*.spec.py`) — write in natural language for MCP:
   - "Open the app, verify the map loads within 5 seconds."
   - "Search 'SoMa San Francisco', verify result card with AI description appears."
   - "Add to compare, pick a second, verify side-by-side rendering."
   - "Set work address, click Compare, verify ranked result with reasoning."
   - "Trigger error case (empty search), verify error UI."
5. **Visual regression** (`tests/visual/*.spec.py`):
   - Use Playwright `await expect(page).toHaveScreenshot()` against `tests/visual/baselines/`.
   - First run creates baselines; subsequent runs diff.
   - Threshold: 0.1% pixel diff tolerance.
6. **Accessibility** (`tests/a11y/*.spec.py`):
   - Use `@axe-core/playwright` on each main screen.
   - Fail on any `serious` or `critical` violation.
7. **Run all via the agent**: prompt Mavis to drive each test file via Playwright MCP. The agent reads the spec, calls MCP tools, reports pass/fail.
8. **CI integration** prep (wired in Phase 6).

**Deliverable**: 80+ tests across all layers, all green, runnable via `pytest backend/tests/` + a single Mavis prompt for E2E.

**Pitfalls**:

- Tests need a running backend for E2E. Use `uvicorn` in test mode with a separate test DB.
- Playwright MCP requires the browser binary. First install ~150MB.
- Visual baselines must be committed to git; otherwise every CI run is "first run" and always passes.
- a11y tests catch things like missing alt text, color contrast. Fix the source, don't silence the test.
- Don't write Playwright tests in Python DSL if MCP is available — natural-language prompts via the agent are more readable.

---

### Phase 6 — CI/CD Pipeline

**Goal**: every push to `main` runs all tests in GitHub Actions and auto-deploys to Render on green.

**AI-SDLC concept**: GitHub Actions is enterprise-grade CI/CD, free for public repos. The same YAML works in any CI system later — GitLab CI, Jenkins, CircleCI differ in syntax but not concepts (checkout → install → test → build → deploy).

**Steps:**

1. `.github/workflows/ci.yml`:
   - On push to any branch: run `pytest backend/tests/`, run Playwright E2E in headless Chromium, run visual regression, run a11y.
   - On push to `main`: same, plus deploy to Render (Render auto-deploys via webhook — we just confirm).
2. `.github/workflows/dependabot.yml` — enable weekly Dependabot PRs.
3. **Required status checks**: in GitHub branch settings, require CI green before merge.
4. **PR template** (`.github/PULL_REQUEST_TEMPLATE.md`) — forces the agent (or human) to fill in: What changed, How tested, Screenshots, Phase reference.
5. **Verify the loop** end-to-end: open a PR, watch Actions run, see green checks, merge, see Render deploy.

**Deliverable**: green CI badge on the repo, PR template, auto-deploy on merge to main.

**Pitfalls**:

- Playwright in CI needs the browser installed: `npx playwright install --with-deps chromium` in the workflow.
- Visual baselines must be committed — diffing against nothing always passes.
- Don't cache pip aggressively without hash pinning — leads to flaky installs.

---

### Phase 7 — Deploy to Production + Observability

**Goal**: live URL on Render, Sentry wired, structured logs shipping, Maps API keys properly restricted, real domain (optional).

**AI-SDLC concept**: 12-factor app config (env vars, not files), observability pillars (logs, errors, metrics), API key security (HTTP referrer for browser, IP restriction for server).

**Steps:**

1. **Render dashboard**: confirm Web Service connected, env vars set:
   - `LLM_API_KEY`, `MAPS_BROWSER_KEY`, `MAPS_SERVER_KEY`, `MAX_LLM_CALLS_PER_DAY=100`, `SENTRY_DSN`.
2. **Google Cloud Console — restrict the browser key**:
   - Application restrictions: HTTP referrers.
   - Add `https://your-app.onrender.com/*` and `http://localhost:*` for dev.
3. **Restrict the server key**:
   - API restrictions: Places API, Distance Matrix API only.
   - IP restrictions: Render's outbound IP range (check Render docs).
4. **Sentry setup** (free tier, 5K events/mo):
   - Create project, get DSN.
   - `pip install sentry-sdk[fastapi]`, init in `main.py`.
   - Test by triggering an error, see it in Sentry dashboard.
5. **Sentry MCP** — configure so the agent can query errors later for Phase 8.
6. **Custom domain** (optional, free via Render's `*.onrender.com` subdomain is default):
   - If you want a real domain: Cloudflare Registrar has $8-12/yr `.dev` domains, but that's optional.
7. **Health check endpoint**: `/api/health` already exists. Add `/api/health/deep` that pings Maps + LLM and returns version info.

**Deliverable**: live URL, fully working, both keys restricted, Sentry wired, deep health check.

**Pitfalls**:

- Render's outbound IPs change occasionally. If Maps errors appear after deploy, re-check the IP allowlist.
- Browser key restriction is case-sensitive on domain. `localhost` ≠ `http://localhost:8000`.
- Sentry free tier soft-caps at 5K events. If we hit it, filter `info`-level logs before sending.
- Free-tier Render sleeps after 15min idle — first request after sleep takes ~30s. Document this in README.

---

### Phase 8 — Documentation & Maintenance Polish

**Goal**: a clean, documented, tag-released v0.1.0 with a README that shows the project working.

**AI-SDLC concept**: Docs-as-code (committed markdown), auto-generated API docs (FastAPI OpenAPI), Architecture Decision Records (ADR) — all enterprise patterns.

**Steps:**

1. **Auto-generated OpenAPI docs**: FastAPI exposes `/docs` and `/openapi.json` for free. Verify they render.
2. **README polish**:
   - What the app does (1 paragraph)
   - Screenshots / GIFs of the working app
   - Quickstart (clone, env, run, deploy)
   - Architecture diagram (ASCII or generated)
   - Phase-by-phase status (link to `PLAN.md`)
3. **Architecture Decision Records** (`docs/adr/`):
   - ADR-001: Why FastAPI + vanilla frontend (vs Next.js)
   - ADR-002: Why Penpot + MCP (vs Figma + MCP)
   - ADR-003: Why SQLite (vs Postgres)
   - ADR-004: Why Sentry free (vs Datadog)
   - Each ADR: Context, Decision, Consequences, Alternatives considered.
4. **Mavis self-review** (Phase 4 pattern) on docs and code:
   > "Find dead code, missing tests, unclear README sections, places where the agent cut corners."
5. **Lighthouse CI** (free, runs in Actions) — score the live URL for performance, a11y, SEO. Target ≥90 on all.
6. **Tag v0.1.0** — `git tag -a v0.1.0 -m "First end-to-end AI-SDLC build"` and push.

**Deliverable**: tagged release `v0.1.0`, Lighthouse ≥90, ADRs committed, polished README with screenshots.

**Pitfalls**:

- Don't let the agent rewrite working code for "cleanliness". Review diff carefully.
- Lighthouse in headless mode can be flaky — run 3 times, take median.
- Screenshots in README: use Playwright MCP to generate them, commit to `docs/img/`.

---

## 8. How MCP Knowledge Transfers to Enterprise

This is the section you'll reference when interviewing for an enterprise role or joining a team that uses Figma.

**Today (Penpot MCP):**

```python
# Agent code (conceptual)
design = mcp__penpot__get_design(file_id="abc123")
components = mcp__penpot__extract_components(design)
html = agent.generate_html(components)
```

**Enterprise (Figma MCP) — same code, different URL:**

```python
# Same agent code, only the MCP server changes
design = mcp__figma__get_file(file_key="xyz789")
components = mcp__figma__extract_components(design)
html = agent.generate_html(components)
```

The **pattern** is the constant. The **vendor URL** is the variable. This is the abstraction MCP gives you.

**Specific transfer scenarios:**

- **Penpot MCP → Figma MCP**: rename tools, swap server config. ~30 min of work.
- **Self-hosted agent → Cursor / Claude Code**: agent code unchanged; you install/configure the same MCP servers in the new agent's `mcp.json`.
- **Playwright MCP**: same server works in any enterprise (it's open source).
- **Semgrep MCP**: same.
- **GitHub MCP → GitLab MCP**: small syntax change in tool names, same pattern.
- **Sentry MCP → Datadog MCP**: same observability patterns, different dashboard.

**What you can put on a resume after this project:**

> "Built a production-style app end-to-end via an AI-SDLC pipeline: Penpot MCP design → agent code generation → Playwright MCP E2E + visual + a11y testing → Semgrep MCP security → GitHub Actions CI/CD → Sentry observability → Render deploy. All free-tier, all swapping 1:1 to enterprise equivalents."

---

## 9. Glossary

- **Agent** — an LLM with a loop and tools. Decides its own next action.
- **Tool** — a single function an agent can call. MCP servers expose tools.
- **MCP** — Model Context Protocol. The standard agents and tools speak to each other.
- **Workflow** — a predefined sequence of steps. Opposite of agent-driven.
- **Context window** — the chunk of text the LLM can "see" at once. Bigger = more aware but slower and more expensive.
- **Context engineering** — what you put in context > how you phrase the prompt.
- **System prompt** — instructions given to the LLM once, defining its role and constraints.
- **Few-shot** — examples in context that guide output style.
- **RAG** — Retrieval Augmented Generation. Fetch facts, then ask LLM to answer using them.
- **TTL** — Time To Live. How long cached data stays fresh.
- **CORS** — Cross-Origin Resource Sharing. Browser security rule configured in FastAPI.
- **HTTP referrer restriction** — Maps API key security: only allow requests from specific domains.
- **ADR** — Architecture Decision Record. Markdown file capturing a decision's context, choice, and consequences.
- **12-factor app** — set of principles for cloud-native apps (env-var config, stateless processes, disposability, etc.).
- **Shift-left security** — finding security issues earlier in the SDLC (in code review / Semgrep) instead of after deploy.

---

## 10. References & Reading (from research, July 2026)

**AI-SDLC frameworks & primers:**

- PwC "Agentic SDLC in practice" (2026) — [pwc.com](https://www.pwc.com/m1/en/publications/2026/docs/future-of-solutions-dev-and-delivery-in-the-rise-of-gen-ai.pdf)
- LTM "SDLC AI Radar 2026" — [ltm.com](https://www.ltm.com/insights/reports/sdlc-ai-radar-2026)
- Brillio "System-wide AI Orchestration" (2026) — [brillio.com](https://www.brillio.com/wp-content/uploads/2026/05/System_wide_AI_orchestration_not_copilots_transforms_the_SDLC.pdf)
- Wizr "Enterprise AI Software Development Best Practices" — [wizr.ai](https://wizr.ai/blogs/enterprise-ai-software-development-guide/)
- Microsoft "AI-led SDLC with Semantic Kernel" — [techcommunity.microsoft.com](https://techcommunity.microsoft.com/blog/appsonazureblog/an-ai-led-sdlc-building-an-end-to-end-agentic-software-development-lifecycle-wit/4491896)

**MCP:**

- Penpot MCP (our Figma alternative) — [penpot.app/ai/mcp-server](https://penpot.app/ai/mcp-server), [help.penpot.app/mcp](https://help.penpot.app/mcp/)
- Penpot MCP complete reference — [github.com/mrf0xvn/penpot-mcp-guide](https://github.com/mrf0xvn/penpot-mcp-guide)
- Free MCP server directory — [skillsindex.dev](https://skillsindex.dev/blog/free-mcp-servers-open-source-2026/), [mcp.directory](https://mcp.directory/blog/best-free-mcp-servers)

**Visual regression:**

- Playwright `toHaveScreenshot()` docs (built-in)
- BackstopJS — [github.com/garris/BackstopJS](https://github.com/garris/BackstopJS)
- Best free visual testing tools 2026 — [delta-qa.com](https://delta-qa.com/en/blog/free-visual-testing-tools-comparison/)

**Other tools:**

- Context7 (live library docs in MCP) — [context7.com](https://context7.com)
- Semgrep MCP — [semgrep.dev](https://semgrep.dev)
- axe-core / @axe-core/playwright — [github.com/dequelabs/axe-core](https://github.com/dequelabs/axe-core)
- Sentry free tier — [sentry.io](https://sentry.io)
- Render free tier — [render.com](https://render.com)
- Penpot design tool — [penpot.app](https://penpot.app)

**MiniMax API patterns** (cached in your Mavis memory): `~/.mavis/agents/mavis/memory/llm-api-patterns.md`

---

## 11. How to Use This Document

- **Read §5 once** before Phase 0.
- **Re-skim the relevant Phase section** before starting it.
- **Update this file** as we discover things. It's a living doc, not a fixed spec.
- **§2 and §8** are your "interview cheat sheet" — bookmark them.

---

## 12. Status Tracker

| Phase | Status | Notes |
|---|---|---|
| 0 — Foundations & deploy skeleton | not started | |
| 1 — Requirements & spec | not started | |
| 2 — Design with Penpot MCP | not started | |
| 3 — AI code generation | not started | |
| 4 — AI code review + security scan | not started | |
| 5 — Test pyramid | not started | |
| 6 — CI/CD pipeline | not started | |
| 7 — Deploy + observability | not started | |
| 8 — Docs + polish | not started | |
| 14 — Spec Kit deep-dive (extension) | deferred | Scheduled after v0.1.0 |

---

## 13. Concepts: How AI-SDLC, SDD, TDD, and Frameworks Relate

A cheat sheet for terminology you'll encounter in enterprise AI-SDLC work. Read once, reference when confused.

| Concept | What it is | Where it fits | How we use it here |
|---|---|---|---|
| **AI-SDLC** | Lifecycle with AI agents at every phase (ideation → design → code → test → deploy → maintain) | The umbrella methodology | PLAN.md §5 — our 9-phase plan |
| **SDD** (Spec-Driven Development) | Spec-first discipline: write specs before code, specs are the source of truth | Inception + Construction (Phases 1-3) | Phase 1 — our `prd.md`, `design.md`, `data-model.md`, `api.md` ARE the specs. Agent reads them in Phase 3 to generate code. |
| **TDD** (Test-Driven Development) | Test-first discipline: write failing test, make it pass, refactor | Testing (Phase 5) | We do test-*alongside* in Phase 5, not strict TDD. Strict TDD is less common in AI-SDLC because the agent generates both code and tests together. |
| **BDD** (Behavior-Driven Development) | Behavior-first using natural-language scenarios ("Given X, When Y, Then Z") | Testing (Phase 5) | Playwright MCP test scripts in Phase 5 are essentially BDD in natural language. |
| **MCP** (Model Context Protocol) | Open standard that lets LLMs call tools in a structured way | Every phase that touches a tool | PLAN.md §6 — wired up across the whole pipeline |
| **Agent loop** | Observe → think → act → observe (the execution pattern) | Every agent-driven phase | PLAN.md §5.2 — runs hundreds of times per phase |
| **Context engineering** | Choosing what goes in the agent's context window (vs prompt wording tricks) | Every phase | PLAN.md §5.5 |
| **BMAD-METHOD** | Process framework with explicit PM/Architect/Dev/QA agent roles | Optional process overlay | Not adopted — adds ceremony without clear value at our scale |
| **GitHub Spec Kit** | SDD tooling with `/speckit.specify`, `/speckit.plan`, `/speckit.tasks` slash commands | Construction (Phases 1-3) | **Deferred to §14 deep-dive** |

### Quick mental model

```
┌─────────────────────────────────────────────────────────────┐
│  AI-SDLC (the umbrella methodology)                         │
│                                                             │
│  Inception ── Design ── Code ── Test ── Deploy ── Maintain  │
│      │                                                     │
│      │  SDD discipline applied here (specs first)          │
│      │  →  GitHub Spec Kit is the tool that formalizes SDD │
│      │                                                     │
│      │  TDD discipline applied here (tests first)          │
│      │  →  BDD when tests are natural-language scenarios   │
│      │                                                     │
│      └──── MCP + Agent loop + Context engineering ─────────│
│             run through every phase                        │
└─────────────────────────────────────────────────────────────┘
```

When someone says "we do AI-SDLC", ask: "What methodology at each phase?" If they answer "Spec Kit for specs, Playwright for E2E, Semgrep for security, GitHub Actions for CI", you've heard the modern enterprise stack.

---

## 14. Future Extension: GitHub Spec Kit Deep Dive

Status: **deferred — to be scheduled after Phase 8 ships v0.1.0**.

GitHub Spec Kit ([github.com/github/spec-kit](https://github.com/github/spec-kit)) is the industry-standard SDD tooling in 2026. It formalizes the spec-first discipline with slash commands and a structured spec format. Big teams (GitHub itself, Microsoft, many Fortune 500) use it to scale SDD across hundreds of engineers — when you interview at these places, familiarity with Spec Kit is table stakes.

### Why we deferred it from Phase 1

- We're doing SDD manually (markdown specs in repo) for educational value — you see what a good spec contains, no abstraction hiding it.
- Spec Kit adds setup overhead and a new tool to learn. Better as a focused deep-dive than a quick add-on.
- Manual SDD builds the muscle memory that makes Spec Kit's automation feel like a tool you understand, not magic.

### What the deep-dive will cover

1. **Install Spec Kit CLI**: `uv tool install specify-cli` (or `pip install specify-cli`).
2. **Init in the repo**: `specify init` scaffolds `.specify/` with templates for spec, plan, tasks.
3. **Replace Phase 1 workflow with Spec Kit slash commands**:
   - `/speckit.specify` — turns a one-paragraph feature description into a structured spec (problem, users, requirements, acceptance criteria).
   - `/speckit.plan` — turns the spec into an implementation plan (architecture, file structure, libraries).
   - `/speckit.tasks` — turns the plan into a numbered task list with dependencies.
4. **Compare side-by-side**: re-run Phase 1 manually vs Spec Kit. Document where the tool helped, where it over-abstracted, where you preferred the manual approach.
5. **Migrate one phase end-to-end**: use Spec Kit to add a new feature post-v0.1.0 (e.g., "saved comparisons" or "neighborhood watchlist"). Spec Kit is best learned by using it on a real feature, not a toy.
6. **Build the muscle memory**: practice the slash commands until they feel natural. Practice writing specs that the slash commands accept cleanly.

### Pre-requisites before starting

- Phase 0-8 shipped (v0.1.0 tagged)
- Working understanding of what specs need to contain (which Phase 1 teaches)
- Some enterprise context: how does your target employer use Spec Kit? What conventions do they enforce in specs?

### Trigger conditions

Start the deep-dive when ALL of these are true:
- v0.1.0 is shipped and stable
- You have 2-3 hours of focused time available
- You want to add a new feature to the app (concrete need beats toy example)

### What "done" looks like for §14

- `.specify/` directory committed with templates customized for our project.
- At least one new feature shipped end-to-end via `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → code → tests.
- A retro doc (`docs/adr/00X-spec-kit-retro.md`) comparing manual vs Spec Kit workflows with your honest take on when to use which.