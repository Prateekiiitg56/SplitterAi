"""Chat: per-role prompts (designer included), hand-off hint, streaming, and model-failure details."""

import json
import sys
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.router import AllModelsFailedError
import server


def test_designer_has_its_own_prompt_and_chat_points_to_run_as_task(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    seen = {}

    async def fake(messages, model_chain, role, config, **k):
        seen["system"], seen["chain"] = messages[0]["content"], model_chain
        return {"content": "use more contrast", "model": "m"}

    with patch.object(server, "call_model", fake):
        body = TestClient(server.app).post("/chat", json={"role": "designer", "message": "is this readable?", "model": "pinned"}).json()
    assert body["reply"] == "use more contrast"
    assert "Designer Agent" in seen["system"] and "Run as task" in seen["system"]
    assert seen["chain"][0] == "pinned"


def test_failed_chat_lists_every_model_tried(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)

    async def broken(*a, **k):
        raise AllModelsFailedError([{"model": "m1", "error": "429 quota"}, {"model": "m2", "error": "timeout"}])

    with patch.object(server, "call_model", broken):
        res = TestClient(server.app).post("/chat", json={"message": "hi"})
    assert res.status_code == 502 and [a["model"] for a in res.json()["detail"]["attempts"]] == ["m1", "m2"]
    assert TestClient(server.app).post("/chat", json={"message": "hi", "role": "nope"}).status_code == 400


def test_chat_streams_tokens(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    monkeypatch.setenv("SPLITTER_FAKE_LLM", "1")
    with TestClient(server.app).stream("POST", "/chat/stream", json={"message": "what is a closure?"}) as res:
        events = [json.loads(line[len("data: "):]) for line in res.iter_lines() if line.startswith("data: ")]
    assert len(events) > 2 and events[-1]["done"] is True
    assert "what is a closure?" in "".join(e.get("delta", "") for e in events)
