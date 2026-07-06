"""Health check endpoints — basic liveness and readiness."""
import os

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "0.1.0",
        "env": os.getenv("APP_ENV", "development"),
    }


@router.get("/api/health/deep")
async def health_deep():
    """Deep health — verifies external service config is present (Phase 7 pings them too)."""
    maps_browser = os.getenv("MAPS_BROWSER_KEY", "")
    maps_server = os.getenv("MAPS_SERVER_KEY", "")
    return {
        "status": "ok",
        "version": "0.1.0",
        "checks": {
            "llm_configured": bool(os.getenv("LLM_API_KEY")),
            "maps_browser_configured": bool(maps_browser) and maps_browser != "placeholder-set-in-phase-7",
            "maps_server_configured": bool(maps_server) and maps_server != "placeholder-set-in-phase-7",
        },
    }