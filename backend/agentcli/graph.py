"""LangGraph decision workflow for autonomous agent execution."""

from __future__ import annotations

import time
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from .config import ExecutionConfig
from .planner import generate_plan
from .sandbox import Sandbox
from .schemas import AgentRole, LogEntry, LogType, Plan, RunResult, RunStatus, Subtask, SubtaskStatus
from .worker import AgentWorker


class GraphState(TypedDict, total=False):
    task: str
    workspace: str
    config: ExecutionConfig
    sandbox: Sandbox
    on_event: Callable[[LogEntry], None] | None
    plan: Plan
    subtasks: list[Subtask]
    index: int
    current: Subtask
    completed: list[Subtask]
    results: dict[str, str]
    errors: list[str]
    retry_count: int
    route: str
    started_at: float


def _emit(state: GraphState, entry: LogEntry) -> None:
    callback = state.get("on_event")
    if callback:
        callback(entry)


async def intake(state: GraphState) -> dict[str, Any]:
    _emit(state, LogEntry(type=LogType.info, message=f"Intake received task: {state['task'][:120]}"))
    return {"started_at": time.time(), "index": 0, "retry_count": 0, "completed": [], "results": {}, "errors": []}


async def planner(state: GraphState) -> dict[str, Any]:
    if state.get("plan"):
        plan = state["plan"]
    else:
        plan = await generate_plan(state["task"], state["config"], state.get("on_event"))
    _emit(state, LogEntry(
        type=LogType.plan_generated,
        role=AgentRole.planner,
        message=f"Planner created {len(plan.subtasks)} subtask(s)",
    ))
    return {"plan": plan, "subtasks": plan.subtasks}


async def route_subtask(state: GraphState) -> dict[str, Any]:
    index = state.get("index", 0)
    subtasks = state["subtasks"]
    if index >= len(subtasks):
        return {"route": "finalize"}
    current = subtasks[index]
    _emit(state, LogEntry(
        type=LogType.info,
        role=current.role,
        subtask_id=current.id,
        message=f"Router selected subtask {current.id}",
    ))
    role_route = {"auditor": "reviewer", "tester": "tester"}.get(current.role.value, "coder")
    return {"current": current, "route": role_route}


async def coder(state: GraphState) -> dict[str, Any]:
    current = state["current"]
    worker = AgentWorker(current.role, state["config"], state["sandbox"], state.get("on_event"))
    result = await worker.run(current)
    return {"current": result}


async def reviewer_agent(state: GraphState) -> dict[str, Any]:
    current = state["current"]
    worker = AgentWorker(AgentRole.auditor, state["config"], state["sandbox"], state.get("on_event"))
    return {"current": await worker.run(current)}


async def tester_agent(state: GraphState) -> dict[str, Any]:
    current = state["current"]
    worker = AgentWorker(AgentRole.tester, state["config"], state["sandbox"], state.get("on_event"))
    return {"current": await worker.run(current)}


async def reviewer(state: GraphState) -> dict[str, Any]:
    current = state["current"]
    if current.status == SubtaskStatus.error:
        return {"route": "decision"}
    _emit(state, LogEntry(
        type=LogType.info,
        role=AgentRole.auditor,
        subtask_id=current.id,
        message=f"Reviewer checking {current.id}",
    ))
    review = Subtask(
        id=f"{current.id}-review",
        role=AgentRole.auditor,
        group=current.group,
        instruction=f"Review the implementation for this task and report concrete issues:\n{current.instruction}",
    )
    result = await AgentWorker(AgentRole.auditor, state["config"], state["sandbox"], state.get("on_event")).run(review)
    if result.status == SubtaskStatus.error:
        current.error = result.error
        current.status = SubtaskStatus.error
    return {"current": current}


async def tester(state: GraphState) -> dict[str, Any]:
    current = state["current"]
    if current.status == SubtaskStatus.error:
        return {"route": "decision"}
    test = Subtask(
        id=f"{current.id}-test",
        role=AgentRole.tester,
        group=current.group,
        instruction=f"Test the implementation for this task and fix any failures using the available tools:\n{current.instruction}",
    )
    result = await AgentWorker(AgentRole.tester, state["config"], state["sandbox"], state.get("on_event")).run(test)
    if result.status == SubtaskStatus.error:
        current.error = result.error
        current.status = SubtaskStatus.error
    return {"current": current, "route": "decision"}


async def decision(state: GraphState) -> dict[str, Any]:
    current = state["current"]
    completed = [*state.get("completed", [])]
    results = dict(state.get("results", {}))
    errors = [*state.get("errors", [])]
    retry_count = state.get("retry_count", 0)

    if current.status == SubtaskStatus.error:
        errors.append(current.error or f"{current.id} failed")
        if retry_count < 2:
            _emit(state, LogEntry(type=LogType.info, message=f"Decision: retrying {current.id}"))
            return {"retry_count": retry_count + 1, "errors": errors, "route": "retry"}
    completed.append(current)
    results[current.id] = current.output or current.error or ""
    next_index = state.get("index", 0) + 1
    route = "route_subtask" if next_index < len(state["subtasks"]) else "finalize"
    return {"completed": completed, "results": results, "errors": errors, "index": next_index, "retry_count": 0, "route": route}


async def finalize(state: GraphState) -> dict[str, Any]:
    _emit(state, LogEntry(
        type=LogType.info,
        message=f"Decision: finalized workflow with {len(state.get('completed', []))} completed subtask(s)",
    ))
    return state


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("intake", intake)
    graph.add_node("planner", planner)
    graph.add_node("route_subtask", route_subtask)
    graph.add_node("coder", coder)
    graph.add_node("reviewer", reviewer)
    graph.add_node("reviewer_agent", reviewer_agent)
    graph.add_node("tester", tester)
    graph.add_node("tester_agent", tester_agent)
    graph.add_node("decision", decision)
    graph.add_node("finalize", finalize)
    graph.add_edge(START, "intake")
    graph.add_edge("intake", "planner")
    graph.add_edge("planner", "route_subtask")
    graph.add_conditional_edges("route_subtask", lambda state: state.get("route", "finalize"), {
        "coder": "coder",
        "reviewer": "reviewer_agent",
        "tester": "tester_agent",
        "finalize": "finalize",
    })
    graph.add_edge("coder", "reviewer")
    graph.add_edge("reviewer", "tester")
    graph.add_edge("tester", "decision")
    graph.add_edge("reviewer_agent", "decision")
    graph.add_edge("tester_agent", "decision")
    graph.add_conditional_edges("decision", lambda state: state.get("route", "finalize"), {
        "retry": "coder",
        "route_subtask": "route_subtask",
        "finalize": "finalize",
    })
    graph.add_edge("finalize", END)
    return graph.compile()


async def run_graph(
    task: str,
    workspace: str,
    config: ExecutionConfig,
    sandbox: Sandbox,
    on_event: Callable[[LogEntry], None] | None = None,
    plan: Plan | None = None,
) -> RunResult:
    state = await build_graph().ainvoke({
        "task": task,
        "workspace": workspace,
        "config": config,
        "sandbox": sandbox,
        "on_event": on_event,
        "plan": plan,
    })
    completed = state.get("completed", [])
    has_errors = any(st.status == SubtaskStatus.error for st in completed)
    return RunResult(
        subtasks=completed,
        results=state.get("results", {}),
        status=RunStatus.error if has_errors else RunStatus.done,
        total_duration_ms=(time.time() - state.get("started_at", time.time())) * 1000,
    )
