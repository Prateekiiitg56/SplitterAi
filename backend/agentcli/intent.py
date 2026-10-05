"""Decide whether a console message is work for the agents (a task) or a question (chat)."""

from __future__ import annotations

import asyncio
import json
import re

from .config import ExecutionConfig
from .models import select_chain
from .router import call_model
from .schemas import AgentRole

INTENT_TIMEOUT_S = 20

INTENT_SYSTEM = (
    "You route messages for a multi-agent coding tool. Decide if the user wants the agents to DO work "
    "that creates or changes files (build, make, write, create, fix, add, refactor, implement, generate a "
    "script/app/page/API/test) or only wants a text answer (a question, an explanation, an opinion, "
    "small talk). Reply with JSON only: {\"intent\": \"task\" or \"chat\", \"confidence\": 0.0-1.0}."
)

# Requests that start like an instruction to produce something.
_IMPERATIVE = re.compile(
    r"^\s*(please\s+|can you\s+|could you\s+|i want( you)? to\s+|i need( you)? to\s+|let'?s\s+)?"
    r"(make|build|create|write|generate|implement|add|fix|refactor|set up|setup|scaffold|develop|code|"
    r"design|update|change|rename|convert|port|split|do)\b",
    re.IGNORECASE,
)


def heuristic_intent(message: str) -> dict:
    if _IMPERATIVE.search(message):
        return {"intent": "task", "confidence": 0.6}
    return {"intent": "chat", "confidence": 0.5}


def _parse(content: str) -> dict | None:
    match = re.search(r"\{.*\}", content or "", re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if data.get("intent") not in ("task", "chat"):
        return None
    try:
        confidence = max(0.0, min(1.0, float(data.get("confidence", 0.5))))
    except (TypeError, ValueError):
        confidence = 0.5
    return {"intent": data["intent"], "confidence": confidence}


async def classify_intent(message: str) -> dict:
    """Ask a fast model; fall back to the imperative heuristic when the model fails or is unclear."""
    fallback = heuristic_intent(message)
    try:
        res = await asyncio.wait_for(call_model(
            [{"role": "system", "content": INTENT_SYSTEM}, {"role": "user", "content": message[:2000]}],
            select_chain("reasoning", "fastest"), AgentRole.planner, ExecutionConfig(),
        ), INTENT_TIMEOUT_S)
    except Exception:
        return fallback
    parsed = _parse(res.get("content", ""))
    if not parsed:
        return fallback
    # An unsure "chat" for something phrased as an instruction is still work.
    if parsed["intent"] == "chat" and parsed["confidence"] < 0.6 and fallback["intent"] == "task":
        return fallback
    return parsed
