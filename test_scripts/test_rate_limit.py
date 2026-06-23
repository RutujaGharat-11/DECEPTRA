"""
test_scripts/test_rate_limit.py
--------------------------------
Verifies daily scan rate limiting without starting a real Flask server.

Tests:
  1. First 5 scans are allowed.
  2. 6th scan is blocked (allowed=False).
  3. Limit resets automatically after the 24-hour window passes.

Run from the project root:
    python -m pytest test_scripts/test_rate_limit.py -v
or:
    python test_scripts/test_rate_limit.py
"""

import os
import sqlite3
import sys
import tempfile
import time
import unittest

# ---------------------------------------------------------------------------
# Make sure project root is on the path so backend.rate_limiter resolves.
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# Redirect the rate limiter to a *temporary* DB so tests never touch auth.db.
# ---------------------------------------------------------------------------
import backend.rate_limiter as rl_module  # noqa: E402 – import after path patch

_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
rl_module.DB_PATH = _tmp_db.name  # patch before any table is created

from backend.rate_limiter import (  # noqa: E402
    SCAN_LIMIT,
    WINDOW_SECONDS,
    check_and_record_scan,
    init_rate_limit_table,
)


def _inject_old_record(identifier: str, age_seconds: float) -> None:
    """Insert a scan record that is `age_seconds` old (for reset tests)."""
    conn = sqlite3.connect(rl_module.DB_PATH)
    conn.execute(
        "INSERT INTO scan_rate_limits (identifier, scanned_at) VALUES (?, ?)",
        (identifier, time.time() - age_seconds),
    )
    conn.commit()
    conn.close()


def _clear_identifier(identifier: str) -> None:
    conn = sqlite3.connect(rl_module.DB_PATH)
    conn.execute("DELETE FROM scan_rate_limits WHERE identifier = ?", (identifier,))
    conn.commit()
    conn.close()


class TestRateLimiter(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_rate_limit_table()

    def setUp(self):
        # Use a unique identifier per test to keep tests isolated.
        self._id = f"ip:127.0.0.{id(self) % 200}"
        _clear_identifier(self._id)

    # ------------------------------------------------------------------
    # Test 1 – first 5 scans succeed
    # ------------------------------------------------------------------
    def test_first_five_scans_allowed(self):
        for i in range(1, SCAN_LIMIT + 1):
            result = check_and_record_scan(self._id)
            self.assertTrue(
                result["allowed"],
                f"Scan {i} should be allowed but was blocked.",
            )
            self.assertEqual(result["count"], i)
            self.assertEqual(result["limit"], SCAN_LIMIT)

    # ------------------------------------------------------------------
    # Test 2 – 6th scan returns allowed=False (maps to HTTP 429)
    # ------------------------------------------------------------------
    def test_sixth_scan_blocked(self):
        for _ in range(SCAN_LIMIT):
            check_and_record_scan(self._id)

        result = check_and_record_scan(self._id)
        self.assertFalse(result["allowed"], "6th scan should be blocked.")
        self.assertEqual(result["count"], SCAN_LIMIT)

    # ------------------------------------------------------------------
    # Test 3 – limit resets after 24 hours
    # ------------------------------------------------------------------
    def test_limit_resets_after_24_hours(self):
        # Saturate the limit with records that are 25 hours old (expired).
        for _ in range(SCAN_LIMIT):
            _inject_old_record(self._id, age_seconds=WINDOW_SECONDS + 3600)

        # A fresh scan should now be allowed because all old records expire.
        result = check_and_record_scan(self._id)
        self.assertTrue(
            result["allowed"],
            "Scan should be allowed after the 24-hour window has passed.",
        )
        self.assertEqual(result["count"], 1)

    # ------------------------------------------------------------------
    # Test 4 – mixed old + recent; old ones don't count toward the limit
    # ------------------------------------------------------------------
    def test_expired_records_do_not_count(self):
        # 3 expired records (should not count toward the limit).
        for _ in range(3):
            _inject_old_record(self._id, age_seconds=WINDOW_SECONDS + 1)

        # 5 fresh records — fills the limit exactly; all should be allowed.
        for i in range(1, SCAN_LIMIT + 1):
            result = check_and_record_scan(self._id)
            self.assertTrue(result["allowed"], f"Fresh scan {i} should be allowed.")

        # 6th fresh scan (limit exhausted) should be blocked.
        result = check_and_record_scan(self._id)
        self.assertFalse(result["allowed"], "6th scan should be blocked after limit is exhausted.")

    # ------------------------------------------------------------------
    # Test 5 – different identifiers are tracked independently
    # ------------------------------------------------------------------
    def test_identifiers_are_independent(self):
        id_a = f"ip:10.0.0.1_{id(self)}"
        id_b = f"ip:10.0.0.2_{id(self)}"
        _clear_identifier(id_a)
        _clear_identifier(id_b)

        # Saturate id_a.
        for _ in range(SCAN_LIMIT):
            check_and_record_scan(id_a)

        # id_b should still be allowed.
        result = check_and_record_scan(id_b)
        self.assertTrue(result["allowed"], "id_b should not be affected by id_a's limit.")

    @classmethod
    def tearDownClass(cls):
        try:
            os.unlink(_tmp_db.name)
        except OSError:
            pass


if __name__ == "__main__":
    unittest.main(verbosity=2)
