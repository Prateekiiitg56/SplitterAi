"""Configuration — per-role API keys, model chains, execution limits.

FR-25: Each role reads its API key from a dedicated env var.
NFR-6: Adding a new role or model is a config change, not a code change.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from .schemas import AgentRole


# ── Per-Role Model Chains ─────────────────────────────────────────

DEFAULT_MODEL_CHAINS: dict[AgentRole, list[str]] = {
    AgentRole.planner: [
        "gemini/gemini-2.5-flash",
        "openrouter/google/gemini-2.0-flash-exp:free",
    ],
    AgentRole.coder: [
        "groq/llama-3.3-70b-versatile",
        "openrouter/meta-llama/llama-3.1-70b-instruct:free",
    ],
    AgentRole.auditor: [
        "gemini/gemini-2.5-flash",
        "groq/llama-3.3-70b-versatile",
    ],
    AgentRole.tester: [
        "groq/llama-3.3-70b-versatile",
        "gemini/gemini-2.5-flash",
    ],
}


# ── Per-Role API Key Resolution ───────────────────────────────────

# FR-25: CODER_API_KEY → fallback to provider default key

ROLE_API_KEY_ENVVARS: dict[AgentRole, str] = {
    AgentRole.planner: "PLANNER_API_KEY",
    AgentRole.coder: "CODER_API_KEY",
    AgentRole.auditor: "AUDITOR_API_KEY",
    AgentRole.tester: "TESTER_API_KEY",
}

PROVIDER_KEY_ENVVARS: dict[str, str] = {
    "gemini": "GEMINI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "groq": "GROQ_API_KEY",
}


def resolve_api_key(role: AgentRole, model: str) -> str | None:
    """Resolve the API key for a given role + model combination.

    Priority:
      1. Role-specific env var (e.g. CODER_API_KEY)
      2. Provider-specific env var (e.g. GROQ_API_KEY)
      3. None (let litellm figure it out from its own env defaults)
    """
    # 1. Role-specific key
    role_key = os.environ.get(ROLE_API_KEY_ENVVARS.get(role, ""))
    if role_key:
        return role_key

    # 2. Provider key — derive provider from model string
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
