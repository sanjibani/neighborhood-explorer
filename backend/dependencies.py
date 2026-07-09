"""
FastAPI dependencies shared across routes.

Currently exposes the NeighborhoodCache as a singleton via Depends. This keeps
state management out of route modules and makes it trivial to swap in a
different cache backend (Postgres, Redis, in-memory) for tests later.
"""
from functools import lru_cache

from backend.services.cache import NeighborhoodCache


@lru_cache(maxsize=1)
def get_cache() -> NeighborhoodCache:
    """Return the process-wide NeighborhoodCache singleton.

    lru_cache gives us a single instance per process (it's a SQLite DB on disk
    anyway, so multiple instances would just point at the same file).
    """
    return NeighborhoodCache()