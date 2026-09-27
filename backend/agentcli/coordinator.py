"""Live coordinator: runs alongside the workers and bridges them through the team board.

It wakes when workers post notes or write files, reviews that activity against the task
contract, and posts directives that the addressed workers receive at their next step.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Callable

from .board import COORDINATOR, Board
from .config import ExecutionConfig
from .prompts import COORDINATOR_SYSTEM
from .router import call_model
from .sandbox import Sandbox
from .schemas import AgentRole, LogEntry, LogType
from .tools import read_file

logger = logging.getLogger(__name__)

MAX_ROUNDS = 6
DEBOUNCE_S = 3.0  # let a burst of writes land before reviewing them
FILE_PREVIEW_CHARS = 3000
_DIRECTIVE = re.compile(r"^\s*TO\s+([\w.\-]+)\s*:\s*(.+)$", re.IGNORECASE)


async def _wait_any(*events: asyncio.Event) -> None:
    waiters = [asyncio.create_task(e.wait()) for e in events]
    try:
        await asyncio.wait(waiters, return_when=asyncio.FIRST_COMPLETED)
    finally:
        for w in waiters:
            w.cancel()


async def coordinate(
    board: Board,
    contract: str,
    subtask_ids: list[str],
    config: ExecutionConfig,
    sandbox: Sandbox,
    on_event: Callable[[LogEntry], None] | None,
    stop: asyncio.Event,
) -> None:
    def emit(message: str, detail: str | None = None) -> None:
        if on_event:
            on_event(LogEntry(type=LogType.info, role=AgentRole.planner, message=message, detail=detail))

    emit("Coordinator watching the workers")
    rounds = 0
    while rounds < MAX_ROUNDS and not stop.is_set():
        await _wait_any(board.activity, stop)
        if stop.is_set():
            break
        try:
            await asyncio.wait_for(stop.wait(), DEBOUNCE_S)
            break  # workers finished; the verifier takes over from here
        except asyncio.TimeoutError:
            pass
        board.activity.clear()
        new = board.unread(COORDINATOR)
        if not new:
            continue

        written = list(dict.fromkeys(m.file for m in new if m.file))
        notes = [f"- [{m.sender} -> {m.to}] {m.text}" for m in new if not m.file]
        files = [f"--- {p} ---\n{read_file(sandbox, p)[:FILE_PREVIEW_CHARS]}" for p in written]
        if (sandbox.resolve_path(".") / "DESIGN.md").is_file() and "DESIGN.md" not in written:
            files.insert(0, f"--- DESIGN.md (source of truth) ---\n{read_file(sandbox, 'DESIGN.md')[:FILE_PREVIEW_CHARS]}")
        waiting = [sid for sid in subtask_ids if sid not in board.running and sid not in board.finished]
        prompt = (
            f"{contract}\n\nRUNNING NOW: {', '.join(sorted(board.running)) or 'none'}"
            f"\nNOT STARTED YET: {', '.join(waiting) or 'none'}"
            f"\nFINISHED: {', '.join(sorted(board.finished)) or 'none'}"
            f"\n\nWORKER NOTES:\n{chr(10).join(notes) or '(none)'}"
            f"\n\nFILES JUST WRITTEN:\n{chr(10).join(files) or '(none)'}"
        )
        rounds += 1
        try:
            response = await asyncio.wait_for(
                call_model(
                    messages=[{"role": "system", "content": COORDINATOR_SYSTEM}, {"role": "user", "content": prompt}],
                    model_chain=config.get_model_chain(AgentRole.planner),
                    role=AgentRole.planner, config=config, on_event=on_event, use_cache=False,
                ),
                timeout=config.step_timeout,
            )
        except Exception as e:  # a coordinator failure must never fail the run
            logger.warning("Coordinator round %d failed: %s", rounds, e)
            emit(f"Coordinator round {rounds} failed", str(e)[:300])
            continue

        sent = 0
        for line in (response.get("content") or "").splitlines():
            match = _DIRECTIVE.match(line)
            if not match:
                continue
            to, text = match.group(1), match.group(2).strip()
            board.post(COORDINATOR, text, to=to)
            emit(f"Coordinator -> {to}: {text[:160]}", text if len(text) > 160 else None)
            sent += 1
        if not sent:
            emit(f"Coordinator round {rounds}: workers are consistent")
