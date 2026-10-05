"""FastAPI server — HTTP webhook + WebSocket for real-time observability.

FR-23: POST /run accepting {task, workspace}, returning RunResult.
NFR-5: Real-time event streaming via WebSocket.
"""

from __future__ import annotations

import asyncio
import contextvars
import json
import logging
from contextlib import asynccontextmanager
from typing import Any

import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse

from agentcli import runs
from agentcli.config import ExecutionConfig, llm_key_status
from agentcli.graph import run_graph
from agentcli.planner import load_manual_plan
from agentcli.analysis import run_analysis
from agentcli.intent import classify_intent
from agentcli.router import AllModelsFailedError, call_model, stream_model
from agentcli.allocation import MAX_AGENTS, PRESETS, build_strategy, estimate as estimate_strategy
from agentcli.telemetry import record_run, record_subtask
from agentcli.models import select_chain
from agentcli.sandbox import Sandbox, SandboxEscapeError
from agentcli.schemas import (
    AgentRole,
    HealthResponse,
    LogEntry,
    Plan,
    RunRequest,
    RunResult,
    RunStatus,
    Subtask,
    SubtaskStatus,
)
from pydantic import BaseModel, Field

from agentcli.web import (
    RUNNABLE_SUFFIXES, apply_template, design_context, detect_stack, is_web_task, needs_build, new_project_dir,
    planning_guidance, project_entry,
)
from agentcli.tools import kill_processes, run_shell, sandbox_status
from agentcli.session import list_runs, list_sessions, load_run, rename_session, reset_session, save_run_result, save_session
from agentcli import integrations as agent_integrations
from agentcli.integrations import IntegrationError
from agentcli.integrations_store import (
    load_all_integrations,
    save_integration,
    delete_integration as db_delete_integration,
    get_secret as get_integration_secret,
    save_secret as save_integration_secret,
    update_integration_roles,
)
from agentcli.db_supabase import is_supabase_enabled


# Load .env — single source of truth is the project-root .env (see .env.example),
# loaded explicitly so behavior doesn't depend on the server's working directory.
import os
import shutil
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
root_env = str(PROJECT_ROOT / ".env")
load_dotenv(root_env)


def resolve_workspace(workspace: str) -> str:
    """Anchor relative workspace paths at the project root, not the server's cwd.

    The dashboard sends paths like './workspace_output' (relative to the repo),
    while the documented startup runs the server from backend/.
    """
    path = Path(workspace)
    return str(path if path.is_absolute() else (PROJECT_ROOT / path).resolve())


# New projects each get a folder here; the dashboard sends this root to mean "new project".
PROJECTS_ROOT = (PROJECT_ROOT / "workspace_output").resolve()
PROJECTS_ROOT.mkdir(exist_ok=True)

logger = logging.getLogger(__name__)
# Every log line carries the run it belongs to (run=- outside runs), so one run's lines can be grepped out.
CURRENT_RUN: contextvars.ContextVar[str] = contextvars.ContextVar("run_id", default="-")


class RunIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.run_id = CURRENT_RUN.get()
        return True


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] run=%(run_id)s %(message)s")
for _handler in logging.getLogger().handlers:
    _handler.addFilter(RunIdFilter())


# ── WebSocket Connection Manager ─────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections for real-time event broadcasting."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info("WebSocket client connected (%d total)", len(self.active))

    def disconnect(self, ws: WebSocket):
        # broadcast() may already have dropped a dead socket
        if ws in self.active:
            self.active.remove(ws)
        logger.info("WebSocket client disconnected (%d remaining)", len(self.active))

    async def broadcast(self, data: dict[str, Any]):
        """Send data to all connected clients."""
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()
# ── App Factory ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SplitterAI server starting")
    # Open the session DB and run its migrations now, not on the first request.
    await asyncio.to_thread(list_sessions, 1)
    yield
    logger.info("agentcli server shutting down")


app = FastAPI(
    title="agentcli",
    description="Multi-Agent AI Orchestration System",
    version="0.1.0",
    lifespan=lifespan,
)

# Shared Secret & CORS hardening (Phase 5)
import os
from fastapi import Header, Query, HTTPException, status

# Credentialed CORS with a default origin list is only acceptable on a developer machine.
if os.getenv("SPLITTER_ENV", "development").lower() != "development" and not os.getenv("ALLOWED_ORIGINS"):
    raise RuntimeError("ALLOWED_ORIGINS must be set when SPLITTER_ENV is not 'development'.")
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]



# ── Middleware: Rate Limiting & Request Size Caps ────────────────

import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

_rate_limit_records: dict[str, list[float]] = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only budget the expensive calls (LLM planning/runs/chat, uploads, integration
        # changes). Cheap reads like GET /sessions or /files are issued several times per
        # dashboard page load and were tripping the limit during normal navigation.
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)

        rate_limit = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        timestamps = [t for t in _rate_limit_records[client_ip] if now - t < 60]
        _rate_limit_records[client_ip] = timestamps

        if len(timestamps) >= rate_limit:
            return Response(
                content=json.dumps({"detail": f"Rate limit exceeded. Maximum {rate_limit} requests per minute."}),
                status_code=429,
                media_type="application/json",
            )

        _rate_limit_records[client_ip].append(now)
        return await call_next(request)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and content_length.isdigit():
            max_bytes = 50 * 1024 * 1024 if request.url.path == "/workspaces/upload" else 10 * 1024 * 1024
            if int(content_length) > max_bytes:
                return Response(
                    content=json.dumps({"detail": f"Request body payload exceeds maximum allowed size ({max_bytes // (1024*1024)}MB)."}),
                    status_code=413,
                    media_type="application/json",
                )
        return await call_next(request)


