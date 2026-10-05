"""In-memory registry of runs started through the HTTP API.

Active runs stay until they finish; only the newest MAX_FINISHED finished runs are kept
(older ones are read back from the session store).
"""

from __future__ import annotations

import asyncio
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any

MAX_FINISHED = 50
MAX_LOGS = 2000
ACTIVE_STATUSES = {"planning", "executing"}


@dataclass
class Run:
    id: str
    workspace: str
    task: str
    status: str = "planning"
    subtasks: list[dict[str, Any]] = field(default_factory=list)
    logs: deque = field(default_factory=lambda: deque(maxlen=MAX_LOGS))
    result: dict[str, Any] | None = None
    created_at: float = field(default_factory=time.time)
    job: asyncio.Task | None = None

    @property
    def active(self) -> bool:
        return self.status in ACTIVE_STATUSES

    def snapshot(self) -> dict[str, Any]:
        return {
            "run_id": self.id, "workspace": self.workspace, "task": self.task, "status": self.status,
            "subtasks": self.subtasks, "logs": list(self.logs), "result": self.result,
            "created_at": self.created_at,
        }


_RUNS: dict[str, Run] = {}


def create(workspace: str, task: str) -> Run:
    run = Run(id=uuid.uuid4().hex[:12], workspace=workspace, task=task)
    _RUNS[run.id] = run
    return run


def get(run_id: str) -> Run | None:
    return _RUNS.get(run_id)


def for_workspace(workspace: str) -> list[Run]:
    return [r for r in _RUNS.values() if r.workspace == workspace]


def prune() -> None:
    finished = [r for r in _RUNS.values() if not r.active]
    for run in finished[:max(0, len(finished) - MAX_FINISHED)]:
        del _RUNS[run.id]
