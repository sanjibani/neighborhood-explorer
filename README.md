# Neighborhood Explorer

An AI-SDLC learning project — a neighborhood comparison tool built end-to-end through an agent-driven pipeline.

## What it does

Search or click any neighborhood on a map, get AI-generated vibe descriptions, compare commute times, and rank by your priorities (commute vs vibe vs walkability).

## How it's built

This project is the deliverable for learning the **modern AI-SDLC pipeline** — every phase from design to deploy uses AI agents and the [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

See **[PLAN.md](./PLAN.md)** for the full phase-by-phase plan with concept primers and free-tool-to-enterprise-tool mapping.

## Stack (all free-tier)

- **Backend**: FastAPI + Python 3.14
- **Frontend**: Vanilla HTML + Tailwind (CDN)
- **Design**: [Penpot](https://penpot.app) via Penpot MCP
- **Maps**: Google Maps JavaScript API + Places + Distance Matrix
- **LLM**: [MiniMax](https://api.minimax.io) (`MiniMax-Text-01`)
- **Tests**: Playwright MCP + pytest + axe-core
- **Security**: Semgrep MCP + Dependabot
- **CI/CD**: GitHub Actions
- **Observability**: Sentry free tier + structured JSON logs
- **Hosting**: Render.com free tier

## Local dev

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env  # then fill in keys
uvicorn backend.main:app --reload
```

Open http://localhost:8000

## Project structure

```
backend/        FastAPI app, services, routes, models
frontend/       Static HTML/JS/CSS served by FastAPI
tests/          e2e/, visual/, a11y/ test suites
docs/           Specs, ADRs, architecture
.github/        CI workflows
PLAN.md         The 9-phase learning plan
```

## Phase progress

See [PLAN.md §12 Status Tracker](./PLAN.md#12-status-tracker).

## License

MIT