class UnhandledErrorMiddleware(BaseHTTPMiddleware):
    """Turn uncaught exceptions into a JSON 500 inside the CORS layer.

    Starlette's default 500 is produced outside CORSMiddleware, so the browser
    reports it as a CORS failure ("backend unreachable") instead of an error.
    """

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            logger.exception("Unhandled error on %s %s", request.method, request.url.path)
            return Response(
                content=json.dumps({"detail": f"Internal server error ({type(e).__name__}). See server logs."}),
                status_code=500,
                media_type="application/json",
            )


app.add_middleware(UnhandledErrorMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
# Added last so it is outermost: 429/413 responses above still carry CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_shared_secret(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Verify shared-secret token if SHARED_SECRET env var is configured."""
    secret = os.getenv("SHARED_SECRET")
    if secret:
        provided = x_api_key or token
        if not provided or provided != secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing shared secret header (X-API-Key) or token query parameter.",
            )



# ── Event Broadcasting Helper ────────────────────────────────────

def make_event_emitter(run: runs.Run | None = None, workspace: str | None = None):
    """on_event callback: tags every LogEntry with its run and workspace, keeps it on the run, broadcasts it.

    Safe to call from worker threads as well as the event loop thread.
    """
    loop = asyncio.get_running_loop()

    def deliver(data: dict[str, Any]) -> None:
        if run:
            run.logs.append(data)
        _spawn(manager.broadcast(data))

    def on_event(entry: LogEntry):
        data = entry.model_copy(update={
            "run_id": run.id if run else None,
            "workspace": run.workspace if run else workspace,
        }).model_dump()
        loop.call_soon_threadsafe(deliver, data)

    return on_event


_background: set[asyncio.Task] = set()


def _spawn(coro) -> None:
    """Fire-and-forget task that is not garbage collected before it finishes."""
    task = asyncio.get_running_loop().create_task(coro)
    _background.add(task)
    task.add_done_callback(_background.discard)


async def publish(run: runs.Run, data: dict[str, Any]) -> None:
    await manager.broadcast({**data, "run_id": run.id, "workspace": run.workspace})


async def sessions_changed() -> None:
    """Tell dashboards to reload the project list (instead of polling /sessions)."""
    await manager.broadcast({"type": "sessions_changed"})


# ── Routes ────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to the interactive API docs."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

STARTED_AT = time.time()


@app.get("/health")
async def health():
    """Liveness plus what the dashboard needs to explain a broken setup (no secrets, no auth)."""
    keys = llm_key_status()
    fake = bool(os.getenv("SPLITTER_FAKE_LLM"))
    return {
        "status": "ok",
        "version": app.version,
        "uptime_s": round(time.time() - STARTED_AT),
        "supabase_enabled": is_supabase_enabled(),
        "llm_ready": fake or any(keys.values()),
        "llm_keys": keys,
        "fake_llm": fake,
        "sandbox": await asyncio.to_thread(sandbox_status),
        "auth_required": bool(os.getenv("SHARED_SECRET")),
        "max_concurrent_agents": ExecutionConfig().max_concurrent_agents,
    }



def project_roots() -> tuple[Path, Path]:
    """Every project lives directly under one of these: generated ones and imported/uploaded ones."""
    from agentcli.workspace_import import DEFAULT_WORKSPACES_ROOT
    return PROJECTS_ROOT, DEFAULT_WORKSPACES_ROOT.resolve()


def project_dir(project_id: str) -> Path | None:
    """The folder of a project id (its folder name), or None when no such project exists."""
    if not project_id or project_id in (".", "..") or "/" in project_id or "\\" in project_id:
        return None
    for base in project_roots():
        folder = base / project_id
        if folder.is_dir():
            return folder
    return None


def _placeholder(title: str, body: str, status_code: int = 200) -> HTMLResponse:
    return HTMLResponse(f"""<!DOCTYPE html>
<html>
<head><title>{title}</title><style>body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0b0f19;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}} .box{{background:#1e293b;padding:30px;border-radius:12px;text-align:center;max-width:500px;}} h2{{color:#60a5fa;}}</style></head>
<body><div class="box"><h2>{title}</h2><p>{body}</p></div></body>
</html>""", status_code=status_code)


PREVIEW_COOKIE = "splitter_preview_token"


@app.get("/preview")
@app.get("/preview/{project_id}")
@app.get("/preview/{project_id}/{file_name:path}")
async def preview_project(request: Request, project_id: str = "", file_name: str = "", token: str | None = Query(None)):
    """Serve one project's site: /preview/<project id>/ (dist/ when the project has a build).

    With SHARED_SECRET set, the first request needs ?token=; it sets a cookie so the page's own
    scripts, styles and images load without it.
    """
    secret = os.getenv("SHARED_SECRET")
    provided = token or request.cookies.get(PREVIEW_COOKIE)
    if secret and provided != secret:
        raise HTTPException(status_code=401, detail="Invalid or missing shared secret token.")

    def respond(response):
        if secret and token == secret:
            response.set_cookie(PREVIEW_COOKIE, secret, httponly=True, samesite="lax", path="/preview")
        return response

    if not project_id:
        return respond(_placeholder("No project selected", "Open a project to preview it."))
    root = project_dir(project_id)
    if not root:
        raise HTTPException(status_code=404, detail="Project not found")
    if request.url.path.rstrip("/") == f"/preview/{project_id}" and not request.url.path.endswith("/"):
        # Relative links (styles.css, app.js) only resolve inside the project with a trailing slash.
        from fastapi.responses import RedirectResponse
        return respond(RedirectResponse(url=f"/preview/{project_id}/" + (f"?token={token}" if token else "")))

    base = root / "dist" if (root / "dist" / "index.html").is_file() else root
    target = (base / file_name).resolve()
    if not target.is_relative_to(root.resolve()):
        raise HTTPException(status_code=403, detail="Forbidden: path escapes the project")
    if target.is_dir():
        target = target / "index.html"
    unbuilt = base == root and needs_build(root)
    if target.is_file() and not (unbuilt and target == root.resolve() / "index.html"):
        return respond(FileResponse(target))
    if target.name != "index.html":
        raise HTTPException(status_code=404, detail="File not found")
    if unbuilt:
        # The raw Vite index.html points at /src/main.jsx and renders blank outside the dev server.
        return respond(_placeholder("Not built yet", "This project has a build step and no up-to-date <code>dist/</code>. "
                                    "It is built when a run finishes; ask for a follow-up run to build it."))
    return respond(_placeholder("Nothing to preview yet", "This project has no <code>index.html</code>. "
                                "If a run is in progress, refresh once the agents finish writing files."))


