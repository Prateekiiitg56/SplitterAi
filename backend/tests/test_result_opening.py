"""Opening a finished run: entry detection, build-before-done, preview for both roots, file viewer, Run."""

import json
import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import graph, workspace_import
from agentcli.config import ExecutionConfig
from agentcli.prompts import VERIFIER_SYSTEM
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, LogType, Plan, Subtask, SubtaskStatus
from agentcli.web import needs_build, project_entry
from agentcli.worker import AgentWorker
import server


def write(root: Path, rel: str, text: str = "x") -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


def test_project_entry(tmp_path):
    assert project_entry(tmp_path) == {"kind": "none", "path": None}
    write(tmp_path, "lib/util.py")
    assert project_entry(tmp_path) == {"kind": "file", "path": "lib/util.py"}
    write(tmp_path, "primes.py")
    os.utime(tmp_path / "primes.py", (time.time() + 5, time.time() + 5))
    assert project_entry(tmp_path)["path"] == "primes.py"
    write(tmp_path, "main.py")
    assert project_entry(tmp_path)["path"] == "main.py"
    write(tmp_path, "package.json", json.dumps({"bin": {"tool": "bin/cli.js"}}))
    write(tmp_path, "bin/cli.js")
    assert project_entry(tmp_path)["path"] == "bin/cli.js"
    write(tmp_path, "index.html")
    assert project_entry(tmp_path) == {"kind": "web", "path": "index.html"}


def test_needs_build(tmp_path):
    assert not needs_build(tmp_path)
    write(tmp_path, "package.json", json.dumps({"scripts": {"build": "vite build"}}))
    write(tmp_path, "src/main.jsx")
    assert needs_build(tmp_path)
    built = write(tmp_path, "dist/index.html")
    os.utime(built, (time.time() + 5, time.time() + 5))
    assert not needs_build(tmp_path)
    os.utime(tmp_path / "src/main.jsx", (time.time() + 10, time.time() + 10))
    assert needs_build(tmp_path)


def fake_workers(seen):
    async def run(self, subtask):
        seen.append(subtask.id)
        subtask.status = SubtaskStatus.success
        subtask.output = "VERDICT: PASS" if self.system_prompt == VERIFIER_SYSTEM else "done"
        return subtask
    return run


async def test_stale_react_build_runs_before_verify_and_failure_fails_verification(tmp_path):
    write(tmp_path, "package.json", json.dumps({"scripts": {"build": "vite build"}}))
    write(tmp_path, "src/main.jsx")
    commands, seen = [], []

    def failing_build(sandbox, command, timeout=30, max_output=10240):
        commands.append(command)
        return "Exit code: 1\nSTDERR:\nerror: cannot resolve ./App"

    plan = Plan(subtasks=[Subtask(id="ui", role=AgentRole.coder, group=1, instruction="build ui")])
    with patch.object(AgentWorker, "run", fake_workers(seen)), patch.object(graph, "run_shell", failing_build):
        result = await graph.run_graph("react app", plan, ExecutionConfig(), Sandbox(tmp_path), preset="cost")
    assert commands[0] == "npm install --prefer-offline --no-audit --no-fund && npm run build"
    assert result.verification["verdict"] == "fail" and "cannot resolve" in result.verification["issues"]
    assert result.status.value == "error"
    assert "verify" not in seen  # the LLM verifier is not asked about a project that does not build

    def good_build(sandbox, command, timeout=30, max_output=10240):
        write(tmp_path, "dist/index.html")
        return "Exit code: 0\nbuilt"

    with patch.object(AgentWorker, "run", fake_workers(seen)), patch.object(graph, "run_shell", good_build):
        result = await graph.run_graph("react app", plan, ExecutionConfig(), Sandbox(tmp_path))
    assert result.verification["verdict"] == "pass"


async def test_worker_reports_written_files(tmp_path):
    events, calls = [], []

    async def fake_model(messages, **kwargs):
        calls.append(1)
        if len(calls) == 1:
            return {"content": "", "tool_calls": [{"id": "c1", "type": "function", "function": {
                "name": "write_file", "arguments": json.dumps({"path": "src/app.js", "content": "x"})}}]}
        return {"content": "done"}

    with patch("agentcli.worker.call_model", fake_model):
        await AgentWorker(AgentRole.coder, ExecutionConfig(), Sandbox(tmp_path), events.append).run(
            Subtask(id="t1", role=AgentRole.coder, group=1, instruction="write"))
    assert [e.detail for e in events if e.type == LogType.file_written] == ["src/app.js"]


@pytest.fixture
def roots(monkeypatch, tmp_path):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    generated, imported = (tmp_path / "workspace_output").resolve(), (tmp_path / "imports").resolve()
    generated.mkdir()
    imported.mkdir()
    monkeypatch.setattr(server, "PROJECTS_ROOT", generated)
    monkeypatch.setattr(workspace_import, "DEFAULT_WORKSPACES_ROOT", imported)
    monkeypatch.setattr(server, "resolve_workspace",
                        lambda w: str(w if Path(w).is_absolute() else generated / Path(w).name))
    return generated, imported


