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
- (Add new entries as we discover more.)