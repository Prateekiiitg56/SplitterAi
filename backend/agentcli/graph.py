"""LangGraph execution workflow.

contract -> workers -> evidence -> synthesize -> verify --PASS--> finalize
                                                  |  ^
                                             FAIL |  | (repair budget left)
                                                  v  |
                                                 repair

Workers run the plan as a dependency graph through the Orchestrator, capped at
the strategy's agent count. The synthesizer sees only the contract and worker
evidence, never raw conversations. The verifier inspects the workspace itself.
"""

from __future__ import annotations

import re
import time
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from .allocation import REPAIR_BUDGET, stage_subtasks
from .config import ExecutionConfig
from .models import select_chain
from .orchestrator import Orchestrator
from .prompts import SYNTHESIZER_SYSTEM, VERIFIER_SYSTEM
from .sandbox import Sandbox
from .schemas import AgentRole, LogEntry, LogType, Plan, RunResult, RunStatus, Subtask, SubtaskStatus
from .worker import AgentWorker

EVIDENCE_OUTPUT_CHARS = 2000
STAGE_LABELS = {
    "synthesize": "Combine the worker results into one report",
    "verify": "Check the workspace against the task contract",
    "repair": "Fix the problems the verifier found",
}
_VERDICT = re.compile(r"VERDICT:\s*(PASS|FAIL)", re.IGNORECASE)


class ExecutionState(TypedDict, total=False):
    task: str
    plan: Plan
    config: ExecutionConfig
    sandbox: Sandbox
    on_event: Callable[[LogEntry], None] | None
    preset: str
    started_at: float
    contract: str
    workers: list[Subtask]
    evidence: str
    synthesis: Subtask
    verifications: list[Subtask]
    repairs: list[Subtask]
    verdict: str
    issues: str


def _emit(state: ExecutionState, message: str, detail: str | None = None) -> None:
    callback = state.get("on_event")
    if callback:
        callback(LogEntry(type=LogType.info, role=AgentRole.planner, message=message, detail=detail))


def _worker(state: ExecutionState, role: AgentRole, **kwargs: Any) -> AgentWorker:
    return AgentWorker(role, state["config"], state["sandbox"], state.get("on_event"), **kwargs)


async def contract(state: ExecutionState) -> dict[str, Any]:
    subtasks = state["plan"].subtasks
    lines = [f"TASK:\n{state['task']}", "", "WORK SPLIT:"]
    lines += [f"- [{st.id}] ({st.role.value}) {st.instruction}" for st in subtasks]
    _emit(state, f"Task contract: {len(subtasks)} worker subtask(s)")
    return {"contract": "\n".join(lines), "started_at": time.time(), "verifications": [], "repairs": []}


async def workers(state: ExecutionState) -> dict[str, Any]:
    context = (
        f"{state['contract']}\n\nOther agents handle the other items in parallel or after you. "
        "Do only your assignment, keep to the file names and shared names the split specifies, "
        "and read files other agents already wrote before changing them."
    )
    result = await Orchestrator(state["config"], state["sandbox"], state.get("on_event"), context=context).execute(state["plan"])
    return {"workers": result.subtasks}


async def evidence(state: ExecutionState) -> dict[str, Any]:
    blocks = []
    for st in state["workers"]:
        body = st.output if st.status == SubtaskStatus.success else f"FAILED: {st.error}"
        blocks.append(f"### [{st.id}] {st.role.value} - {st.status.value}\n{(body or '')[:EVIDENCE_OUTPUT_CHARS]}")
    return {"evidence": "\n\n".join(blocks)}


async def synthesize(state: ExecutionState) -> dict[str, Any]:
    _emit(state, "Synthesizer combining worker results")
    synth, _ = stage_subtasks(
        [st.id for st in state["workers"]], state["preset"],
        synthesis_instruction=f"{state['contract']}\n\nWORKER EVIDENCE:\n{state['evidence']}",
    )
    return {"synthesis": await _worker(state, AgentRole.planner, system_prompt=SYNTHESIZER_SYSTEM).run(synth)}


def _verify_instruction(state: ExecutionState) -> str:
    synthesis = state["synthesis"].output or "(synthesis unavailable)"
    text = f"{state['contract']}\n\nWHAT THE WORKERS REPORT:\n{synthesis}"
    if state["repairs"]:
        # The synthesis predates the repairs; without this the verifier re-reports already-fixed gaps.
        text += "\n\nThe report above was written BEFORE these repair rounds changed the workspace:"
        for fix in state["repairs"]:
            text += f"\n- {fix.id}: {(fix.output or fix.error or '')[:EVIDENCE_OUTPUT_CHARS]}"
    return text


