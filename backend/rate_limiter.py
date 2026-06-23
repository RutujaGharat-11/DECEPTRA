"""
backend/rate_limiter.py
-----------------------
SQLite-backed rolling 24-hour rate limiter for Deceptra scan endpoints.

Design notes:
- Uses the existing auth.db so no extra infrastructure is needed.
- Exclusive transactions + WAL mode keep counts accurate across multiple
  gunicorn workers on Railway.
- Expired rows are pruned inline; no background job required.
"""

import logging
import os
import sqlite3
import time

logger = logging.getLogger(__name__)

SCAN_LIMIT = 5
WINDOW_SECONDS = 24 * 60 * 60  # 24 hours rolling

# Resolved relative to this file so it works from any cwd.
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "auth.db")


# ---------------------------------------------------------------------------
# Schema bootstrap
# ---------------------------------------------------------------------------

def init_rate_limit_table() -> None:
    """Create scan_rate_limits table and index (idempotent)."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scan_rate_limits (
            identifier TEXT NOT NULL,
            scanned_at REAL NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
        ON scan_rate_limits (identifier)
        """
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Core check-and-record
# ---------------------------------------------------------------------------

def _purge_expired(cur: sqlite3.Cursor, identifier: str, now: float) -> None:
    """Delete rows outside the rolling window for this identifier."""
    cutoff = now - WINDOW_SECONDS
    cur.execute(
        "DELETE FROM scan_rate_limits WHERE identifier = ? AND scanned_at < ?",
        (identifier, cutoff),
    )


def check_and_record_scan(identifier: str) -> dict:
    """
    Atomically check quota and record a new scan attempt.

    Returns:
        {
            "allowed": bool,
            "count":   int,   # scans used in current window
            "limit":   int,   # SCAN_LIMIT constant
        }

    Thread/process safe: uses EXCLUSIVE transaction + WAL so multiple
    gunicorn workers on Railway cannot double-count.
    """
    now = time.time()
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    try:
        conn.execute("BEGIN EXCLUSIVE")
        _purge_expired(cur, identifier, now)

        cur.execute(
            "SELECT COUNT(*) FROM scan_rate_limits WHERE identifier = ?",
            (identifier,),
        )
        count = cur.fetchone()[0]

        if count >= SCAN_LIMIT:
            conn.rollback()
            logger.warning(
                "RATE_LIMIT_REACHED | identifier=%s scan_count=%d limit=%d",
                identifier,
                count,
                SCAN_LIMIT,
            )
            return {"allowed": False, "count": count, "limit": SCAN_LIMIT}

        cur.execute(
            "INSERT INTO scan_rate_limits (identifier, scanned_at) VALUES (?, ?)",
            (identifier, now),
        )
        conn.commit()
        new_count = count + 1
        logger.info(
            "SCAN_RECORDED | identifier=%s scan_count=%d limit=%d",
            identifier,
            new_count,
            SCAN_LIMIT,
        )
        return {"allowed": True, "count": new_count, "limit": SCAN_LIMIT}

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Identifier resolution
# ---------------------------------------------------------------------------

def get_scan_identifier(request, user) -> str:
    """
    Return the rate-limit key for this request:
      - authenticated session user  → "user:<user_id>"
      - Clerk JWT user (future)     → "user:<clerk_id>"   (pass user dict with 'id')
      - anonymous                   → "ip:<client_ip>"

    Respects X-Forwarded-For set by Railway's proxy so the correct
    originating IP is used even behind a load balancer.
    """
    if user and user.get("id"):
        return f"user:{user['id']}"

    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "unknown")
    return f"ip:{ip}"
