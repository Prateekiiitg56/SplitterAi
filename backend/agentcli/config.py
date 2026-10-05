"""Configuration — per-role API keys, model chains, execution limits.

FR-25: Each role reads its API key from a dedicated env var.
NFR-6: Adding a new role or model is a config change, not a code change.
"""

from __future__ import annotations

import itertools
import os
from dataclasses import dataclass, field

from .schemas import AgentRole


# ── Real Per-Role Model Chains for User's Active Models ─────────────

GEMINI_FLASH = "gemini/gemini-3.5-flash"
NEMOTRON_ULTRA = "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"
NEMOTRON_SUPER = "openrouter/nvidia/nemotron-3-super-120b-a12b:free"
NEMOTRON_LIGHTNING = "openrouter/nvidia/nemotron-3.5-lightning:free"
LING_FLASH = "openrouter/inclusionai/ling-3.0-flash-fin:free"
GEMMA_31B = "openrouter/google/gemma-4-31b-it:free"
QWEN_27B = "openrouter/qwen/qwen3.8-27b:free"
NORTH_CODE = "openrouter/cohere/north-mini-code:free"
LAGUNA_S = "openrouter/poolside/laguna-s-2.1:free"
LAGUNA_XS = "openrouter/poolside/laguna-xs-2.1:free"
GPT_4O_MINI = "openrouter/openai/gpt-4o-mini"
LLAMA_70B = "openrouter/meta-llama/llama-3.3-70b-instruct"

# Vision models first for roles that look at screenshots (designer, verifier).
DEFAULT_MODEL_CHAINS: dict[AgentRole, list[str]] = {
    AgentRole.planner: [GEMINI_FLASH, NEMOTRON_ULTRA, LING_FLASH, NEMOTRON_SUPER],
    AgentRole.coder: [GEMINI_FLASH, NORTH_CODE, NEMOTRON_SUPER, QWEN_27B, LAGUNA_S, GPT_4O_MINI],
    AgentRole.designer: [GEMINI_FLASH, GEMMA_31B, QWEN_27B, NORTH_CODE],
    AgentRole.auditor: [GEMINI_FLASH, GEMMA_31B, QWEN_27B, NEMOTRON_ULTRA, LING_FLASH],
    AgentRole.tester: [NEMOTRON_LIGHTNING, LAGUNA_XS, NORTH_CODE, GEMINI_FLASH],
}


# ── API Keys ──────────────────────────────────────────────────────
#
# Free quotas are per account, so each model group has its own OpenRouter account and the
# others act as fallbacks. The router moves to the next key when one is rate-limited, out of
# credits or rejected. Gemini keys rotate so load spreads over all four projects.

ROLE_API_KEY_ENVVARS: dict[AgentRole, str] = {
    AgentRole.planner: "PLANNER_API_KEY",
    AgentRole.coder: "CODER_API_KEY",
    AgentRole.designer: "DESIGNER_API_KEY",
    AgentRole.auditor: "AUDITOR_API_KEY",
    AgentRole.tester: "TESTER_API_KEY",
}

GEMINI_KEYS = ("GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY", "GEMINI_API_KEY_ALT")

# Dedicated account first, then accounts with spare quota.
MODEL_KEYS: dict[str, tuple[str, ...]] = {
    NEMOTRON_ULTRA: ("OPENROUTER_KEY_BIG", "OPENROUTER_ULTRA_KEY", "OPENROUTER_KEY_REASON"),
    LING_FLASH: ("OPENROUTER_KEY_REASON", "OPENROUTER_KEY_BIG"),
    GEMMA_31B: ("OPENROUTER_KEY_VISION", "OPENROUTER_KEY_FAST"),
    QWEN_27B: ("OPENROUTER_KEY_VISION", "OPENROUTER_KEY_CODE"),
    NORTH_CODE: ("OPENROUTER_KEY_CODE", "OPENROUTER_KEY_FAST"),
    LAGUNA_S: ("OPENROUTER_KEY_CODE", "OPENROUTER_KEY_FAST"),
    NEMOTRON_SUPER: ("OPENROUTER_KEY_CODE", "OPENROUTER_SUPER_KEY"),
    NEMOTRON_LIGHTNING: ("OPENROUTER_KEY_FAST", "OPENROUTER_KEY_CODE"),
    LAGUNA_XS: ("OPENROUTER_KEY_FAST",),
    GPT_4O_MINI: ("OPENROUTER_SUPER_KEY",),  # paid model: only the account with credits
    LLAMA_70B: ("OPENROUTER_SUPER_KEY",),
}

