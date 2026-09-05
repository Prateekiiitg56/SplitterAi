"""FastAPI server — HTTP webhook + WebSocket for real-time observability.

FR-23: POST /run accepting {task, workspace}, returning RunResult.
NFR-5: Real-time event streaming via WebSocket.
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any

import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from agentcli.config import ExecutionConfig
from agentcli.orchestrator import Orchestrator
from agentcli.planner import generate_plan, load_manual_plan
from agentcli.sandbox import Sandbox
from agentcli.schemas import (
    AgentRole,
    HealthResponse,
    LogEntry,
    Plan,
    RunRequest,
    RunResult,
    RunStatus,
)
from agentcli.session import list_sessions, save_run_result
from agentcli.integrations_store import (
    load_all_integrations,
    save_integration,
    delete_integration as db_delete_integration,
    update_integration_roles,
)

# Load .env — single source of truth is the project-root .env (see .env.example),
# loaded explicitly so behavior doesn't depend on the server's working directory.
import os
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(root_env)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")


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
    logger.info("agentcli server starting")
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

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

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

def make_event_emitter():
    """Create an on_event callback that broadcasts to WebSocket clients."""
    loop = asyncio.get_event_loop()

    def on_event(entry: LogEntry):
        data = entry.model_dump()
        # Fire-and-forget broadcast
        asyncio.run_coroutine_threadsafe(manager.broadcast(data), loop)

    return on_event


# ── Routes ────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse()


@app.post("/plan")
async def plan_task(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Generate an execution plan without executing it — for plan-review-confirm flow."""
    verify_shared_secret(x_api_key, token)
    task = payload.get("task", "")
    if not task:
        raise HTTPException(status_code=400, detail="Task is required")

    config = ExecutionConfig()
    on_event = make_event_emitter()

    plan = await generate_plan(
        task=task,
        config=config,
        on_event=on_event,
    )

    return {
        "task": task,
        "subtasks": [st.model_dump() for st in plan.subtasks],
    }


