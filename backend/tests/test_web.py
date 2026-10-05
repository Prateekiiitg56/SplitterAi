"""Web projects: stack choice, per-project folders, templates, browser check, preview."""

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import web
from agentcli.browser import browser_check
from agentcli.config import ExecutionConfig
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, Plan, RunResult, Subtask
from agentcli.worker import AgentWorker
import server


def test_detect_stack():
    assert web.detect_stack("build a calculator") == "tailwind"
    assert web.detect_stack("a todo app in React") == "react"
    assert web.detect_stack("landing page, plain html please") == "plain"
    assert web.detect_stack("a react app", requested="plain") == "plain"


def test_is_web_task():
    designer_plan = Plan(subtasks=[Subtask(id="d", role=AgentRole.designer, group=1, instruction="x")])
    assert web.is_web_task("make something", designer_plan)
    assert web.is_web_task("build an calculator")
    assert not web.is_web_task("write a python script that renames files")


def test_new_project_folder_and_template():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        a, b = web.new_project_dir(root, "Build a Calculator!"), web.new_project_dir(root, "Build a Calculator!")
        assert a != b and a.name.startswith("build-a-calculator-")
        assert web.apply_template("tailwind", a) == ["app.js", "index.html"]
        assert "tailwindcss/browser" in (a / "index.html").read_text()
        assert web.apply_template("tailwind", a) == []  # never over an existing project
        assert "src/App.jsx" in web.apply_template("react", b)
        assert "DESIGN GUIDE" in web.design_context("plain", ["styles.css"])


def _chromium_available() -> bool:
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            p.chromium.launch().close()
        return True
    except Exception:
        return False


needs_chromium = pytest.mark.skipif(not _chromium_available(), reason="Playwright Chromium not installed")


PAGE = """<!DOCTYPE html><html><body>
<button id="inc">+</button><output id="count">0</output>
<script>
document.getElementById('inc').onclick = () => {
  const c = document.getElementById('count'); c.textContent = +c.textContent + 1;
};
console.error('boom');
</script>
<script src="missing.js"></script>
</body></html>"""


@needs_chromium
def test_browser_check_reports_problems_and_runs_actions():
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "index.html").write_text(PAGE)
        report = browser_check(Sandbox(Path(tmp)), actions=[
            {"action": "click", "selector": "#inc"},
            {"action": "click", "selector": "#inc"},
            {"action": "expect_text", "selector": "#count", "value": "2"},
            {"action": "click", "selector": "#nope"},
        ], screenshot=True)
        assert "ok   expect_text(#count, '2')" in report
        assert "FAIL click(#nope" in report
        assert "console error: boom" in report
        assert "missing.js" in report
        assert (Path(tmp) / ".splitter/screenshots/mobile.jpg").stat().st_size > 0


@needs_chromium
async def test_screenshots_reach_the_model_as_images():
    calls = []

    async def fake_model(messages, **kwargs):
        calls.append(messages)
        if len(calls) == 1:
            return {"content": "", "tool_calls": [{"id": "c1", "type": "function", "function": {
                "name": "browser_check", "arguments": json.dumps({"screenshot": True})}}]}
        return {"content": "VERDICT: PASS"}

    with tempfile.TemporaryDirectory() as tmp, patch("agentcli.worker.call_model", fake_model):
        (Path(tmp) / "index.html").write_text("<h1>hi</h1>")
        await AgentWorker(AgentRole.auditor, ExecutionConfig(), Sandbox(Path(tmp))).run(
            Subtask(id="verify", role=AgentRole.auditor, group=1, instruction="check"))
    images = [part for part in calls[1][-1]["content"] if part["type"] == "image_url"]
    assert len(images) == 2 and images[0]["image_url"]["url"].startswith("data:image/jpeg;base64,")


