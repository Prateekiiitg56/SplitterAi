"""Estimator, DAG scheduling and strategy selection."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import telemetry
from agentcli.allocation import (
    MIN_HISTORY, PRIOR_CALL_LATENCY_S, PRIOR_STEPS, SYNTHESIS_ID, VERIFY_ID, analyze, build_strategy, estimate,
)
from agentcli.dag import levels, resolve_deps, simulate
from agentcli.planner import _parse_plan_json
from agentcli.schemas import AgentRole, Subtask


def st(sid, deps=(), size="m", group=1, capability="coding"):
    return Subtask(id=sid, role=AgentRole.coder, group=group, instruction=f"do {sid}",
                   depends_on=list(deps), size=size, capability=capability)


def test_parallel_time_is_critical_path_not_sum():
    deps = {"a": [], "b": [], "c": []}
    durations = {"a": 60.0, "b": 80.0, "c": 50.0}
    assert simulate(deps, durations, 3) == (80.0, 3)
    assert simulate(deps, durations, 1)[0] == 190.0


def test_dependencies_serialize_work():
    deps = resolve_deps([st("db"), st("api", ["db"]), st("ui", ["api"])])
    assert simulate(deps, {"db": 10.0, "api": 10.0, "ui": 10.0}, 3) == (30.0, 1)
    assert levels(deps) == {"db": 1, "api": 2, "ui": 3}


def test_forward_dependency_is_dropped_to_stay_acyclic():
    deps = resolve_deps([st("a", ["b"]), st("b", ["a"])])
    assert deps == {"a": [], "b": ["a"]}


def test_group_fallback_orders_deps():
    deps = resolve_deps([st("late", group=2), st("early", group=1)])
    assert list(deps) == ["early", "late"]
    assert deps["late"] == ["early"]


def test_recommends_smallest_count_that_reaches_parallel_speed():
    subtasks = [st("a"), st("b"), st("c"), st("merge", ["a", "b", "c"])]
    analysis = analyze(subtasks)
    assert analysis["max_parallel"] == 3
    assert analysis["recommended_agents"] == 3
    assert [o["agents"] for o in analysis["options"]] == [1, 2, 3]
    # Same work at every agent count: tokens do not change, time does.
    assert len({o["point_tokens"] for o in analysis["options"]}) == 1
    assert analysis["options"][0]["point_time_s"] > analysis["options"][2]["point_time_s"]


def test_no_history_uses_priors_with_low_confidence():
    est = estimate(build_strategy([st("a")], "balanced"), 1)
    assert est["confidence"] == "low"
    assert est["sources"] == ["prior"]
    # Worker, then synthesis (small), then verification (medium), all sequential.
    stage_steps = PRIOR_STEPS["m"] + PRIOR_STEPS["s"] + PRIOR_STEPS["m"]
    assert est["point_time_s"] == stage_steps * PRIOR_CALL_LATENCY_S
    assert set(est["per_subtask"]) == {"a", SYNTHESIS_ID, VERIFY_ID}
    lo, hi = est["time_s"]
    assert lo < est["point_time_s"] < hi


def test_history_replaces_priors():
    for cap, size in [("coding", "m"), ("reasoning", "s"), ("review", "m")]:
        for _ in range(MIN_HISTORY):
            telemetry.record_subtask("x", cap, size, "x", 1000, 20.0, 3, True)
    est = estimate(build_strategy([st("a")], "balanced"), 1)
    assert est["sources"] == ["history"]
    assert est["point_time_s"] == 60.0
    assert est["point_tokens"] == 3000


def test_strategy_assigns_models_per_workstream():
    plan = build_strategy([st("a"), st("b", capability="docs")], "quality")
    assert all(s.model_chain for s in plan)


def test_planner_parses_dependencies_and_derives_groups():
    raw = ('[{"id":"t1","role":"coder","capability":"coding","size":"l","depends_on":[],"instruction":"x"},'
           '{"id":"t2","role":"tester","capability":"testing","size":"s","depends_on":["t1"],"instruction":"y"}]')
    plan = _parse_plan_json(raw, "task")
    assert [s.group for s in plan.subtasks] == [1, 2]
    assert plan.subtasks[1].depends_on == ["t1"]
    assert plan.subtasks[0].size == "l"


def test_run_report_records_history_and_calibrates_next_estimates():
    from agentcli.schemas import RunResult, SubtaskStatus
    from server import execution_report

    done = [st("a"), st("b")]
    for s in done:
        s.status, s.duration_ms, s.tokens_in, s.tokens_out, s.model = SubtaskStatus.success, 30000, 900, 100, "m1"
    result = RunResult(subtasks=done, total_duration_ms=30000)
    est = {"point_time_s": 60.0, "point_tokens": 4000, "time_s": [30, 90], "tokens": [2000, 6000], "confidence": "low"}

    for _ in range(MIN_HISTORY):
        report = execution_report(result, "balanced", 2, est)

    assert report["actual"] == {"time_s": 30.0, "tokens": 2000}
    assert report["parallel_efficiency"] == 1.0
    cal = telemetry.calibration()
    assert cal["samples"] == MIN_HISTORY
    assert cal["time"][1] == 0.5 and cal["tokens"][1] == 0.5
