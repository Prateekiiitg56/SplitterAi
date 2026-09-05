"""Pydantic data models for agentcli — mirrors the PRD data model exactly."""

from __future__ import annotations

import time
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────

class AgentRole(str, Enum):
    planner = "planner"
    coder = "coder"
    auditor = "auditor"
    tester = "tester"
    unassigned = "unassigned"


class SubtaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    success = "success"
    error = "error"


class RunStatus(str, Enum):
    idle = "idle"
    planning = "planning"
    executing = "executing"
    done = "done"
    error = "error"


class LogType(str, Enum):
    model_request = "model_request"
    model_response = "model_response"
    model_fallback = "model_fallback"
    tool_call = "tool_call"
    tool_result = "tool_result"
    plan_generated = "plan_generated"
    group_start = "group_start"
    group_end = "group_end"
    subtask_start = "subtask_start"
    subtask_end = "subtask_end"
    sandbox_block = "sandbox_block"
    info = "info"
    error = "error"


# ── Core Models ───────────────────────────────────────────────────

class Subtask(BaseModel):
    """One unit of work within a Plan."""
    id: str
    role: AgentRole
    group: int
    instruction: str
    status: SubtaskStatus = SubtaskStatus.pending
    model: Optional[str] = None
    output: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    duration_ms: Optional[float] = None
    steps: int = 0


class Plan(BaseModel):
    """An ordered list of subtasks produced by the Planner or supplied manually."""
    subtasks: list[Subtask]


class RunResult(BaseModel):
    """Combined result of executing a Plan."""
    subtasks: list[Subtask]
    results: dict[str, str] = Field(default_factory=dict)
    status: RunStatus = RunStatus.done
    total_duration_ms: Optional[float] = None


class LogEntry(BaseModel):
    """A single observability event in the execution stream."""
    id: str = Field(default_factory=lambda: f"log-{int(time.time() * 1000)}")
    timestamp: str = Field(
        default_factory=lambda: time.strftime("%H:%M:%S")
    )
    type: LogType
    role: Optional[AgentRole] = None
    subtask_id: Optional[str] = None
    model: Optional[str] = None
    message: str
    detail: Optional[str] = None


# ── Session / Persistence ─────────────────────────────────────────

class SessionEntry(BaseModel):
    """A saved workspace session."""
    workspace: str
    task: str
    status: RunStatus = RunStatus.idle
    created_at: str = Field(
        default_factory=lambda: time.strftime("%I:%M %p")
    )
    subtask_count: int = 0
    messages_json: Optional[str] = None
    updated_at: Optional[float] = None


# ── Request / Response (API Surface) ──────────────────────────────

class RunRequest(BaseModel):
    """POST /run request body."""
    task: str
    workspace: str
    model: Optional[str] = None
    plan_file: Optional[str] = None  # FR-8: manual plan mode
    subtasks: Optional[list[dict]] = None  # User-confirmed subtasks from plan review UI


class HealthResponse(BaseModel):
    """GET /health response."""
    status: str = "ok"
    version: str = "0.1.0"


class AgentStatusResponse(BaseModel):
    """Agent status for the dashboard."""
    role: AgentRole
    status: str = "idle"
    current_task: Optional[str] = None
    model: Optional[str] = None
    subtask_id: Optional[str] = None
    steps_completed: int = 0
    total_runs: int = 0
    success_rate: float = 100.0
