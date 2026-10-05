"""Model Router — unified LLM interface with fallback chains.

FR-1: Attempt each model in order until one succeeds.
FR-2: Gemini, OpenRouter, Groq via litellm.
FR-3: Per-call API key override.
FR-4: Raise distinct error on total failure.
"""

from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import logging
import os
import time
from collections import OrderedDict, deque
from typing import Any, AsyncIterator, Callable, Optional

import litellm

from . import fake_llm, telemetry
from .config import ROLE_GENERATION, ExecutionConfig
from .schemas import AgentRole, LogEntry, LogType

logger = logging.getLogger(__name__)

# Suppress litellm's verbose default logging; drop per-role params a provider does not support.
litellm.suppress_debug_info = True
litellm.drop_params = True

# Recent calls for usage metrics; bounded so a long-lived server does not grow without limit.
ROUTER_CALL_LOG: deque[dict[str, Any]] = deque(maxlen=5000)

# Planner responses for identical prompts: LRU with a TTL, handed out as copies.
PLANNER_CACHE: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
PLANNER_CACHE_SIZE = 200
PLANNER_CACHE_TTL_S = 3600

# Errors worth one more try on the same model and key.
TRANSIENT_ERRORS = (litellm.Timeout, litellm.RateLimitError, litellm.ServiceUnavailableError, litellm.APIConnectionError)
MAX_RETRY_AFTER_S = 10  # longer waits move on to the next model instead

# Circuit breaker: a model that keeps failing is skipped for a while instead of costing a timeout per call.
BREAKER_FAILURES = 3
BREAKER_OPEN_S = 300
_BREAKER: dict[str, tuple[int, float]] = {}


def _cache_get(key: str) -> dict[str, Any] | None:
    entry = PLANNER_CACHE.get(key)
    if not entry or entry[0] < time.time():
        PLANNER_CACHE.pop(key, None)
        return None
    PLANNER_CACHE.move_to_end(key)
    return copy.deepcopy(entry[1])


def _cache_put(key: str, result: dict[str, Any]) -> None:
    PLANNER_CACHE[key] = (time.time() + PLANNER_CACHE_TTL_S, copy.deepcopy(result))
    PLANNER_CACHE.move_to_end(key)
    while len(PLANNER_CACHE) > PLANNER_CACHE_SIZE:
        PLANNER_CACHE.popitem(last=False)


def _breaker_open(model: str) -> bool:
    fails, open_until = _BREAKER.get(model, (0, 0.0))
    if fails >= BREAKER_FAILURES and open_until > time.time():
        return True
    # History says it never works lately (e.g. a retired model id): treat it as open too.
    stats = telemetry.model_stats(model)
    return stats["recent_samples"] >= 5 and stats["recent_success_rate"] == 0


def _breaker_record(model: str, ok: bool) -> None:
    if ok:
        _BREAKER.pop(model, None)
        return
    fails = _BREAKER.get(model, (0, 0.0))[0] + 1
    _BREAKER[model] = (fails, time.time() + BREAKER_OPEN_S if fails >= BREAKER_FAILURES else 0.0)