PROVIDER_KEYS: dict[str, tuple[str, ...]] = {
    "openrouter": ("OPENROUTER_SUPER_KEY", "OPENROUTER_ULTRA_KEY", "OPENROUTER_KEY_BIG", "OPENROUTER_KEY_REASON",
                   "OPENROUTER_KEY_VISION", "OPENROUTER_KEY_CODE", "OPENROUTER_KEY_FAST", "OPENROUTER_API_KEY"),
    "gemini": GEMINI_KEYS,
    "xai": ("XAI_GROK_API_KEY",),
    "grok": ("XAI_GROK_API_KEY",),
}

_gemini_turn = itertools.count()


def llm_key_status() -> dict[str, bool]:
    """Which providers have at least one key configured (never the keys themselves)."""
    return {provider: any(os.environ.get(n, "").strip() for n in names)
            for provider, names in PROVIDER_KEYS.items() if provider != "grok"}


def resolve_api_keys(role: AgentRole, model: str) -> list[str]:
    """Keys to try for a role + model, in order. Empty means litellm uses its own env defaults.

    A role-specific key (e.g. CODER_API_KEY) goes first when set.
    """
    provider = model.split("/")[0]
    names = list(MODEL_KEYS.get(model, PROVIDER_KEYS.get(provider, ())))
    if provider == "gemini" and names:
        turn = next(_gemini_turn) % len(names)
        names = names[turn:] + names[:turn]
    names.insert(0, ROLE_API_KEY_ENVVARS.get(role, ""))
    keys = [os.environ.get(n, "").strip() for n in names if n]
    return list(dict.fromkeys(k for k in keys if k))


# ── Execution Limits ──────────────────────────────────────────────

@dataclass
class ExecutionConfig:
    """Runtime configuration for the agent system."""

    max_steps: int = field(
        default_factory=lambda: int(os.environ.get("MAX_STEPS", "25"))
    )
    max_concurrent_agents: int = field(
        default_factory=lambda: int(os.environ.get("MAX_CONCURRENT_AGENTS", "4"))
    )
    # Free models writing whole files regularly need well over 30s per call.
    model_timeout: int = field(
        default_factory=lambda: int(os.environ.get("MODEL_TIMEOUT", "90"))
    )
    step_timeout: int = field(
        default_factory=lambda: int(os.environ.get("STEP_TIMEOUT", "180"))
    )
    shell_timeout: int = field(
        default_factory=lambda: int(os.environ.get("SHELL_TIMEOUT", "30"))
    )
    output_max_bytes: int = field(
        default_factory=lambda: int(os.environ.get("OUTPUT_MAX_BYTES", "10240"))
    )
    model_chains: dict[AgentRole, list[str]] = field(
        default_factory=lambda: dict(DEFAULT_MODEL_CHAINS)
    )

    def get_model_chain(self, role: AgentRole) -> list[str]:
        """Get the model fallback chain for a role."""
        return self.model_chains.get(role, DEFAULT_MODEL_CHAINS[AgentRole.coder])

    def set_model_chain(self, role: AgentRole, chain: list[str]) -> None:
        """Set the model fallback chain for a role."""
        self.model_chains[role] = chain

    def get_api_keys(self, role: AgentRole, model: str) -> list[str]:
        """API keys to try for a role + model, in failover order."""
        return resolve_api_keys(role, model)
