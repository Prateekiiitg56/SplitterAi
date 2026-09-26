"""Execution graph: workers -> synthesis -> verification -> repair loop."""

import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.config import ExecutionConfig
from agentcli.graph import run_graph
from agentcli.prompts import SYNTHESIZER_SYSTEM, VERIFIER_SYSTEM
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, Plan, RunStatus, Subtask, SubtaskStatus
from agentcli.worker import AgentWorker


def fake_run(verdicts, seen):
    """Workers succeed; the verifier returns the next verdict from `verdicts`."""
    async def run(self, subtask):
        seen.append((subtask.id, self.system_prompt, subtask.instruction))
        subtask.status = SubtaskStatus.success
        if self.system_prompt == VERIFIER_SYSTEM:
            subtask.output = f"checked\nVERDICT: {verdicts.pop(0)}\n- api.py: login returns 500"
        elif self.system_prompt == SYNTHESIZER_SYSTEM:
            subtask.output = "built api and ui"
        else:
            subtask.output = f"done {subtask.id}"
        subtask.duration_ms = 10
        return subtask
    return run


def plan():
    return Plan(subtasks=[
        Subtask(id="api", role=AgentRole.coder, group=1, instruction="build api"),
        Subtask(id="ui", role=AgentRole.coder, group=1, instruction="build ui"),
    ])


async def execute(verdicts, preset="balanced"):
    seen = []
    with tempfile.TemporaryDirectory() as tmp, patch.object(AgentWorker, "run", fake_run(verdicts, seen)):
        result = await run_graph("make app", plan(), ExecutionConfig(), Sandbox(Path(tmp)), preset=preset)
    return result, seen


@pytest.mark.asyncio
async def test_pass_runs_workers_then_synthesis_then_verify():
    result, seen = await execute(["PASS"])
    assert [s.id for s in result.subtasks] == ["api", "ui", "synthesize", "verify"]
    assert result.status == RunStatus.done
    assert result.verification == {"verdict": "pass", "issues": "", "repair_rounds": 0}
    assert result.synthesis == "built api and ui"
    synth_input = next(i for sid, _, i in seen if sid == "synthesize")
    assert "done api" in synth_input and "done ui" in synth_input


@pytest.mark.asyncio
async def test_fail_triggers_repair_then_reverify():
    result, seen = await execute(["FAIL", "PASS"])
    assert [s.id for s in result.subtasks] == ["api", "ui", "synthesize", "verify", "repair-1", "verify-2"]
    assert [s.group for s in result.subtasks] == [1, 1, 2, 3, 4, 5]
    assert result.subtasks[-1].instruction == "Check the workspace against the task contract"
    assert result.verification["verdict"] == "pass"
    assert result.verification["repair_rounds"] == 1
    repair_input = next(i for sid, _, i in seen if sid == "repair-1")
    assert "login returns 500" in repair_input


@pytest.mark.asyncio
async def test_repair_budget_is_respected():
    result, _ = await execute(["FAIL", "FAIL"], preset="balanced")
    assert result.verification["repair_rounds"] == 1
    assert result.verification["verdict"] == "fail"
    assert result.status == RunStatus.error

    result, _ = await execute(["FAIL"], preset="cost")
    assert result.verification["repair_rounds"] == 0
    assert result.status == RunStatus.error


@pytest.mark.asyncio
async def test_workers_receive_the_task_contract():
    _, seen = await execute(["PASS"])
    worker_ids = {sid for sid, prompt, _ in seen if prompt not in (SYNTHESIZER_SYSTEM, VERIFIER_SYSTEM)}
    assert worker_ids == {"api", "ui"}


@pytest.mark.asyncio
async def test_worker_message_includes_contract(tmp_path):
    from unittest.mock import AsyncMock
    worker = AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path), context="TASK:\nbook library homepage")
    call = AsyncMock(return_value={"content": "done", "model": "m"})
    with patch("agentcli.worker.call_model", call):
        await worker.run(Subtask(id="t1", role=AgentRole.coder, group=1, instruction="write styles.css"))
    user_msg = call.call_args.kwargs["messages"][1]["content"]
    assert "book library homepage" in user_msg and "YOUR ASSIGNMENT [t1]" in user_msg


def test_shell_output_is_utf8_and_caches_stay_out_of_workspace(tmp_path):
    from agentcli.tools import run_shell
    sandbox = Sandbox(tmp_path)
    out = run_shell(sandbox, 'python -c "import sys; sys.stdout.buffer.write(\'caf\u00e9 \u2713\'.encode())"')
    assert "café ✓" in out
    out = run_shell(sandbox, 'python -c "import os; print(os.environ[\'APPDATA\']); print(os.environ[\'TEMP\'])"')
    assert str(tmp_path) not in out
    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_coder_that_only_chats_is_pushed_to_write_files(tmp_path):
    from unittest.mock import AsyncMock
    write = {"content": "", "model": "m", "tool_calls": [{"id": "c1", "type": "function", "function": {
        "name": "write_file", "arguments": '{"path": "index.html", "content": "<h1>Library</h1>"}'}}]}
    replies = [{"content": "<html>...</html>", "model": "m"}, write, {"content": "saved index.html", "model": "m"}]
    call = AsyncMock(side_effect=replies)
    with patch("agentcli.worker.call_model", call):
        st = await AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path)).run(
            Subtask(id="t1", role=AgentRole.coder, group=1, instruction="write index.html"))
    assert st.status == SubtaskStatus.success
    assert (tmp_path / "index.html").read_text() == "<h1>Library</h1>"
    assert st.output == "saved index.html"