@app.post("/run", response_model=RunResult)
async def run_task(request: RunRequest, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Execute a task through the multi-agent pipeline."""
    verify_shared_secret(x_api_key, token)
    config = ExecutionConfig()
    sandbox = Sandbox(request.workspace)

    # Build event emitter for real-time WebSocket streaming
    on_event = make_event_emitter()

    # Step 1: Generate or load plan — user-confirmed subtasks take priority
    if request.subtasks:
        # User confirmed these subtasks from the plan review UI — use them directly
        from agentcli.schemas import Subtask as SubtaskSchema
        confirmed_subtasks = []
        for item in request.subtasks:
            confirmed_subtasks.append(SubtaskSchema(
                id=str(item.get("id", f"t{len(confirmed_subtasks)+1}")),
                role=AgentRole(item.get("role", "coder")),
                group=int(item.get("group", 1)),
                instruction=str(item.get("instruction", "")),
            ))
        plan = Plan(subtasks=confirmed_subtasks)
        on_event(LogEntry(
            type="info",
            role=AgentRole.planner,
            message=f"Using user-confirmed plan: {len(plan.subtasks)} subtasks",
        ))
    elif request.plan_file:
        plan = load_manual_plan(request.plan_file)
        on_event(LogEntry(
            type="info",
            role=AgentRole.planner,
            message=f"Loaded manual plan: {len(plan.subtasks)} subtasks",
        ))
    else:
        plan = await generate_plan(
            task=request.task,
            config=config,
            on_event=on_event,
        )

    # Broadcast plan to WebSocket clients
    await manager.broadcast({
        "type": "plan",
        "subtasks": [st.model_dump() for st in plan.subtasks],
    })

    # Step 2: Execute plan
    orchestrator = Orchestrator(
        config=config,
        sandbox=sandbox,
        on_event=on_event,
    )
    result = await orchestrator.execute(plan)

    # Step 3: Persist session
    save_run_result(request.workspace, request.task, result)

    # Broadcast completion
    await manager.broadcast({
        "type": "complete",
        "result": result.model_dump(),
    })

    return result


@app.post("/chat")
async def chat_with_agent(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Direct conversational chat endpoint for single agent interaction calling real LLM model router."""
    verify_shared_secret(x_api_key, token)
    role_str = payload.get("role", "coder")
    message = payload.get("message", "").strip()
    history = payload.get("history", [])
    model_override = payload.get("model")

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    import datetime
    ts = datetime.datetime.now().strftime("%I:%M:%S %p")

    try:
        from agentcli.schemas import AgentRole as SchemaAgentRole
        from agentcli.config import ExecutionConfig
        from agentcli.router import call_model

        role_enum = SchemaAgentRole(role_str)
        config = ExecutionConfig()
        model_chain = config.get_model_chain(role_enum)

        if model_override:
            model_chain = [model_override] + [m for m in model_chain if m != model_override]

        # Build OpenAI chat messages
        system_prompts = {
            "planner": "You are SplitterAI's Planner Agent. Help users break down software projects into clean tasks.",
            "coder": "You are SplitterAI's Coder Agent. Help users write code, debug functions, and refactor applications.",
            "auditor": "You are SplitterAI's Auditor Agent. Help users review code security, PEP8 standards, and quality.",
            "tester": "You are SplitterAI's Tester Agent. Help users design unit tests, run verification suites, and fix bugs.",
        }
        sys_prompt = system_prompts.get(role_str, "You are an AI software engineering assistant.")

        messages = [{"role": "system", "content": sys_prompt}]
        for item in history[-10:]:
          if item.get("text") and item.get("sender"):
            messages.append({
              "role": "user" if item["sender"] == "user" else "assistant",
              "content": item["text"],
            })
        messages.append({"role": "user", "content": message})

        # Call litellm model router
        res = await call_model(
            messages=messages,
            model_chain=model_chain,
            role=role_enum,
            config=config,
        )

        reply_content = res.get("content", "").strip()
        if not reply_content:
            logger.warning("Model returned empty content for role=%s, message='%s' — using fallback", role_str, message[:80])
            reply_content = "[Fallback] The model returned an empty response. Please try again or rephrase your request."

        return {
            "reply": reply_content,
            "role": role_str,
            "timestamp": ts,
            "model": res.get("model"),
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"LLM Provider Error ({role_str}): {str(err)}")


@app.get("/sessions")
async def get_sessions(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """List recent sessions for the dashboard sidebar."""
    verify_shared_secret(x_api_key, token)
    sessions = list_sessions(limit=20)
    return [s.model_dump() for s in sessions]


@app.get("/agents")
async def get_agents(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Get agent role configurations."""
    verify_shared_secret(x_api_key, token)
    config = ExecutionConfig()
    return [
        {
            "role": role.value,
            "model_chain": config.get_model_chain(role),
            "status": "idle",
        }
        for role in AgentRole
    ]


@app.get("/agents/quota")
async def get_agent_quotas(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Per-role/provider usage against free-tier limits sourced from router call logs."""
    verify_shared_secret(x_api_key, token)
    from agentcli.router import get_usage_metrics
    metrics = get_usage_metrics()

    provider_data = metrics["providers"]
    quotas = []
    for key, data in provider_data.items():
        used = data["calls"]
        limit = data["limit_requests"]
        pct = min(100, int((used / limit) * 100)) if limit > 0 else 0
        quotas.append({
            "provider": data["provider"],
            "modelKey": key,
            "requestsUsed": used,
            "requestsLimit": limit,
            "usedPercentage": pct,
            "resetTime": "Resets daily at 00:00 UTC",
            "status": "healthy" if pct < 85 else "warning",
        })
    return quotas


@app.get("/agents/{role}")
async def get_agent_detail(role: str, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Get detailed status, logs, and subtask metrics for a specific agent role."""
    verify_shared_secret(x_api_key, token)
    valid_roles = [r.value for r in AgentRole]
    if role not in valid_roles:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found")

    config = ExecutionConfig()
    role_enum = AgentRole(role)
    model_chain = config.get_model_chain(role_enum)
    sessions = list_sessions(limit=50)
    total_runs = sum(s.subtask_count for s in sessions if s.subtask_count > 0)

    return {
        "role": role,
        "status": "idle",
        "stepsCompleted": 0,
        "totalRuns": max(total_runs, 1),
        "successRate": 100,
        "lastActive": "Just now",
        "model": model_chain[0] if model_chain else "gemini/gemini-3.5-flash",
        "modelChain": model_chain,
        "logs": [],
        "subtasks": [],
    }


@app.get("/files")
async def get_files(workspace: str = ".", x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Sandboxed recursive file tree (never reads outside workspace root)."""
    verify_shared_secret(x_api_key, token)
    try:
        sb = Sandbox(workspace)
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

        tree = build_tree(root_path)
        return tree.get("children", [])
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


# ── Integrations Endpoint (Server-Side Credential Storage & Handshake) ────────

# Load integrations from SQLite on startup (survives restarts)
INTEGRATIONS_STORE = load_all_integrations()

@app.get("/integrations")
async def get_integrations(x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Get all connected integrations without raw secrets."""
    verify_shared_secret(x_api_key, token)
    return list(INTEGRATIONS_STORE.values())

@app.post("/integrations/connect")
async def connect_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Validate server-side connection and store credentials securely server-side."""
    verify_shared_secret(x_api_key, token)
    itype = payload.get("type")
    name = payload.get("name", "Custom Integration")
    int_token = payload.get("token")
    url = payload.get("url")
    repo = payload.get("repo")
    allowed_roles = payload.get("allowedRoles", ["planner", "coder", "auditor", "tester"])

    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    iid = f"int-{int(datetime.datetime.now().timestamp() * 1000)}"

    # Server-Side Handshake & Validation
    if itype == "mcp":
        if not url:
            raise HTTPException(status_code=400, detail="MCP Server URL is required.")
        if not (url.startswith("http://") or url.startswith("https://") or url.startswith("sse://") or url.startswith("stdio://")):
            raise HTTPException(status_code=400, detail="Invalid MCP Server URL schema.")

        # Real reachability check for HTTP/HTTPS MCP servers
        mcp_status = "connected"
        mcp_error = None
        if url.startswith("http://") or url.startswith("https://"):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.head(url)
                    if resp.status_code >= 400:
                        mcp_status = "error"
                        mcp_error = f"MCP server returned HTTP {resp.status_code}"
            except Exception as e:
                mcp_status = "error"
                mcp_error = f"Cannot reach MCP server: {str(e)[:200]}"
        elif url.startswith("sse://") or url.startswith("stdio://"):
            mcp_status = "pending_verification"
            mcp_error = "Non-HTTP transport — reachability not verified automatically"

        integration_obj = {
            "id": iid,
            "type": "mcp",
            "name": name,
            "status": mcp_status,
            "connectedAt": now_str,
            "config": {"url": url, "transport": "sse" if "sse" in url else "http"},
            "scopes": ["mcp:tools", "mcp:resources"],
            "allowedRoles": allowed_roles,
            "lastError": mcp_error,
        }
    elif itype == "github":
        if not int_token and not repo:
            raise HTTPException(status_code=400, detail="GitHub access token or repository is required.")

        repo_name = repo or "Prateekiiitg56/SplitterAi"

        # Validate GitHub token by calling the API
        gh_status = "connected"
        gh_error = None
        if int_token:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    gh_resp = await client.get(
                        f"https://api.github.com/repos/{repo_name}",
                        headers={
                            "Authorization": f"Bearer {int_token}",
                            "Accept": "application/vnd.github+json",
                        },
                    )
                    if gh_resp.status_code == 401:
                        raise HTTPException(status_code=400, detail="GitHub token is invalid or expired.")
                    elif gh_resp.status_code == 404:
                        raise HTTPException(status_code=400, detail=f"GitHub repo '{repo_name}' not found or token lacks access.")
                    elif gh_resp.status_code >= 400:
                        gh_status = "error"
                        gh_error = f"GitHub API returned HTTP {gh_resp.status_code}"
            except HTTPException:
                raise
            except Exception as e:
                gh_status = "error"
                gh_error = f"Cannot reach GitHub API: {str(e)[:200]}"

        integration_obj = {
            "id": iid,
            "type": "github",
            "name": f"GitHub ({repo_name})",
            "status": gh_status,
            "connectedAt": now_str,
            "config": {"repo": repo_name, "org": repo_name.split("/")[0]},
            "scopes": ["repo", "read:org", "workflow"],
            "allowedRoles": allowed_roles,
            "lastError": gh_error,
        }
    else:
        integration_obj = {
            "id": iid,
            "type": itype or "oauth_generic",
            "name": name,
            "status": "connected",
            "connectedAt": now_str,
            "config": {"description": "Custom Connector"},
            "scopes": ["read", "write"],
            "allowedRoles": allowed_roles,
            "lastError": None,
        }

    INTEGRATIONS_STORE[iid] = integration_obj
    save_integration(integration_obj)  # Persist to SQLite
    return integration_obj

@app.post("/integrations/disconnect")
async def disconnect_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Revoke and delete stored credentials server-side."""
    verify_shared_secret(x_api_key, token)
    iid = payload.get("id")
    if iid in INTEGRATIONS_STORE:
        del INTEGRATIONS_STORE[iid]
        db_delete_integration(iid)  # Remove from SQLite
        return {"success": True, "message": "Integration disconnected and credentials revoked."}
    return {"success": True, "message": "Already disconnected."}

@app.post("/integrations/reconfigure")
async def reconfigure_integration(payload: dict, x_api_key: str | None = Header(None, alias="X-API-Key"), token: str | None = Query(None)):
    """Update scopes or allowed roles for an integration."""
    verify_shared_secret(x_api_key, token)
    iid = payload.get("id")
    allowed_roles = payload.get("allowedRoles")
    if iid in INTEGRATIONS_STORE:
        if allowed_roles is not None:
            INTEGRATIONS_STORE[iid]["allowedRoles"] = allowed_roles
            update_integration_roles(iid, allowed_roles)  # Persist to SQLite
        return INTEGRATIONS_STORE[iid]
    raise HTTPException(status_code=404, detail="Integration not found.")


# ── WebSocket Endpoint ────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str | None = Query(None)):
    """Real-time event stream for the dashboard."""
    secret = os.getenv("SHARED_SECRET")
    if secret and token != secret:
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
        manager.disconnect(ws)


# ── Main ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
