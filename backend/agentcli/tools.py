"""Sandboxed tools — file read/write, shell exec, code search.

FR-10: file read/write, list dir, sandboxed shell exec, code search.
FR-17: Paths validated via Sandbox before execution.
FR-18: Shell with timeout + output truncation.
"""

from __future__ import annotations

import asyncio
import functools
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Any, Iterator

from .browser import TOOL_DEFINITION as BROWSER_CHECK_TOOL, browser_check
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
# Package managers resolve the project root by walking up to the nearest package.json. Without
# one in the workspace, an install lands in whatever project contains the workspace.
_NODE_INSTALL = re.compile(r"(?<![\w-])(npm|pnpm|yarn)\s+(install|i|add|ci)(?![\w-])")
_NODE_BUILD = re.compile(r"(?<![\w-])(npm|pnpm|yarn)\s+(run\s+)?build(?![\w-])")
NODE_TIMEOUT_S = 300  # installs and Vite builds routinely exceed the normal shell timeout

BLOCKED_PROBE_PATTERNS = [
    "169.254.169.254",
    "metadata.google.internal",
    "instance-data/latest",
]


def _shell_scratch_dir(sandbox: Sandbox) -> str:
    digest = hashlib.sha1(str(sandbox.workspace).encode("utf-8")).hexdigest()[:12]
    path = Path(tempfile.gettempdir()) / "splitterai-shell" / digest
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


# ── Isolation ─────────────────────────────────────────────────────
# Shell commands run under bubblewrap: only the workspace (as /workspace, read-write), a shared npm
# cache and the read-only system dirs are visible. The repo, its .env, the session DB and the user's
# home do not exist inside. On Windows bwrap runs in a WSL distro. SPLITTER_SANDBOX=none opts out
# (commands then run directly on the host, as before), and "auto" refuses to run without a sandbox.

WSL_DISTRO = os.getenv("SPLITTER_WSL_DISTRO", "Ubuntu")
NPM_CACHE_DIR = "/var/cache/splitter-npm"  # shared across projects so installs reuse downloads

_BWRAP_BASE = [
    "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin", "--symlink", "usr/lib", "/lib",
    "--symlink", "usr/lib64", "/lib64", "--symlink", "usr/sbin", "/sbin", "--ro-bind", "/etc", "/etc",
    # WSL points /etc/resolv.conf at /mnt/wsl/resolv.conf; without that one file DNS fails (npm install).
    "--ro-bind-try", "/mnt/wsl/resolv.conf", "/mnt/wsl/resolv.conf",
    "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
    "--clearenv", "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin", "--setenv", "HOME", "/tmp",
    "--setenv", "LANG", "C.UTF-8", "--setenv", "npm_config_cache", "/npm-cache", "--setenv", "CI", "1",
    "--setenv", "PYTHONUNBUFFERED", "1",
    "--unshare-all", "--share-net", "--die-with-parent", "--new-session",
]


def _sandbox_mode() -> str:
    return os.getenv("SPLITTER_SANDBOX", "auto").lower()


def _bwrap_prefix() -> list[str]:
    return ["wsl.exe", "-d", WSL_DISTRO, "--", "bwrap"] if os.name == "nt" else ["bwrap"]


@functools.lru_cache(maxsize=4)
def _bwrap_works(prefix: tuple[str, ...]) -> bool:
    try:
        probe = subprocess.run([*prefix, *_BWRAP_BASE, "--", "/bin/true"], capture_output=True, timeout=120)
        return probe.returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def sandbox_status() -> dict[str, Any]:
    """For /health: whether shell commands are isolated, and how."""
    mode = _sandbox_mode()
    if mode == "none":
        return {"mode": "none", "available": False}
    available = _bwrap_works(tuple(_bwrap_prefix()))
    return {"mode": "wsl-bwrap" if os.name == "nt" else "bwrap", "available": available}


def _linux_path(path: Path) -> str:
    """Path of a host folder as the sandbox's Linux side sees it (D:\\x -> /mnt/d/x under WSL)."""
    if os.name != "nt":
        return str(path)
    drive, rest = path.drive, path.as_posix()[len(path.drive):]
    return f"/mnt/{drive.rstrip(':').lower()}{rest}"


def _escaping_reference(command: str) -> str | None:
    """A path in the command that points outside the workspace (parent climbs, home, host drives)."""
    for token in re.split(r"[\s;&|<>()'\"`=,]+", command):
        if not token or token == sys.executable:  # the interpreter run_python uses when unsandboxed
            continue
        if token.startswith("~") or token.startswith("/mnt/") or re.match(r"^[A-Za-z]:[\\/]", token):
            return token
        depth = 0
        for part in token.replace("\\", "/").split("/"):
            if part == "..":
                depth -= 1
                if depth < 0:
                    return token
            elif part and part != ".":
                depth += 1
    return None


# Running shell processes per workspace, so a cancelled run can stop them.
_PROCESSES: dict[Path, set[subprocess.Popen]] = {}
_PROCESSES_LOCK = threading.Lock()


