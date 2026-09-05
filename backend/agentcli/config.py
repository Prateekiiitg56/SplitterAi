"""Configuration — per-role API keys, model chains, execution limits.

FR-25: Each role reads its API key from a dedicated env var.
NFR-6: Adding a new role or model is a config change, not a code change.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from .schemas import AgentRole


# ── Real Per-Role Model Chains for User's Active Models ─────────────

DEFAULT_MODEL_CHAINS: dict[AgentRole, list[str]] = {
    AgentRole.planner: [
        "gemini/gemini-3.5-flash",
        "openrouter/meta-llama/llama-3.3-70b-instruct",
        "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
        "openrouter/openai/gpt-4o-mini",
    ],
    AgentRole.coder: [
        "gemini/gemini-3.5-flash",
        "openrouter/meta-llama/llama-3.3-70b-instruct",
        "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
        "openrouter/openai/gpt-4o-mini",
    ],
    AgentRole.auditor: [
        "gemini/gemini-3.5-flash",
        "openrouter/meta-llama/llama-3.3-70b-instruct",
        "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
        "openrouter/openai/gpt-4o-mini",
    ],
    AgentRole.tester: [
        "gemini/gemini-3.5-flash",
        "openrouter/meta-llama/llama-3.3-70b-instruct",
        "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
        "openrouter/openai/gpt-4o-mini",
    ],
}



# ── Per-Role API Key Resolution ───────────────────────────────────

ROLE_API_KEY_ENVVARS: dict[AgentRole, str] = {
    AgentRole.planner: "PLANNER_API_KEY",
    AgentRole.coder: "CODER_API_KEY",
    AgentRole.auditor: "AUDITOR_API_KEY",
    AgentRole.tester: "TESTER_API_KEY",
}

PROVIDER_KEY_ENVVARS: dict[str, str] = {
    "gemini": "GEMINI_API_KEY",
    "xai": "XAI_GROK_API_KEY",
    "grok": "XAI_GROK_API_KEY",
    "openrouter": "OPENROUTER_SUPER_KEY",
}


def resolve_api_key(role: AgentRole, model: str) -> str | None:
    """Resolve the API key for a given role + model combination.

    Priority:
      1. Role-specific env var (e.g. CODER_API_KEY)
      2. Model-specific / Provider-specific env var
      3. None (let litellm figure it out from its own env defaults)
    """
    # 1. Role-specific key
    role_key = os.environ.get(ROLE_API_KEY_ENVVARS.get(role, ""))
    if role_key:
        return role_key

    # 2. Specific model or provider key resolution
    lower_model = model.lower()
    if "ultra" in lower_model:
        key = os.environ.get("OPENROUTER_ULTRA_KEY") or os.environ.get("OPENROUTER_SUPER_KEY") or os.environ.get("OPENROUTER_API_KEY")
        if key:
            return key

    if "openrouter" in lower_model:
        key = os.environ.get("OPENROUTER_SUPER_KEY") or os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENROUTER_ULTRA_KEY")
        if key:
            return key

    if "gemini" in lower_model:
        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY_ALT")
        if key:
            return key

    if "xai" in lower_model or "grok" in lower_model:
        key = os.environ.get("XAI_GROK_API_KEY")
        if key:
            return key

    provider = model.split("/")[0] if "/" in model else model
    provider_key = os.environ.get(PROVIDER_KEY_ENVVARS.get(provider, ""))
    if provider_key:
        return provider_key

    return None


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

    def get_api_key(self, role: AgentRole, model: str) -> str | None:
        """Get the API key for a role + model."""
        return resolve_api_key(role, model)
