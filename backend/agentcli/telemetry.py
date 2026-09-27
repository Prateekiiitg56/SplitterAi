"""Execution history — the data the estimator learns from.

Every model call, finished subtask and finished run is appended to a JSONL file.
Estimates read medians back out of it; with no history the estimator falls back
to labelled priors and reports low confidence.
"""

from __future__ import annotations

import json
import os
import statistics
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Any

_lock = threading.Lock()


def history_path() -> Path:
    default = Path(__file__).resolve().parent.parent / ".splitter" / "history.jsonl"
    return Path(os.environ.get("SPLITTER_HISTORY_PATH", default))


def _append(record: dict[str, Any]) -> None:
    record["ts"] = time.time()
    path = history_path()
    with _lock:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")


_cache: dict[str, Any] = {"key": None, "records": []}


def load(kind: str) -> list[dict[str, Any]]:
    path = history_path()
    if not path.exists():
        return []
    stat = path.stat()
    key = (str(path), stat.st_mtime_ns, stat.st_size)
    with _lock:
        if _cache["key"] != key:
            records = []
            with path.open(encoding="utf-8") as f:
                for line in f:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            _cache.update(key=key, records=records)
        return [r for r in _cache["records"] if r.get("kind") == kind]


def record_call(model: str, role: str, prompt_tokens: int, completion_tokens: int, latency_s: float, success: bool,
                cached_tokens: int = 0, limited: bool = False) -> None:
    _append({
        "kind": "call", "model": model, "role": role,
        "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens, "cached_tokens": cached_tokens,
        "latency_s": latency_s, "success": success, "limited": limited,
    })


def record_subtask(role: str, capability: str | None, size: str | None, model: str | None,
                   tokens: int, duration_s: float, steps: int, success: bool) -> None:
    _append({
        "kind": "subtask", "role": role, "capability": capability, "size": size, "model": model,
        "tokens": tokens, "duration_s": duration_s, "steps": steps, "success": success,
    })


def record_run(report: dict[str, Any]) -> None:
    _append({"kind": "run", **report})


# Outages and daily quotas are temporary: judge reliability on recent calls only,
# so a model recovers once its provider or its keys do.
RELIABILITY_WINDOW_S = 6 * 3600


def model_stats(model: str) -> dict[str, Any]:
    calls = [c for c in load("call") if c.get("model") == model]
    ok = [c["latency_s"] for c in calls if c.get("success")]
    recent = [c for c in calls if c.get("ts", 0) >= time.time() - RELIABILITY_WINDOW_S]
    return {
        "samples": len(calls),
        "median_latency_s": statistics.median(ok) if ok else None,
        "success_rate": (sum(1 for c in calls if c.get("success")) / len(calls)) if calls else None,
        "recent_samples": len(recent),
        "recent_success_rate": (sum(1 for c in recent if c.get("success")) / len(recent)) if recent else None,
    }


_PACIFIC = ZoneInfo("America/Los_Angeles")


def quota_window(model: str, now: float) -> tuple[float, float | None]:
    """(start, reset) of the daily quota window a model's calls count against; reset None = no daily reset.

    Gemini API daily quotas reset at midnight Pacific time, OpenRouter free-model limits at
    00:00 UTC. Paid OpenRouter models draw on account credits, so they never reset.
    """
    tz = _PACIFIC if model.startswith("gemini/") else timezone.utc
    start = datetime.fromtimestamp(now, tz).replace(hour=0, minute=0, second=0, microsecond=0)
    resets = model.startswith("gemini/") or ":free" in model
    return start.timestamp(), (start + timedelta(days=1)).timestamp() if resets else None


def usage(models: list[str]) -> list[dict[str, Any]]:
    """Per-model calls and tokens in the current quota window, with when that window resets."""
    now = time.time()
    calls = load("call")
    out = []
    for model in models:
        start, reset = quota_window(model, now)
        window = [c for c in calls if c.get("model") == model and c.get("ts", 0) >= start]
        last = window[-1] if window else None
        out.append({
            "model": model,
            "provider": model.split("/")[0],
            "requests": len(window),
            "errors": sum(1 for c in window if not c.get("success")),
            "prompt_tokens": sum(c.get("prompt_tokens", 0) for c in window),
            "completion_tokens": sum(c.get("completion_tokens", 0) for c in window),
            # The latest call hit a quota or key error, so the model is likely out until reset.
            "limited": bool(last and not last.get("success") and last.get("limited")),
            "last_used": last["ts"] if last else None,
            "window_start": start,
            "resets_at": reset,
        })
    return out


def model_subtask_success(model: str) -> tuple[int, float | None]:
    """(samples, success rate) of finished subtasks whose last model was `model`."""
    rows = [r for r in load("subtask") if r.get("model") == model]
    if not rows:
        return 0, None
    return len(rows), sum(1 for r in rows if r.get("success")) / len(rows)


def model_verified_rate(model: str) -> tuple[int, float | None]:
    """(runs, pass rate) of verified runs where `model` wrote worker code."""
    runs = [r for r in load("run") if model in (r.get("worker_models") or []) and r.get("verdict") in ("pass", "fail")]
    if not runs:
        return 0, None
    return len(runs), sum(1 for r in runs if r["verdict"] == "pass") / len(runs)


def subtask_stats(capability: str | None, size: str | None) -> dict[str, Any]:
    rows = [r for r in load("subtask")
            if r.get("success") and r.get("capability") == capability and r.get("size") == size]
    if not rows:
        return {"samples": 0}
    return {
        "samples": len(rows),
        "median_tokens": statistics.median(r["tokens"] for r in rows),
        "median_duration_s": statistics.median(r["duration_s"] for r in rows),
    }


def _quartiles(values: list[float]) -> tuple[float, float, float]:
    if len(values) < 4:
        return min(values), statistics.median(values), max(values)
    q1, q2, q3 = statistics.quantiles(values, n=4)
    return q1, q2, q3


def calibration() -> dict[str, Any]:
    """Actual/estimated ratios from past runs, used to widen or shift future ranges."""
    runs = [r for r in load("run") if r.get("estimated_time_s") and r.get("estimated_tokens")]
    if not runs:
        return {"samples": 0}
    time_ratios = [r["actual_time_s"] / r["estimated_time_s"] for r in runs if r["estimated_time_s"] > 0]
    token_ratios = [r["actual_tokens"] / r["estimated_tokens"] for r in runs if r["estimated_tokens"] > 0]
    return {
        "samples": len(runs),
        "time": _quartiles(time_ratios) if time_ratios else None,
        "tokens": _quartiles(token_ratios) if token_ratios else None,
    }
