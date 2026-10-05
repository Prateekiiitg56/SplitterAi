"""Model capability registry — the one place model-specific assumptions live.

Capabilities and tiers are static config. Latency and reliability come from
execution history (telemetry), never from hardcoded numbers.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import telemetry
from .config import (
    DEFAULT_MODEL_CHAINS, GEMINI_FLASH, GEMMA_31B, GPT_4O_MINI, LAGUNA_S, LAGUNA_XS, LLAMA_70B,
    NEMOTRON_LIGHTNING, NEMOTRON_SUPER, NEMOTRON_ULTRA, NORTH_CODE, QWEN_27B,
)

CAPABILITIES = ("coding", "reasoning", "review", "testing", "docs")
TIERS = ("fast", "standard", "strong")


@dataclass(frozen=True)
class ModelProfile:
    id: str
    provider: str
    capabilities: frozenset[str]
    tier: str
    tool_support: bool = True
    vision: bool = False  # can read screenshots


def _profile(model_id: str, capabilities: set[str], tier: str, vision: bool = False) -> ModelProfile:
    return ModelProfile(model_id, model_id.split("/")[0], frozenset(capabilities), tier, vision=vision)


MODEL_PROFILES: dict[str, ModelProfile] = {p.id: p for p in [
    # Four keys and the most reliable tool use: the default lead.
    _profile(GEMINI_FLASH, {"coding", "reasoning", "review", "testing", "docs"}, "standard", vision=True),
    _profile(NEMOTRON_ULTRA, {"reasoning", "review", "coding"}, "strong"),
    _profile(GEMMA_31B, {"review", "coding", "docs"}, "standard", vision=True),
    _profile(QWEN_27B, {"coding", "review", "reasoning"}, "standard", vision=True),
    _profile(NORTH_CODE, {"coding", "testing"}, "fast"),
    _profile(LAGUNA_S, {"coding", "testing"}, "standard"),
    _profile(NEMOTRON_SUPER, {"coding", "testing", "docs"}, "standard"),
    _profile(NEMOTRON_LIGHTNING, {"testing", "docs"}, "fast"),
    _profile(LAGUNA_XS, {"testing", "docs"}, "fast"),
    _profile(GPT_4O_MINI, {"coding", "docs", "review", "testing"}, "fast", vision=True),
    # Not listed for coding: in observed runs it often skipped tool calls or wrote placeholder files.
    _profile(LLAMA_70B, {"docs"}, "standard"),
]}

# Tier order each preset prefers; models of other tiers stay in the chain as fallbacks.
PRESET_TIER_ORDER: dict[str, tuple[str, ...]] = {
    "cost": ("fast", "standard", "strong"),
    "fastest": ("fast", "standard", "strong"),
    "balanced": ("standard", "fast", "strong"),
    "quality": ("strong", "standard", "fast"),
}

ROLE_DEFAULT_CAPABILITY = {"coder": "coding", "designer": "coding", "auditor": "review", "tester": "testing"}

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
            stats["recent_samples"] >= _MIN_RELIABILITY_SAMPLES
            and stats["recent_success_rate"] is not None
            and stats["recent_success_rate"] < 0.5
        ) or (task_samples >= _MIN_RELIABILITY_SAMPLES and task_success is not None and task_success < 0.5)
        if capability == "coding":
            # Output quality, not just API success: coders whose runs keep failing verification drop.
            runs, pass_rate = telemetry.model_verified_rate(model_id)
            unreliable = unreliable or (runs >= _MIN_VERIFIED_RUNS and pass_rate is not None and pass_rate < 0.5)
        # Reviewers look at screenshots, so vision models lead there.
        blind = int(capability == "review" and not profile.vision)
        paid = int(":free" not in model_id and profile.provider == "openrouter")  # spends account credits
        return (int(unreliable), int(capability not in profile.capabilities), paid, blind, tier_order.index(profile.tier))

    chain = sorted(all_models(), key=rank)
    if pinned:
        chain = [pinned] + [m for m in chain if m != pinned]
    return chain
