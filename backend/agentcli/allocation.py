"""Agent allocation — execution estimates, strategy options and the recommendation.

Numbers come from execution history when it exists (telemetry). Until then the
estimator uses the PRIOR_* constants below, widens its ranges and reports low
confidence. Agent count here means concurrent workers: it changes wall time,
not the amount of work. Every run also pays for the execution graph's
synthesis and verification stages, which are included in the estimates.
"""

from __future__ import annotations

from typing import Any

from . import dag, telemetry
from .models import ROLE_DEFAULT_CAPABILITY, select_chain
from .schemas import AgentRole, Subtask

# Priors used only until history has MIN_HISTORY samples for the same kind of subtask.
PRIOR_STEPS = {"s": 3, "m": 6, "l": 10}
PRIOR_CALL_LATENCY_S = 8.0
PRIOR_TOKENS_PER_STEP = 2500
PRIOR_SPREAD = 0.5
HISTORY_SPREAD = 0.25
MIN_HISTORY = 3
MAX_AGENTS = 8
KNEE_TOLERANCE = 0.10  # an extra agent must cut estimated time by more than this to be worth it

SIZE_POINTS = {"s": 1, "m": 2, "l": 3}
PRESETS = ("cost", "balanced", "fastest", "quality")
PRESET_LABELS = {"cost": "Cost Saver", "balanced": "Balanced", "fastest": "Fastest", "quality": "Quality"}
# Repair rounds the execution graph may run after a failed verification.
REPAIR_BUDGET = {"cost": 0, "balanced": 1, "fastest": 1, "quality": 2}
SYNTHESIS_ID = "synthesize"
VERIFY_ID = "verify"


def _size(st: Subtask) -> str:
    return st.size if st.size in PRIOR_STEPS else "m"


def _capability(st: Subtask) -> str:
    return st.capability or ROLE_DEFAULT_CAPABILITY.get(st.role.value, "coding")


def stage_subtasks(worker_ids: list[str], preset: str, synthesis_instruction: str = "",
                   verify_instruction: str = "") -> tuple[Subtask, Subtask]:
    """The synthesis and verification stages that follow the workers in every run."""
    synth = Subtask(
        id=SYNTHESIS_ID, role=AgentRole.planner, group=0, capability="reasoning", size="s",
        depends_on=list(worker_ids), instruction=synthesis_instruction,
        model_chain=select_chain("reasoning", preset),
    )
    verify = Subtask(
        id=VERIFY_ID, role=AgentRole.auditor, group=0, capability="review", size="m",
        depends_on=[SYNTHESIS_ID], instruction=verify_instruction,
        model_chain=select_chain("review", preset),
    )
    return synth, verify


def assign_models(subtasks: list[Subtask], preset: str, pinned: str | None = None) -> None:
    for st in subtasks:
        st.capability = _capability(st)
        st.model_chain = select_chain(st.capability, preset, pinned)


def _subtask_estimate(st: Subtask) -> tuple[float, float, str]:
    """(duration seconds, tokens, source) for one subtask."""
    size = _size(st)
    hist = telemetry.subtask_stats(_capability(st), size)
    if hist["samples"] >= MIN_HISTORY:
        return hist["median_duration_s"], hist["median_tokens"], "history"
    steps = PRIOR_STEPS[size]
    tokens = steps * PRIOR_TOKENS_PER_STEP
    model = (st.model_chain or [None])[0]
    stats = telemetry.model_stats(model) if model else {"samples": 0}
    if stats["samples"] >= MIN_HISTORY and stats.get("median_latency_s"):
        return steps * stats["median_latency_s"], tokens, "model-latency"
    return steps * PRIOR_CALL_LATENCY_S, tokens, "prior"


def _range(point: float, ratios: tuple[float, float, float] | None, spread: float) -> list[float]:
    if ratios:
        lo, _, hi = ratios
        return [round(point * lo), round(point * hi)]
    return [round(point * (1 - spread)), round(point * (1 + spread))]