async def test_failed_browser_check_sends_no_screenshot_message():
    calls = []

    async def fake_model(messages, **kwargs):
        calls.append(messages)
        if len(calls) == 1:
            return {"content": "", "tool_calls": [{"id": "c1", "type": "function", "function": {
                "name": "browser_check", "arguments": json.dumps({"screenshot": True})}}]}
        return {"content": "VERDICT: PASS"}

    report = "Browser check failed: no browser\nSCREENSHOT: .splitter/screenshots/mobile.jpg"
    with tempfile.TemporaryDirectory() as tmp, patch("agentcli.worker.call_model", fake_model), \
            patch("agentcli.tools.browser_check", lambda *a, **k: report):
        (Path(tmp) / "index.html").write_text("<h1>hi</h1>")
        await AgentWorker(AgentRole.auditor, ExecutionConfig(), Sandbox(Path(tmp))).run(
            Subtask(id="verify", role=AgentRole.auditor, group=1, instruction="check"))
    assert calls[1][-1]["role"] == "tool"


def test_run_with_projects_root_creates_new_project_and_preview_serves_it(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    seen = {}

    async def fake_graph(task, plan, config, sandbox, on_event, preset="balanced", design=""):
        seen["workspace"], seen["design"] = sandbox.workspace, design
        (sandbox.workspace / "app.js").write_text("// built")
        return RunResult(subtasks=[])

    async def fake_plan(**kwargs):
        seen["guidance"] = kwargs.get("guidance", "")
        return Plan(subtasks=[Subtask(id="d", role=AgentRole.designer, group=1, instruction="design")])

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp).resolve()
        with patch.object(server, "PROJECTS_ROOT", root), patch.object(server, "run_graph", fake_graph), \
                patch.object(server, "generate_plan", fake_plan), patch.object(server, "save_run_result", lambda *a: None), \
                patch.object(server, "resolve_workspace", lambda w: str(root if w == "./workspace_output" else root / Path(w).name)):
            client = TestClient(server.app)
            body = client.post("/run", json={"task": "build a calculator", "workspace": "./workspace_output"}).json()

            project = seen["workspace"]
            assert project.parent == root and project.name.startswith("build-a-calculator-")
            assert body["workspace"].endswith(project.name)
            assert "WEB TASKS" in seen["guidance"] and "tailwind" in seen["design"].lower()
            assert (project / "index.html").exists()  # starter template

            assert client.get(f"/preview/{project.name}", follow_redirects=False).status_code in (307, 302)
            page = client.get(f"/preview/{project.name}/")
            assert page.status_code == 200 and "tailwindcss/browser" in page.text
            assert client.get("/preview/../secret").status_code in (403, 404)


def test_preview_root_ignores_leftover_files_and_delete_removes_project(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp).resolve()
        (root / "index.html").write_text("<title>Old Calculator</title>")
        project = root / "todo-abc123"
        project.mkdir()
        (project / "index.html").write_text("todo")
        with patch.object(server, "PROJECTS_ROOT", root), patch.object(server, "reset_session", lambda w: True),                 patch.object(server, "resolve_workspace", lambda w: str(root if w == "./workspace_output" else root / Path(w).name)):
            client = TestClient(server.app)
            assert "Old Calculator" not in client.get("/preview/").text
            assert "Old Calculator" not in client.get("/preview/index.html").text

            assert client.delete("/sessions", params={"workspace": "./workspace_output/todo-abc123"}).status_code == 200
            assert not project.exists()
            client.delete("/sessions", params={"workspace": "./workspace_output"})
            assert root.exists()


async def test_text_only_model_retries_without_screenshots():
    from types import SimpleNamespace
    from agentcli.router import call_model
    sent = []

    async def fake_completion(**kwargs):
        sent.append(kwargs["messages"])
        if isinstance(kwargs["messages"][-1]["content"], list):
            raise Exception('OpenrouterException - {"error":{"message":"No endpoints found that support image input"}}')
        msg = SimpleNamespace(content="VERDICT: PASS", tool_calls=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)], usage=None)

    shot = {"role": "user", "content": [{"type": "text", "text": "Screenshots"},
                                         {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,AA"}}]}
    with patch("agentcli.router.litellm.acompletion", fake_completion):
        result = await call_model([{"role": "system", "content": "s"}, shot], ["openrouter/meta-llama/x"],
                                  AgentRole.auditor, ExecutionConfig())
    assert result["content"] == "VERDICT: PASS"
    assert "Screenshots omitted" in sent[1][-1]["content"]
