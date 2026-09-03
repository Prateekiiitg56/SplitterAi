"""Worker Agent — ReAct loop for all agent roles.

FR-9:  Each role runs the same core loop with role-specific prompt + model chain.
FR-10: Tool access via sandbox.
FR-11: Loop capped at configurable max steps.
FR-13: Each worker gets isolated message history.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable, Optional

from .config import ExecutionConfig
from .prompts import get_system_prompt
from .router import AllModelsFailedError, call_model
from .sandbox import Sandbox, SandboxEscapeError
from .schemas import AgentRole, LogEntry, LogType, Subtask, SubtaskStatus
from .tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)


class AgentWorker:
    """A single agent worker that executes a subtask via the ReAct loop.

    Each worker has:
    - Its own message history (no shared context with siblings)
    - Its own model chain and API key
    - Its own sandbox reference
    - A max step cap to prevent runaway loops
    """

    def __init__(
        self,
        role: AgentRole,
        config: ExecutionConfig,
        sandbox: Sandbox,
        on_event: Optional[Callable[[LogEntry], None]] = None,
    ):
        self.role = role
        self.config = config
        self.sandbox = sandbox
        self.on_event = on_event
        self.model_chain = config.get_model_chain(role)
        self.max_steps = config.max_steps

    def _emit(self, entry: LogEntry) -> None:
        """Emit a log event if callback is registered."""
        if self.on_event:
            self.on_event(entry)

    async def run(self, subtask: Subtask) -> Subtask:
        """Execute a subtask through the ReAct loop.

        Returns:
            Updated Subtask with status, output/error, timing, and step count.
        """
        subtask.status = SubtaskStatus.running
        subtask.started_at = time.time()
        subtask.steps = 0

        self._emit(LogEntry(
            type=LogType.subtask_start,
            role=self.role,
            subtask_id=subtask.id,
            model=self.model_chain[0] if self.model_chain else None,
            message=f"Starting: {subtask.instruction[:100]}",
        ))

        # Build initial message history
        system_prompt = get_system_prompt(self.role.value)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": subtask.instruction},
        ]

        # Planner doesn't use tools — just generates text/JSON
        use_tools = self.role != AgentRole.planner
        tools = TOOL_DEFINITIONS if use_tools else None

        try:
            for step in range(self.max_steps):
                subtask.steps = step + 1

                # Call model
                response = await call_model(
                    messages=messages,
                    model_chain=self.model_chain,
                    role=self.role,
                    config=self.config,
                    tools=tools,
                    on_event=self.on_event,
                )

                subtask.model = response.get("model")

                # If the model returned tool calls, execute them
                if response.get("tool_calls"):
                    # Append assistant message with tool calls
                    messages.append({
                        "role": "assistant",
                        "content": response.get("content", ""),
                        "tool_calls": response["tool_calls"],
                    })

                    # Execute each tool call
                    for tc in response["tool_calls"]:
                        func = tc["function"]
                        tool_name = func["name"]

                        try:
                            args = json.loads(func["arguments"])
                        except json.JSONDecodeError:
                            args = {}

                        # Log the tool call
                        args_summary = ", ".join(f'{k}="{v}"' if isinstance(v, str) and len(str(v)) < 50 else f"{k}=..." for k, v in args.items())
                        self._emit(LogEntry(
                            type=LogType.tool_call,
                            role=self.role,
                            subtask_id=subtask.id,
                            message=f'{tool_name}({args_summary})',
                        ))

                        # Execute with sandbox
                        try:
                            result = execute_tool(
                                sandbox=self.sandbox,
                                tool_name=tool_name,
                                arguments=args,
                                shell_timeout=self.config.shell_timeout,
                                max_output=self.config.output_max_bytes,
                            )
                        except SandboxEscapeError as e:
                            result = f"BLOCKED: {e}"
                            self._emit(LogEntry(
                                type=LogType.sandbox_block,
                                role=self.role,
                                subtask_id=subtask.id,
                                message=f"Blocked: {tool_name}({args_summary}) — path escapes sandbox",
                            ))

                        # Log the result
                        result_preview = result[:150] + "..." if len(result) > 150 else result
                        self._emit(LogEntry(
                            type=LogType.tool_result,
                            role=self.role,
                            subtask_id=subtask.id,
                            message=f"{tool_name} → {result_preview}",
                        ))

                        # Append tool result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": result,
                        })

                else:
                    # Model returned final text — we're done
                    final_output = response.get("content", "")
                    subtask.output = final_output
                    subtask.status = SubtaskStatus.success
                    subtask.finished_at = time.time()
                    subtask.duration_ms = (subtask.finished_at - subtask.started_at) * 1000

                    self._emit(LogEntry(
                        type=LogType.subtask_end,
                        role=self.role,
                        subtask_id=subtask.id,
                        message=f"Completed in {subtask.duration_ms:.0f}ms ({subtask.steps} steps)",
                    ))

                    return subtask

            # Max steps reached
            subtask.status = SubtaskStatus.error
            subtask.error = f"Max steps ({self.max_steps}) reached without completion"
            subtask.finished_at = time.time()
            subtask.duration_ms = (subtask.finished_at - subtask.started_at) * 1000

            self._emit(LogEntry(
                type=LogType.error,
                role=self.role,
                subtask_id=subtask.id,
                message=f"Max steps reached ({self.max_steps})",
            ))

            return subtask

        except AllModelsFailedError as e:
            subtask.status = SubtaskStatus.error
            subtask.error = str(e)
            subtask.finished_at = time.time()
            subtask.duration_ms = (subtask.finished_at - subtask.started_at) * 1000

            self._emit(LogEntry(
                type=LogType.error,
                role=self.role,
                subtask_id=subtask.id,
                message=f"All models failed: {e}",
            ))

            return subtask

        except Exception as e:
            subtask.status = SubtaskStatus.error
            subtask.error = str(e)[:500]
            subtask.finished_at = time.time()
            subtask.duration_ms = (subtask.finished_at - subtask.started_at) * 1000

            self._emit(LogEntry(
                type=LogType.error,
                role=self.role,
                subtask_id=subtask.id,
                message=f"Unexpected error: {str(e)[:200]}",
            ))

            return subtask
