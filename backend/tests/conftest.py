import pytest

import agentcli.db_supabase as db_supabase


@pytest.fixture(autouse=True)
def isolated_history(tmp_path, monkeypatch):
    """Keep tests from reading or writing the real execution history, session DB or Supabase project."""
    monkeypatch.setenv("SPLITTER_HISTORY_PATH", str(tmp_path / "history.jsonl"))
    monkeypatch.setenv("SPLITTER_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setattr(db_supabase, "_client_initialized", True)
    monkeypatch.setattr(db_supabase, "_supabase_client", None)
