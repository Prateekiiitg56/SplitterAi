"""Live coordinator: bridges parallel workers through the team board while they run."""

import asyncio
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import coordinator
from agentcli.board import COORDINATOR, Board
from agentcli.config import ExecutionConfig
from agentcli.graph import run_graph
from agentcli.prompts import COORDINATOR_SYSTEM, VERIFIER_SYSTEM
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, Plan, RunStatus, Subtask


def tool_call(name, **args):
    return {"content": "", "tool_calls": [
        {"id": f"c-{name}", "type": "function", "function": {"name": name, "arguments": json.dumps(args)}}
    ]}


def test_board_routes_messages():
    board = Board()
    board.post("html", "wrote index.html", to=COORDINATOR, file="index.html")
    board.post("html", "display id is #screen")
    board.post(COORDINATOR, "use #screen", to="js")
    assert [m.text for m in board.unread("js")] == ["display id is #screen", "use #screen"]
    assert board.unread("js") == []
    assert board.unread("html") == []  # never its own notes, never others' directives
    assert [m.file for m in board.unread(COORDINATOR)] == ["index.html", None]


@pytest.mark.asyncio
async def test_coordinator_bridges_running_workers():
    seen_by_js = []

    async def fake_model(messages, model_chain, role, config, tools=None, on_event=None, use_cache=True):
        system, text = messages[0]["content"], "\n".join(str(m.get("content")) for m in messages[1:])
        if system == COORDINATOR_SYSTEM:
            assert 'id="screen"' in text  # the coordinator sees the file content
            return {"content": "TO js: the display element is #screen, not #display"}
        if system == VERIFIER_SYSTEM:
            return {"content": "VERDICT: PASS"}
        if "YOUR ASSIGNMENT [html]" in text:
            if not any(m["role"] == "tool" for m in messages):
                return tool_call("write_file", path="index.html", content='<div id="screen"></div>')
            return {"content": "html done"}
        if "YOUR ASSIGNMENT [js]" in text:
            if "#screen" in text:
                seen_by_js.append(text)
                if not any("app.js" in str(m.get("content")) for m in messages if m["role"] == "tool"):
                    return tool_call("write_file", path="app.js", content="document.querySelector('#screen')")
                return {"content": "js done"}
            await asyncio.sleep(0.05)  # still working when the coordinator speaks
            return tool_call("list_directory", path=".")
        return {"content": "summary"}

    plan = Plan(subtasks=[
        Subtask(id="html", role=AgentRole.coder, group=1, instruction="build markup"),
        Subtask(id="js", role=AgentRole.coder, group=1, instruction="build logic"),
    ])
    config = ExecutionConfig()
    config.max_concurrent_agents = 2
    config.max_steps = 40
    with tempfile.TemporaryDirectory() as tmp, \
            patch("agentcli.worker.call_model", fake_model), \
            patch("agentcli.coordinator.call_model", fake_model), \
            patch.object(coordinator, "DEBOUNCE_S", 0.01):
        result = await run_graph("calculator", plan, config, Sandbox(Path(tmp)))
        written = (Path(tmp) / "app.js").read_text()

    assert seen_by_js and "TEAM MESSAGES" in seen_by_js[0]
    assert "#screen" in written
    assert result.status == RunStatus.done
