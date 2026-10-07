"""Server-side trust boundaries: project folders only, health without secrets, CORS rule, cancel kills commands."""

import importlib
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import workspace_import
import server


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    generated, imported = (tmp_path / "workspace_output").resolve(), (tmp_path / "imports").resolve()
    generated.mkdir()
    imported.mkdir()
    monkeypatch.setattr(server, "PROJECTS_ROOT", generated)
    monkeypatch.setattr(workspace_import, "DEFAULT_WORKSPACES_ROOT", imported)
    monkeypatch.setattr(server, "resolve_workspace", lambda w: str(
        w if Path(w).is_absolute() else generated if w == "./workspace_output" else generated / Path(w).name))
    c = TestClient(server.app)
    c.generated, c.imported = generated, imported
    return c


def test_runs_and_files_only_accept_project_folders(client):
    outside = Path(tempfile.gettempdir()).resolve()
    assert client.post("/runs", json={"task": "x", "workspace": str(outside)}).status_code == 400
    assert client.get("/files", params={"workspace": str(outside)}).status_code == 400
    assert client.get("/files", params={"workspace": str(Path(server.__file__).parent)}).status_code == 400
    (client.imported / "upload-1").mkdir()
    (client.imported / "upload-1" / "a.txt").write_text("a")
    assert client.get("/files", params={"workspace": str(client.imported / "upload-1")}).json()[0]["name"] == "a.txt"


def test_deleting_an_imported_project_removes_its_folder(client):
    folder = client.imported / "upload-2"
    folder.mkdir()
    with patch.object(server, "reset_session", lambda w: True):
        assert client.delete("/sessions", params={"workspace": str(folder)}).status_code == 200
        assert not folder.exists()
        # Never a root itself.
        client.delete("/sessions", params={"workspace": str(client.imported)})
        assert client.imported.exists()


def test_health_reports_setup_without_secrets(client, monkeypatch):
    for name in ("GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_ALT", "OPENROUTER_API_KEY",
                 "OPENROUTER_SUPER_KEY", "OPENROUTER_ULTRA_KEY", "OPENROUTER_KEY_BIG", "OPENROUTER_KEY_REASON",
                 "OPENROUTER_KEY_VISION", "OPENROUTER_KEY_CODE", "OPENROUTER_KEY_FAST", "XAI_GROK_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.delenv("SPLITTER_FAKE_LLM", raising=False)
    body = client.get("/health").json()
    assert body["llm_ready"] is False and body["llm_keys"]["gemini"] is False
    assert {"version", "uptime_s", "sandbox"} <= body.keys()
    monkeypatch.setenv("GEMINI_API_KEY", "secret-value")
    body = client.get("/health").json()
    assert body["llm_ready"] is True and "secret-value" not in str(body)


def test_production_requires_explicit_origins(monkeypatch):
    monkeypatch.setenv("SPLITTER_ENV", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    with pytest.raises(RuntimeError, match="ALLOWED_ORIGINS"):
        importlib.reload(server)
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://dashboard.example")
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="SHARED_SECRET"):
        importlib.reload(server)
    monkeypatch.setenv("SPLITTER_ENV", "development")
    importlib.reload(server)


def test_cancel_kills_running_commands(client):
    import asyncio
    killed = []

    async def slow_graph(*a, **k):
        await asyncio.sleep(30)

    async def analysis(task, config, **kwargs):
        from agentcli.schemas import AgentRole, Plan, Subtask
        return Plan(subtasks=[Subtask(id="t", role=AgentRole.coder, group=1, instruction="x")]), {}

    with patch.object(server, "run_graph", slow_graph), patch.object(server, "run_analysis", analysis), \
            patch.object(server, "kill_processes", lambda ws: killed.append(ws) or 2), \
            patch.object(server, "save_run_result", lambda *a: None), TestClient(server.app) as c:
        res = c.post("/runs", json={"task": "x", "workspace": "./workspace_output"})
        assert res.status_code == 200, res.text
        run_id = res.json()["run_id"]
        import time
        for _ in range(100):
            if c.get(f"/runs/{run_id}").json()["status"] == "executing":
                break
            time.sleep(0.02)
        c.post(f"/runs/{run_id}/cancel")
        for _ in range(100):
            body = c.get(f"/runs/{run_id}").json()
            if body["status"] == "cancelled":
                break
            time.sleep(0.02)
    assert killed and killed[0].parent == client.generated
    assert any("stopped 2 running command" in log["message"] for log in body["logs"])


def test_stores_share_one_connection_and_set_up_the_schema_once(monkeypatch):
    from agentcli import db, session
    calls = []
    real = session._init_schema
    monkeypatch.setattr(session, "_init_schema", lambda conn: calls.append(1) or real(conn))
    with session._connection() as first, session._connection() as second:
        assert first is second
    session.list_sessions()
    assert len(calls) == 1


def test_agent_detail_reports_real_history(client):
    from agentcli import telemetry
    assert client.get("/agents/coder").json()["successRate"] is None
    telemetry.record_subtask("coder", "coding", "s", "m", 100, 2.0, 3, True)
    telemetry.record_subtask("coder", "coding", "s", "m", 100, 2.0, 4, False)
    body = client.get("/agents/coder").json()
    assert body["subtasks"] == 2 and body["successRate"] == 50 and body["steps"] == 7 and body["lastActive"]
    assert client.get("/agents/nobody").status_code == 404
