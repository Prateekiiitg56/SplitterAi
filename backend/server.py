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
    RunRequest,
    RunResult,
    RunStatus,
)
from agentcli.session import list_sessions, save_run_result

# Load .env
load_dotenv()

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

# CORS — allow dashboard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.post("/run", response_model=RunResult)
async def run_task(request: RunRequest):
    """Execute a task through the multi-agent pipeline.

    1. Plan: Decompose task into subtasks (or load manual plan).
    2. Execute: Orchestrator runs subtasks with grouped parallelism.
    3. Persist: Save session to SQLite.
    4. Return: Combined RunResult.
    """
    config = ExecutionConfig()
    sandbox = Sandbox(request.workspace)

    # Build event emitter for real-time WebSocket streaming
    on_event = make_event_emitter()

    # Step 1: Generate or load plan
    if request.plan_file:
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


@app.get("/sessions")
async def get_sessions():
    """List recent sessions for the dashboard sidebar."""
    sessions = list_sessions(limit=20)
    return [s.model_dump() for s in sessions]


@app.get("/agents")
async def get_agents():
    """Get agent role configurations."""
    config = ExecutionConfig()
    return [
        {
            "role": role.value,
            "model_chain": config.get_model_chain(role),
            "status": "idle",
        }
        for role in AgentRole
    ]


# ── WebSocket Endpoint ────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Real-time event stream for the dashboard.

    NFR-5: Every step is visible in real time.
    """
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
