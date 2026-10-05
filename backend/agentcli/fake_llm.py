"""Scripted model for end-to-end tests (SPLITTER_FAKE_LLM=1): no provider keys, deterministic output.

Recognises the system prompts the app sends (intent, planner, synthesizer, verifier, workers, chat)
and answers each the way a well-behaved model would, including tool calls that write real files.
"""

from __future__ import annotations

import json
import re
from typing import Any

from .prompts import PLANNER_SYSTEM, SYNTHESIZER_SYSTEM, VERIFIER_SYSTEM
from .schemas import AgentRole

MODEL = "fake/scripted"

TODO_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todo</title>
<style>
  :root { --bg: #f7f7f5; --fg: #1d1d1b; --card: #ffffff; --accent: #c2410c; }
  body.dark { --bg: #161514; --fg: #f1efe9; --card: #24221f; --accent: #f59e0b; }
  body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); }
  main { max-width: 32rem; margin: 3rem auto; padding: 1.5rem; background: var(--card); border-radius: 12px; }
  form { display: flex; gap: .5rem; } input[type=text] { flex: 1; padding: .5rem; }
  li.done span { text-decoration: line-through; opacity: .6; } button { cursor: pointer; }
</style>
</head>
<body>
<main>
  <header style="display:flex;justify-content:space-between;align-items:center">
    <h1>Todo</h1>
    <button id="theme" type="button" aria-pressed="false">Dark mode</button>
  </header>
  <form id="add-form"><input id="new-todo" type="text" placeholder="What needs doing?" aria-label="New todo"><button type="submit">Add</button></form>
  <ul id="list"></ul>
  __EXTRA__
</main>
<script>
  const list = document.getElementById('list');
  const items = [];
  function render() {
    list.innerHTML = '';
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = item.done ? 'done' : '';
      li.innerHTML = '<label><input type="checkbox"' + (item.done ? ' checked' : '') + '> <span></span></label>';
      li.querySelector('span').textContent = item.text;
      li.querySelector('input').onchange = () => { item.done = !item.done; render(); };
      list.appendChild(li);
    });
  }
  document.getElementById('add-form').onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('new-todo');
    if (input.value.trim()) { items.push({ text: input.value.trim(), done: false }); input.value = ''; render(); }
  };
  document.getElementById('theme').onclick = (e) => {
    const dark = document.body.classList.toggle('dark');
    e.target.setAttribute('aria-pressed', String(dark));
  };
  __EXTRA_JS__
</script>
</body>
</html>
"""

CLEAR_BUTTON = '<button id="clear-completed" type="button">Clear completed</button>'
CLEAR_JS = ("document.getElementById('clear-completed').onclick = () => { "
            "for (let i = items.length - 1; i >= 0; i--) if (items[i].done) items.splice(i, 1); render(); };")

PRIMES_PY = """def primes(n):
    found = []
    candidate = 2
    while len(found) < n:
        if all(candidate % p for p in found if p * p <= candidate):
            found.append(candidate)
        candidate += 1
    return found


if __name__ == "__main__":
    print(primes(20))
"""

COUNTER_APP = """import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Counter</h1>
        <output id="count" className="block text-5xl">{count}</output>
        <button id="inc" className="btn btn-primary" onClick={() => setCount(count + 1)}>+1</button>
      </div>
    </main>
  )
}
"""


def _text(content: Any) -> str:
    if isinstance(content, list):
        return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
    return content or ""


def _call(name: str, **arguments: Any) -> dict[str, Any]:
    return {"id": f"fake-{name}-{abs(hash(json.dumps(arguments, sort_keys=True))) % 10**8}", "type": "function",
            "function": {"name": name, "arguments": json.dumps(arguments)}}


def _worker_actions(task: str, tool_names: set[str]) -> list[dict[str, Any]]:
    lower = task.lower()
    if "../../.env" in lower:
        return [_call("run_shell", command="cat ../../.env")]
    mcp = sorted(n for n in tool_names if n.startswith("mcp__"))
    if "mcp" in lower and mcp:
        echo = next((n for n in mcp if n.endswith("__echo")), mcp[0])
        return [_call(echo, message="hello from SplitterAI")]
    if "prime" in lower:
        return [_call("read_file", path="primes.py"), _call("write_file", path="primes.py", content=PRIMES_PY),
                _call("run_shell", command="python primes.py")]
    if "react" in lower or "vite" in lower:
        return [_call("read_file", path="src/App.jsx"), _call("write_file", path="src/App.jsx", content=COUNTER_APP)]
    clear = "clear" in lower
    html = TODO_HTML.replace("__EXTRA__", CLEAR_BUTTON if clear else "").replace("__EXTRA_JS__", CLEAR_JS if clear else "")
    return [_call("read_file", path="index.html"), _call("write_file", path="index.html", content=html)]


def respond(messages: list[dict[str, Any]], role: AgentRole, tools: list[dict] | None) -> dict[str, Any]:
    system = _text(messages[0].get("content")) if messages else ""
    last_user = next((_text(m.get("content")) for m in reversed(messages) if m.get("role") == "user"), "")
    reply = {"model": MODEL, "role": "assistant", "usage": {"prompt_tokens": 0, "completion_tokens": 0, "cached_tokens": 0}}

    if system.startswith("You route messages"):
        imperative = re.match(r"\s*(please\s+)?(make|build|create|write|add|fix|generate|implement)\b", last_user, re.I)
        intent = "chat" if last_user.rstrip().endswith("?") and not imperative else "task"
        return {**reply, "content": json.dumps({"intent": intent, "confidence": 0.95})}
    if system.startswith(SYNTHESIZER_SYSTEM[:60]):
        return {**reply, "content": "The workers finished the task: the requested files are in the workspace."}
    if system.startswith(VERIFIER_SYSTEM[:60]):
        return {**reply, "content": "Checked the workspace against the contract.\nVERDICT: PASS"}
    if system.startswith(PLANNER_SYSTEM[:60]):
        task = last_user.strip()
        return {**reply, "content": json.dumps([{"id": "t1", "role": "coder", "instruction": f"Implement: {task}",
                                                "capability": "coding", "size": "s", "depends_on": []}])}
    if not tools:  # /chat and the coordinator
        return {**reply, "content": f"(fake model) You asked: {last_user[:200]}"}

    # Workers: replay the scripted tool calls one per step, then report.
    task = " ".join(_text(m.get("content")) for m in messages if m.get("role") == "user")
    actions = _worker_actions(task, {t["function"]["name"] for t in tools})
    step = sum(1 for m in messages if m.get("role") == "assistant" and m.get("tool_calls"))
    if step < len(actions):
        return {**reply, "content": "", "tool_calls": [actions[step]]}
    return {**reply, "content": "Done: the files for the assignment are written."}
