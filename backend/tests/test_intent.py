"""POST /intent: task vs chat routing for console messages."""

import io
import sys
import zipfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import intent
from agentcli.session import list_sessions
import server


def model_says(content):
    async def fake(messages, *a, **k):
        return {"content": content}
    return fake


@pytest.mark.parametrize("message", [
    "make me a todo app", "write a python script that renames files", "fix the bug in app.js",
    "add dark mode", "Can you build a landing page?",
])
def test_heuristic_treats_instructions_as_tasks(message):
    assert intent.heuristic_intent(message)["intent"] == "task"


def test_heuristic_treats_questions_as_chat():
    assert intent.heuristic_intent("what is the difference between let and var?")["intent"] == "chat"


async def test_model_verdict_is_used():
    with patch.object(intent, "call_model", model_says('{"intent": "chat", "confidence": 0.9}')):
        assert await intent.classify_intent("make sense of this error for me") == {"intent": "chat", "confidence": 0.9}


async def test_falls_back_to_task_for_instructions_when_model_fails():
    async def broken(*a, **k):
        raise RuntimeError("all models failed")

    with patch.object(intent, "call_model", broken):
        assert (await intent.classify_intent("make a todo app with dark mode"))["intent"] == "task"
    with patch.object(intent, "call_model", model_says("not json")):
        assert (await intent.classify_intent("add a clear button"))["intent"] == "task"


async def test_unsure_chat_for_an_instruction_stays_a_task():
    with patch.object(intent, "call_model", model_says('{"intent": "chat", "confidence": 0.4}')):
        assert (await intent.classify_intent("build a calculator"))["intent"] == "task"


def test_intent_endpoint(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    with patch.object(intent, "call_model", model_says('{"intent": "task", "confidence": 0.95}')):
        body = TestClient(server.app).post("/intent", json={"message": "make a todo app"}).json()
    assert body == {"intent": "task", "confidence": 0.95}


def test_uploaded_workspace_becomes_a_project(monkeypatch, tmp_path):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("site/index.html", "<h1>hi</h1>")
    from agentcli import workspace_import
    monkeypatch.setattr(workspace_import, "DEFAULT_WORKSPACES_ROOT", tmp_path / "imports")
    res = TestClient(server.app).post("/workspaces/upload", files={"file": ("site.zip", buf.getvalue(), "application/zip")})
    assert res.status_code == 200
    workspace = res.json()["workspace"]
    assert any(s.workspace == workspace for s in list_sessions())
