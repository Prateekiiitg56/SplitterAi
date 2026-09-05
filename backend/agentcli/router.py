"""Model Router — unified LLM interface with fallback chains.

FR-1: Attempt each model in order until one succeeds.
FR-2: Gemini, OpenRouter, Groq via litellm.
FR-3: Per-call API key override.
FR-4: Raise distinct error on total failure.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable, Optional

import litellm

from .schemas import AgentRole, LogEntry, LogType
from .config import ExecutionConfig

logger = logging.getLogger(__name__)

import hashlib
import json

# Suppress litellm's verbose default logging
litellm.suppress_debug_info = True

# In-memory call log for real quota & usage tracking
ROUTER_CALL_LOG: list[dict[str, Any]] = []

# In-memory prompt cache for planner calls
PLANNER_CACHE: dict[str, dict[str, Any]] = {}


def get_usage_metrics() -> dict[str, Any]:
    """Calculate real usage metrics per provider and per role from call history."""
    provider_limits = {
        "gemini": {"provider": "Google Gemini", "limit_requests": 1500, "limit_tokens": 1000000},
        "xai": {"provider": "xAI Grok", "limit_requests": 1000, "limit_tokens": 500000},
        "openrouter": {"provider": "OpenRouter", "limit_requests": 2000, "limit_tokens": 2000000},
    }

    metrics: dict[str, dict[str, Any]] = {
        p: {
            "provider": info["provider"],
            "calls": 0,
            "errors": 0,
            "total_tokens": 0,
            "limit_requests": info["limit_requests"],
        }
        for p, info in provider_limits.items()
    }

    role_metrics: dict[str, int] = {
        role.value: 0 for role in AgentRole
    }

    total_tokens_all = 0

    for log in ROUTER_CALL_LOG:
        p = log.get("provider", "other")
        r = log.get("role", "unknown")
        tokens = log.get("total_tokens", 0)

        if r in role_metrics:
            role_metrics[r] += 1

        if p in metrics:
            metrics[p]["calls"] += 1
            metrics[p]["total_tokens"] += tokens
            if not log.get("success", False):
                metrics[p]["errors"] += 1

        total_tokens_all += tokens

    return {
        "providers": metrics,
        "roles": role_metrics,
        "total_calls": len(ROUTER_CALL_LOG),
        "total_tokens": total_tokens_all,
    }


class AllModelsFailedError(Exception):
    """Raised when every model in the fallback chain fails."""

    def __init__(self, attempts: list[dict[str, Any]]):
        self.attempts = attempts
        models = [a["model"] for a in attempts]
        super().__init__(f"All models failed: {models}")


async def call_model(
    messages: list[dict[str, Any]],
    model_chain: list[str],
    role: AgentRole,
    config: ExecutionConfig,
    tools: Optional[list[dict]] = None,
    on_event: Optional[Callable[[LogEntry], None]] = None,
    use_cache: bool = True,
) -> dict[str, Any]:
    """Call an LLM with automatic fallback through the model chain and per-model transient retry.

    Args:
        messages: Chat messages in OpenAI format.
        model_chain: Ordered list of model identifiers to try.
        role: The agent role making this call (for API key resolution).
        config: Execution configuration.
        tools: Optional tool/function definitions for function calling.
        on_event: Optional callback for observability events.
        use_cache: If True, check/cache planner requests to prevent duplicate LLM calls.

    Returns:
        The model response as a dict with 'content' and optionally 'tool_calls'.

    Raises:
        AllModelsFailedError: If every model in the chain fails.
    """
    # Check planner cache for duplicate identical planning prompts
    cache_key = None
    if use_cache and role == AgentRole.planner and not tools:
        cache_str = f"{role.value}:{json.dumps(messages, sort_keys=True)}"
        cache_key = hashlib.md5(cache_str.encode("utf-8")).hexdigest()
        if cache_key in PLANNER_CACHE:
            if on_event:
                on_event(LogEntry(
                    type=LogType.info,
                    role=role,
                    message="Using cached planner response",
                ))
            return PLANNER_CACHE[cache_key]

    attempts: list[dict[str, Any]] = []

    for i, model in enumerate(model_chain):
        api_key = config.get_api_key(role, model)

        # Log the attempt
        if on_event:
            on_event(LogEntry(
                type=LogType.model_request,
                role=role,
                model=model,
                message=f"Calling {model}" + (f" (attempt {i + 1}/{len(model_chain)})" if i > 0 else ""),
            ))

        # Single-model transient retry loop (up to 2 attempts per model)
        max_retries = 2
        for retry in range(max_retries):
            try:
                # Alias gemini-3.5-flash to active valid Gemini endpoint
                target_model = model
                if "gemini-3.5-flash" in model.lower():
                    target_model = "gemini/gemini-2.0-flash"

                kwargs: dict[str, Any] = {
                    "model": target_model,
                    "messages": messages,
                    "timeout": 30,
                }
                if api_key:
                    kwargs["api_key"] = api_key
                if tools:
                    kwargs["tools"] = tools
                    kwargs["tool_choice"] = "auto"

                response = await litellm.acompletion(**kwargs)
                choice = response.choices[0]
                message = choice.message

                # Build result dict
                result: dict[str, Any] = {
                    "content": message.content or "",
                    "model": model,
                    "role": "assistant",
                }

                # Handle tool calls
                if hasattr(message, "tool_calls") and message.tool_calls:
                    result["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ]

                # Extract token usage accounting
                usage = getattr(response, "usage", None)
                prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
                completion_tokens = getattr(usage, "completion_tokens", 0) or 0
                total_tokens = getattr(usage, "total_tokens", 0) or (prompt_tokens + completion_tokens)

                provider = model.split("/")[0] if "/" in model else model
                ROUTER_CALL_LOG.append({
                    "model": model,
                    "provider": provider,
                    "role": role.value,
                    "success": True,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                })

                if cache_key:
                    PLANNER_CACHE[cache_key] = result

                if on_event:
                    on_event(LogEntry(
                        type=LogType.model_response,
                        role=role,
                        model=model,
                        message=f"Response from {model}" + (
                            f" ({len(result.get('tool_calls', []))} tool calls)"
                            if result.get("tool_calls")
                            else f" ({len(result['content'])} chars)"
                        ),
                    ))

                return result

            except Exception as e:
                error_str = str(e)[:200]
                is_transient = any(c in error_str for c in ("429", "502", "503", "504", "timeout", "RateLimit", "Overloaded"))

                if is_transient and retry < max_retries - 1:
                    logger.warning("Transient error calling %s (retry %d/%d): %s", model, retry + 1, max_retries, error_str)
                    await asyncio.sleep(1.5 * (retry + 1))
                    continue

                attempts.append({"model": model, "error": error_str})
                logger.warning("Model %s failed: %s", model, error_str)

                if on_event and i < len(model_chain) - 1:
                    next_model = model_chain[i + 1]
                    on_event(LogEntry(
                        type=LogType.model_fallback,
                        role=role,
                        model=model,
                        message=f"{model} failed → falling back to {next_model}",
                        detail=error_str,
                    ))

                if i < len(model_chain) - 1:
                    await asyncio.sleep(1)
                break


    # All models failed
    if on_event:
        on_event(LogEntry(
            type=LogType.error,
            role=role,
            message=f"All {len(model_chain)} models failed",
            detail=str(attempts),
        ))

    raise AllModelsFailedError(attempts)
