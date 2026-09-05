"""Orchestrator — grouped parallel execution of subtask plans.

FR-12: Same-group subtasks run concurrently; groups run in sequence.
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
    ):
        self.config = config
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
            )
            return await worker.run(subtask)

    async def execute(self, plan: Plan) -> RunResult:
        """Execute the full plan.

        Groups are sorted ascending by group number.
        Within each group, all subtasks run concurrently (up to max_concurrent_agents).
        Group N+1 doesn't start until group N is fully complete.
        """
        start_time = time.time()

        # Group subtasks by group number
        groups: dict[int, list[Subtask]] = {}
        for st in plan.subtasks:
            groups.setdefault(st.group, []).append(st)
        group_nums = sorted(groups.keys())

        self._emit(LogEntry(
            type=LogType.info,
            message=f"Executing plan: {len(plan.subtasks)} subtasks in {len(group_nums)} groups",
        ))

        all_completed: list[Subtask] = []
        results: dict[str, str] = {}
        abort_on_error = getattr(self.config, "abort_on_group_error", False)
        group_failed = False

        for group_num in group_nums:
            group_subtasks = groups[group_num]
            is_parallel = len(group_subtasks) > 1

            if group_failed and abort_on_error:
                for st in group_subtasks:
                    st.status = SubtaskStatus.error
                    st.error = "Cancelled due to prerequisite group failure"
                    st.finished_at = time.time()
                    all_completed.append(st)
                    results[st.id] = f"CANCELLED: {st.error}"
                self._emit(LogEntry(
                    type=LogType.info,
                    message=f"Group {group_num} skipped due to abort_on_group_error policy",
                ))
                continue

            self._emit(LogEntry(
                type=LogType.group_start,
                message=f"Group {group_num}: {len(group_subtasks)} subtask(s)" + (
                    " (parallel)" if is_parallel else " (sequential)"
                ),
            ))

            # FR-12: Run all subtasks in this group concurrently
            # FR-16: return_exceptions=True so one failure doesn't kill siblings
            tasks = [self._run_subtask(st) for st in group_subtasks]
            completed = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for i, result in enumerate(completed):
                if isinstance(result, Exception):
                    # FR-16: Capture exception as subtask error
                    group_failed = True
                    st = group_subtasks[i]
                    st.status = SubtaskStatus.error
                    st.error = str(result)[:500]
                    st.finished_at = time.time()
                    if st.started_at:
                        st.duration_ms = (st.finished_at - st.started_at) * 1000
                    all_completed.append(st)
                    results[st.id] = f"ERROR: {st.error}"

                    self._emit(LogEntry(
                        type=LogType.error,
                        role=st.role,
                        subtask_id=st.id,
                        message=f"Subtask {st.id} failed: {str(result)[:200]}",
                    ))
                else:
                    if result.status == SubtaskStatus.error:
                        group_failed = True
                    all_completed.append(result)
                    results[result.id] = result.output or result.error or ""

            self._emit(LogEntry(
                type=LogType.group_end,
                message=f"Group {group_num} complete",
            ))


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
