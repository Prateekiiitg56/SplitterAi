"""Unit tests for Module B5 (Workspace Retention) and Module B6 (Persistence Resilience).

Tests retention cleanup of expired workspaces and SQLite table column schema migration safety.
"""

import os
import sqlite3
import sys
import tempfile
import time
import unittest
from pathlib import Path

# Ensure backend root is on sys.path for importing agentcli
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.integrations_store import _run_migrations as run_int_migrations
from agentcli.session import _run_migrations as run_session_migrations
from agentcli.workspace_import import cleanup_expired_workspaces


class TestWorkspaceAndPersistence(unittest.TestCase):
    def test_workspace_retention_cleanup(self):
        with tempfile.TemporaryDirectory(prefix="ws_clean_") as tmpdir:
            root = Path(tmpdir)

            # Create an expired workspace (mtime 10 days ago)
            old_ws = root / "ws-old12345678"
            old_ws.mkdir()
            (old_ws / "file.txt").write_text("old data", encoding="utf-8")
            old_time = time.time() - (10 * 86400)
            os.utime(old_ws, (old_time, old_time))

            # Create a fresh workspace (mtime now)
            fresh_ws = root / "ws-fresh876543"
            fresh_ws.mkdir()
            (fresh_ws / "file.txt").write_text("fresh data", encoding="utf-8")

            # Execute retention cleanup (7 days TTL)
            deleted_count, freed_bytes = cleanup_expired_workspaces(
                max_age_seconds=7 * 86400, workspaces_root=root
            )

            self.assertEqual(deleted_count, 1)
            self.assertGreater(freed_bytes, 0)
            self.assertFalse(old_ws.exists())
            self.assertTrue(fresh_ws.exists())

    def test_sqlite_schema_migration_session(self):
        conn = sqlite3.connect(":memory:")
        # Create legacy table missing subtask_count and created_at columns
        conn.execute("""
            CREATE TABLE sessions (
                workspace TEXT PRIMARY KEY,
                task TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'idle',
                messages_json TEXT NOT NULL DEFAULT '[]',
                updated_at REAL NOT NULL DEFAULT 0
            )
        """)
        conn.commit()

        # Run migration
        run_session_migrations(conn)

        # Verify missing columns were safely added
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(sessions)")
        cols = {row[1] for row in cursor.fetchall()}
        self.assertIn("subtask_count", cols)
        self.assertIn("created_at", cols)

    def test_sqlite_schema_migration_integrations(self):
        conn = sqlite3.connect(":memory:")
        # Create legacy table missing allowed_roles_json column
        conn.execute("""
            CREATE TABLE integrations (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'connected',
                connected_at TEXT NOT NULL DEFAULT '',
                config_json TEXT NOT NULL DEFAULT '{}',
                scopes_json TEXT NOT NULL DEFAULT '[]',
                last_error TEXT
            )
        """)
        conn.commit()

        # Run migration
        run_int_migrations(conn)

        # Verify missing column was safely added
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(integrations)")
        cols = {row[1] for row in cursor.fetchall()}
        self.assertIn("allowed_roles_json", cols)


if __name__ == "__main__":
    unittest.main()