def estimate(subtasks: list[Subtask], agents: int, preset: str = "balanced") -> dict[str, Any]:
    """Estimate one configuration: the workers (with model chains assigned) plus the
    synthesis and verification stages. Possible repair rounds are not included."""
    subtasks = [*subtasks, *stage_subtasks([st.id for st in subtasks], preset)]
    deps = dag.resolve_deps(subtasks)
    per = {st.id: _subtask_estimate(st) for st in subtasks}
    makespan, _ = dag.simulate(deps, {sid: e[0] for sid, e in per.items()}, max(1, agents))
    tokens = sum(e[1] for e in per.values())
    sources = {e[2] for e in per.values()}

    cal = telemetry.calibration()
    calibrated = cal["samples"] >= MIN_HISTORY
    spread = HISTORY_SPREAD if sources == {"history"} else PRIOR_SPREAD
    if calibrated and cal["samples"] >= 5 and sources == {"history"}:
        confidence = "high"
    elif calibrated or "prior" not in sources:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "agents": agents,
        "time_s": _range(makespan, cal.get("time") if calibrated else None, spread),
        "tokens": _range(tokens, cal.get("tokens") if calibrated else None, spread),
        # Uncalibrated point values: stored with the run so actual/estimate ratios can calibrate later runs.
        "point_time_s": round(makespan, 1),
        "point_tokens": round(tokens),
        "confidence": confidence,
        "sources": sorted(sources),
        "per_subtask": {sid: {"time_s": round(e[0], 1), "tokens": round(e[1])} for sid, e in per.items()},
    }


def _complexity(subtasks: list[Subtask], depth: int) -> str:
    score = sum(SIZE_POINTS[_size(st)] for st in subtasks) + depth
    if score <= 4:
        return "Low"
    if score <= 8:
        return "Medium"
    if score <= 14:
        return "High"
    return "Very High"


def build_strategy(subtasks: list[Subtask], preset: str, pinned: str | None = None) -> list[Subtask]:
    """The worker subtasks a strategy executes: copies with model chains for the preset."""
    plan = [st.model_copy(deep=True) for st in subtasks]
    assign_models(plan, preset, pinned)
    return plan


def analyze(subtasks: list[Subtask], pinned: str | None = None) -> dict[str, Any]:
    """Compare agent counts and presets for a decomposed task and recommend one."""
    base = build_strategy(subtasks, "balanced", pinned)
    deps = dag.resolve_deps(base)
    depth = max(dag.levels(deps).values(), default=0)
    width = dag.simulate(deps, {st.id: 1.0 for st in base}, len(base) or 1)[1]
    max_useful = max(1, min(width, MAX_AGENTS))

    options = [estimate(base, n, "balanced") for n in range(1, max_useful + 1)]
    fastest_time = min(o["point_time_s"] for o in options)
    knee = next(o["agents"] for o in options if o["point_time_s"] <= fastest_time * (1 + KNEE_TOLERANCE))

    preset_agents = {"cost": 1, "balanced": knee, "fastest": max_useful, "quality": knee}
    strategies = []
    for preset in PRESETS:
        plan = build_strategy(subtasks, preset, pinned)
        est = estimate(plan, preset_agents[preset], preset)
        strategies.append({
            "id": preset,
            "label": PRESET_LABELS[preset],
            "repairs": REPAIR_BUDGET[preset],
            "models": sorted({st.model_chain[0] for st in plan if st.model_chain}),
            **est,
        })

    cal = telemetry.calibration()
    reasons = [
        f"{len(subtasks)} subtask(s) across {depth} dependency level(s); at most {width} can run at once",
    ]
    if knee < max_useful:
        top = options[max_useful - 1]["point_time_s"]
        at_knee = options[knee - 1]["point_time_s"]
        saving = round(100 * (at_knee - top) / at_knee) if at_knee else 0
        if saving < 1:
            reasons.append(f"More than {knee} agent(s) would not finish sooner: the dependency chain sets the pace")
        else:
            reasons.append(f"Going from {knee} to {max_useful} agents saves only ~{saving}% of the estimated time")
    else:
        reasons.append(f"{knee} agent(s) cover every parallel branch; more would sit idle")
    reasons.append("Agent count changes wall time, not work: token estimates stay the same across agent counts")
    reasons.append("Every run ends with synthesis and verification; a failed check triggers repair rounds, "
                   "which the estimates do not include")
    if cal["samples"] >= MIN_HISTORY:
        reasons.append(f"Ranges are calibrated against {cal['samples']} past runs")
    elif cal["samples"]:
        reasons.append(f"{cal['samples']} past run(s) recorded; ranges start calibrating after {MIN_HISTORY}")
    else:
        reasons.append("No execution history yet: estimates use default priors and sharpen as runs complete")

    return {
        "complexity": _complexity(subtasks, depth),
        "subtask_count": len(subtasks),
        "dependency_levels": depth,
        "max_parallel": width,
        "max_useful_agents": max_useful,
        "recommended": "balanced",
        "recommended_agents": knee,
        "reasons": reasons,
        "options": options,
        "strategies": strategies,
        "subtasks": [
            {"id": st.id, "capability": st.capability, "size": _size(st), "depends_on": deps[st.id],
             "model": (st.model_chain or [None])[0]}
            for st in base
        ],
    }
