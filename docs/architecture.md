# Architecture

## High-level

```
Browser (vanilla JS + Tailwind via CDN)
   │  HTTP /api/*
   ▼
FastAPI backend (Python 3.14)
   ├── routes/         HTTP endpoints
   ├── services/       Maps, LLM, cache, logging wrappers
   ├── models/         Pydantic schemas (Phase 3)
   └── data/           SQLite cache file (Phase 3)
   │
   ├──► MiniMax API (LLM)
   └──► Google Maps APIs (Places, Distance Matrix — Phase 3)
```

## Key decisions

- See [ADRs](./adr/) for the rationale behind each choice.
- [ADR-0001](./adr/0001-fastapi-vanilla-frontend.md): FastAPI + vanilla frontend over Next.js.

## Request lifecycle

1. Request arrives at FastAPI.
2. `structlog` binds a request ID for the trace.
3. Route handler validates input via Pydantic.
4. Service layer calls external APIs (Maps, LLM) or cache.
5. Response serialized to JSON.
6. Structured log line emitted with status, latency, request ID.

## Observability

- All logs are JSON to stdout (parsed by Render, Sentry will capture in Phase 7).
- Each log line carries the event name + structured key-value fields.
- Errors logged with `exc_info=True` so Sentry can capture full tracebacks.

## Security

- All secrets in env vars (never committed; `.env` is gitignored).
- API key restrictions enforced at Phase 7 (HTTP referrer for browser key, IP for server key).
- Input validation at the Pydantic boundary.
- Semgrep MCP + Dependabot in Phase 4.