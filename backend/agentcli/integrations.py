"""Connected services the agents can use: GitHub (API + git) and MCP servers.

Connect/test validate against the real service. At run time every integration whose allowedRoles
include the worker's role adds its tools to that worker; calls are routed here with a timeout.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import shlex
import shutil
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx

from .integrations_store import get_secret, load_all_integrations
from .sandbox import Sandbox

GITHUB_API = "https://api.github.com"
TOOL_TIMEOUT_S = 60
GIT_TIMEOUT_S = 180
_REPO = re.compile(r"^[\w.-]+/[\w.-]+$")
_BRANCH = re.compile(r"^(?!-)[\w./-]{1,200}$")


class IntegrationError(Exception):
    """A service rejected the request; the message is shown to the user or the agent as-is."""


def _http() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=15)


# ── GitHub ────────────────────────────────────────────────────────

def _gh_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"}


def _gh_error(resp: httpx.Response) -> IntegrationError:
    try:
        message = resp.json().get("message", "")
    except ValueError:
        message = resp.text[:200]
    return IntegrationError(f"GitHub API {resp.status_code}: {message}")


async def github_validate(token: str, repo: str | None = None) -> dict[str, Any]:
    """Check the token (and the repo when given). Returns the account, scopes and repo."""
    if repo and not _REPO.match(repo):
        raise IntegrationError("Repository must look like owner/name.")
    async with _http() as client:
        user = await client.get(f"{GITHUB_API}/user", headers=_gh_headers(token))
        if user.status_code != 200:
            raise _gh_error(user)
        scopes = [s.strip() for s in user.headers.get("X-OAuth-Scopes", "").split(",") if s.strip()]
        if repo:
            r = await client.get(f"{GITHUB_API}/repos/{repo}", headers=_gh_headers(token))
            if r.status_code != 200:
                raise _gh_error(r)
    return {"login": user.json().get("login"), "scopes": scopes, "repo": repo}


async def github_repos(token: str) -> list[dict[str, Any]]:
    async with _http() as client:
        resp = await client.get(f"{GITHUB_API}/user/repos", headers=_gh_headers(token),
                                params={"per_page": 100, "sort": "updated"})
    if resp.status_code != 200:
        raise _gh_error(resp)
    return [{"full_name": r["full_name"], "private": r["private"], "default_branch": r.get("default_branch")}
            for r in resp.json()]


def _git_env(token: str) -> dict[str, str]:
    # The token goes in an HTTP header through git's env config: never in a remote URL, argv or .git/config.
    basic = base64.b64encode(f"x-access-token:{token}".encode()).decode()
    env = {k: v for k, v in os.environ.items() if k in ("PATH", "SYSTEMROOT", "HOME", "USERPROFILE", "TEMP", "TMP")}
    env.update({
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_CONFIG_COUNT": "1",
        "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
        "GIT_CONFIG_VALUE_0": f"AUTHORIZATION: basic {basic}",
    })
    return env


def _git(args: list[str], cwd: Path, token: str = "") -> str:
    proc = subprocess.run(["git", *args], cwd=cwd, env=_git_env(token), capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=GIT_TIMEOUT_S)
    if proc.returncode != 0:
        raise IntegrationError(f"git {args[0]} failed: {(proc.stderr or proc.stdout).strip()[-800:]}")
    return proc.stdout.strip()


def git_clone(repo: str, dest: Path, token: str) -> None:
    if not _REPO.match(repo):
        raise IntegrationError("Repository must look like owner/name.")
    _git(["clone", "--depth", "1", f"https://github.com/{repo}.git", str(dest)], dest.parent, token)


def git_create_branch(workspace: Path, branch: str) -> str:
    if not _BRANCH.match(branch):
        raise IntegrationError(f"Invalid branch name: {branch}")
    if not (workspace / ".git").is_dir():
        _git(["init", "-b", "main"], workspace)
    _git(["checkout", "-B", branch], workspace)
    return f"On branch {branch}"


def git_commit_and_push(workspace: Path, repo: str, branch: str, message: str, token: str) -> str:
    """Commit everything (except dependencies and private files) and push it as `branch`."""
    if not _REPO.match(repo):
        raise IntegrationError("Repository must look like owner/name.")
    if not (workspace / ".git").is_dir():
        _git(["init", "-b", "main"], workspace)
    exclude = workspace / ".git" / "info" / "exclude"
    exclude.parent.mkdir(parents=True, exist_ok=True)
    exclude.write_text("node_modules/\n.splitter/\n__pycache__/\n.venv/\n")
    git_create_branch(workspace, branch)
    _git(["add", "-A"], workspace)
    if _git(["status", "--porcelain"], workspace):
        _git(["-c", "user.name=SplitterAI", "-c", "user.email=splitterai@users.noreply.github.com",
              "commit", "-m", message], workspace)
    _git(["push", f"https://github.com/{repo}.git", f"HEAD:refs/heads/{branch}"], workspace, token)
    return f"Pushed {branch} to {repo}: https://github.com/{repo}/tree/{branch}"


PAGES_BRANCH = "gh-pages"


def site_dir(project: Path) -> Path:
    """The folder GitHub Pages serves: the build output when there is one, else the project itself."""
    for folder in (project / "dist", project):
        if (folder / "index.html").is_file():
            return folder
    raise IntegrationError("Nothing to deploy: the project has no index.html (or dist/index.html).")


def git_publish_pages(site: Path, repo: str, token: str) -> None:
    """Replace the repository's gh-pages branch with the site's files (one fresh commit, force-pushed)."""
    if not _REPO.match(repo):
        raise IntegrationError("Repository must look like owner/name.")
    import tempfile
    skip = {"node_modules", ".git", ".splitter", "__pycache__"}
    with tempfile.TemporaryDirectory(prefix="splitter-pages-") as tmp:
        stage = Path(tmp) / "site"
        shutil.copytree(site, stage, ignore=lambda d, names: [n for n in names if n in skip])
        (stage / ".nojekyll").write_text("")  # serve files and folders starting with _ as they are
        _git(["init", "-b", PAGES_BRANCH], stage)
        _git(["add", "-A"], stage)
        _git(["-c", "user.name=SplitterAI", "-c", "user.email=splitterai@users.noreply.github.com",
              "commit", "-m", "Deploy from SplitterAI"], stage)
        _git(["push", "--force", f"https://github.com/{repo}.git", f"HEAD:refs/heads/{PAGES_BRANCH}"], stage, token)


PAGES_PERMISSION_HINT = (
    "The files are on the gh-pages branch, but GitHub would not switch Pages on for this token. "
    "Either give the token Administration: Read and write and Pages: Read and write, or turn Pages on once "
    "yourself (repository Settings > Pages > Deploy from a branch > gh-pages, / root) and deploy again."
)


async def github_enable_pages(token: str, repo: str) -> str:
    """Make Pages serve the gh-pages branch (enabling it when needed). Returns the site URL."""
    source = {"source": {"branch": PAGES_BRANCH, "path": "/"}}
    async with _http() as client:
        current = await client.get(f"{GITHUB_API}/repos/{repo}/pages", headers=_gh_headers(token))
        if current.status_code == 200 and (current.json().get("source") or {}).get("branch") == PAGES_BRANCH:
            info = current  # already serving gh-pages: nothing to change (and no admin rights needed)
        else:
            if current.status_code == 404:
                resp = await client.post(f"{GITHUB_API}/repos/{repo}/pages", headers=_gh_headers(token), json=source)
            else:
                resp = await client.put(f"{GITHUB_API}/repos/{repo}/pages", headers=_gh_headers(token), json=source)
            if resp.status_code == 403:
                raise IntegrationError(f"{_gh_error(resp)}. {PAGES_PERMISSION_HINT}")
            if resp.status_code not in (200, 201, 204):
                raise _gh_error(resp)
            info = await client.get(f"{GITHUB_API}/repos/{repo}/pages", headers=_gh_headers(token))
    if info.status_code != 200:
        raise _gh_error(info)
    return info.json().get("html_url") or f"https://{repo.split('/')[0]}.github.io/{repo.split('/')[1]}/"


async def github_open_pr(token: str, repo: str, head: str, base: str, title: str, body: str = "") -> str:
    async with _http() as client:
        resp = await client.post(f"{GITHUB_API}/repos/{repo}/pulls", headers=_gh_headers(token),
                                 json={"title": title, "head": head, "base": base, "body": body})
    if resp.status_code != 201:
        raise _gh_error(resp)
    return f"Opened pull request: {resp.json()['html_url']}"


# ── MCP ───────────────────────────────────────────────────────────

def mcp_config(url: str) -> dict[str, Any]:
    """stdio://<command line>, sse://host/path (SSE over http) or http(s):// (streamable HTTP)."""
    if url.startswith("stdio://"):
        # Non-POSIX splitting keeps Windows backslashes; it also keeps the quotes, so drop those.
        parts = [p[1:-1] if len(p) > 1 and p[0] == p[-1] and p[0] in "\"'" else p
                 for p in shlex.split(url[len("stdio://"):], posix=False)]
        if not parts:
            raise IntegrationError("stdio:// needs a command, e.g. stdio://npx -y @modelcontextprotocol/server-everything")
        return {"transport": "stdio", "command": parts[0], "args": parts[1:], "url": url}
    if url.startswith("sse://"):
        return {"transport": "sse", "url": "http://" + url[len("sse://"):]}
    if url.startswith(("http://", "https://")):
        return {"transport": "http", "url": url}
    raise IntegrationError("MCP server URL must start with stdio://, sse://, http:// or https://.")


