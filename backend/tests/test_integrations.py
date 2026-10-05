"""Integrations: GitHub (httpx mocked), MCP (a real stdio server), Supabase artifact, n8n callback, secrets."""

import asyncio
import json
import sqlite3
import sys
import time
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import integrations, integrations_store
from agentcli.config import ExecutionConfig
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, Plan, RunResult, Subtask
from agentcli.worker import AgentWorker
import server

TOKEN = "ghp_realLookingToken123"
ECHO_SERVER = f'stdio://"{sys.executable}" "{Path(__file__).with_name("mcp_echo_server.py")}"'


def github_api(handler):
    """Route integrations' HTTP calls to `handler` (request -> response)."""
    return patch.object(integrations, "_http", lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)))


def ok_github(request: httpx.Request) -> httpx.Response:
    assert request.headers["Authorization"] == f"Bearer {TOKEN}"
    if request.url.path == "/user":
        return httpx.Response(200, json={"login": "octo"}, headers={"X-OAuth-Scopes": "repo, read:org"})
    if request.url.path == "/repos/octo/site":
        return httpx.Response(200, json={"full_name": "octo/site"})
    if request.url.path == "/user/repos":
        return httpx.Response(200, json=[{"full_name": "octo/site", "private": False, "default_branch": "main"}])
    if request.url.path == "/repos/octo/site/pulls":
        return httpx.Response(201, json={"html_url": "https://github.com/octo/site/pull/1"})
    return httpx.Response(404, json={"message": "Not Found"})


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("SHARED_SECRET", raising=False)
    store = {}
    monkeypatch.setattr(server, "INTEGRATIONS_STORE", store)
    monkeypatch.setattr(integrations, "REGISTRY", store)
    c = TestClient(server.app)
    c.store = store
    return c


def test_github_connect_validates_and_stores_token_encrypted(client, tmp_path):
    with github_api(ok_github):
        body = client.post("/integrations/connect", json={"type": "github", "token": TOKEN, "repo": "octo/site"}).json()
    assert body["status"] == "connected" and body["config"] == {"login": "octo", "repo": "octo/site"}
    assert body["scopes"] == ["repo", "read:org"]
    listed = client.get("/integrations").text
    assert TOKEN not in listed and TOKEN not in json.dumps(body)
    db = Path(integrations_store._get_db_path())
    raw = sqlite3.connect(db).execute("SELECT secret_enc FROM integration_secrets").fetchone()[0]
    assert TOKEN not in raw and integrations_store.get_secret(body["id"]) == TOKEN

    with github_api(ok_github):
        assert client.get("/integrations/github/repos").json()[0]["full_name"] == "octo/site"

    assert client.post("/integrations/disconnect", json={"id": body["id"]}).status_code == 200
    assert integrations_store.get_secret(body["id"]) is None and client.get("/integrations").json() == []


def test_github_errors_come_from_the_api(client):
    with github_api(lambda r: httpx.Response(401, json={"message": "Bad credentials"})):
        res = client.post("/integrations/connect", json={"type": "github", "token": "bad"})
    assert res.status_code == 400 and res.json()["detail"] == "GitHub API 401: Bad credentials"
    assert client.post("/integrations/connect", json={"type": "github", "repo": "octo/site"}).status_code == 400
    assert client.store == {}


def test_unknown_types_are_rejected(client):
    res = client.post("/integrations/connect", json={"type": "oauth_generic", "name": "Anything"})
    assert res.status_code == 400 and "Unknown integration type" in res.json()["detail"]


def test_test_connection_updates_status(client):
    with github_api(ok_github):
        iid = client.post("/integrations/connect", json={"type": "github", "token": TOKEN}).json()["id"]
    with github_api(lambda r: httpx.Response(401, json={"message": "Bad credentials"})):
        body = client.post("/integrations/test", json={"id": iid}).json()
    assert body["status"] == "error" and "Bad credentials" in body["lastError"]
    with github_api(ok_github):
        assert client.post("/integrations/test", json={"id": iid}).json()["status"] == "connected"
    assert client.post("/integrations/test", json={"id": "nope"}).status_code == 404


def test_push_commits_and_pushes_with_the_token_in_a_header(client, tmp_path, monkeypatch):
    with github_api(ok_github):
        client.post("/integrations/connect", json={"type": "github", "token": TOKEN, "repo": "octo/site"})
    project = tmp_path / "workspace_output" / "site-1"
    project.mkdir(parents=True)
    (project / "index.html").write_text("hi")
    monkeypatch.setattr(server, "workspace_dir", lambda w: project)
    calls = []
    real_git = integrations._git

    def recording_git(args, cwd, token=""):
        calls.append((args, token))
        if args[0] == "push":
            return ""
        return real_git(args, cwd, token)

    with patch.object(integrations, "_git", recording_git):
        body = client.post("/integrations/github/push", json={"workspace": "x", "branch": "splitter/site", "message": "Add site"}).json()
    assert body["url"] == "https://github.com/octo/site/tree/splitter/site"
    push = next(c for c in calls if c[0][0] == "push")
    assert push[0] == ["push", "https://github.com/octo/site.git", "HEAD:refs/heads/splitter/site"] and push[1] == TOKEN
    assert all(TOKEN not in " ".join(args) for args, _ in calls)
    assert "AUTHORIZATION: basic" in integrations._git_env(TOKEN)["GIT_CONFIG_VALUE_0"]
    assert real_git(["log", "--format=%s"], project) == "Add site"