async def verify(state: ExecutionState) -> dict[str, Any]:
    rounds = len(state["verifications"])
    _emit(state, "Verifier checking the workspace against the contract" + (f" (after repair {rounds})" if rounds else ""))
    _, check = stage_subtasks([], state["preset"], verify_instruction=_verify_instruction(state))
    check.id = f"verify-{rounds + 1}" if rounds else check.id
    check.depends_on = [state["repairs"][-1].id] if state["repairs"] else [state["synthesis"].id]
    result = await _worker(state, AgentRole.auditor, system_prompt=VERIFIER_SYSTEM).run(check)

    matches = _VERDICT.findall(result.output or "")
    verdict = matches[-1].lower() if result.status == SubtaskStatus.success and matches else "unknown"
    issues = (result.output or "").split(matches[-1], 1)[-1].strip() if verdict == "fail" else ""
    _emit(state, f"Verification: {verdict.upper()}", issues or None)
    return {"verifications": [*state["verifications"], result], "verdict": verdict, "issues": issues}


def after_verify(state: ExecutionState) -> str:
    budget = REPAIR_BUDGET.get(state["preset"], 1)
    if state["verdict"] == "fail" and len(state["repairs"]) < budget:
        return "repair"
    return "finalize"


async def repair(state: ExecutionState) -> dict[str, Any]:
    n = len(state["repairs"]) + 1
    _emit(state, f"Repair round {n}: fixing verifier findings")
    fix = Subtask(
        id=f"repair-{n}", role=AgentRole.coder, group=0, capability="coding", size="m",
        depends_on=[state["verifications"][-1].id],
        model_chain=select_chain("coding", state["preset"]),
        instruction=(
            f"{state['contract']}\n\nThe verifier found these problems in the workspace. First read every "
            "file involved (list_directory, then read_file), so your fix matches the ids, classes and names "
            "the other files actually use. Then fix every problem with write_file and re-run the relevant "
            f"checks:\n{state['issues']}"
        ),
    )
    return {"repairs": [*state["repairs"], await _worker(state, AgentRole.coder).run(fix)]}


async def finalize(state: ExecutionState) -> dict[str, Any]:
    _emit(state, f"Workflow finished: verification {state['verdict'].upper()}, {len(state['repairs'])} repair round(s)")
    return {}


def build_graph():
    graph = StateGraph(ExecutionState)
    for name, node in [("contract", contract), ("workers", workers), ("evidence", evidence),
                       ("synthesize", synthesize), ("verify", verify), ("repair", repair), ("finalize", finalize)]:
        graph.add_node(name, node)
    graph.add_edge(START, "contract")
    graph.add_edge("contract", "workers")
    graph.add_edge("workers", "evidence")
    graph.add_edge("evidence", "synthesize")
    graph.add_edge("synthesize", "verify")
    graph.add_conditional_edges("verify", after_verify, {"repair": "repair", "finalize": "finalize"})
    graph.add_edge("repair", "verify")
    graph.add_edge("finalize", END)
    return graph.compile()


async def run_graph(
    task: str,
    plan: Plan,
    config: ExecutionConfig,
    sandbox: Sandbox,
    on_event: Callable[[LogEntry], None] | None = None,
    preset: str = "balanced",
) -> RunResult:
    state = await build_graph().ainvoke({
        "task": task, "plan": plan, "config": config, "sandbox": sandbox,
        "on_event": on_event, "preset": preset,
    })
    workers_done = state["workers"]
    stages = [state["synthesis"]]
    for i, check in enumerate(state["verifications"]):
        stages.append(check)
        if i < len(state["repairs"]):
            stages.append(state["repairs"][i])
    # Stages run one after another once the workers are done: give them their own
    # steps and short labels (their real instructions embed the whole contract).
    next_group = max((st.group for st in workers_done), default=0) + 1
    for i, st in enumerate(stages):
        st.group = next_group + i
        st.instruction = STAGE_LABELS[st.id.split("-")[0]]
    all_subtasks = [*workers_done, *stages]

    failed = any(st.status == SubtaskStatus.error for st in workers_done) or state["verdict"] == "fail"
    return RunResult(
        subtasks=all_subtasks,
        results={st.id: st.output or st.error or "" for st in all_subtasks},
        status=RunStatus.error if failed else RunStatus.done,
        total_duration_ms=(time.time() - state["started_at"]) * 1000,
        synthesis=state["synthesis"].output,
        verification={"verdict": state["verdict"], "issues": state["issues"], "repair_rounds": len(state["repairs"])},
    )