def test_preview_serves_generated_and_imported_projects(roots):
    generated, imported = roots
    write(generated, "todo-1/index.html", "todo app")
    write(imported, "upload-abc/index.html", "uploaded site")
    write(imported, "upload-abc/css/site.css", "body{}")
    client = TestClient(server.app)
    assert client.get("/preview/todo-1/").text == "todo app"
    assert client.get("/preview/upload-abc/").text == "uploaded site"
    assert client.get("/preview/upload-abc/css/site.css").text == "body{}"
    assert client.get("/preview/nope/").status_code == 404
    assert client.get("/preview/upload-abc/missing.js").status_code == 404


def test_preview_prefers_dist_and_explains_unbuilt_projects(roots):
    generated, _ = roots
    write(generated, "counter/package.json", json.dumps({"scripts": {"build": "vite build"}}))
    write(generated, "counter/index.html", '<script type="module" src="/src/main.jsx"></script>')
    write(generated, "counter/src/main.jsx")
    client = TestClient(server.app)
    page = client.get("/preview/counter/")
    assert page.status_code == 200 and "Not built yet" in page.text
    built = write(generated, "counter/dist/index.html", "built counter")
    os.utime(built, (time.time() + 5, time.time() + 5))
    write(generated, "counter/dist/assets/app.js", "js")
    assert client.get("/preview/counter/").text == "built counter"
    assert client.get("/preview/counter/assets/app.js").text == "js"


def test_preview_needs_the_shared_secret_then_uses_a_cookie(roots, monkeypatch):
    generated, _ = roots
    write(generated, "site/index.html", "page")
    write(generated, "site/app.js", "js")
    monkeypatch.setenv("SHARED_SECRET", "s3cret")
    client = TestClient(server.app)
    assert client.get("/preview/site/").status_code == 401
    assert client.get("/preview/site/?token=s3cret").text == "page"
    assert client.get("/preview/site/app.js").text == "js"  # cookie from the first request


def test_project_info_and_file_content(roots):
    generated, imported = roots
    write(generated, "primes-1/primes.py", "print(2)")
    (generated / "primes-1/blob.bin").write_bytes(b"\0\1\2")
    client = TestClient(server.app)
    info = client.get("/projects/info", params={"workspace": "./workspace_output/primes-1"}).json()
    assert info["project_id"] == "primes-1" and info["entry"] == {"kind": "file", "path": "primes.py"}

    params = {"workspace": "./workspace_output/primes-1"}
    body = client.get("/files/content", params={**params, "path": "primes.py"}).json()
    assert body["content"] == "print(2)" and not body["binary"]
    assert client.get("/files/content", params={**params, "path": "blob.bin"}).json()["binary"]
    assert client.get("/files/content", params={**params, "path": "../../secret"}).status_code == 403
    assert client.get("/files/content", params={**params, "path": "nope.py"}).status_code == 404
    # Only folders directly under a project root are projects.
    assert client.get("/projects/info", params={"workspace": str(generated)}).status_code == 400
    assert client.get("/projects/info", params={"workspace": str(Path(tempfile.gettempdir()))}).status_code == 400


def _events(res):
    return [json.loads(line[len("data: "):]) for line in res.iter_lines() if line.startswith("data: ")]


def test_run_file_streams_a_script(roots):
    generated, _ = roots
    write(generated, "primes-2/primes.py", "print([p for p in range(2, 30) if all(p % d for d in range(2, p))])")
    client = TestClient(server.app)
    seen = []

    def fake_stream(sandbox, command, timeout=60):
        seen.append((sandbox.workspace.name, command))
        yield "[2, 3, 5, 7]"
        yield "done"
        yield "Exit code: 0"

    with patch.object(server, "stream_shell", fake_stream), \
            client.stream("POST", "/projects/run-file", json={"workspace": "./workspace_output/primes-2", "path": "primes.py"}) as res:
        events = _events(res)
    assert events == [{"command": 'python "primes.py"'}, {"line": "[2, 3, 5, 7]"}, {"line": "done"}, {"exit_code": 0}]
    assert seen == [("primes-2", 'python "primes.py"')]
    bad = client.post("/projects/run-file", json={"workspace": "./workspace_output/primes-2", "path": "index.html"})
    assert bad.status_code == 400


def test_run_file_really_runs_and_reports_errors(roots):
    generated, _ = roots
    write(generated, "count/count.py", "for i in range(3):\n    print(i)\nraise SystemExit(3)")
    with TestClient(server.app).stream("POST", "/projects/run-file", json={"workspace": "./workspace_output/count", "path": "count.py"}) as res:
        events = _events(res)
    assert [e["line"] for e in events if "line" in e] == ["0", "1", "2"]
    assert events[-1] == {"exit_code": 3}
