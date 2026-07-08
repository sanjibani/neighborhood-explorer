"""
SQLite cache layer for Neighborhood profiles.

This is a thin wrapper around sqlite3 with these patterns:
- JSON-blob storage (Neighborhood serialized as JSON in a TEXT column)
- Per-id primary key (Neighborhood.id is a URL-safe slug)
- TTL helper for vibe cache (caller decides whether to regenerate)

Why JSON-blob instead of normalized columns:
- Neighborhood has nested arrays (parks_data, schools_data, vibe)
- Normalizing would need 3+ tables and joins
- For 10 neighborhoods and hundreds of requests/day, the JSON-blob is
  faster to read, write, and seed from JSON
- Easy to migrate to Postgres JSONB columns later if needed

Trade-off acknowledged:
- Render free tier disk is ephemeral (DB resets on every deploy)
- Phase 8 will add persistent disk or move to Postgres
- For v0.1, we re-seed from backend/data/neighborhoods_seed.json on startup

Anti-pattern intentionally avoided: storing vibes in a separate table joined
by neighborhood_id. That's premature optimization for our scale.
"""
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import structlog

from backend.models.neighborhood import Neighborhood

log = structlog.get_logger(__name__)

VIBE_CACHE_TTL_DAYS = 7
DB_PATH_DEFAULT = "backend/data/neighborhoods.db"


class NeighborhoodCache:
    """SQLite-backed cache for Neighborhood profiles.
    
    Usage:
        cache = NeighborhoodCache()
        nb = cache.get("indiranagar-bangalore-ka")
        if nb and cache.is_vibe_expired(nb):
            # regenerate vibe via LLM, then:
            cache.upsert(updated_nb)
    """

    def __init__(self, db_path: str | None = None) -> None:
        """Open or create the cache. Auto-creates parent dir + schema."""
        self.db_path = db_path or os.getenv("NEIGHBORHOOD_DB_PATH", DB_PATH_DEFAULT)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        log.info("cache.initialized", db_path=self.db_path)

    def _connect(self) -> sqlite3.Connection:
        """Open a connection. Caller is responsible for closing (use with)."""
        return sqlite3.connect(self.db_path)

    def _init_schema(self) -> None:
        """Create the table if it doesn't exist. Idempotent."""
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS neighborhood_cache (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    cached_at TEXT NOT NULL
                )
            """)

    # ──────── CRUD ────────

    def get(self, neighborhood_id: str) -> Neighborhood | None:
        """Fetch a neighborhood by id. Returns None if not present."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT data FROM neighborhood_cache WHERE id = ?",
                (neighborhood_id,),
            ).fetchone()
        if not row:
            log.info("cache.miss", id=neighborhood_id)
            return None
        log.info("cache.hit", id=neighborhood_id)
        return Neighborhood.model_validate_json(row[0])

    def search(self, query: str, limit: int = 10) -> list[Neighborhood]:
        """Search by name OR id substring. Uses SQLite JSON1 to extract
        fields from the JSON blob. Ordered by name.
        """
        q = query.lower()
        like = f"%{q}%"
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT data FROM neighborhood_cache
                WHERE LOWER(json_extract(data, "$.name")) LIKE ?
                   OR LOWER(json_extract(data, "$.id"))    LIKE ?
                ORDER BY json_extract(data, "$.name")
                LIMIT ?
                """,
                (like, like, limit),
            ).fetchall()
        return [Neighborhood.model_validate_json(row[0]) for row in rows]

    def list_all(self) -> list[Neighborhood]:
        """Return all neighborhoods, ordered by name. Used by /api/compare."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT data FROM neighborhood_cache ORDER BY json_extract(data, '$.name')"
            ).fetchall()
        return [Neighborhood.model_validate_json(row[0]) for row in rows]

    def upsert(self, neighborhood: Neighborhood) -> None:
        """Insert or replace. The Pydantic model is serialized to JSON."""
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO neighborhood_cache (id, data, cached_at)
                VALUES (?, ?, ?)
                """,
                (
                    neighborhood.id,
                    neighborhood.model_dump_json(),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
        log.info("cache.upsert", id=neighborhood.id)

    def bulk_insert(self, neighborhoods: list[Neighborhood]) -> int:
        """Seed bulk. Idempotent (uses INSERT OR IGNORE).
        
        Used at startup to load backend/data/neighborhoods_seed.json.
        Returns count of rows that were newly inserted (skips duplicates).
        """
        inserted = 0
        with self._connect() as conn:
            for n in neighborhoods:
                try:
                    cur = conn.execute(
                        "INSERT OR IGNORE INTO neighborhood_cache (id, data, cached_at) VALUES (?, ?, ?)",
                        (n.id, n.model_dump_json(), datetime.now(timezone.utc).isoformat()),
                    )
                    inserted += cur.rowcount
                except Exception as exc:
                    log.warning("cache.bulk_insert_failed", id=n.id, error=str(exc))
        log.info("cache.bulk_insert", inserted=inserted, total=len(neighborhoods))
        return inserted

    def count(self) -> int:
        with self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM neighborhood_cache").fetchone()[0]

    def clear(self) -> None:
        """Wipe all rows. Useful for tests + dev iteration."""
        with self._connect() as conn:
            conn.execute("DELETE FROM neighborhood_cache")
        log.warning("cache.cleared")

    # ──────── Cache helpers ────────

    @staticmethod
    def is_vibe_expired(neighborhood: Neighborhood, ttl_days: int = VIBE_CACHE_TTL_DAYS) -> bool:
        """Return True if the cached vibe is older than ttl_days.
        
        The route layer checks this and triggers regeneration via LLM service.
        """
        # Pydantic v2 ensures vibe_generated_at is timezone-aware
        age = datetime.now(timezone.utc) - neighborhood.vibe.vibe_generated_at
        return age > timedelta(days=ttl_days)
