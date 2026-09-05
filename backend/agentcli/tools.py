"""Sandboxed tools — file read/write, shell exec, code search.

FR-10: file read/write, list dir, sandboxed shell exec, code search.
FR-17: Paths validated via Sandbox before execution.
FR-18: Shell with timeout + output truncation.
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import Any

from .sandbox import Sandbox, SandboxEscapeError


# ── Tool Implementations ──────────────────────────────────────────

def read_file(sandbox: Sandbox, path: str) -> str:
    """Read file contents within the sandbox."""
    resolved = sandbox.resolve_path(path)
    if not resolved.exists():
        return f"Error: File not found: {path}"
    if not resolved.is_file():
        return f"Error: Not a file: {path}"
    try:
        content = resolved.read_text(encoding="utf-8", errors="replace")
        # Truncate very large files
        if len(content) > 50_000:
            content = content[:50_000] + f"\n\n... [truncated at 50KB, total {len(content)} bytes]"
        return content
    except Exception as e:
        return f"Error reading file: {e}"


def write_file(sandbox: Sandbox, path: str, content: str) -> str:
    """Write content to a file within the sandbox."""
    resolved = sandbox.resolve_path(path)
    try:
        resolved.parent.mkdir(parents=True, exist_ok=True)
        resolved.write_text(content, encoding="utf-8")
        return f"Successfully wrote {len(content)} bytes to {path}"
    except Exception as e:
        return f"Error writing file: {e}"


def list_directory(sandbox: Sandbox, path: str = ".") -> str:
    """List directory contents within the sandbox."""
    resolved = sandbox.resolve_path(path)
    if not resolved.exists():
        return f"Error: Directory not found: {path}"
    if not resolved.is_dir():
        return f"Error: Not a directory: {path}"

    entries = []
    try:
        for item in sorted(resolved.iterdir()):
            rel = item.relative_to(sandbox.workspace)
            kind = "dir" if item.is_dir() else "file"
            size = ""
            if item.is_file():
                size = f" ({item.stat().st_size} bytes)"
            entries.append(f"  [{kind}] {rel}{size}")
    except Exception as e:
        return f"Error listing directory: {e}"

    if not entries:
        return f"Directory '{path}' is empty."
    return f"Contents of '{path}':\n" + "\n".join(entries)


# Dangerous host/cloud probes blocked at command level
BLOCKED_PROBE_PATTERNS = [
    "169.254.169.254",
    "metadata.google.internal",
    "instance-data/latest",
]


def run_shell(sandbox: Sandbox, command: str, timeout: int = 30, max_output: int = 10240) -> str:
    """Execute a shell command strictly within the sandbox workspace.

    FR-18: timeout + output truncation + environment isolation.
    """
    # 1. Check for suspicious SSRF / cloud metadata endpoint probes
    for pattern in BLOCKED_PROBE_PATTERNS:
        if pattern in command:
            raise SandboxEscapeError(command, str(sandbox.workspace))

    # 2. Build sanitized environment (strip host secrets & keys)
    safe_env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": str(sandbox.workspace),
        "TMP": str(sandbox.workspace),
        "TEMP": str(sandbox.workspace),
        "USER": os.environ.get("USER", "agent"),
        "LANG": os.environ.get("LANG", "en_US.UTF-8"),
        "SHELL": os.environ.get("SHELL", "powershell.exe" if os.name == "nt" else "/bin/sh"),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "COMSPEC": os.environ.get("COMSPEC", "cmd.exe"),
        "PATHEXT": os.environ.get("PATHEXT", ""),
    }
    safe_env = {k: v for k, v in safe_env.items() if v}

    # 3. Execute subprocess with process tree termination on timeout
    try:
        proc = subprocess.Popen(
            command,
            shell=True,
            cwd=str(sandbox.workspace),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=safe_env,
        )

        try:
            stdout_data, stderr_data = proc.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            return f"Error: Command timed out after {timeout}s: {command}"

        output_parts = []
        if stdout_data:
            stdout = stdout_data[:max_output]
            if len(stdout_data) > max_output:
                stdout += f"\n... [stdout truncated at {max_output} bytes]"
            output_parts.append(stdout)
        if stderr_data:
            stderr = stderr_data[:max_output]
            if len(stderr_data) > max_output:
                stderr += f"\n... [stderr truncated at {max_output} bytes]"
            output_parts.append(f"STDERR:\n{stderr}")

        output = "\n".join(output_parts) if output_parts else "(no output)"
        return f"Exit code: {proc.returncode}\n{output}"

    except SandboxEscapeError:
        raise
    except Exception as e:
        return f"Error executing command: {e}"



def search_code(sandbox: Sandbox, query: str, path: str = ".") -> str:
    """Search for a pattern in files within the sandbox."""
    resolved = sandbox.resolve_path(path)
    if not resolved.exists():
        return f"Error: Path not found: {path}"

    matches = []
    search_root = resolved if resolved.is_dir() else resolved.parent

    try:
        for file_path in search_root.rglob("*"):
            if not file_path.is_file():
                continue
            # Skip binary / large files
            if file_path.stat().st_size > 1_000_000:
                continue
            # Skip hidden dirs and common non-code dirs
            parts = file_path.relative_to(sandbox.workspace).parts
            if any(p.startswith(".") or p in ("node_modules", "__pycache__", "venv", ".git") for p in parts):
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                for line_num, line in enumerate(content.splitlines(), 1):
                    if query.lower() in line.lower():
                        rel = file_path.relative_to(sandbox.workspace)
                        matches.append(f"  {rel}:{line_num}: {line.strip()}")
                        if len(matches) >= 50:
                            matches.append("  ... [results capped at 50 matches]")
                            return f"Search results for '{query}':\n" + "\n".join(matches)
            except Exception:
                continue

    except Exception as e:
        return f"Error searching: {e}"

    if not matches:
        return f"No matches found for '{query}' in '{path}'."
    return f"Search results for '{query}' ({len(matches)} matches):\n" + "\n".join(matches)


# ── Tool Executor ─────────────────────────────────────────────────

def execute_tool(
    sandbox: Sandbox,
    tool_name: str,
    arguments: dict[str, Any],
    shell_timeout: int = 30,
    max_output: int = 10240,
) -> str:
    """Execute a named tool with arguments, handling sandbox escapes."""
    try:
        if tool_name == "read_file":
            return read_file(sandbox, arguments["path"])
        elif tool_name == "write_file":
            return write_file(sandbox, arguments["path"], arguments["content"])
        elif tool_name == "list_directory":
            return list_directory(sandbox, arguments.get("path", "."))
        elif tool_name == "run_shell":
            return run_shell(sandbox, arguments["command"], timeout=shell_timeout, max_output=max_output)
        elif tool_name == "search_code":
            return search_code(sandbox, arguments["query"], arguments.get("path", "."))
        else:
            return f"Error: Unknown tool '{tool_name}'"
    except SandboxEscapeError as e:
        return f"BLOCKED: {e}"


# ── Tool Definitions (OpenAI function-calling schema) ─────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to the file within the workspace."}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file in the workspace. Creates parent directories if needed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to the file within the workspace."},
                    "content": {"type": "string", "description": "The content to write to the file."},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List all files and directories within a path in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative directory path. Defaults to workspace root.", "default": "."}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_shell",
            "description": "Execute a shell command in the workspace directory. Output is captured and returned.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The shell command to execute."}
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Search for a text pattern in files within the workspace. Case-insensitive.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search string or pattern."},
                    "path": {"type": "string", "description": "Relative path to search within. Defaults to entire workspace.", "default": "."},
                },
                "required": ["query"],
            },
        },
    },
]