def _attr(obj: Any, *names: str) -> Any:
    """MCP SDK 2.x renamed camelCase fields (inputSchema -> input_schema); accept both."""
    return next((getattr(obj, n) for n in names if getattr(obj, n, None) is not None), None)


def _root_cause(e: BaseException) -> BaseException:
    """The transports wrap failures in ExceptionGroups; report the first real error."""
    while isinstance(e, BaseExceptionGroup) and e.exceptions:
        e = e.exceptions[0]
    return e


@asynccontextmanager
async def _mcp_session(config: dict[str, Any]):
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.sse import sse_client
    from mcp.client.stdio import stdio_client
    from mcp.client.streamable_http import streamable_http_client

    if config["transport"] == "stdio":
        command = shutil.which(config["command"]) or config["command"]  # npx -> npx.cmd on Windows
        transport = stdio_client(StdioServerParameters(command=command, args=config["args"]))
    elif config["transport"] == "sse":
        transport = sse_client(config["url"])
    else:
        transport = streamable_http_client(config["url"])
    async with transport as streams:
        async with ClientSession(streams[0], streams[1]) as session:
            await session.initialize()
            yield session


async def mcp_list_tools(config: dict[str, Any]) -> list[dict[str, Any]]:
    async def run():
        async with _mcp_session(config) as session:
            result = await session.list_tools()
            return [{"name": t.name, "description": t.description or "", "inputSchema": _attr(t, "input_schema", "inputSchema") or {}}
                    for t in result.tools]
    try:
        return await asyncio.wait_for(run(), TOOL_TIMEOUT_S)
    except asyncio.TimeoutError:
        raise IntegrationError(f"MCP server did not answer within {TOOL_TIMEOUT_S}s")
    except IntegrationError:
        raise
    except Exception as e:
        e = _root_cause(e)
        raise IntegrationError(f"MCP connection failed: {type(e).__name__}: {e}")


