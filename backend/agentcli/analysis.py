"""Pre-execution analysis graph: normalize -> decompose -> allocate.

Runs before anything executes so the user (or AUTO mode) can pick a strategy
from real decomposition and history-backed estimates.
"""

from __future__ import annotations

import re
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from .allocation import analyze
from .config import ExecutionConfig
from .planner import generate_plan
from .schemas import LogEntry, Plan


class AnalysisState(TypedDict, total=False):
    task: str
    config: ExecutionConfig
    history: list[dict[str, Any]] | None
    pinned_model: str | None
    on_event: Callable[[LogEntry], None] | None
    plan: Plan
    analysis: dict[str, Any]


async def normalize(state: AnalysisState) -> dict[str, Any]:
    return {"task": re.sub(r"\s+", " ", state["task"]).strip()}


async def decompose(state: AnalysisState) -> dict[str, Any]:
    plan = await generate_plan(state["task"], state["config"], state.get("on_event"), state.get("history"))
    return {"plan": plan}


async def allocate(state: AnalysisState) -> dict[str, Any]:
    return {"analysis": analyze(state["plan"].subtasks, state.get("pinned_model"))}


def build_analysis_graph():
    graph = StateGraph(AnalysisState)
    graph.add_node("normalize", normalize)
    graph.add_node("decompose", decompose)
    graph.add_node("allocate", allocate)
    graph.add_edge(START, "normalize")
    graph.add_edge("normalize", "decompose")
    graph.add_edge("decompose", "allocate")
    graph.add_edge("allocate", END)
    return graph.compile()


async def run_analysis(
    task: str,
    config: ExecutionConfig,
    history: list[dict[str, Any]] | None = None,
    pinned_model: str | None = None,
    on_event: Callable[[LogEntry], None] | None = None,
) -> tuple[Plan, dict[str, Any]]:
    state = await build_analysis_graph().ainvoke({
        "task": task, "config": config, "history": history,
        "pinned_model": pinned_model, "on_event": on_event,
    })
    return state["plan"], state["analysis"]
