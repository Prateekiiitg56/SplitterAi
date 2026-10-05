"""Worker Agent — ReAct loop for all agent roles.

FR-9:  Each role runs the same core loop with role-specific prompt + model chain.
FR-10: Tool access via sandbox.
FR-11: Loop capped at configurable max steps.
FR-13: Each worker gets isolated message history.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from pathlib import Path
from typing import Any, Callable, Optional


from .browser import SCREENSHOT_MARK
from .board import COORDINATOR, EVERYONE, POST_NOTE_TOOL, Board
from .config import ExecutionConfig
from .prompts import get_system_prompt
from .router import AllModelsFailedError, call_model
from .sandbox import Sandbox, SandboxEscapeError
from .schemas import AgentRole, LogEntry, LogType, Subtask, SubtaskStatus
from .tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)

MAX_WRITE_NUDGES = 2
WRITE_NUDGE = (
    "You have not written any files, so nothing exists in the workspace yet. Code shown in chat is "
    "not saved. Call write_file for every file your assignment requires, then reply with a short summary."
)

# Every step resends the whole history, so old tool output is paid for again on each call.
# Once it passes the budget, older output is replaced by stubs in one pass. Compacting in
# bursts (not every step) keeps the prompt prefix stable between passes, so provider-side
# prompt caching keeps hitting.
HISTORY_BUDGET_CHARS = 40_000
KEEP_RECENT_MESSAGES = 6
STUB_MIN_CHARS = 300


def _stub(n: int) -> str:
    return f"[{n} chars of earlier output removed to save tokens; run the tool again if you still need it]"


def _message_chars(msg: dict[str, Any]) -> int:
    content = msg.get("content")
    n = len(content) if isinstance(content, str) else (len(json.dumps(content)) if content else 0)
    return n + sum(len(tc["function"]["arguments"]) for tc in msg.get("tool_calls") or [])


def compact_history(messages: list[dict[str, Any]]) -> int:
    """Stub out bulky old tool output, file bodies and screenshots. Returns chars removed.

    The system prompt, the assignment and the most recent messages are never touched.
    """
    head, tail = 2, len(messages) - KEEP_RECENT_MESSAGES
    if tail <= head or sum(_message_chars(m) for m in messages[head:tail]) <= HISTORY_BUDGET_CHARS:
        return 0
    saved = 0
    for i in range(head, tail):
        msg = messages[i]
        content = msg.get("content")
        if msg["role"] == "tool" and isinstance(content, str) and len(content) > STUB_MIN_CHARS:
            messages[i] = {**msg, "content": _stub(len(content))}
            saved += len(content)
        elif msg["role"] == "user" and isinstance(content, list):
            size = len(json.dumps(content))
            messages[i] = {**msg, "content": "[screenshots removed to save tokens]"}
            saved += size
        elif msg.get("tool_calls"):
            calls = []
            for tc in msg["tool_calls"]:
                args_json = tc["function"]["arguments"]
                try:
                    args = json.loads(args_json)
                except json.JSONDecodeError:
                    args = None
                body = args.get("content") if isinstance(args, dict) else None
                if isinstance(body, str) and len(body) > STUB_MIN_CHARS:
                    args["content"] = _stub(len(body))
                    new_json = json.dumps(args)
                    saved += len(args_json) - len(new_json)
                    tc = {**tc, "function": {**tc["function"], "arguments": new_json}}
                calls.append(tc)
            messages[i] = {**msg, "tool_calls": calls}
    return saved


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
        system_prompt: Optional[str] = None,
        use_tools: Optional[bool] = None,
        context: Optional[str] = None,
        board: Optional[Board] = None,
    ):
        self.role = role
        self.board = board  # live team channel; None when the worker runs alone
        self.context = context  # shared task contract shown ahead of the subtask's own instruction
        self.system_prompt = system_prompt or get_system_prompt(role.value)
        # Planner-role calls (planning, synthesis) produce text only unless told otherwise.
        self.use_tools = use_tools if use_tools is not None else role != AgentRole.planner
        self.config = config
        self.sandbox = sandbox
        self.on_event = on_event
        self.model_chain = config.get_model_chain(role)
        self.max_steps = config.max_steps

    def _emit(self, entry: LogEntry) -> None:
        """Emit a log event if callback is registered."""
        if self.on_event:
            self.on_event(entry)

    def _screenshot_message(self, paths: list[str]) -> dict[str, Any]:
        """Screenshots go back to the model as images; tool results can only carry text."""
        content: list[dict[str, Any]] = [{"type": "text", "text": (
            "Screenshots from browser_check (" + ", ".join(paths) + "). Judge the visual quality "
            "against the design guide: layout, alignment, spacing, hierarchy, contrast, polish."
        )}]
        for rel in paths:
            data = base64.b64encode(self.sandbox.resolve_path(rel).read_bytes()).decode("ascii")
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{data}"}})
        return {"role": "user", "content": content}

    async def run(self, subtask: Subtask) -> Subtask:
        """Execute a subtask through the ReAct loop.

        Returns:
            Updated Subtask with status, output/error, timing, and step count.
        """
        subtask.status = SubtaskStatus.running
        subtask.started_at = time.time()
        subtask.steps = 0
        model_chain = subtask.model_chain or self.model_chain

        self._emit(LogEntry(
            type=LogType.subtask_start,
            role=self.role,
            subtask_id=subtask.id,
            model=model_chain[0] if model_chain else None,
            message=f"Starting: {subtask.instruction[:100]}",
        ))

        # Build initial message history
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": (
                f"{self.context}\n\nYOUR ASSIGNMENT [{subtask.id}]:\n{subtask.instruction}"
                if self.context else subtask.instruction
            )},
        ]
        tools = TOOL_DEFINITIONS if self.use_tools else None
        if tools and self.board:
            tools = [*tools, POST_NOTE_TOOL]
        # Coders deliver files. Some models answer with code as chat text instead of calling
        # write_file; push them back a bounded number of times instead of reporting success.
        must_write = self.use_tools and self.role in (AgentRole.coder, AgentRole.designer)
        wrote_files = False
        write_nudges = 0
        # write_file replaces whole files. An agent that never read an existing file would wipe
        # everything it didn't restate, so overwriting requires reading (or creating) it first.
        known_files: set[str] = set()

        try:
            for step in range(self.max_steps):
                subtask.steps = step + 1
                if self.board:
                    inbox = self.board.unread(subtask.id)
                    if inbox:
                        messages.append({"role": "user", "content": (
                            "TEAM MESSAGES (from the coordinator and agents working in parallel with you; "
                            "follow them where they affect your files):\n"
                            + "\n".join(f"- [{m.sender}] {m.text}" for m in inbox)
                        )})
                        self._emit(LogEntry(
                            type=LogType.info, role=self.role, subtask_id=subtask.id,
                            message=f"Received {len(inbox)} team message(s)",
                        ))

                saved = compact_history(messages)
                if saved:
                    self._emit(LogEntry(
                        type=LogType.info, role=self.role, subtask_id=subtask.id,
                        message=f"Compacted history: {saved:,} chars of old tool output removed",
                    ))

                # Call model with step-level timeout
                step_timeout = self.config.step_timeout
                try:
                    response = await asyncio.wait_for(
                        call_model(
                            messages=messages,
                            model_chain=model_chain,
                            role=self.role,
                            config=self.config,
                            tools=tools,
                            on_event=self.on_event,
                        ),
                        timeout=step_timeout,
                    )
                except asyncio.TimeoutError:
                    self._emit(LogEntry(
                        type=LogType.error,
                        role=self.role,
                        subtask_id=subtask.id,
                        message=f"Step {step + 1} timed out after {step_timeout}s",
                    ))
                    raise TimeoutError(f"Step {step + 1} timed out after {step_timeout}s")


                subtask.model = response.get("model")
                usage = response.get("usage") or {}
                subtask.tokens_in += usage.get("prompt_tokens", 0)
                subtask.tokens_out += usage.get("completion_tokens", 0)

                # If the model returned tool calls, execute them
                if response.get("tool_calls"):
                    # Append assistant message with tool calls
                    messages.append({
                        "role": "assistant",
                        "content": response.get("content", ""),
                        "tool_calls": response["tool_calls"],
                    })

                    screenshots: list[str] = []
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
                            file_key = None
                            if tool_name in ("read_file", "write_file") and isinstance(args.get("path"), str):
                                file_key = str(self.sandbox.resolve_path(args["path"]))
                            if tool_name == "post_note" and self.board:
                                self.board.post(subtask.id, str(args.get("message", "")), to=str(args.get("to") or EVERYONE))
                                result = "Note sent."
                            elif tool_name == "write_file" and file_key and file_key not in known_files \
                                    and Path(file_key).exists():
                                result = (
                                    f"Refused: {args['path']} already exists and you have not read it. write_file "
                                    "replaces the whole file, so read_file it first, then write back the complete "
                                    "updated content (existing parts included)."
                                )
                            else:
                                # Off the event loop: parallel workers and the coordinator keep running
                                # while a shell command or browser check blocks.
                                result = await asyncio.to_thread(
                                    execute_tool,
                                    sandbox=self.sandbox,
                                    tool_name=tool_name,
                                    arguments=args,
                                    shell_timeout=self.config.shell_timeout,
                                    max_output=self.config.output_max_bytes,
                                )
                                if file_key and not result.startswith(("Error", "BLOCKED")):
                                    known_files.add(file_key)
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

                        if tool_name == "write_file" and result.startswith("Successfully wrote"):
                            wrote_files = True
                            if self.board:
                                self.board.post(subtask.id, f"wrote {args['path']}", to=COORDINATOR, file=args["path"])

                        # Append tool result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": result,
                        })
                        screenshots += [line[len(SCREENSHOT_MARK):] for line in result.splitlines()
                                        if line.startswith(SCREENSHOT_MARK)
                                        and self.sandbox.resolve_path(line[len(SCREENSHOT_MARK):]).is_file()]

                    if screenshots:
                        messages.append(self._screenshot_message(screenshots))

                elif must_write and not wrote_files and write_nudges < MAX_WRITE_NUDGES:
                    write_nudges += 1
                    messages.append({"role": "assistant", "content": response.get("content", "")})
                    messages.append({"role": "user", "content": WRITE_NUDGE})
                    self._emit(LogEntry(
                        type=LogType.info,
                        role=self.role,
                        subtask_id=subtask.id,
                        message="Finished without writing any file; asking the agent to save its work with write_file",
                    ))

                else:
                    # Model returned final text — we're done
                    final_output = response.get("content", "")
                    subtask.output = final_output
                    subtask.status = SubtaskStatus.success
                    if must_write and not wrote_files:
                        subtask.status = SubtaskStatus.error
                        subtask.error = "Finished without writing any file"
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