@pytest.mark.asyncio
async def test_coder_nudges_are_bounded(tmp_path):
    from unittest.mock import AsyncMock
    call = AsyncMock(return_value={"content": "here is the code", "model": "m"})
    with patch("agentcli.worker.call_model", call):
        st = await AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path)).run(
            Subtask(id="t1", role=AgentRole.coder, group=1, instruction="write index.html"))
    assert call.await_count == 3
    assert st.status == SubtaskStatus.error
    assert st.error == "Finished without writing any file"


def test_models_whose_subtasks_fail_drop_down_the_chain():
    from agentcli import telemetry
    from agentcli.models import select_chain
    first = select_chain("coding", "balanced")[0]
    for _ in range(5):
        telemetry.record_subtask("coder", "coding", "m", first, 100, 1.0, 1, False)
    assert select_chain("coding", "balanced")[-1] == first


def test_coders_whose_runs_fail_verification_drop_down_the_chain():
    from agentcli import telemetry
    from agentcli.models import select_chain
    first = select_chain("coding", "balanced")[0]
    for _ in range(3):
        telemetry.record_run({"worker_models": [first], "verdict": "fail"})
    assert select_chain("coding", "balanced")[0] != first


def test_malformed_tool_call_returns_error_to_model(tmp_path):
    from agentcli.tools import execute_tool
    assert "missing required argument 'path'" in execute_tool(Sandbox(tmp_path), "write_file", {"content": "x"})


@pytest.mark.asyncio
async def test_reverify_sees_what_the_repair_did():
    _, seen = await execute(["FAIL", "PASS"])
    reverify = next(i for sid, _, i in seen if sid == "verify-2")
    assert "BEFORE these repair rounds" in reverify
    assert "repair-1: done repair-1" in reverify


def test_node_install_without_workspace_package_json_is_refused(tmp_path):
    from agentcli.tools import run_shell
    sandbox = Sandbox(tmp_path)
    assert run_shell(sandbox, "npm install jest").startswith("Refused")
    assert run_shell(sandbox, "npm i -D puppeteer && npm test").startswith("Refused")
    (tmp_path / "package.json").write_text("{}")
    assert not run_shell(sandbox, "npm install --dry-run --offline left-pad").startswith("Refused")


def _write(path, content, cid="c1"):
    import json as _json
    return {"content": "", "model": "m", "tool_calls": [{"id": cid, "type": "function", "function": {
        "name": "write_file", "arguments": _json.dumps({"path": path, "content": content})}}]}


def _read(path, cid="r1"):
    import json as _json
    return {"content": "", "model": "m", "tool_calls": [{"id": cid, "type": "function", "function": {
        "name": "read_file", "arguments": _json.dumps({"path": path})}}]}


@pytest.mark.asyncio
async def test_unread_existing_file_is_not_overwritten(tmp_path):
    from unittest.mock import AsyncMock
    (tmp_path / "styles.css").write_text("body { color: red; } .grid { display: grid; }")
    replies = [_write("styles.css", ".contact { padding: 1rem; }"), _read("styles.css"),
               _write("styles.css", "body { color: red; } .grid { display: grid; } .contact { padding: 1rem; }", "c2"),
               {"content": "styled contact", "model": "m"}]
    call = AsyncMock(side_effect=replies)
    with patch("agentcli.worker.call_model", call):
        st = await AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path)).run(
            Subtask(id="t1", role=AgentRole.coder, group=1, instruction="style #contact"))
    tool_results = [m["content"] for m in call.call_args.kwargs["messages"] if m["role"] == "tool"]
    assert tool_results[0].startswith("Refused: styles.css already exists")
    assert ".grid { display: grid; }" in (tmp_path / "styles.css").read_text()
    assert ".contact" in (tmp_path / "styles.css").read_text()
    assert st.status == SubtaskStatus.success


@pytest.mark.asyncio
async def test_new_files_can_be_written_and_rewritten(tmp_path):
    from unittest.mock import AsyncMock
    replies = [_write("app.js", "v1"), _write("app.js", "v2", "c2"), {"content": "done", "model": "m"}]
    with patch("agentcli.worker.call_model", AsyncMock(side_effect=replies)):
        await AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path)).run(
            Subtask(id="t1", role=AgentRole.coder, group=1, instruction="write app.js"))
    assert (tmp_path / "app.js").read_text() == "v2"


def test_run_python_runs_multiline_scripts_without_touching_workspace(tmp_path):
    from agentcli.tools import execute_tool
    (tmp_path / "books.json").write_text('[{"t": "a"}, {"t": "b"}]')
    code = "import json\nfor b in json.load(open('books.json')):\n    print(b['t'])\n"
    out = execute_tool(Sandbox(tmp_path), "run_python", {"code": code})
    assert out.startswith("Exit code: 0") and "a" in out and "b" in out
    assert sorted(p.name for p in tmp_path.iterdir()) == ["books.json"]
