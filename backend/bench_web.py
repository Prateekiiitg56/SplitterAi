"""Web quality benchmark: run fixed web tasks through a running backend and record the outcome.

Usage (backend running on :8000):
    python bench_web.py                 # all tasks
    python bench_web.py calculator      # tasks whose name contains "calculator"

Each run is a new project under workspace_output/. Results append to workspace_output/bench_results.jsonl
with verdict, repair rounds, time, tokens and the project folder (screenshots in .splitter/screenshots/).
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import httpx

API = "http://localhost:8000"
RESULTS = Path(__file__).resolve().parent.parent / "workspace_output" / "bench_results.jsonl"

TASKS = {
    "calculator": "Build a calculator web app with chained operations, decimals, clear, backspace and keyboard support.",
    "landing": "Build a landing page for a note-taking app called Inkwell: hero, features, pricing teaser, testimonials, footer.",
    "todo": "Build a to-do app: add, complete, delete and filter tasks (all/active/done), saved in localStorage.",
    "pricing": "Build a pricing page with three plans, a monthly/yearly toggle that updates prices, and a FAQ accordion.",
    "dashboard": "Build a small analytics dashboard: four KPI cards, a bar chart drawn with SVG, and a sortable table of 10 orders.",
}


def run(name: str, task: str) -> dict:
    started = time.time()
    res = httpx.post(f"{API}/run", json={"task": task, "workspace": "./workspace_output", "strategy": "balanced",
                                         "agent_count": 2}, timeout=1800)
    res.raise_for_status()
    body = res.json()
    verification = body.get("verification") or {}
    return {
        "name": name,
        "at": time.strftime("%Y-%m-%d %H:%M"),
        "status": body.get("status"),
        "verdict": verification.get("verdict"),
        "repair_rounds": verification.get("repair_rounds"),
        "seconds": round(time.time() - started),
        "tokens": sum(st.get("tokens_in", 0) + st.get("tokens_out", 0) for st in body.get("subtasks", [])),
        "workspace": body.get("workspace"),
    }


if __name__ == "__main__":
    selected = {k: v for k, v in TASKS.items() if not sys.argv[1:] or any(a in k for a in sys.argv[1:])}
    RESULTS.parent.mkdir(exist_ok=True)
    for name, task in selected.items():
        row = run(name, task)
        print(json.dumps(row))
        with RESULTS.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")
