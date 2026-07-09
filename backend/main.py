"""
Neighborhood Explorer — FastAPI entry point.

AI-SDLC Phase 3: full neighborhood + compare routes wired up.
- Structured JSON logging via structlog
- Health, echo-llm, neighborhoods, compare endpoints
- MiniMax client wired via backend.services.llm
- Frontend served as static files from /frontend
- Seed JSON bulk-inserted into SQLite cache on startup (idempotent)
"""
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (or any parent dir). In production (Render), env
# vars come from the dashboard; load_dotenv is a no-op when no .env is present.
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.dependencies import get_cache
from backend.models.neighborhood import Neighborhood
from backend.routes import compare, echo, health, neighborhoods
from backend.services.cache import NeighborhoodCache
from backend.services.logging import configure_logging, get_logger

configure_logging()
log = get_logger(__name__)


SEED_PATH = Path(__file__).parent / "data" / "neighborhoods_seed.json"


def _seed_if_empty(cache: NeighborhoodCache) -> int:
    """Load seed JSON and bulk-insert into the cache iff the table is empty.

    Why gated on count(): Render free tier has ephemeral disk, so the DB resets
    on every deploy. Re-seeding from a JSON file (instead of a migrations table
    or a backup/restore step) keeps v0.1 dead simple. Phase 8 will replace this
    with Postgres + a proper migrations story.
    """
    if cache.count() > 0:
        log.info("seed.skipped", reason="cache already populated", current=cache.count())
        return 0
    if not SEED_PATH.exists():
        log.warning("seed.skipped", reason="seed file missing", path=str(SEED_PATH))
        return 0
    with open(SEED_PATH) as f:
        raw = json.load(f)
    items = [Neighborhood(**entry) for entry in raw]
    inserted = cache.bulk_insert(items)
    log.info("seed.complete", inserted=inserted, source=str(SEED_PATH))
    return inserted


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(
        "neighborhood_explorer.startup",
        env=os.getenv("APP_ENV", "development"),
        version="0.1.0",
    )
    # Seed the SQLite cache on boot. Idempotent: count() > 0 skips re-seed.
    try:
        cache = get_cache()  # same singleton the routes use via Depends
        _seed_if_empty(cache)
    except Exception as exc:
        # Never block app startup on a seed failure. Routes will 404 until seeded,
        # which is loud enough to catch in smoke tests.
        log.error("seed.failed", error=str(exc), exc_info=True)
    yield
    log.info("neighborhood_explorer.shutdown")


app = FastAPI(
    title="Neighborhood Explorer API",
    description="AI-SDLC learning project: neighborhood comparison tool.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: permissive in dev, locked down by domain in Phase 7.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(echo.router)
app.include_router(neighborhoods.router)
app.include_router(compare.router)


# Serve the frontend as static files. Mounted last so API routes match first.
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.error(
        "unhandled_exception",
        path=request.url.path,
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "message": str(exc)},
    )