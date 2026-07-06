"""
Google Maps wrapper.

Phase 0: placeholder. Real Places + Distance Matrix integration in Phase 3.
Phase 7: keys restricted by HTTP referrer (browser) and IP (server).
"""
import structlog

log = structlog.get_logger(__name__)


def maps_stub() -> dict:
    log.warning("maps.stub_called")
    return {"status": "stub", "note": "Maps integration ships in Phase 3"}