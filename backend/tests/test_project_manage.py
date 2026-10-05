"""Project rename and delete: PATCH/DELETE /sessions."""

import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import db, session
from agentcli.schemas import RunStatus
import server


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    with tempfile.TemporaryDirectory() as tmp, \
            patch.object(session, "_get_db_path", lambda: Path(tmp) / "sessions.db"), \
            patch.object(session, "is_supabase_enabled", lambda: False):
        yield TestClient(server.app)
        db.close_all()  # release sessions.db so the temporary folder can be removed


def names(client):
    return {s["workspace"]: s["name"] for s in client.get("/sessions").json()}


def test_rename_survives_later_runs(client):
    session.save_session("./calc", "build a calculator", RunStatus.done)
    assert client.patch("/sessions", json={"workspace": "./calc", "name": "  Calculator  "}).status_code == 200
    session.save_session("./calc", "make it prettier", RunStatus.done)
    assert names(client) == {"./calc": "Calculator"}


def test_rename_validation(client):
    assert client.patch("/sessions", json={"workspace": "./nope", "name": "x"}).status_code == 404
    session.save_session("./calc", "t", RunStatus.done)
    assert client.patch("/sessions", json={"workspace": "./calc", "name": "   "}).status_code == 400


def test_delete_removes_only_that_project(client):
    session.save_session("./a", "a", RunStatus.done)
    session.save_session("./b", "b", RunStatus.done)
    assert client.delete("/sessions", params={"workspace": "./a"}).status_code == 200
    assert list(names(client)) == ["./b"]
    assert client.delete("/sessions", params={"workspace": "./a"}).status_code == 404