async def test_github_agent_tools_open_a_pr(tmp_path):
    integration = {"id": "g1", "type": "github", "name": "GitHub", "status": "connected",
                   "config": {"repo": "octo/site"}, "allowedRoles": ["coder"]}
    with patch.object(integrations, "get_secret", lambda iid: TOKEN), github_api(ok_github):
        tools = integrations.AgentIntegrations("coder", {"g1": integration})
        assert {"github_clone", "github_create_branch", "github_commit_and_push", "github_open_pr"} <= {
            d["function"]["name"] for d in tools.definitions}
        out = await tools.call(Sandbox(tmp_path), "github_open_pr", {"head": "feature", "title": "Add site"})
    assert out == "Opened pull request: https://github.com/octo/site/pull/1"
    assert integrations.AgentIntegrations("tester", {"g1": integration}).definitions == []


def test_mcp_config_parsing():
    assert integrations.mcp_config("stdio://npx -y @modelcontextprotocol/server-everything")["args"] == [
        "-y", "@modelcontextprotocol/server-everything"]
    assert integrations.mcp_config("sse://localhost:3001/sse") == {"transport": "sse", "url": "http://localhost:3001/sse"}
    assert integrations.mcp_config("https://mcp.example.com/mcp")["transport"] == "http"
    with pytest.raises(integrations.IntegrationError):
        integrations.mcp_config("ftp://x")


def test_mcp_connect_lists_real_tools_and_agents_can_call_them(client, tmp_path):
    body = client.post("/integrations/connect", json={"type": "mcp", "name": "Echo", "url": ECHO_SERVER,
                                                      "allowedRoles": ["auditor"]}).json()
    assert body["status"] == "connected", body
    assert sorted(t["name"] for t in body["config"]["tools"]) == ["add", "shout"]

    calls = []

    async def fake_model(messages, tools=None, **kwargs):
        calls.append(tools)
        if len(calls) == 1:
            return {"content": "", "tool_calls": [{"id": "c1", "type": "function", "function": {
                "name": "mcp__echo__shout", "arguments": json.dumps({"text": "hello"})}}]}
        return {"content": messages[-1]["content"]}

    events = []
    with patch("agentcli.worker.call_model", fake_model):
        result = asyncio.run(AgentWorker(AgentRole.auditor, ExecutionConfig(), Sandbox(tmp_path), events.append).run(
            Subtask(id="t1", role=AgentRole.auditor, group=1, instruction="use the tool")))
    assert "mcp__echo__shout" in {t["function"]["name"] for t in calls[0]}
    assert result.output == "HELLO"
    assert any("mcp__echo__shout" in e.message for e in events)


def test_mcp_connect_reports_a_dead_server(client):
    res = client.post("/integrations/connect", json={"type": "mcp", "url": "stdio://definitely-not-a-command-xyz"})
    assert res.status_code == 400 and "MCP" in res.json()["detail"]


def test_supabase_storage_needs_a_working_client(client):
    res = client.post("/integrations/connect", json={"type": "supabase_storage"})
    assert res.status_code == 400 and "Supabase is not configured" in res.json()["detail"]


def _run_client(monkeypatch, tmp_path):
    root = (tmp_path / "workspace_output").resolve()
    root.mkdir()
    monkeypatch.setattr(server, "PROJECTS_ROOT", root)
    monkeypatch.setattr(server, "resolve_workspace", lambda w: str(root if w == "./workspace_output" else root / Path(w).name))

    async def analysis(task, config, **kwargs):
        return Plan(subtasks=[Subtask(id="t", role=AgentRole.coder, group=1, instruction="x")]), {}

    async def graph(task, plan, config, sandbox, on_event, **kwargs):
        (sandbox.workspace / "index.html").write_text("site")
        return RunResult(subtasks=plan.subtasks)

    monkeypatch.setattr(server, "run_analysis", analysis)
    monkeypatch.setattr(server, "run_graph", graph)
    monkeypatch.setattr(server, "save_run_result", lambda *a: None)


def test_finished_run_uploads_the_project_zip_and_calls_back(client, monkeypatch, tmp_path):
    _run_client(monkeypatch, tmp_path)
    client.store["s1"] = {"id": "s1", "type": "supabase_storage", "status": "connected", "config": {"bucket": "art"}}
    uploads, callbacks = [], []

    def upload(path, data, bucket, expires_s=0):
        uploads.append((path, bucket, len(data)))
        return "https://supabase.example/signed/zip"

    async def callback(url, result):
        callbacks.append((url, result["status"], result["artifact_url"]))

    with patch("agentcli.db_supabase.supabase_upload_signed", upload), patch.object(server, "post_callback", callback):
        body = client.post("/run", json={"task": "a site", "workspace": "./workspace_output",
                                         "callback_url": "https://n8n.example/webhook/abc"}).json()
    assert body["artifact_url"] == "https://supabase.example/signed/zip"
    assert uploads[0][0].endswith(f"/{body['run_id']}.zip") and uploads[0][1] == "art"
    assert callbacks == [("https://n8n.example/webhook/abc", "done", "https://supabase.example/signed/zip")]
    assert client.post("/runs", json={"task": "x", "workspace": "./workspace_output", "callback_url": "file:///x"}).status_code == 400


