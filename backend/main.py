"""
Neighborhood Explorer — FastAPI entry point.

AI-SDLC Phase 0: minimal deployable skeleton.
- Structured JSON logging via structlog
- Health + echo-llm endpoints
- MiniMax client wired via backend.services.llm
- Frontend served as static files from /frontend
"""
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

from backend.routes import echo, health
from backend.services.logging import configure_logging, get_logger

configure_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(
        "neighborhood_explorer.startup",
        env=os.getenv("APP_ENV", "development"),
        version="0.1.0",
    )
    yield
    log.info("neighborhood_explorer.shutdown")


app = FastAPI(
    title="Neighborhood Explorer API",
    description="AI-SDLC learning project — neighborhood comparison tool.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — permissive in dev, locked down by domain in Phase 7.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(echo.router)


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