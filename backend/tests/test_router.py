"""Router: bounded caches, typed transient errors, Retry-After, no fixed sleeps, circuit breaker, per-role params."""

import sys
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
import litellm
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import router
from agentcli.config import ROLE_GENERATION, ExecutionConfig
from agentcli.schemas import AgentRole


def ok(content="hi"):
    msg = SimpleNamespace(content=content, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=msg)], usage=None)


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    router._BREAKER.clear()
    router.PLANNER_CACHE.clear()
    monkeypatch.delenv("SPLITTER_FAKE_LLM", raising=False)


def scripted(*outcomes):
    calls = []

    async def completion(**kwargs):
        calls.append(kwargs)
        outcome = outcomes[min(len(calls), len(outcomes)) - 1]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome
    return completion, calls


async def call(chain, role=AgentRole.coder, **kw):
    return await router.call_model([{"role": "user", "content": "x"}], chain, role, ExecutionConfig(), **kw)


async def test_timeout_is_retried_by_exception_type_and_role_params_are_sent():
    completion, calls = scripted(litellm.Timeout("Request timed out", "m1", "openai"), ok())
    with patch.object(router.litellm, "acompletion", completion), patch.object(router.asyncio, "sleep", lambda s: _noop()):
        assert (await call(["m1"]))["content"] == "hi"
    assert len(calls) == 2
    assert calls[0]["max_tokens"] == ROLE_GENERATION[AgentRole.coder]["max_tokens"]


async def _noop():
    return None


async def test_long_retry_after_moves_on_without_waiting():
    limited = litellm.RateLimitError("429 slow down", "openrouter", "m1",
                                     response=httpx.Response(429, headers={"retry-after": "120"},
                                                             request=httpx.Request("POST", "https://x")))
    completion, calls = scripted(limited, ok("from m2"))
    started = time.monotonic()
    with patch.object(router.litellm, "acompletion", completion):
        result = await call(["m1", "m2"])
    assert result["content"] == "from m2" and [c["model"] for c in calls] == ["m1", "m2"]
    assert time.monotonic() - started < 1  # no fixed sleep between fallback models


async def test_non_transient_errors_are_not_retried_on_the_same_model():
    completion, calls = scripted(ValueError("timeout in the prompt text is not a timeout"), ok())
    with patch.object(router.litellm, "acompletion", completion):
        await call(["m1", "m2"])
    assert [c["model"] for c in calls] == ["m1", "m2"]


async def test_breaker_skips_a_model_that_keeps_failing():
    completion, calls = scripted(ValueError("dead model"), ok())
    for _ in range(router.BREAKER_FAILURES):
        completion, calls = scripted(ValueError("dead model"), ok())
        with patch.object(router.litellm, "acompletion", completion):
            await call(["dead", "alive"])
    events = []
    completion, calls = scripted(ok())
    with patch.object(router.litellm, "acompletion", completion):
        await call(["dead", "alive"], on_event=events.append)
    assert [c["model"] for c in calls] == ["alive"]
    assert any("keep failing" in e.message for e in events)
    # Never skip everything: a chain of only open models still gets tried.
    completion, calls = scripted(ok())
    with patch.object(router.litellm, "acompletion", completion):
        await call(["dead"])
    assert [c["model"] for c in calls] == ["dead"]


async def test_planner_cache_is_bounded_and_returns_copies(monkeypatch):
    monkeypatch.setattr(router, "PLANNER_CACHE_SIZE", 2)
    completion, calls = scripted(ok("plan"))
    with patch.object(router.litellm, "acompletion", completion):
        first = await call(["m1"], role=AgentRole.planner)
        first["content"] = "mutated by caller"
        again = await call(["m1"], role=AgentRole.planner)
        assert again["content"] == "plan" and len(calls) == 1
        for i in range(3):
            await router.call_model([{"role": "user", "content": f"other {i}"}], ["m1"], AgentRole.planner, ExecutionConfig())
    assert len(router.PLANNER_CACHE) == 2


def test_call_log_is_bounded():
    assert router.ROUTER_CALL_LOG.maxlen == 5000


async def test_fake_llm_plans_without_any_provider(monkeypatch):
    monkeypatch.setenv("SPLITTER_FAKE_LLM", "1")
    from agentcli.prompts import PLANNER_SYSTEM
    result = await router.call_model([{"role": "system", "content": PLANNER_SYSTEM}, {"role": "user", "content": "make a todo app"}],
                                     ["none"], AgentRole.planner, ExecutionConfig())
    assert '"role": "coder"' in result["content"] and "make a todo app" in result["content"]


async def test_stream_model_falls_back_before_the_first_token():
    class Chunks:
        def __init__(self, parts):
            self.parts = parts

        def __aiter__(self):
            return self._gen()

        async def _gen(self):
            for p in self.parts:
                yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=p))])

    calls = []

    async def completion(**kwargs):
        calls.append(kwargs["model"])
        if kwargs["model"] == "m1":
            raise litellm.APIConnectionError("down", "openai", "m1")
        assert kwargs["stream"] is True
        return Chunks(["Hel", "lo"])

    with patch.object(router.litellm, "acompletion", completion):
        out = [e async for e in router.stream_model([{"role": "user", "content": "x"}], ["m1", "m2"], AgentRole.planner, ExecutionConfig())]
    assert "".join(e.get("delta", "") for e in out) == "Hello" and out[-1] == {"model": "m2"}


async def test_gemini_3_keeps_its_default_temperature():
    completion, calls = scripted(ok())
    with patch.object(router.litellm, "acompletion", completion):
        await call(["gemini/gemini-3.5-flash"])
        await call(["openrouter/x/y"])
    assert "temperature" not in calls[0] and calls[0]["max_tokens"] == ROLE_GENERATION[AgentRole.coder]["max_tokens"]
    assert calls[1]["temperature"] == ROLE_GENERATION[AgentRole.coder]["temperature"]
