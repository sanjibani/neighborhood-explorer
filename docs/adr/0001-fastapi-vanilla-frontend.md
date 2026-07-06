# ADR-0001: FastAPI + Vanilla HTML/JS frontend (no React/Next.js)

- **Status**: Accepted
- **Date**: 2026-07-06
- **Phase**: 0

## Context

The neighborhood explorer needs a web frontend. The natural choice in 2026 would be Next.js or Vite + React. We evaluated whether to use a framework or stay vanilla.

## Decision

Use **vanilla HTML + Tailwind (CDN) + plain JS** served by FastAPI as static files. No build step. No `node_modules`.

## Consequences

**Positive:**

- Single deploy artifact (one process, one Render web service).
- No build pipeline, no JS framework ceremony, faster iterations.
- AI-SDLC focus stays on the agent loop and MCP, not framework quirks.
- Tailwind via CDN is enough for our UI surface.

**Negative:**

- No SPA routing (we use hash-based routing in `app.js` when needed in Phase 3).
- No SSR (acceptable for an internal tool).
- Harder to scale frontend complexity past ~10 components.

## Alternatives considered

- **Next.js**: Better DX for complex UIs, but adds a build step, npm deps, and a separate deploy. Overkill at our scope.
- **Vite + React**: Lighter than Next, but still requires npm + build pipeline.
- **HTMX + Jinja**: Server-rendered, modern twist on classic. Interesting but adds template engine complexity.

## When to revisit

If we ever ship features like real-time collaboration, deep client state, or >10 components with shared logic — migrate to a framework. Backend API stays the same; the migration is a frontend-only rewrite.