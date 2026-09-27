"""Token savings: worker history compaction and provider prompt-cache accounting."""

import json
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import worker
from agentcli.config import ExecutionConfig
from agentcli.router import ROUTER_CALL_LOG, call_model, get_usage_metrics
from agentcli.schemas import AgentRole


def _history(steps: int, size: int) -> list[dict]:
    messages = [{"role": "system", "content": "sys"}, {"role": "user", "content": "task"}]
    for i in range(steps):
        body = "x" * size
        messages.append({"role": "assistant", "content": "", "tool_calls": [{
            "id": f"c{i}", "type": "function",
            "function": {"name": "write_file", "arguments": json.dumps({"path": f"f{i}.js", "content": body})},
        }]})
        messages.append({"role": "tool", "tool_call_id": f"c{i}", "content": body})
    return messages


def test_small_history_is_untouched():
    messages = _history(3, 1000)
    before = json.dumps(messages)
    assert worker.compact_history(messages) == 0
    assert json.dumps(messages) == before


def test_large_history_stubs_old_output_and_keeps_recent():
    messages = _history(10, 5000)
    recent = json.dumps(messages[-worker.KEEP_RECENT_MESSAGES:])
    saved = worker.compact_history(messages)

    assert saved > worker.HISTORY_BUDGET_CHARS
    assert messages[:2] == [{"role": "system", "content": "sys"}, {"role": "user", "content": "task"}]
    assert json.dumps(messages[-worker.KEEP_RECENT_MESSAGES:]) == recent
    assert "removed to save tokens" in messages[3]["content"]
    args = json.loads(messages[2]["tool_calls"][0]["function"]["arguments"])
    assert args["path"] == "f0.js" and "removed to save tokens" in args["content"]
    # A second pass right away changes nothing, so the cached prefix stays stable between bursts.
    snapshot = json.dumps(messages)
    assert worker.compact_history(messages) == 0
    assert json.dumps(messages) == snapshot


@pytest.mark.asyncio
async def test_cached_prompt_tokens_are_recorded():
    ROUTER_CALL_LOG.clear()
    usage = SimpleNamespace(prompt_tokens=2000, completion_tokens=100, total_tokens=2100,
                            prompt_tokens_details=SimpleNamespace(cached_tokens=1500))
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="ok", tool_calls=None))], usage=usage)

    async def fake_completion(**kwargs):
        return response

    with patch("agentcli.router.litellm.acompletion", fake_completion), \
            patch("agentcli.router.telemetry.record_call") as record:
        result = await call_model([{"role": "user", "content": "hi"}], ["gemini/gemini-3.5-flash"],
                                  AgentRole.coder, ExecutionConfig(), use_cache=False)

    assert result["usage"]["cached_tokens"] == 1500
    assert record.call_args.kwargs["cached_tokens"] == 1500
    metrics = get_usage_metrics()
    assert metrics["cached_tokens"] == 1500 and metrics["providers"]["gemini"]["cached_tokens"] == 1500
    ROUTER_CALL_LOG.clear()
