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

# Suppress litellm's verbose default logging
litellm.suppress_debug_info = True


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
) -> dict[str, Any]:
    """Call an LLM with automatic fallback through the model chain.

    Args:
        messages: Chat messages in OpenAI format.
        model_chain: Ordered list of model identifiers to try.
        role: The agent role making this call (for API key resolution).
        config: Execution configuration.
        tools: Optional tool/function definitions for function calling.
        on_event: Optional callback for observability events.

    Returns:
        The model response as a dict with 'content' and optionally 'tool_calls'.

    Raises:
        AllModelsFailedError: If every model in the chain fails.
    """
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

        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "timeout": 60,
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

            # Brief backoff before retry
            if i < len(model_chain) - 1:
                await asyncio.sleep(1)

    # All models failed
    if on_event:
        on_event(LogEntry(
            type=LogType.error,
            role=role,
            message=f"All {len(model_chain)} models failed",
            detail=str(attempts),
        ))

    raise AllModelsFailedError(attempts)
