import pytest


@pytest.fixture(autouse=True)
def isolated_history(tmp_path, monkeypatch):
    """Keep tests from reading or writing the real execution history."""
    monkeypatch.setenv("SPLITTER_HISTORY_PATH", str(tmp_path / "history.jsonl"))
