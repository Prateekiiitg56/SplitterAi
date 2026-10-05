"""Async run API: POST /runs, GET /runs/{id}, cancel, run-scoped events, blocking /run wrapper."""

import asyncio
import sys
import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import runs
from agentcli.schemas import AgentRole, LogEntry, LogType, Plan, RunResult, Subtask
import server


def plan():
    return Plan(subtasks=[Subtask(id="t1", role=AgentRole.coder, group=1, instruction="write it")])


async def fake_analysis(task, config, **kwargs):
    return plan(), {}


async def quick_graph(task, plan, config, sandbox, on_event, preset="balanced", design=""):
    on_event(LogEntry(type=LogType.info, message="working"))
    # Events can also come from worker threads.
    t = threading.Thread(target=on_event, args=(LogEntry(type=LogType.info, message="from thread"),))
    t.start()
    t.join()
    await asyncio.sleep(0.01)
    return RunResult(subtasks=plan.subtasks)


async def slow_graph(task, plan, config, sandbox, on_event, preset="balanced", design=""):
    await asyncio.sleep(30)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    saved = []
    sent = []

    async def capture(data):
        sent.append(data)

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp).resolve()
        with patch.object(server, "PROJECTS_ROOT", root), \
                patch.object(server, "resolve_workspace", lambda w: str(root if w == "./workspace_output" else root / Path(w).name)), \
                patch.object(server, "run_analysis", fake_analysis), \
                patch.object(server, "save_run_result", lambda *a: saved.append(a)), \
                patch.object(server.manager, "broadcast", capture), \
                TestClient(server.app) as c:
            c.saved, c.sent = saved, sent
            yield c


def wait_for(client, run_id, statuses, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        body = client.get(f"/runs/{run_id}").json()
        if body["status"] in statuses:
            return body
        time.sleep(0.02)
    raise AssertionError(f"run never reached {statuses}: {body['status']}")


def test_post_runs_returns_immediately_and_status_resyncs(client):
    with patch.object(server, "run_graph", quick_graph):
        start = client.post("/runs", json={"task": "build a todo app", "workspace": "./workspace_output"}).json()
        assert start["run_id"] and start["workspace"].startswith("./workspace_output/build-a-todo-app-")
        body = wait_for(client, start["run_id"], {"done"})

    assert body["result"]["run_id"] == start["run_id"]
    assert {"working", "from thread"} <= {log["message"] for log in body["logs"]}
    assert all(log["run_id"] == start["run_id"] and log["workspace"] == start["workspace"] for log in body["logs"])
    # Every WebSocket message (logs, plan, complete) is tagged with the run and workspace.
    assert {m.get("type") for m in client.sent} >= {"plan", "complete", "info"}
    assert all(m["run_id"] == start["run_id"] and m["workspace"] == start["workspace"] for m in client.sent)
    # The finished result is persisted with its log.
    workspace, task, result, logs = client.saved[0]
    assert result.run_id == start["run_id"] and logs


def test_invalid_strategy_is_rejected_before_any_model_call(client):
    called = []

    async def analysis(*a, **k):
        called.append(1)
        return plan(), {}

    with patch.object(server, "run_analysis", analysis):
        res = client.post("/runs", json={"task": "x", "workspace": "./workspace_output", "strategy": "bogus"})
    assert res.status_code == 400 and not called


def test_run_without_subtasks_plans_with_run_analysis(client):
    seen = {}

    async def analysis(task, config, **kwargs):
        seen["guidance"] = kwargs.get("guidance")
        return plan(), {}

    with patch.object(server, "run_analysis", analysis), patch.object(server, "run_graph", quick_graph):
        start = client.post("/runs", json={"task": "a python script", "workspace": "./workspace_output"}).json()
        wait_for(client, start["run_id"], {"done"})
    assert "guidance" in seen


def test_cancel_stops_the_run(client):
    with patch.object(server, "run_graph", slow_graph):
        start = client.post("/runs", json={"task": "slow", "workspace": "./workspace_output"}).json()
        wait_for(client, start["run_id"], {"executing"})
        assert client.post(f"/runs/{start['run_id']}/cancel").status_code == 200
        body = wait_for(client, start["run_id"], {"cancelled"})
    assert body["result"]["error"] == "Cancelled by user"
    assert client.post(f"/runs/{start['run_id']}/cancel").status_code == 409
    assert client.post("/runs/nope/cancel").status_code == 404


def test_crashing_run_reports_error(client):
    async def broken(*a, **k):
        raise RuntimeError("all models failed")

    with patch.object(server, "run_graph", broken):
        start = client.post("/runs", json={"task": "x", "workspace": "./workspace_output"}).json()
        body = wait_for(client, start["run_id"], {"error"})
    assert "all models failed" in body["result"]["error"]


def test_blocking_run_wrapper_returns_result(client):
    with patch.object(server, "run_graph", quick_graph):
        body = client.post("/run", json={"task": "x", "workspace": "./workspace_output"}).json()
    assert body["status"] == "done" and body["run_id"]


def test_finished_runs_are_read_back_from_history(client):
    with patch.object(server, "load_run", lambda rid: {"run_id": rid, "status": "done"} if rid == "old" else None):
        assert client.get("/runs/old").json()["status"] == "done"
        assert client.get("/runs/missing").status_code == 404


def test_registry_keeps_active_runs_and_caps_finished():
    runs._RUNS.clear()
    active = runs.create("w", "t")
    for _ in range(runs.MAX_FINISHED + 5):
        runs.create("w", "t").status = "done"
    runs.prune()
    assert runs.get(active.id) and len(runs._RUNS) == runs.MAX_FINISHED + 1
    runs._RUNS.clear()
