"""Planner — task decomposition into structured execution plans.

FR-5: Produce JSON plan from natural-language task.
FR-6: Group only genuinely independent subtasks.
FR-7: Fallback to single-subtask plan on failure.
FR-8: Manual plan mode — load user-supplied plan file.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Callable, Optional

from .config import ExecutionConfig
from .prompts import get_system_prompt
from .router import AllModelsFailedError, call_model
from .schemas import AgentRole, LogEntry, LogType, Plan, Subtask, SubtaskStatus

logger = logging.getLogger(__name__)


def _fallback_plan(task: str) -> Plan:
    """FR-7: Single-subtask fallback plan when planner fails."""
    return Plan(subtasks=[
        Subtask(
            id="t1",
            role=AgentRole.coder,
            group=1,
            instruction=task,
        )
    ])


def _parse_plan_json(raw: str, task: str) -> Plan:
    """Parse the planner's JSON output into a Plan.

    Handles:
    - Clean JSON arrays
    - JSON wrapped in markdown code fences
    - Malformed output → fallback plan
    """
    # Strip markdown code fences if present
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Planner output is not valid JSON, using fallback plan")
        return _fallback_plan(task)

    if not isinstance(data, list):
        logger.warning("Planner output is not a JSON array, using fallback plan")
        return _fallback_plan(task)

    subtasks: list[Subtask] = []
    valid_roles = {"coder", "auditor", "tester"}

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue

        role_str = str(item.get("role", "coder")).lower()
        if role_str not in valid_roles:
            role_str = "coder"

        subtask_id = item.get("id", f"t{i + 1}")
        group = int(item.get("group", i + 1))
        instruction = str(item.get("instruction", ""))

        if not instruction:
            continue

        subtasks.append(Subtask(
            id=str(subtask_id),
            role=AgentRole(role_str),
            group=group,
            instruction=instruction,
        ))

    if not subtasks:
        logger.warning("Planner produced no valid subtasks, using fallback plan")
        return _fallback_plan(task)

    return Plan(subtasks=subtasks)


async def generate_plan(
    task: str,
    config: ExecutionConfig,
    on_event: Optional[Callable[[LogEntry], None]] = None,
) -> Plan:
    """Generate an execution plan from a natural-language task.

    Uses the planner model chain to decompose the task into subtasks.
    Falls back to a single-subtask plan on any failure (FR-7).
    """
    if on_event:
        on_event(LogEntry(
            type=LogType.info,
            role=AgentRole.planner,
            message=f"Planning task: {task[:100]}",
        ))

    system_prompt = get_system_prompt("planner")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": task},
    ]

    try:
        response = await call_model(
            messages=messages,
            model_chain=config.get_model_chain(AgentRole.planner),
            role=AgentRole.planner,
            config=config,
            on_event=on_event,
        )

        raw_output = response.get("content", "")
        plan = _parse_plan_json(raw_output, task)

        if on_event:
            groups = set(st.group for st in plan.subtasks)
            on_event(LogEntry(
                type=LogType.plan_generated,
                role=AgentRole.planner,
                message=f"Plan: {len(plan.subtasks)} subtasks in {len(groups)} groups",
                detail=raw_output[:500],
            ))

        return plan

    except AllModelsFailedError:
        logger.warning("All planner models failed, using fallback plan")
        if on_event:
            on_event(LogEntry(
                type=LogType.error,
                role=AgentRole.planner,
                message="Planner failed — falling back to single-subtask plan",
            ))
        return _fallback_plan(task)

    except Exception as e:
        logger.warning("Planner error: %s, using fallback plan", e)
        if on_event:
            on_event(LogEntry(
                type=LogType.error,
                role=AgentRole.planner,
                message=f"Planner error: {str(e)[:200]} — using fallback plan",
            ))
        return _fallback_plan(task)


def load_manual_plan(file_path: str) -> Plan:
    """FR-8: Load a user-supplied plan from a JSON file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Plan file not found: {file_path}")

    raw = path.read_text(encoding="utf-8")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in plan file: {e}")

    # Accept either a list or a dict with a "subtasks" key
    if isinstance(data, dict) and "subtasks" in data:
        data = data["subtasks"]

    if not isinstance(data, list):
        raise ValueError("Plan file must contain a JSON array of subtasks")

    subtasks = []
    for item in data:
        subtasks.append(Subtask(
            id=str(item["id"]),
            role=AgentRole(item["role"]),
            group=int(item["group"]),
            instruction=str(item["instruction"]),
        ))

    return Plan(subtasks=subtasks)