def _retry_after(error: Exception) -> float | None:
    """Seconds the provider asked us to wait (Retry-After header), when it said."""
    response = getattr(error, "response", None)
    value = getattr(response, "headers", {}).get("retry-after") if response is not None else None
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _live_chain(model_chain: list[str], role: AgentRole, on_event) -> list[str]:
    live = [m for m in model_chain if not _breaker_open(m)]
    skipped = [m for m in model_chain if m not in live]
    if skipped and live and on_event:
        on_event(LogEntry(type=LogType.info, role=role,
                          message=f"Skipping {len(skipped)} model(s) that keep failing: {', '.join(skipped)}"))
    return live or model_chain


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
            "cached_tokens": 0,
            "limit_requests": info["limit_requests"],
        }
        for p, info in provider_limits.items()
    }

    role_metrics: dict[str, int] = {
        role.value: 0 for role in AgentRole
    }

    total_tokens_all = 0

    for log in list(ROUTER_CALL_LOG):
        p = log.get("provider", "other")
        r = log.get("role", "unknown")
        tokens = log.get("total_tokens", 0)

        if r in role_metrics:
            role_metrics[r] += 1

        if p in metrics:
            metrics[p]["calls"] += 1
            metrics[p]["total_tokens"] += tokens
            metrics[p]["cached_tokens"] += log.get("cached_tokens", 0)
            if not log.get("success", False):
                metrics[p]["errors"] += 1

        total_tokens_all += tokens

    return {
        "providers": metrics,
        "roles": role_metrics,
        "total_calls": len(ROUTER_CALL_LOG),
        "total_tokens": total_tokens_all,
        "cached_tokens": sum(log.get("cached_tokens", 0) for log in ROUTER_CALL_LOG),
        "prompt_tokens": sum(log.get("prompt_tokens", 0) for log in ROUTER_CALL_LOG),
    }


class AllModelsFailedError(Exception):
    """Raised when every model in the fallback chain fails."""

    def __init__(self, attempts: list[dict[str, Any]]):
        self.attempts = attempts
        models = [a["model"] for a in attempts]
        details = "; ".join(
            f"{attempt['model']}: {attempt.get('error', 'unknown error')}"
            for attempt in attempts
        )
        super().__init__(f"All models failed: {models}. Details: {details}")


def _is_account_error(error: str) -> bool:
    """Errors tied to one account (quota, credits, auth), which another key can get past."""
    lower = error.lower()
    if "upstream" in lower:  # the provider behind OpenRouter is busy for every account
        return False
    return any(s in lower for s in ("429", "402", "401", "403", "ratelimit", "rate limit", "quota",
                                    "credits", "exhausted", "unauthorized", "invalid api key", "api key not valid"))


def _has_images(messages: list[dict[str, Any]]) -> bool:
    return any(isinstance(m.get("content"), list) for m in messages)


