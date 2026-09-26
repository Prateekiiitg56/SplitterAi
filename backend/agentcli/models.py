"""Model capability registry — the one place model-specific assumptions live.

Capabilities and tiers are static config. Latency and reliability come from
execution history (telemetry), never from hardcoded numbers.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import telemetry
from .config import DEFAULT_MODEL_CHAINS

CAPABILITIES = ("coding", "reasoning", "review", "testing", "docs")
TIERS = ("fast", "standard", "strong")


@dataclass(frozen=True)
class ModelProfile:
    id: str
    provider: str
    capabilities: frozenset[str]
    tier: str
    tool_support: bool = True


def _profile(model_id: str, capabilities: set[str], tier: str) -> ModelProfile:
    return ModelProfile(model_id, model_id.split("/")[0], frozenset(capabilities), tier)


MODEL_PROFILES: dict[str, ModelProfile] = {p.id: p for p in [
    _profile("gemini/gemini-3.5-flash", {"coding", "reasoning", "review", "testing", "docs"}, "fast"),
    # Not listed for coding: in observed runs it often skipped tool calls or wrote placeholder files.
    _profile("openrouter/meta-llama/llama-3.3-70b-instruct", {"docs"}, "standard"),
    _profile("openrouter/nvidia/nemotron-3-ultra-550b-a55b:free", {"reasoning", "review", "coding"}, "strong"),
    _profile("openrouter/nvidia/nemotron-3-super-120b-a12b:free", {"coding", "testing", "docs"}, "standard"),
    _profile("openrouter/openai/gpt-4o-mini", {"coding", "docs", "review", "testing"}, "fast"),
]}

# Tier order each preset prefers; models of other tiers stay in the chain as fallbacks.
PRESET_TIER_ORDER: dict[str, tuple[str, ...]] = {
    "cost": ("fast", "standard", "strong"),
    "fastest": ("fast", "standard", "strong"),
    "balanced": ("standard", "fast", "strong"),
    "quality": ("strong", "standard", "fast"),
}

ROLE_DEFAULT_CAPABILITY = {"coder": "coding", "auditor": "review", "tester": "testing"}

_MIN_RELIABILITY_SAMPLES = 5
_MIN_VERIFIED_RUNS = 3


def get_profile(model_id: str) -> ModelProfile:
    return MODEL_PROFILES.get(model_id) or _profile(model_id, set(CAPABILITIES), "standard")


def all_models() -> list[str]:
    seen: dict[str, None] = {}
    for chain in DEFAULT_MODEL_CHAINS.values():
        for m in chain:
            seen.setdefault(m, None)
    for m in MODEL_PROFILES:
        seen.setdefault(m, None)
    return list(seen)


def select_chain(capability: str | None, preset: str = "balanced", pinned: str | None = None) -> list[str]:
    """Ordered fallback chain for one workstream.

    Capable models first, ordered by the preset's tier preference; models that
    history shows failing most calls drop to the end. A user-pinned model leads.
    """
    capability = capability if capability in CAPABILITIES else "coding"
    tier_order = PRESET_TIER_ORDER.get(preset, PRESET_TIER_ORDER["balanced"])

    def rank(model_id: str) -> tuple[int, int, int]:
        profile = get_profile(model_id)
        stats = telemetry.model_stats(model_id)
        task_samples, task_success = telemetry.model_subtask_success(model_id)
        # Unreliable = most API calls fail, or most subtasks it finishes end in error.
        unreliable = (
            stats["samples"] >= _MIN_RELIABILITY_SAMPLES
            and stats["success_rate"] is not None
            and stats["success_rate"] < 0.5
        ) or (task_samples >= _MIN_RELIABILITY_SAMPLES and task_success is not None and task_success < 0.5)
        if capability == "coding":
            # Output quality, not just API success: coders whose runs keep failing verification drop.
            runs, pass_rate = telemetry.model_verified_rate(model_id)
            unreliable = unreliable or (runs >= _MIN_VERIFIED_RUNS and pass_rate is not None and pass_rate < 0.5)
        return (int(unreliable), int(capability not in profile.capabilities), tier_order.index(profile.tier))

    chain = sorted(all_models(), key=rank)
    if pinned:
        chain = [pinned] + [m for m in chain if m != pinned]
    return chain