async def mcp_call_tool(config: dict[str, Any], name: str, arguments: dict[str, Any]) -> str:
    async def run():
        async with _mcp_session(config) as session:
            return await session.call_tool(name, arguments)
    try:
        result = await asyncio.wait_for(run(), TOOL_TIMEOUT_S)
    except asyncio.TimeoutError:
        return f"Error: MCP tool {name} timed out after {TOOL_TIMEOUT_S}s"
    except Exception as e:
        e = _root_cause(e)
        return f"Error: MCP tool {name} failed: {type(e).__name__}: {e}"
    parts = []
    for item in getattr(result, "content", None) or []:
        text = getattr(item, "text", None)
        parts.append(text if text is not None else f"[{getattr(item, 'type', 'content')}]")
    output = "\n".join(parts) or "(no output)"
    return f"Error: {output}" if _attr(result, "is_error", "isError") else output


# ── Agent tools ───────────────────────────────────────────────────

def _slug(text: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]+", "_", text).strip("_").lower()[:20] or "server"


GITHUB_TOOLS = [
    {"type": "function", "function": {
        "name": "github_clone", "description": "Clone a GitHub repository (owner/name) into a folder of the workspace.",
        "parameters": {"type": "object", "properties": {
            "repo": {"type": "string"}, "path": {"type": "string", "description": "Folder inside the workspace."}},
            "required": ["repo"]}}},
    {"type": "function", "function": {
        "name": "github_create_branch", "description": "Create (or switch to) a git branch in the workspace.",
        "parameters": {"type": "object", "properties": {"branch": {"type": "string"}}, "required": ["branch"]}}},
    {"type": "function", "function": {
        "name": "github_commit_and_push",
        "description": "Commit all workspace changes and push them as a branch of the connected repository.",
        "parameters": {"type": "object", "properties": {
            "branch": {"type": "string"}, "message": {"type": "string"},
            "repo": {"type": "string", "description": "owner/name; defaults to the connected repository."}},
            "required": ["branch", "message"]}}},
    {"type": "function", "function": {
        "name": "github_open_pr", "description": "Open a pull request on the connected repository.",
        "parameters": {"type": "object", "properties": {
            "head": {"type": "string"}, "base": {"type": "string"}, "title": {"type": "string"},
            "body": {"type": "string"}, "repo": {"type": "string"}},
            "required": ["head", "title"]}}},
]


