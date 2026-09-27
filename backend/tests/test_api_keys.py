"""Per-model API keys: dedicated account first, failover to the next key on quota errors."""

import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli import config
from agentcli.config import ExecutionConfig, resolve_api_keys
from agentcli.router import call_model
from agentcli.schemas import AgentRole

ENV = {
    "OPENROUTER_KEY_BIG": "big", "OPENROUTER_ULTRA_KEY": "ultra", "OPENROUTER_KEY_REASON": "reason",
    "OPENROUTER_KEY_CODE": "code", "OPENROUTER_SUPER_KEY": "super",
    "GEMINI_API_KEY_2": "g2", "GEMINI_API_KEY_3": "g3", "GEMINI_API_KEY": "g1", "GEMINI_API_KEY_ALT": "galt",
}


@pytest.fixture
def env(monkeypatch):
    for name in {n for names in [*config.MODEL_KEYS.values(), *config.PROVIDER_KEYS.values()] for n in names}:
        monkeypatch.delenv(name, raising=False)
    for name in config.ROLE_API_KEY_ENVVARS.values():
        monkeypatch.delenv(name, raising=False)
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)


def test_dedicated_key_first_then_fallbacks(env):
    assert resolve_api_keys(AgentRole.planner, config.NEMOTRON_ULTRA) == ["big", "ultra", "reason"]
    assert resolve_api_keys(AgentRole.coder, config.GPT_4O_MINI) == ["super"]  # paid: never on free accounts


def test_role_key_overrides_and_missing_keys_skipped(env, monkeypatch):
    monkeypatch.setenv("CODER_API_KEY", "mine")
    assert resolve_api_keys(AgentRole.coder, config.NEMOTRON_SUPER) == ["mine", "code", "super"]


def test_gemini_keys_rotate(env):
    firsts = {resolve_api_keys(AgentRole.coder, config.GEMINI_FLASH)[0] for _ in range(4)}
    assert firsts == {"g2", "g3", "g1", "galt"}
    assert sorted(resolve_api_keys(AgentRole.coder, config.GEMINI_FLASH)) == ["g1", "g2", "g3", "galt"]


@pytest.mark.asyncio
async def test_quota_error_moves_to_next_key_of_same_model(env):
    used = []

    async def fake_completion(**kwargs):
        used.append((kwargs["model"], kwargs["api_key"]))
        if kwargs["api_key"] == "big":
            raise Exception("RateLimitError: 429 free-models-per-day limit exceeded")
        msg = SimpleNamespace(content="ok", tool_calls=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)], usage=None)

    with patch("agentcli.router.litellm.acompletion", fake_completion):
        result = await call_model([{"role": "user", "content": "hi"}], [config.NEMOTRON_ULTRA],
                                  AgentRole.planner, ExecutionConfig(), use_cache=False)
    assert result["content"] == "ok"
    assert used == [(config.NEMOTRON_ULTRA, "big"), (config.NEMOTRON_ULTRA, "ultra")]