def _kill_tree(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True)
        else:
            os.killpg(proc.pid, signal.SIGKILL)
    except (OSError, ProcessLookupError):
        proc.kill()


def kill_processes(workspace: Path) -> int:
    """Kill every shell command (and its children) still running in a workspace."""
    with _PROCESSES_LOCK:
        procs = list(_PROCESSES.get(workspace, ()))
    for proc in procs:
        _kill_tree(proc)
    return len(procs)


def _prepare(sandbox: Sandbox, command: str) -> tuple[str | list[str], dict[str, str], str | None] | str:
    """Checks plus how to launch the command: (args, env, cwd), or the refusal message to return instead."""
    # 1. Check for suspicious SSRF / cloud metadata endpoint probes and paths outside the workspace
    for pattern in BLOCKED_PROBE_PATTERNS:
        if pattern in command:
            raise SandboxEscapeError(command, str(sandbox.workspace))
    escaping = _escaping_reference(command)
    if escaping:
        raise SandboxEscapeError(escaping, str(sandbox.workspace))

    if _NODE_INSTALL.search(command) and not (sandbox.workspace / "package.json").exists():
        return (
            "Refused: the workspace has no package.json, so this install would modify a project outside "
            "the workspace. Run `npm init -y` first if the task really needs packages."
        )

    if _sandbox_mode() == "none":
        # 2. Unsandboxed: sanitized environment (strip host secrets & keys).
        # Home/temp/app-data point at a per-workspace scratch dir outside the workspace, so tool
        # caches (npm, jest, pip) neither pollute the deliverable nor touch the host profile.
        scratch = _shell_scratch_dir(sandbox)
        env = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": scratch,
            "USERPROFILE": scratch,
            "APPDATA": scratch,
            "LOCALAPPDATA": scratch,
            "TMP": scratch,
            "TEMP": scratch,
            "USER": os.environ.get("USER", "agent"),
            "LANG": os.environ.get("LANG", "en_US.UTF-8"),
            "SHELL": os.environ.get("SHELL", "powershell.exe" if os.name == "nt" else "/bin/sh"),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "COMSPEC": os.environ.get("COMSPEC", "cmd.exe"),
            "PATHEXT": os.environ.get("PATHEXT", ""),
            "PYTHONUNBUFFERED": "1",
        }
        return command, {k: v for k, v in env.items() if v}, str(sandbox.workspace)

    prefix = _bwrap_prefix()
    if not _bwrap_works(tuple(prefix)):
        return (
            "Error: the shell sandbox (bubblewrap" + (" in WSL" if os.name == "nt" else "") + ") is not "
            "available, so shell commands are disabled. Set SPLITTER_SANDBOX=none to run them unsandboxed."
        )
    args = [*prefix, *_BWRAP_BASE, "--bind", _linux_path(sandbox.workspace), "/workspace",
            "--bind-try", NPM_CACHE_DIR, "/npm-cache", "--chdir", "/workspace", "--", "/bin/bash", "-c", command]
    # wsl.exe and bwrap need only the basics; nothing from the server's environment reaches the command.
    env = {k: os.environ[k] for k in ("PATH", "SYSTEMROOT", "WINDIR", "PATHEXT", "COMSPEC") if os.environ.get(k)}
    return args, env, None