# The server's in-memory view of connected integrations; loaded from the store when unset (CLI, tests).
REGISTRY: dict[str, dict] | None = None


class AgentIntegrations:
    """The integration tools one worker role may use during a run."""

    def __init__(self, role: str, integrations: dict[str, dict] | None = None):
        if integrations is None:
            integrations = REGISTRY if REGISTRY is not None else load_all_integrations()
        allowed = [i for i in integrations.values()
                   if role in (i.get("allowedRoles") or []) and i.get("status") == "connected"]
        self.github = next((i for i in allowed if i["type"] == "github"), None)
        self.mcp_tools: dict[str, tuple[dict, str]] = {}
        self.definitions: list[dict] = list(GITHUB_TOOLS) if self.github else []
        for integ in allowed:
            if integ["type"] != "mcp":
                continue
            for tool in integ.get("config", {}).get("tools", []):
                name = f"mcp__{_slug(integ['name'])}__{_slug(tool['name'])}"[:64]
                self.mcp_tools[name] = (integ["config"], tool["name"])
                self.definitions.append({"type": "function", "function": {
                    "name": name,
                    "description": f"[MCP {integ['name']}] {tool.get('description', '')}"[:1000],
                    "parameters": tool.get("inputSchema") or {"type": "object", "properties": {}},
                }})

    def handles(self, tool_name: str) -> bool:
        return tool_name in self.mcp_tools or (self.github is not None and tool_name.startswith("github_"))

    async def call(self, sandbox: Sandbox, tool_name: str, args: dict[str, Any]) -> str:
        if tool_name in self.mcp_tools:
            config, name = self.mcp_tools[tool_name]
            return await mcp_call_tool(config, name, args)
        token = get_secret(self.github["id"]) or ""
        repo = args.get("repo") or self.github.get("config", {}).get("repo")
        try:
            if tool_name == "github_clone":
                dest = sandbox.resolve_path(args.get("path") or args["repo"].split("/")[-1])
                if dest.exists():
                    return f"Error: {dest.name} already exists in the workspace"
                await asyncio.to_thread(git_clone, args["repo"], dest, token)
                return f"Cloned {args['repo']} into {dest.relative_to(sandbox.workspace).as_posix()}"
            if tool_name == "github_create_branch":
                return await asyncio.to_thread(git_create_branch, sandbox.workspace, args["branch"])
            if not repo:
                return "Error: no repository given and none connected"
            if tool_name == "github_commit_and_push":
                return await asyncio.to_thread(git_commit_and_push, sandbox.workspace, repo, args["branch"],
                                               args["message"], token)
            if tool_name == "github_open_pr":
                return await github_open_pr(token, repo, args["head"], args.get("base") or "main",
                                            args["title"], args.get("body", ""))
        except IntegrationError as e:
            return f"Error: {e}"
        except KeyError as e:
            return f"Error: {tool_name} is missing required argument {e}"
        return f"Error: Unknown tool '{tool_name}'"
