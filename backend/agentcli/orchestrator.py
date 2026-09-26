"""Orchestrator — grouped parallel execution of subtask plans.

FR-12: Subtasks run as soon as their dependencies finish (DAG order).
FR-13: Isolated message history per subtask (by construction — each AgentWorker is independent).
FR-14: Collect outputs into combined RunResult.
FR-15: Semaphore limits max concurrent agents.
FR-16: One subtask failure doesn't kill siblings — errors captured per-subtask.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Callable, Optional

from .config import ExecutionConfig
from .dag import resolve_deps
from .sandbox import Sandbox
from .schemas import (
    AgentRole,
    LogEntry,
    LogType,
    Plan,
    RunResult,
    RunStatus,
    Subtask,
    SubtaskStatus,
)
from .worker import AgentWorker

logger = logging.getLogger(__name__)


class Orchestrator:
    """Execute a Plan by running groups sequentially and subtasks within a group concurrently."""

    def __init__(
        self,
        config: ExecutionConfig,
        sandbox: Sandbox,
        on_event: Optional[Callable[[LogEntry], None]] = None,
        context: Optional[str] = None,
    ):
        self.config = config
        self.context = context
        self.sandbox = sandbox
        self.on_event = on_event
        self._semaphore = asyncio.Semaphore(config.max_concurrent_agents)

    def _emit(self, entry: LogEntry) -> None:
        if self.on_event:
            self.on_event(entry)

    async def _run_subtask(self, subtask: Subtask) -> Subtask:
        """Run a single subtask with concurrency limiting."""
        async with self._semaphore:
            worker = AgentWorker(
                role=subtask.role,
                config=self.config,
                sandbox=self.sandbox,
                on_event=self.on_event,
                context=self.context,
            )
            return await worker.run(subtask)

    async def execute(self, plan: Plan) -> RunResult:
        """Execute the plan as a dependency graph.

        A subtask starts as soon as all of its dependencies finish (see dag.resolve_deps;
        plans without depends_on fall back to group ordering). The semaphore caps how
        many run at once — that cap is the strategy's agent count.
        """
        start_time = time.time()
        deps = resolve_deps(plan.subtasks)
        by_id = {st.id: st for st in plan.subtasks}
        done: dict[str, asyncio.Event] = {sid: asyncio.Event() for sid in by_id}
        abort_on_error = getattr(self.config, "abort_on_group_error", False)

        self._emit(LogEntry(
            type=LogType.info,
            message=f"Executing plan: {len(plan.subtasks)} subtasks, up to "
                    f"{self.config.max_concurrent_agents} concurrent agent(s)",
        ))

        all_completed: list[Subtask] = []
        results: dict[str, str] = {}

        async def run_node(st: Subtask) -> None:
            for d in deps[st.id]:
                await done[d].wait()
            try:
                if abort_on_error and any(by_id[d].status == SubtaskStatus.error for d in deps[st.id]):
                    st.status = SubtaskStatus.error
                    st.error = "Cancelled due to prerequisite group failure"
                    st.finished_at = time.time()
                    results[st.id] = f"CANCELLED: {st.error}"
                    all_completed.append(st)
                    return
                try:
                    result = await self._run_subtask(st)
                except Exception as e:  # FR-16: one failure never kills siblings
                    st.status = SubtaskStatus.error
                    st.error = str(e)[:500]
                    st.finished_at = time.time()
                    if st.started_at:
                        st.duration_ms = (st.finished_at - st.started_at) * 1000
                    self._emit(LogEntry(
                        type=LogType.error, role=st.role, subtask_id=st.id,
                        message=f"Subtask {st.id} failed: {str(e)[:200]}",
                    ))
                    result = st
                by_id[st.id] = result
                all_completed.append(result)
                results[result.id] = result.output or result.error or ""
            finally:
                done[st.id].set()

        await asyncio.gather(*(run_node(st) for st in plan.subtasks))

        # Build final result
        total_duration = (time.time() - start_time) * 1000
        has_errors = any(st.status == SubtaskStatus.error for st in all_completed)

        run_result = RunResult(
            subtasks=all_completed,
            results=results,
            status=RunStatus.error if has_errors else RunStatus.done,
            total_duration_ms=total_duration,
        )

        self._emit(LogEntry(
            type=LogType.info,
            message=f"Execution complete: {len(all_completed)} subtasks in {total_duration:.0f}ms"
                    + (f" ({sum(1 for s in all_completed if s.status == SubtaskStatus.error)} errors)" if has_errors else ""),
        ))

        return run_result
