"""Unit tests for Supabase Database & Storage adapter in SplitterAI."""

import os
import sys
import unittest
from pathlib import Path

# Ensure backend root is on sys.path for importing agentcli
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.db_supabase import (
    is_supabase_enabled,
    get_supabase_client,
    get_storage_bucket_name,
    supabase_save_session,
    supabase_load_session,
    supabase_reset_session,
    supabase_upload_file,
    supabase_download_file,
)
from agentcli.schemas import RunStatus
from agentcli.session import save_session, load_session, reset_session, list_sessions
from agentcli.integrations_store import save_integration, load_all_integrations, delete_integration


class TestSupabaseIntegration(unittest.TestCase):
    def test_supabase_disabled_by_default_when_no_keys(self):
        """When SUPABASE_URL and SUPABASE_KEY are unset, returns False without crashing."""
        orig_url = os.environ.pop("SUPABASE_URL", None)
        orig_key = os.environ.pop("SUPABASE_KEY", None)

        try:
            # Force re-check
            import agentcli.db_supabase as db_sp
            db_sp._client_initialized = False
            db_sp._supabase_client = None

            self.assertFalse(is_supabase_enabled())
            self.assertIsNone(get_supabase_client())
            self.assertFalse(supabase_save_session("test_ws", "task", "done"))
            self.assertIsNone(supabase_load_session("test_ws"))
            self.assertFalse(supabase_reset_session("test_ws"))
            self.assertIsNone(supabase_upload_file("test.txt", "content"))
            self.assertIsNone(supabase_download_file("test.txt"))
        finally:
            if orig_url:
                os.environ["SUPABASE_URL"] = orig_url
            if orig_key:
                os.environ["SUPABASE_KEY"] = orig_key

    def test_bucket_name_resolution(self):
        """Bucket name defaults to 'workspace-artifacts'."""
        self.assertEqual(get_storage_bucket_name(), "workspace-artifacts")

    def test_session_dual_storage_fallback(self):
        """Save and load session via session API with SQLite fallback active."""
        test_ws = "./test_supabase_fallback_ws"
        save_session(test_ws, "Build responsive header", RunStatus.done, subtask_count=3)
        loaded = load_session(test_ws)

        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["workspace"], test_ws)
        self.assertEqual(loaded["task"], "Build responsive header")
        self.assertEqual(loaded["status"], "done")
        self.assertEqual(loaded["subtask_count"], 3)

        sessions = list_sessions(limit=10)
        workspaces = [s.workspace for s in sessions]
        self.assertIn(test_ws, workspaces)

        res = reset_session(test_ws)
        self.assertTrue(res)
        self.assertIsNone(load_session(test_ws))

    def test_integrations_dual_storage_fallback(self):
        """Save and load integration via integrations_store API."""
        integ = {
            "id": "supabase-test-int",
            "type": "postgres",
            "name": "Test Supabase DB",
            "status": "connected",
            "connectedAt": "10:00 AM",
            "config": {"host": "localhost", "port": 5432},
            "scopes": ["read", "write"],
            "allowedRoles": ["planner", "coder"],
        }
        save_integration(integ)

        all_int = load_all_integrations()
        self.assertIn("supabase-test-int", all_int)
        self.assertEqual(all_int["supabase-test-int"]["name"], "Test Supabase DB")

        del_res = delete_integration("supabase-test-int")
        self.assertTrue(del_res)
        all_int_after = load_all_integrations()
        self.assertNotIn("supabase-test-int", all_int_after)


if __name__ == "__main__":
    unittest.main()