def _start(sandbox: Sandbox, args: str | list[str], env: dict[str, str], cwd: str | None,
           merge_stderr: bool = False) -> subprocess.Popen:
    """Launch in its own process group (a timeout or cancel kills the whole tree: npm -> node -> vite)
    and register it so kill_processes() can stop it."""
    proc = subprocess.Popen(
        args,
        shell=isinstance(args, str),
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT if merge_stderr else subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
        start_new_session=os.name != "nt",
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    with _PROCESSES_LOCK:
        _PROCESSES.setdefault(sandbox.workspace, set()).add(proc)
    return proc


def _finish(sandbox: Sandbox, proc: subprocess.Popen) -> None:
    with _PROCESSES_LOCK:
        _PROCESSES.get(sandbox.workspace, set()).discard(proc)


def run_shell(sandbox: Sandbox, command: str, timeout: int = 30, max_output: int = 10240) -> str:
    """Execute a shell command strictly within the sandbox workspace.

    FR-18: timeout + output truncation + environment isolation.
    """
    prepared = _prepare(sandbox, command)
    if isinstance(prepared, str):
        return prepared
    try:
        proc = _start(sandbox, *prepared)
        try:
            stdout_data, stderr_data = proc.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            _kill_tree(proc)
            proc.communicate()
            return f"Error: Command timed out after {timeout}s: {command}"
        finally:
            _finish(sandbox, proc)

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


def stream_shell(sandbox: Sandbox, command: str, timeout: int = 60, max_lines: int = 5000) -> Iterator[str]:
    """Like run_shell, but yields output lines (stdout and stderr merged) as they are printed, then a
    final "Exit code: N" (or the timeout / refusal message)."""
    prepared = _prepare(sandbox, command)
    if isinstance(prepared, str):
        yield prepared
        return
    proc = _start(sandbox, *prepared, merge_stderr=True)
    fired = threading.Event()

    def on_timeout() -> None:
        fired.set()
        _kill_tree(proc)

    timer = threading.Timer(timeout, on_timeout)
    timer.start()
    try:
        for count, line in enumerate(proc.stdout, 1):
            if count <= max_lines:
                yield line.rstrip("\n")
            elif count == max_lines + 1:
                yield f"... [output truncated after {max_lines} lines]"
        proc.wait()
    finally:
        timer.cancel()
        _finish(sandbox, proc)
    yield f"Error: Command timed out after {timeout}s" if fired.is_set() else f"Exit code: {proc.returncode}"


def run_python(sandbox: Sandbox, code: str, timeout: int = 30, max_output: int = 10240) -> str:
    """Run a multi-line Python script with the workspace as cwd.

    Models routinely cram scripts into one-line `python -c` calls (a SyntaxError for loops) or
    call interpreters the host lacks. The script lives in the workspace's private .splitter folder
    (visible inside the sandbox, left out of exports) and is deleted after it ran.
    """
    scripts = sandbox.workspace / ".splitter" / "scripts"
    scripts.mkdir(parents=True, exist_ok=True)
    script = scripts / f"script-{uuid.uuid4().hex[:10]}.py"
    script.write_text(code, encoding="utf-8")
    python = f'"{sys.executable}"' if _sandbox_mode() == "none" else "python"
    try:
        return run_shell(sandbox, f"{python} .splitter/scripts/{script.name}", timeout=timeout, max_output=max_output)
    finally:
        script.unlink(missing_ok=True)
        for folder in (scripts, scripts.parent):
            try:
                folder.rmdir()  # only when empty: leaves screenshots and other private files alone
            except OSError:
                break


def _ripgrep(sandbox: Sandbox, query: str, resolved: Path) -> list[str] | None:
    """ripgrep's matches as 'path:line: text', or None when rg is not installed."""
    rg = shutil.which("rg")
    if not rg:
        return None
    proc = subprocess.run(
        [rg, "--fixed-strings", "--ignore-case", "--line-number", "--no-heading", "--color", "never",
         "--max-filesize", "1M", "--glob", "!node_modules", "--glob", "!__pycache__", "--glob", "!venv",
         "--", query, str(resolved)],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
    )
    if proc.returncode not in (0, 1):  # 1 = no matches
        return None
    matches = []
    for line in proc.stdout.splitlines():
        file_part, _, rest = line.partition(":")
        if len(file_part) == 1 and rest[:1] in ("\\", "/"):  # Windows drive letter
            drive_rest, _, rest = rest.partition(":")
            file_part = f"{file_part}:{drive_rest}"
        line_no, _, text = rest.partition(":")
        try:
            rel = Path(file_part).resolve().relative_to(sandbox.workspace)
        except ValueError:
            continue
        matches.append(f"  {rel.as_posix()}:{line_no}: {text.strip()}")
    return matches


def search_code(sandbox: Sandbox, query: str, path: str = ".") -> str:
    """Search for a pattern in files within the sandbox (ripgrep when available)."""
    resolved = sandbox.resolve_path(path)
    if not resolved.exists():
        return f"Error: Path not found: {path}"

    found = _ripgrep(sandbox, query, resolved)
    if found is not None:
        if not found:
            return f"No matches found for '{query}' in '{path}'."
        if len(found) > 50:
            found = found[:50] + ["  ... [results capped at 50 matches]"]
        return f"Search results for '{query}' ({len(found)} matches):\n" + "\n".join(found)

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
            command = arguments["command"]
            if _NODE_INSTALL.search(command) or _NODE_BUILD.search(command):
                shell_timeout = max(shell_timeout, NODE_TIMEOUT_S)
            return run_shell(sandbox, command, timeout=shell_timeout, max_output=max_output)
        elif tool_name == "run_python":
            return run_python(sandbox, arguments["code"], timeout=shell_timeout, max_output=max_output)
        elif tool_name == "search_code":
            return search_code(sandbox, arguments["query"], arguments.get("path", "."))
        elif tool_name == "browser_check":
            return browser_check(sandbox, arguments.get("path") or "index.html", arguments.get("actions"),
                                 bool(arguments.get("screenshot")))
        else:
            return f"Error: Unknown tool '{tool_name}'"
    except SandboxEscapeError as e:
        return f"BLOCKED: {e}"
    except KeyError as e:
        # Malformed call: tell the model so it can retry instead of crashing the subtask.
        return f"Error: {tool_name} is missing required argument {e}"


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
            "description": "Execute a bash command in an isolated Linux sandbox whose working directory is the "
                           "workspace (/workspace). node, npm, npx and python are available. Nothing outside the "
                           "workspace is reachable. Output is captured and returned.",
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
            "name": "run_python",
            "description": "Run a multi-line Python script with the workspace as the working directory and return "
                           "its output. Use this for checks and data processing instead of `python -c` in run_shell.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Complete Python source, with normal newlines."}
                },
                "required": ["code"],
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
    BROWSER_CHECK_TOOL,
]
