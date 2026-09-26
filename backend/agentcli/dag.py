"""Dependency graph helpers shared by the estimator and the orchestrator."""

from __future__ import annotations

import heapq

from .schemas import Subtask


def resolve_deps(subtasks: list[Subtask]) -> dict[str, list[str]]:
    """Explicit depends_on wins; plans without it fall back to group ordering
    (every subtask waits for all subtasks in earlier groups).

    A subtask may only depend on subtasks listed before it, which keeps the graph acyclic.
    """
    if any(st.depends_on for st in subtasks):
        earlier: set[str] = set()
        out: dict[str, list[str]] = {}
        for st in subtasks:
            out[st.id] = [d for d in st.depends_on if d in earlier]
            earlier.add(st.id)
        return out
    # Insertion order follows groups so every dependency precedes its dependents.
    by_group: dict[str, list[str]] = {}
    finished: list[str] = []
    for g in sorted({st.group for st in subtasks}):
        members = [st.id for st in subtasks if st.group == g]
        for sid in members:
            by_group[sid] = list(finished)
        finished += members
    return by_group


def levels(deps: dict[str, list[str]]) -> dict[str, int]:
    """Longest-path depth from the roots, 1-based. Relies on resolve_deps ordering."""
    depth: dict[str, int] = {}
    for sid, ds in deps.items():
        depth[sid] = 1 + max((depth[d] for d in ds), default=0)
    return depth


def simulate(deps: dict[str, list[str]], durations: dict[str, float], slots: int) -> tuple[float, int]:
    """List-schedule the DAG on `slots` workers, critical path first.

    Returns (makespan, peak concurrency). Mirrors how the orchestrator runs:
    a subtask starts once all its dependencies finish and a slot is free.
    """
    children: dict[str, list[str]] = {sid: [] for sid in deps}
    for sid, ds in deps.items():
        for d in ds:
            children.setdefault(d, []).append(sid)

    # Longest remaining path from each node; deps point backwards, so walk the order in reverse.
    tail: dict[str, float] = {}
    for sid in reversed(list(deps)):
        tail[sid] = durations[sid] + max((tail[c] for c in children[sid]), default=0.0)

    pending = {sid: len(ds) for sid, ds in deps.items()}
    ready = [(-tail[sid], sid) for sid, n in pending.items() if n == 0]
    heapq.heapify(ready)
    running: list[tuple[float, str]] = []
    now, peak = 0.0, 0

    while ready or running:
        while ready and len(running) < slots:
            _, sid = heapq.heappop(ready)
            heapq.heappush(running, (now + durations[sid], sid))
        peak = max(peak, len(running))
        now, sid = heapq.heappop(running)
        for c in children[sid]:
            pending[c] -= 1
            if pending[c] == 0:
                heapq.heappush(ready, (-tail[c], c))
    return now, peak