def workspace_dir(workspace: str) -> Path:
    """A project folder under one of the project roots; anything else is a 400."""
    root = Path(resolve_workspace(workspace)).resolve()
    if root.is_dir() and any(root != base and root.parent == base for base in project_roots()):
        return root
    raise HTTPException(status_code=400, detail="Not a project folder.")


@app.get("/projects/info")
async def project_info(workspace: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Project id (for preview URLs) and what to open: the preview for web projects, else the main file."""
    verify_shared_secret(x_api_key, token)
    root = workspace_dir(workspace)
    return {"project_id": root.name, "workspace": workspace, "entry": await asyncio.to_thread(project_entry, root)}


MAX_VIEW_BYTES = 512 * 1024


@app.get("/files/content")
async def file_content(workspace: str, path: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """One file's text for the viewer: sandboxed, size-capped, binary files reported but not sent."""
    verify_shared_secret(x_api_key, token)
    sandbox = Sandbox(workspace_dir(workspace))
    try:
        target = sandbox.resolve_path(path)
    except SandboxEscapeError:
        raise HTTPException(status_code=403, detail="Path escapes the project")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    size = target.stat().st_size
    with target.open("rb") as f:
        data = f.read(MAX_VIEW_BYTES)
    if b"\0" in data[:8192]:
        return {"path": path, "size": size, "binary": True, "truncated": False, "content": ""}
    return {"path": path, "size": size, "binary": False, "truncated": size > MAX_VIEW_BYTES,
            "content": data.decode("utf-8", errors="replace")}


class RunFileRequest(BaseModel):
    workspace: str
    path: str


@app.post("/projects/run-file")
async def run_file(req: RunFileRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Run a project's Python or Node script in the sandbox and return its output."""
    verify_shared_secret(x_api_key, token)
    sandbox = Sandbox(workspace_dir(req.workspace))
    try:
        target = sandbox.resolve_path(req.path)
    except SandboxEscapeError:
        raise HTTPException(status_code=403, detail="Path escapes the project")
    if not target.is_file() or target.suffix not in RUNNABLE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only .py, .js, .mjs and .cjs files can be run.")
    rel = target.relative_to(sandbox.workspace).as_posix()
    command = f'python "{rel}"' if target.suffix == ".py" else f'node "{rel}"'
    output = await asyncio.to_thread(run_shell, sandbox, command, 60)
    exit_line, _, rest = output.partition("\n")
    exit_code = int(exit_line.split(":")[1]) if exit_line.startswith("Exit code:") else None
    return {"command": command, "exit_code": exit_code, "output": rest if exit_code is not None else output}


SHORT_TASK_CHARS = 200


def planner_config(model: str | None, task: str) -> ExecutionConfig:
    """Planner chain shared by /plan and /runs so plans match: the user's model first, then the
    strongest reasoning models; a short single-deliverable task plans with the fast tier instead."""
    config = ExecutionConfig()
    preset = "fastest" if len(task) < SHORT_TASK_CHARS and "\n" not in task.strip() else "quality"
    config.set_model_chain(AgentRole.planner, select_chain("reasoning", preset, pinned=model))
    return config


@app.post("/plan")
async def plan_task(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Generate an execution plan without executing it — for plan-review-confirm flow."""
    verify_shared_secret(x_api_key, token)
    task = payload.get("task", "")
    history = payload.get("history", [])
    if not task:
        raise HTTPException(status_code=400, detail="Task is required")

    stack = detect_stack(task, payload.get("stack"))
    plan, analysis = await run_analysis(task, planner_config(payload.get("model"), task), history=history,
                                        on_event=make_event_emitter(workspace=payload.get("workspace")),
                                        guidance=planning_guidance(stack))

    return {
        "task": task,
        "subtasks": [st.model_dump() for st in plan.subtasks],
        "analysis": analysis,
        "stack": stack,
    }


def execution_report(result: RunResult, strategy: str, agents: int, estimate: dict) -> dict:
    """Estimated vs actual for one run; also feeds execution history for future estimates."""
    wall_s = (result.total_duration_ms or 0) / 1000
    busy_s = sum((st.duration_ms or 0) for st in result.subtasks) / 1000
    tokens = sum(st.tokens_in + st.tokens_out for st in result.subtasks)
    for st in result.subtasks:
        record_subtask(st.role.value, st.capability, st.size, st.model, st.tokens_in + st.tokens_out,
                       (st.duration_ms or 0) / 1000, st.steps, st.status.value == "success")
    record_run({
        "strategy": strategy, "agent_count": agents, "subtask_count": len(result.subtasks),
        "estimated_time_s": estimate["point_time_s"], "estimated_tokens": estimate["point_tokens"],
        "actual_time_s": round(wall_s, 1), "actual_tokens": tokens, "status": result.status.value,
        "verdict": (result.verification or {}).get("verdict"),
        "worker_models": sorted({st.model for st in result.subtasks if st.model and st.role.value == "coder"
                                 and not st.id.startswith("repair")}),
    })
    return {
        "strategy": strategy,
        "agents": agents,
        "models_used": sorted({st.model for st in result.subtasks if st.model}),
        "estimated": {"time_s": estimate["time_s"], "tokens": estimate["tokens"], "confidence": estimate["confidence"]},
        "actual": {"time_s": round(wall_s, 1), "tokens": tokens},
        "failed_subtasks": sum(1 for st in result.subtasks if st.status.value == "error"),
        "verification": result.verification,
        # Share of agent-time spent working: 100% means every agent was busy for the whole run.
        "parallel_efficiency": round(min(1.0, busy_s / (wall_s * agents)), 2) if wall_s else None,
    }


def confirmed_plan(items: list[dict]) -> Plan:
    """Subtasks the user confirmed in the plan review UI."""
    subtasks = []
    for item in items:
        subtasks.append(Subtask(
            id=str(item.get("id", f"t{len(subtasks)+1}")),
            role=AgentRole(item.get("role", "coder")),
            group=int(item.get("group", 1)),
            instruction=str(item.get("instruction", "")),
            depends_on=[str(d) for d in item.get("depends_on") or []],
            capability=item.get("capability"),
            size=item.get("size"),
        ))
    return Plan(subtasks=subtasks)


def start_run(request: RunRequest) -> runs.Run:
    """Validate the request, pick the workspace and start the job in the background."""
    if request.strategy and request.strategy not in PRESETS:
        raise HTTPException(status_code=400, detail=f"Unknown strategy '{request.strategy}'")
    if not request.task.strip():
        raise HTTPException(status_code=400, detail="Task is required")
    if request.callback_url and not request.callback_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="callback_url must be an http(s) URL")
    try:
        plan = confirmed_plan(request.subtasks) if request.subtasks else None
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid subtasks: {e}")

    workspace = request.workspace
    # The shared projects root means "new project": give it its own folder so projects never mix files.
    # Anything else must be an existing project folder; a client cannot point a run at any path on disk.
    if Path(resolve_workspace(workspace)) == PROJECTS_ROOT:
        folder = new_project_dir(PROJECTS_ROOT, request.task)
        workspace = f"./workspace_output/{folder.name}"
        sandbox = Sandbox(folder)
    else:
        sandbox = Sandbox(workspace_dir(workspace))

    run = runs.create(workspace, request.task)
    run.job = asyncio.create_task(execute_run(run, request, sandbox, plan, follow_up=Path(resolve_workspace(request.workspace)) != PROJECTS_ROOT))
    return run


def previous_summary(workspace: str) -> str | None:
    """What the project's last finished run reported, for follow-up runs in the same folder."""
    for item in list_runs(workspace, limit=5):
        stored = load_run(item["run_id"])
        synthesis = ((stored or {}).get("result") or {}).get("synthesis")
        if synthesis:
            return synthesis
    return None


async def execute_run(run: runs.Run, request: RunRequest, sandbox: Sandbox, plan: Plan | None,
                      follow_up: bool = False) -> RunResult:
    """The whole job: plan (unless confirmed), run the graph, persist, announce completion."""
    CURRENT_RUN.set(run.id)
    logger.info("Run started in %s: %s", run.workspace, request.task[:200])
    on_event = make_event_emitter(run)
    # Follow-up work: the agents see what the previous run in this project did (the files are already there).
    agent_task = request.task
    previous = await asyncio.to_thread(previous_summary, run.workspace) if follow_up else None
    if previous:
        agent_task = (f"{request.task}\n\nThis is a follow-up in an existing project; read the existing files "
                      f"before changing them. What the previous run reported:\n{previous[:4000]}")
        on_event(LogEntry(type="info", role=AgentRole.planner, message="Follow-up: previous run summary added as context"))
    # The project shows up in the dashboard (and survives a refresh) while its first run is still going.
    await asyncio.to_thread(save_session, run.workspace, request.task, RunStatus.executing)
    await sessions_changed()
    stack = detect_stack(request.task, request.stack)
    config = planner_config(request.model, request.task)
    if request.model:
        for r in AgentRole:
            if r != AgentRole.planner:
                config.set_model_chain(r, [request.model] + [m for m in config.get_model_chain(r) if m != request.model])

    try:
        if plan:
            on_event(LogEntry(type="info", role=AgentRole.planner,
                              message=f"Using user-confirmed plan: {len(plan.subtasks)} subtasks"))
        elif request.plan_file:
            plan = load_manual_plan(request.plan_file)
            on_event(LogEntry(type="info", role=AgentRole.planner,
                              message=f"Loaded manual plan: {len(plan.subtasks)} subtasks"))
        else:
            plan, _ = await run_analysis(agent_task, config, on_event=on_event, guidance=planning_guidance(stack))

        estimate = None
        if request.strategy:
            agents = max(1, min(request.agent_count or 1, MAX_AGENTS))
            config.max_concurrent_agents = agents
            plan = Plan(subtasks=build_strategy(plan.subtasks, request.strategy))
            estimate = estimate_strategy(plan.subtasks, agents, request.strategy)
            on_event(LogEntry(type="info", role=AgentRole.planner,
                              message=f"Strategy {request.strategy}: {agents} concurrent agent(s), {len(plan.subtasks)} subtasks"))

        run.status = "executing"
        run.subtasks = [st.model_dump() for st in plan.subtasks]
        await publish(run, {"type": "plan", "subtasks": run.subtasks})

        design = ""
        if is_web_task(request.task, plan):
            starter = apply_template(stack, sandbox.workspace)
            design = design_context(stack, starter)
            on_event(LogEntry(type="info", role=AgentRole.planner,
                              message=f"Web project: {stack} stack" + (f", starter files {', '.join(starter)}" if starter else "")))

        # Workers -> synthesis -> verification -> repair
        result = await run_graph(agent_task, plan, config, sandbox, on_event,
                                 preset=request.strategy or "balanced", design=design)
        if estimate:
            result.report = execution_report(result, request.strategy, config.max_concurrent_agents, estimate)
    except asyncio.CancelledError:
        killed = await asyncio.to_thread(kill_processes, sandbox.workspace)
        on_event(LogEntry(type="error", role=AgentRole.planner,
                          message="Run cancelled" + (f", stopped {killed} running command(s)" if killed else "")))
        result = RunResult(subtasks=[Subtask(**st) for st in run.subtasks], status=RunStatus.cancelled,
                           error="Cancelled by user")
    except Exception as e:
        logger.exception("Run %s failed", run.id)
        on_event(LogEntry(type="error", role=AgentRole.planner, message=f"Run failed: {e}"))
        result = RunResult(subtasks=[Subtask(**st) for st in run.subtasks], status=RunStatus.error, error=str(e))

    result.workspace = run.workspace
    result.run_id = run.id
    storage = next((i for i in INTEGRATIONS_STORE.values()
                    if i["type"] == "supabase_storage" and i["status"] == "connected"), None)
    if storage and result.status != RunStatus.cancelled:
        from agentcli.db_supabase import supabase_upload_signed
        data = await asyncio.to_thread(build_workspace_zip, sandbox.workspace)
        result.artifact_url = await asyncio.to_thread(
            supabase_upload_signed, f"{sandbox.workspace.name}/{run.id}.zip", data, storage["config"]["bucket"])
        on_event(LogEntry(type="info", role=AgentRole.planner,
                          message="Project zip uploaded to Supabase Storage" if result.artifact_url
                          else "Supabase Storage upload failed (see server log)"))
    # Let log events queued from worker threads reach run.logs before they are persisted.
    await asyncio.sleep(0)
    await asyncio.to_thread(save_run_result, run.workspace, request.task, result, list(run.logs))
    await sessions_changed()
    run.result = result.model_dump()
    run.subtasks = run.result["subtasks"]
    run.status = result.status.value
    runs.prune()
    await publish(run, {"type": "complete", "result": run.result})
    if request.callback_url:
        await post_callback(request.callback_url, run.result)
    return result


async def post_callback(url: str, result: dict) -> None:
    """Outbound webhook (n8n): POST the finished RunResult. Failures are logged, never raised."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=result, headers={"X-SplitterAI-Run": result.get("run_id") or ""})
        logger.info("Run %s callback to %s: HTTP %s", result.get("run_id"), url, resp.status_code)
    except httpx.HTTPError as e:
        logger.warning("Run %s callback to %s failed: %s", result.get("run_id"), url, e)


@app.post("/runs")
async def create_run(request: RunRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Start a run in the background. Progress arrives over the WebSocket tagged with run_id."""
    verify_shared_secret(x_api_key, token)
    run = start_run(request)
    return {"run_id": run.id, "workspace": run.workspace}


@app.get("/runs")
async def get_runs(workspace: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Runs of one workspace: active ones first, then finished ones from history."""
    verify_shared_secret(x_api_key, token)
    live = [{k: v for k, v in r.snapshot().items() if k not in ("logs", "result", "subtasks")}
            for r in runs.for_workspace(workspace) if r.active]
    return live + await asyncio.to_thread(list_runs, workspace)


@app.get("/runs/{run_id}")
async def get_run(run_id: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Status, plan, log and result of one run; used to resync after a refresh or reconnect."""
    verify_shared_secret(x_api_key, token)
    run = runs.get(run_id)
    if run:
        return run.snapshot()
    stored = await asyncio.to_thread(load_run, run_id)
    if not stored:
        raise HTTPException(status_code=404, detail="Run not found")
    return stored


@app.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    verify_shared_secret(x_api_key, token)
    run = runs.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if not run.active:
        raise HTTPException(status_code=409, detail=f"Run already {run.status}")
    run.job.cancel()
    return {"run_id": run.id, "status": "cancelling"}


@app.post("/run", response_model=RunResult)
async def run_task(request: RunRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Blocking variant for n8n and scripts: starts a run and waits for its result."""
    verify_shared_secret(x_api_key, token)
    run = start_run(request)
    # A dropped HTTP connection must not cancel the run itself.
    return await asyncio.shield(run.job)


class IntentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)


@app.post("/intent")
async def intent(req: IntentRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Is this console message work for the agents ("task") or a question ("chat")?"""
    verify_shared_secret(x_api_key, token)
    return await classify_intent(req.message)


CHAT_SYSTEM_PROMPTS = {
    "planner": "You are SplitterAI's Planner Agent. Help users break down software projects into clean tasks.",
    "designer": "You are SplitterAI's Designer Agent. Help users with layout, visual hierarchy, typography, color, "
                "accessibility and design tokens for web interfaces.",
    "coder": "You are SplitterAI's Coder Agent. Help users write code, debug functions, and refactor applications.",
    "auditor": "You are SplitterAI's Auditor Agent. Help users review code security, PEP8 standards, and quality.",
    "tester": "You are SplitterAI's Tester Agent. Help users design unit tests, run verification suites, and fix bugs.",
}
CHAT_HANDOFF = (" You answer in chat only and cannot create or change files. When the user wants something built "
                "or changed, say so briefly: they can press \"Run as task\" and the agents will do it.")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    role: str = "coder"
    model: str | None = None
    history: list[dict] = Field(default_factory=list)


def chat_setup(req: ChatRequest) -> tuple[AgentRole, ExecutionConfig, list[str], list[dict]]:
    try:
        role = AgentRole(req.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown role '{req.role}'")
    config = ExecutionConfig()
    chain = config.get_model_chain(role)
    if req.model:
        chain = [req.model] + [m for m in chain if m != req.model]
    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPTS.get(role.value, CHAT_SYSTEM_PROMPTS["coder"]) + CHAT_HANDOFF}]
    for item in req.history[-10:]:
        if item.get("text") and item.get("sender"):
            messages.append({"role": "user" if item["sender"] == "user" else "assistant", "content": str(item["text"])})
    messages.append({"role": "user", "content": req.message.strip()})
    return role, config, chain, messages


@app.post("/chat")
async def chat_with_agent(req: ChatRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """One chat reply from a role's model chain. Chat never touches files; tasks go through /runs."""
    verify_shared_secret(x_api_key, token)
    import datetime
    role, config, chain, messages = chat_setup(req)
    try:
        res = await call_model(messages=messages, model_chain=chain, role=role, config=config)
    except AllModelsFailedError as err:
        raise HTTPException(status_code=502, detail={"message": "Every model in the chain failed.", "attempts": err.attempts})
    reply = res.get("content", "").strip() or "The model returned an empty response. Please try again or rephrase."
    return {"reply": reply, "role": role.value, "timestamp": datetime.datetime.now().strftime("%I:%M:%S %p"),
            "model": res.get("model")}


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Same as /chat, streamed as server-sent events: {"delta"} tokens, then {"done", "model"} or {"error"}."""
    verify_shared_secret(x_api_key, token)
    from fastapi.responses import StreamingResponse
    role, config, chain, messages = chat_setup(req)

    async def events():
        try:
            async for item in stream_model(messages, chain, role, config):
                payload = {"delta": item["delta"]} if "delta" in item else {"done": True, "model": item["model"]}
                yield f"data: {json.dumps(payload)}\n\n"
        except AllModelsFailedError as err:
            yield f"data: {json.dumps({'error': 'Every model in the chain failed.', 'attempts': err.attempts})}\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'error': str(err)[:300]})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/sessions")
async def get_sessions(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """List recent sessions for the dashboard sidebar."""
    verify_shared_secret(x_api_key, token)
    sessions = await asyncio.to_thread(list_sessions, 20)
    return [s.model_dump() for s in sessions]


class RenameSessionRequest(BaseModel):
    workspace: str
    name: str = Field(min_length=1, max_length=120)


@app.patch("/sessions")
async def patch_session(req: RenameSessionRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Rename a project. The name survives later runs in the same workspace."""
    verify_shared_secret(x_api_key, token)
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty.")
    if not await asyncio.to_thread(rename_session, req.workspace, name):
        raise HTTPException(status_code=404, detail="Project not found.")
    await sessions_changed()
    return {"workspace": req.workspace, "name": name}


@app.delete("/sessions")
async def delete_session(workspace: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Delete a project's record, run history and its generated folder under workspace_output."""
    verify_shared_secret(x_api_key, token)
    found = await asyncio.to_thread(reset_session, workspace)
    folder = Path(resolve_workspace(workspace)).resolve()
    # Only project folders directly under a project root are ours to remove; never a root or user paths.
    owned = any(folder.parent == base for base in project_roots())
    if owned and folder.is_dir():
        await asyncio.to_thread(shutil.rmtree, folder, True)
        found = True
    if not found:
        raise HTTPException(status_code=404, detail="Project not found.")
    await sessions_changed()
    return {"deleted": workspace}


@app.get("/agents")
async def get_agents(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Get agent role configurations."""
    verify_shared_secret(x_api_key, token)
    config = ExecutionConfig()
    return [
        {
            "role": role.value,
            "model_chain": config.get_model_chain(role),
        }
        for role in AgentRole
    ]


@app.get("/models")
async def list_models(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Models the router knows (checked against the providers' live model lists), for the model pickers."""
    verify_shared_secret(x_api_key, token)
    from agentcli.models import MODEL_PROFILES, all_models, get_profile
    out = []
    for model_id in [*MODEL_PROFILES, *(m for m in all_models() if m not in MODEL_PROFILES)]:
        profile = get_profile(model_id)
        name = model_id.split("/")[-1]
        out.append({
            "id": model_id,
            "label": name.replace(":free", " (free)"),
            "provider": {"openrouter": "OpenRouter", "gemini": "Google AI"}.get(profile.provider, profile.provider),
            "tier": profile.tier,
            "vision": profile.vision,
            "capabilities": sorted(profile.capabilities),
        })
    return out


@app.get("/agents/quota")
async def get_agent_quotas(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Per-model usage in the current daily quota window and when that window resets."""
    verify_shared_secret(x_api_key, token)
    from agentcli import telemetry
    from agentcli.models import all_models
    return await asyncio.to_thread(telemetry.usage, all_models())


@app.get("/agents/{role}")
async def get_agent_detail(role: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """A role's model chain and its real track record from the execution history (no live status here:
    live state comes from the run the dashboard follows)."""
    verify_shared_secret(x_api_key, token)
    if role not in {r.value for r in AgentRole}:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found")
    from agentcli import telemetry
    done = [r for r in await asyncio.to_thread(telemetry.load, "subtask") if r.get("role") == role]
    return {
        "role": role,
        "modelChain": ExecutionConfig().get_model_chain(AgentRole(role)),
        "subtasks": len(done),
        "successRate": round(100 * sum(1 for r in done if r.get("success")) / len(done)) if done else None,
        "steps": sum(r.get("steps", 0) for r in done),
        "lastActive": max((r.get("ts", 0) for r in done), default=None),
        "logs": [],
    }


@app.get("/files")
async def get_files(workspace: str = ".", x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Sandboxed recursive file tree (never reads outside workspace root)."""
    verify_shared_secret(x_api_key, token)
    sb = Sandbox(workspace_dir(workspace))
    try:
        root_path = sb.resolve_path(".")

        def build_tree(path):
            try:
                rel = str(path.relative_to(root_path)).replace("\\", "/")
                if rel == ".":
                    rel = ""
            except ValueError:
                return {}

            name = path.name if path != root_path else (sb.workspace.name or "workspace")
            if path.is_dir():
                children = []
                for item in sorted(path.iterdir()):
                    if item.name.startswith(".") or item.name in ("node_modules", "__pycache__", "dist", "venv", ".git"):
                        continue
                    child_node = build_tree(item)
                    if child_node:
                        children.append(child_node)
                return {"name": name, "path": rel or ".", "type": "dir", "children": children}
            else:
                return {"name": name, "path": rel, "type": "file", "size": path.stat().st_size}

        tree = await asyncio.to_thread(build_tree, root_path)
        return tree.get("children", [])
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/workspaces/upload")
async def upload_workspace(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    token: str | None = Query(None),
):
    """Upload and extract a project .zip file into a new server workspace."""
    verify_shared_secret(x_api_key, token)

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed for project import.")

    zip_bytes = await file.read()
    if len(zip_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds 50MB limit.")

    try:
        from agentcli.workspace_import import extract_zip_to_workspace

        ws_path, file_count = await asyncio.to_thread(extract_zip_to_workspace, zip_bytes)
        # An imported project is a project like any other: listed, openable, previewable.
        await asyncio.to_thread(save_session, str(ws_path), f"Imported {file.filename}", RunStatus.idle)
        await sessions_changed()
        return {"workspace": str(ws_path), "fileCount": file_count}
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        logger.error(f"Workspace upload failed: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to import workspace: {str(err)}")


# Regenerable or private folders stay out of exports.
EXPORT_SKIP_DIRS = {"node_modules", ".git", "__pycache__", "venv", ".venv", ".splitter"}


def build_workspace_zip(root: Path) -> bytes:
    import io
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in EXPORT_SKIP_DIRS]
            for name in filenames:
                path = Path(dirpath) / name
                if path.is_symlink():
                    continue
                zf.write(path, Path(root.name) / path.relative_to(root))
    return buf.getvalue()


@app.get("/workspaces/export")
async def export_workspace(
    workspace: str,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    token: str | None = Query(None),
):
    """Download a project folder as a .zip."""
    verify_shared_secret(x_api_key, token)
    from fastapi.responses import Response
    from agentcli.workspace_import import DEFAULT_WORKSPACES_ROOT

    root = Path(resolve_workspace(workspace)).resolve()
    # Only project folders the app created or imported, never the roots themselves or anything else on disk.
    allowed = (PROJECTS_ROOT, DEFAULT_WORKSPACES_ROOT.resolve())
    if not root.is_dir() or not any(root != base and root.is_relative_to(base) for base in allowed):
        raise HTTPException(status_code=400, detail="Only a project folder can be exported.")

    data = await asyncio.to_thread(build_workspace_zip, root)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{root.name}.zip"'},
    )


@app.delete("/workspaces/cleanup")
async def cleanup_workspaces(
    max_age_seconds: int = Query(604800, description="Purge workspaces older than specified seconds (default 7 days)"),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    token: str | None = Query(None),
):
    """Purge old extracted workspaces exceeding TTL retention policy."""
    verify_shared_secret(x_api_key, token)
    try:
        from agentcli.workspace_import import cleanup_expired_workspaces
        deleted_count, freed_bytes = await asyncio.to_thread(cleanup_expired_workspaces, max_age_seconds=max_age_seconds)
        return {
            "success": True,
            "deletedCount": deleted_count,
            "freedBytes": freed_bytes,
            "message": f"Purged {deleted_count} expired workspace(s), freed {freed_bytes / (1024*1024):.2f} MB",
        }
    except Exception as err:
        logger.error(f"Workspace cleanup failed: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cleanup workspaces: {str(err)}")



@app.post("/workflows/import-n8n")
async def import_n8n_workflow(
    payload: dict,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    token: str | None = Query(None),
):
    """Import an n8n workflow export JSON and return a decomposed Plan."""
    verify_shared_secret(x_api_key, token)
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid request body. Expected JSON object.")

    try:
        from agentcli.n8n_import import parse_n8n_workflow

        plan = parse_n8n_workflow(payload)
        task_name = payload.get("name", "n8n Workflow Import")
        return {
            "task": task_name,
            "subtasks": [st.model_dump() for st in plan.subtasks],
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        logger.error(f"n8n import failed: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse n8n workflow: {str(err)}")


# ── Integrations (validated against the real service, secrets encrypted server-side) ────────

# Loaded once; agents read the same dict (agentcli.integrations.REGISTRY).
INTEGRATIONS_STORE = load_all_integrations()
agent_integrations.REGISTRY = INTEGRATIONS_STORE
ALL_ROLES = [r.value for r in AgentRole if r != AgentRole.unassigned]


async def _supabase_bucket_check(bucket: str) -> None:
    if not is_supabase_enabled():
        raise IntegrationError("Supabase is not configured (SUPABASE_URL / SUPABASE_KEY) or the client failed to start.")
    from agentcli.db_supabase import get_supabase_client
    try:
        await asyncio.to_thread(lambda: get_supabase_client().storage.from_(bucket).list())
    except Exception as e:
        raise IntegrationError(f"Supabase Storage bucket '{bucket}': {e}")


async def _validate(itype: str, payload: dict, secret: str | None) -> tuple[str, dict, list[str]]:
    """Talk to the service. Returns (display name, config, scopes) or raises IntegrationError."""
    if itype == "github":
        if not secret:
            raise IntegrationError("A GitHub access token is required.")
        info = await agent_integrations.github_validate(secret, payload.get("repo") or None)
        name = f"GitHub ({info['repo'] or info['login']})"
        return name, {"login": info["login"], "repo": info["repo"]}, info["scopes"]
    if itype == "mcp":
        config = agent_integrations.mcp_config(payload.get("url") or "")
        config["tools"] = await agent_integrations.mcp_list_tools(config)
        return payload.get("name") or "MCP server", config, ["mcp:tools"]
    if itype == "supabase_storage":
        from agentcli.db_supabase import get_storage_bucket_name
        bucket = payload.get("bucket") or get_storage_bucket_name()
        await _supabase_bucket_check(bucket)
        return payload.get("name") or "Supabase Storage", {"bucket": bucket}, ["storage:upload", "storage:sign"]
    raise IntegrationError(f"Unknown integration type '{itype}'. Supported: github, mcp, supabase_storage.")


@app.get("/integrations")
async def get_integrations(type: str | None = None, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Connected integrations, never with their secrets."""
    verify_shared_secret(x_api_key, token)
    return [i for i in INTEGRATIONS_STORE.values() if not type or i["type"] == type]


@app.post("/integrations/connect")
async def connect_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Validate against the service, store the secret encrypted, return the integration (without it)."""
    verify_shared_secret(x_api_key, token)
    itype = payload.get("type") or ""
    roles = [r for r in payload.get("allowedRoles") or ALL_ROLES if r in ALL_ROLES]
    secret = (payload.get("token") or "").strip() or None
    try:
        name, config, scopes = await _validate(itype, payload, secret)
    except IntegrationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    import datetime
    now = datetime.datetime.now()
    integration = {
        "id": f"int-{int(now.timestamp() * 1000)}",
        "type": itype,
        "name": name,
        "status": "connected",
        "connectedAt": now.strftime("%Y-%m-%d %H:%M:%S"),
        "config": config,
        "scopes": scopes,
        "allowedRoles": roles,
        "lastError": None,
    }
    if secret:
        await asyncio.to_thread(save_integration_secret, integration["id"], secret)
    INTEGRATIONS_STORE[integration["id"]] = integration
    await asyncio.to_thread(save_integration, integration)
    return integration


def _integration(iid: str) -> dict:
    integration = INTEGRATIONS_STORE.get(iid or "")
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found.")
    return integration


@app.post("/integrations/test")
async def test_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Re-check a connection now; updates its status and last error."""
    verify_shared_secret(x_api_key, token)
    integration = _integration(payload.get("id"))
    secret = await asyncio.to_thread(get_integration_secret, integration["id"])
    retest = {**integration.get("config", {}), "name": integration["name"]}
    try:
        _, config, scopes = await _validate(integration["type"], retest, secret)
        integration.update(status="connected", lastError=None, config=config, scopes=scopes)
    except IntegrationError as e:
        integration.update(status="error", lastError=str(e))
    await asyncio.to_thread(save_integration, integration)
    return integration


@app.post("/integrations/disconnect")
async def disconnect_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Forget the integration and delete its stored secret."""
    verify_shared_secret(x_api_key, token)
    iid = payload.get("id")
    _integration(iid)
    del INTEGRATIONS_STORE[iid]
    await asyncio.to_thread(db_delete_integration, iid)
    return {"success": True, "message": "Integration disconnected and its stored credentials deleted."}


@app.post("/integrations/reconfigure")
async def reconfigure_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Change which agent roles may use an integration."""
    verify_shared_secret(x_api_key, token)
    integration = _integration(payload.get("id"))
    roles = payload.get("allowedRoles")
    if roles is not None:
        integration["allowedRoles"] = [r for r in roles if r in ALL_ROLES]
        await asyncio.to_thread(update_integration_roles, integration["id"], integration["allowedRoles"])
    return integration


def _github() -> tuple[dict, str]:
    github = next((i for i in INTEGRATIONS_STORE.values() if i["type"] == "github"), None)
    secret = get_integration_secret(github["id"]) if github else None
    if not github or not secret:
        raise HTTPException(status_code=400, detail="Connect GitHub on the Integrations page first.")
    return github, secret


@app.get("/integrations/github/repos")
async def github_repos(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    verify_shared_secret(x_api_key, token)
    _, secret = await asyncio.to_thread(_github)
    try:
        return await agent_integrations.github_repos(secret)
    except IntegrationError as e:
        raise HTTPException(status_code=400, detail=str(e))


class GithubImportRequest(BaseModel):
    repo: str


@app.post("/integrations/github/import")
async def github_import(req: GithubImportRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Clone a repository into a new project (next to uploaded projects)."""
    verify_shared_secret(x_api_key, token)
    _, secret = await asyncio.to_thread(_github)
    from agentcli.workspace_import import DEFAULT_WORKSPACES_ROOT
    import uuid
    root = DEFAULT_WORKSPACES_ROOT.resolve()
    root.mkdir(parents=True, exist_ok=True)
    dest = root / f"{req.repo.split('/')[-1][:40]}-{uuid.uuid4().hex[:6]}"
    try:
        await asyncio.to_thread(agent_integrations.git_clone, req.repo, dest, secret)
    except IntegrationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await asyncio.to_thread(save_session, str(dest), f"Imported {req.repo}", RunStatus.idle)
    await sessions_changed()
    return {"workspace": str(dest)}


class GithubPushRequest(BaseModel):
    workspace: str
    branch: str = Field(min_length=1, max_length=200)
    message: str = Field(default="Update from SplitterAI", min_length=1, max_length=500)
    repo: str | None = None


@app.post("/integrations/github/push")
async def github_push(req: GithubPushRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Commit the project and push it as a branch of the connected (or given) repository."""
    verify_shared_secret(x_api_key, token)
    root = workspace_dir(req.workspace)
    github, secret = await asyncio.to_thread(_github)
    repo = req.repo or github["config"].get("repo")
    if not repo:
        raise HTTPException(status_code=400, detail="Pick a repository: the GitHub connection has none.")
    try:
        message = await asyncio.to_thread(agent_integrations.git_commit_and_push, root, repo, req.branch, req.message, secret)
    except IntegrationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": message, "url": f"https://github.com/{repo}/tree/{req.branch}"}


# ── Supabase Storage Status Endpoint ──────────────────────────────

@app.get("/storage/status")
async def storage_status(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Return Supabase Storage connection status."""
    verify_shared_secret(x_api_key, token)
    from agentcli.db_supabase import get_storage_bucket_name
    enabled = is_supabase_enabled()
    return {
        "enabled": enabled,
        "bucket": get_storage_bucket_name() if enabled else None,
        "supabase_url": os.getenv("SUPABASE_URL", "").strip() if enabled else None,
    }

# ── WebSocket Endpoint ────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str | None = Query(None),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    """Real-time event stream for the dashboard."""
    secret = os.getenv("SHARED_SECRET")
    if secret:
        provided = token or x_api_key or ws.headers.get("x-api-key")
        if not provided or provided != secret:
            await ws.close(code=4001, reason="Unauthorized shared secret token")
            return

    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)



# ── Main ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