def test_inbound_webhook_needs_the_shared_secret(client, monkeypatch, tmp_path):
    _run_client(monkeypatch, tmp_path)
    monkeypatch.setenv("SHARED_SECRET", "s3cret")
    assert client.post("/run", json={"task": "x", "workspace": "./workspace_output"}).status_code == 401
    ok = client.post("/run", json={"task": "x", "workspace": "./workspace_output"}, headers={"X-API-Key": "s3cret"})
    assert ok.status_code == 200 and ok.json()["status"] == "done"


async def test_post_callback_posts_the_result(monkeypatch):
    seen = []

    def handler(request):
        seen.append((str(request.url), json.loads(request.content)))
        return httpx.Response(200)

    real = httpx.AsyncClient
    monkeypatch.setattr(server.httpx, "AsyncClient", lambda **k: real(transport=httpx.MockTransport(handler)))
    await server.post_callback("https://n8n.example/hook", {"run_id": "r1", "status": "done"})
    assert seen == [("https://n8n.example/hook", {"run_id": "r1", "status": "done"})]


def test_deploy_publishes_the_site_to_gh_pages_and_enables_pages(client, tmp_path, monkeypatch):
    pages_calls = []

    def github_with_pages(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/repos/octo/site/pages":
            pages_calls.append(request.method)
            if request.method == "POST":
                return httpx.Response(201, json={})
            if len(pages_calls) == 1:  # first GET: Pages not enabled yet
                return httpx.Response(404, json={"message": "Not Found"})
            return httpx.Response(200, json={"html_url": "https://octo.github.io/site/", "source": {"branch": "gh-pages"}})
        return ok_github(request)

    with github_api(ok_github):
        client.post("/integrations/connect", json={"type": "github", "token": TOKEN, "repo": "octo/site"})
    project = tmp_path / "workspace_output" / "counter-1"
    (project / "dist" / "assets").mkdir(parents=True)
    (project / "dist" / "index.html").write_text("built")
    (project / "dist" / "assets" / "app.js").write_text("js")
    (project / "index.html").write_text("raw vite index")
    (project / "node_modules").mkdir()
    monkeypatch.setattr(server, "workspace_dir", lambda w: project)
    pushed = {}
    real_git = integrations._git

    def recording_git(args, cwd, token=""):
        if args[0] == "push":
            pushed["args"], pushed["token"] = args, token
            pushed["files"] = sorted(p.relative_to(cwd).as_posix() for p in cwd.rglob("*")
                                     if p.is_file() and ".git" not in p.relative_to(cwd).parts)
            return ""
        return real_git(args, cwd, token)

    with patch.object(integrations, "_git", recording_git), github_api(github_with_pages):
        body = client.post("/integrations/github/deploy", json={"workspace": "x"}).json()
    assert body["url"] == "https://octo.github.io/site/"
    assert pushed["args"] == ["push", "--force", "https://github.com/octo/site.git", "HEAD:refs/heads/gh-pages"]
    assert pushed["token"] == TOKEN
    assert pushed["files"] == [".nojekyll", "assets/app.js", "index.html"]  # dist/ only
    assert pages_calls == ["GET", "POST", "GET"]


def test_deploy_needs_an_index_html(client, tmp_path, monkeypatch):
    with github_api(ok_github):
        client.post("/integrations/connect", json={"type": "github", "token": TOKEN, "repo": "octo/site"})
    project = tmp_path / "workspace_output" / "script-1"
    project.mkdir(parents=True)
    (project / "main.py").write_text("print(1)")
    monkeypatch.setattr(server, "workspace_dir", lambda w: project)
    res = client.post("/integrations/github/deploy", json={"workspace": "x"})
    assert res.status_code == 400 and "Nothing to deploy" in res.json()["detail"]


async def test_pages_already_on_gh_pages_needs_no_admin_rights():
    calls = []

    def handler(request):
        calls.append(request.method)
        return httpx.Response(200, json={"html_url": "https://octo.github.io/site/", "source": {"branch": "gh-pages", "path": "/"}})

    with github_api(handler):
        assert await integrations.github_enable_pages(TOKEN, "octo/site") == "https://octo.github.io/site/"
    assert calls == ["GET"]


async def test_pages_permission_error_says_how_to_fix_it():
    def handler(request):
        if request.method == "GET":
            return httpx.Response(404, json={"message": "Not Found"})
        return httpx.Response(403, json={"message": "Resource not accessible by personal access token"})

    with github_api(handler), pytest.raises(integrations.IntegrationError) as err:
        await integrations.github_enable_pages(TOKEN, "octo/site")
    assert "Resource not accessible" in str(err.value) and "Administration" in str(err.value) and "Settings > Pages" in str(err.value)
