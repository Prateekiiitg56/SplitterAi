"""Shell isolation: escape detection, bubblewrap sandbox, process-tree kill, sandbox_block events."""

import json
import os
import sys
import threading
import time
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import tools
from agentcli.config import ExecutionConfig
from agentcli.sandbox import Sandbox, SandboxEscapeError
from agentcli.schemas import AgentRole, LogType, Subtask
from agentcli.worker import AgentWorker


def bwrap_available() -> bool:
    return tools._bwrap_works(tuple(tools._bwrap_prefix()))


needs_bwrap = pytest.mark.skipif(not bwrap_available(), reason="bubblewrap sandbox not available")


@pytest.mark.parametrize("command", [
    "cat ../../.env", "ls ..", "cat ~/.agentcli/sessions.db", "type C:\\Users\\me\\.env",
    "cat /mnt/c/secret", "rm -rf ../", "cp x ../../y",
])
def test_commands_reaching_outside_the_workspace_are_blocked(tmp_path, command):
    with pytest.raises(SandboxEscapeError):
        tools.run_shell(Sandbox(tmp_path), command)


@pytest.mark.parametrize("command", ["cat src/../index.html", "ls ./src", "npm run build", "python main.py --n=20"])
def test_normal_commands_are_not_blocked(command):
    assert tools._escaping_reference(command) is None


async def test_blocked_command_is_logged_as_sandbox_block(tmp_path):
    events, calls = [], []

    async def fake_model(messages, **kwargs):
        calls.append(1)
        if len(calls) == 1:
            return {"content": "", "tool_calls": [{"id": "c1", "type": "function", "function": {
                "name": "run_shell", "arguments": json.dumps({"command": "cat ../../.env"})}}]}
        return {"content": "done"}

    with patch("agentcli.worker.call_model", fake_model):
        await AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path), events.append).run(
            Subtask(id="t1", role=AgentRole.coder, group=1, instruction="x"))
    blocks = [e for e in events if e.type == LogType.sandbox_block]
    assert blocks and "../../.env" in blocks[0].detail


def test_without_a_sandbox_auto_mode_refuses_to_run(tmp_path, monkeypatch):
    monkeypatch.setenv("SPLITTER_SANDBOX", "auto")
    with patch.object(tools, "_bwrap_works", lambda prefix: False):
        assert "sandbox" in tools.run_shell(Sandbox(tmp_path), "echo hi")
        assert tools.sandbox_status()["available"] is False


def test_run_python_removes_its_script(tmp_path):
    out = tools.run_python(Sandbox(tmp_path), "for i in range(3):\n    print(i)")
    assert "0\n1\n2" in out
    assert list(tmp_path.iterdir()) == []


def test_kill_processes_stops_a_running_command(tmp_path):
    sandbox = Sandbox(tmp_path)
    result = {}
    worker = threading.Thread(target=lambda: result.update(out=tools.run_shell(
        sandbox, f'"{sys.executable}" -c "import time; time.sleep(60)"', timeout=120)))
    started = time.time()
    worker.start()
    for _ in range(100):
        if tools._PROCESSES.get(sandbox.workspace):
            break
        time.sleep(0.05)
    assert tools.kill_processes(sandbox.workspace) == 1
    worker.join(30)
    assert not worker.is_alive() and time.time() - started < 30


@needs_bwrap
def test_bwrap_sandbox_hides_the_host(tmp_path, monkeypatch):
    monkeypatch.setenv("SPLITTER_SANDBOX", "auto")
    monkeypatch.setenv("SPLITTER_TEST_SECRET", "hunter2")
    sandbox = Sandbox(tmp_path)
    (tmp_path / "in.txt").write_text("inside")
    out = tools.run_shell(sandbox, "cat in.txt; ls /mnt; env; echo made > out.txt; pwd", timeout=120)
    assert "inside" in out and "/workspace" in out
    assert "hunter2" not in out
    mounts = tools.run_shell(sandbox, "ls /mnt", timeout=120).splitlines()[1:]
    assert not {"c", "d", "e"} & set(mounts)  # no host drives; at most WSL's resolver folder
    assert set(mounts) <= {"wsl"} or "No such file" in " ".join(mounts)
    assert (tmp_path / "out.txt").read_text().strip() == "made"
    assert "3" in tools.run_shell(sandbox, 'python -c "print(1+2)"', timeout=120)


@needs_bwrap
def test_bwrap_timeout_kills_the_command(tmp_path, monkeypatch):
    monkeypatch.setenv("SPLITTER_SANDBOX", "auto")
    started = time.time()
    out = tools.run_shell(Sandbox(tmp_path), "sleep 30", timeout=3)
    assert "timed out" in out and time.time() - started < 20


def _search_fixture(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.js").write_text("const Total = 1\nfunction total() {}\n")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "dep.js").write_text("total")
    return Sandbox(tmp_path)


def test_search_code_python_fallback(tmp_path):
    with patch.object(tools.shutil, "which", lambda name: None):
        out = tools.search_code(_search_fixture(tmp_path), "total")
    assert "src/app.js:1:" in out.replace("\\", "/") and "node_modules" not in out


@pytest.mark.skipif(not tools.shutil.which("rg"), reason="ripgrep not installed")
def test_search_code_uses_ripgrep(tmp_path):
    out = tools.search_code(_search_fixture(tmp_path), "total")
    assert "src/app.js:1: const Total = 1" in out and "src/app.js:2:" in out and "node_modules" not in out


@needs_bwrap
def test_bwrap_sandbox_resolves_dns(tmp_path, monkeypatch):
    monkeypatch.setenv("SPLITTER_SANDBOX", "auto")
    out = tools.run_shell(Sandbox(tmp_path), "getent hosts registry.npmjs.org && ls /mnt", timeout=120)
    assert "registry.npmjs.org" in out
    assert "wsl" in out or "No such file" in out  # at most the resolver file, never host drives
    assert "/mnt/c" not in out and "\nc\n" not in out