def _without_images(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for m in messages:
        if isinstance(m.get("content"), list):
            text = " ".join(p.get("text", "") for p in m["content"] if p.get("type") == "text")
            m = {**m, "content": f"{text} [Screenshots omitted: this model cannot read images. "
                                "Judge from the browser_check report instead.]"}
        out.append(m)
    return out


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
    if os.getenv("SPLITTER_FAKE_LLM"):
        return fake_llm.respond(messages, role, tools)

    # Check planner cache for duplicate identical planning prompts
    cache_key = None
    if use_cache and role == AgentRole.planner and not tools:
        cache_str = f"{role.value}:{json.dumps(messages, sort_keys=True)}"
        cache_key = hashlib.md5(cache_str.encode("utf-8")).hexdigest()
        cached = _cache_get(cache_key)
        if cached is not None:
            if on_event:
                on_event(LogEntry(
                    type=LogType.info,
                    role=role,
                    message="Using cached planner response",
                ))
            return cached

    attempts: list[dict[str, Any]] = []
    model_chain = _live_chain(model_chain, role, on_event)

    for i, model in enumerate(model_chain):
        model_messages = messages
        # Each model can have several accounts; a rate-limited or empty one hands over to the next.
        api_keys = config.get_api_keys(role, model) or [None]
        key_index = 0

        # Log the attempt
        if on_event:
            on_event(LogEntry(
                type=LogType.model_request,
                role=role,
                model=model,
                message=f"Calling {model}" + (f" (attempt {i + 1}/{len(model_chain)})" if i > 0 else ""),
            ))

        # Single-model transient retry loop (up to 2 attempts per model and key)
        max_retries = 2
        retry = 0
        while retry < max_retries:
            api_key = api_keys[key_index]
            try:
                # Keep provider-qualified model names intact so each configured
                # API key is sent to its intended provider.
                target_model = model

                kwargs: dict[str, Any] = {
                    "model": target_model,
                    "messages": model_messages,
                    "timeout": config.model_timeout,
                    **ROLE_GENERATION.get(role, {}),
                }
                if api_key:
                    kwargs["api_key"] = api_key
                if tools:
                    kwargs["tools"] = tools
                    kwargs["tool_choice"] = "auto"

                call_started = time.monotonic()
                response = await litellm.acompletion(**kwargs)
                latency_s = time.monotonic() - call_started
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
                # Prompt tokens the provider served from its prefix cache (Gemini implicit, OpenAI automatic).
                details = getattr(usage, "prompt_tokens_details", None)
                cached_tokens = (details.get("cached_tokens") if isinstance(details, dict)
                                 else getattr(details, "cached_tokens", 0))
                cached_tokens = cached_tokens if isinstance(cached_tokens, int) else 0

                provider = model.split("/")[0] if "/" in model else model
                ROUTER_CALL_LOG.append({
                    "model": model,
                    "provider": provider,
                    "role": role.value,
                    "success": True,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "cached_tokens": cached_tokens,
                })
                telemetry.record_call(model, role.value, prompt_tokens, completion_tokens, latency_s, True,
                                      cached_tokens=cached_tokens)
                result["usage"] = {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
                                   "cached_tokens": cached_tokens}

                if cache_key:
                    _cache_put(cache_key, result)
                _breaker_record(model, True)

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
                error_full = str(e)
                error_str = error_full[:200]
                if "image" in error_full.lower() and model_messages is messages and _has_images(messages):
                    # Text-only model: retry it without the screenshots instead of losing the whole chain.
                    logger.warning("Model %s cannot read images; retrying without screenshots", model)
                    model_messages = _without_images(messages)
                    continue
                if key_index < len(api_keys) - 1 and _is_account_error(error_full):
                    key_index += 1
                    retry = 0
                    logger.warning("Model %s: key %d is limited (%s); trying key %d",
                                   model, key_index, error_str[:80], key_index + 1)
                    continue
                wait = _retry_after(e)
                is_transient = isinstance(e, TRANSIENT_ERRORS) and (wait is None or wait <= MAX_RETRY_AFTER_S)

                if is_transient and retry < max_retries - 1:
                    logger.warning("Transient error calling %s (retry %d/%d): %s", model, retry + 1, max_retries, error_str)
                    await asyncio.sleep(wait if wait is not None else 1.5 * (retry + 1))
                    retry += 1
                    continue

                attempts.append({"model": model, "error": error_str})
                _breaker_record(model, False)
                telemetry.record_call(model, role.value, 0, 0, 0.0, False, limited=_is_account_error(error_full))
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


async def stream_model(
    messages: list[dict[str, Any]],
    model_chain: list[str],
    role: AgentRole,
    config: ExecutionConfig,
) -> AsyncIterator[dict[str, Any]]:
    """Yield {"delta": text} as tokens arrive, then {"model": name}.

    Falls back to the next model only while nothing has been sent yet.
    """
    if os.getenv("SPLITTER_FAKE_LLM"):
        reply = fake_llm.respond(messages, role, None)
        for word in reply["content"].split(" "):
            yield {"delta": word + " "}
        yield {"model": fake_llm.MODEL}
        return

    attempts: list[dict[str, Any]] = []
    for model in _live_chain(model_chain, role, None):
        api_key = (config.get_api_keys(role, model) or [None])[0]
        kwargs: dict[str, Any] = {"model": model, "messages": messages, "timeout": config.model_timeout,
                                  "stream": True, **ROLE_GENERATION.get(role, {})}
        if api_key:
            kwargs["api_key"] = api_key
        sent = False
        try:
            async for chunk in await litellm.acompletion(**kwargs):
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    sent = True
                    yield {"delta": delta}
            _breaker_record(model, True)
            yield {"model": model}
            return
        except Exception as e:
            if sent:
                raise
            attempts.append({"model": model, "error": str(e)[:200]})
            _breaker_record(model, False)
    raise AllModelsFailedError(attempts)
