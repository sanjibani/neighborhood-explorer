"""
SQLite cache layer for neighborhood descriptions.

Phase 0: placeholder. Real schema + queries in Phase 3.
"""
import structlog

log = structlog.get_logger(__name__)


def cache_stub() -> dict:
    log.warning("cache.stub_called")
    return {"status": "stub", "note": "SQLite cache ships in Phase 3"}