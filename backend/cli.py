"""CLI entry point — agentcli command-line interface.

FR-22: Single task, interactive mode, multi-agent mode, manual plan mode.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time

import click
from dotenv import load_dotenv

# Add parent to path for module resolution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agentcli.config import ExecutionConfig
from agentcli.orchestrator import Orchestrator
from agentcli.planner import generate_plan, load_manual_plan
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, LogEntry, LogType, RunStatus, SubtaskStatus
from agentcli.session import list_sessions, reset_session, save_run_result

load_dotenv()

# ── Colored Output ────────────────────────────────────────────────

COLORS = {
    LogType.model_request: "cyan",
    LogType.model_response: "green",
    LogType.model_fallback: "yellow",
    LogType.tool_call: "blue",
    LogType.tool_result: "white",
    LogType.plan_generated: "magenta",
    LogType.group_start: "bright_white",
    LogType.group_end: "bright_white",
    LogType.subtask_start: "cyan",
    LogType.subtask_end: "green",
    LogType.sandbox_block: "red",
    LogType.info: "white",
    LogType.error: "red",
}

STATUS_ICONS = {
    SubtaskStatus.pending: "○",
    SubtaskStatus.running: "●",
    SubtaskStatus.success: "✓",
    SubtaskStatus.error: "✗",
}


def print_event(entry: LogEntry) -> None:
    """Pretty-print a log event to terminal."""
    color = COLORS.get(entry.type, "white")
    role_str = f"[{entry.role.value}]" if entry.role else "[system]"
    subtask_str = f" ({entry.subtask_id})" if entry.subtask_id else ""

    click.echo(
        click.style(f"  {entry.timestamp} ", fg="bright_black")
        + click.style(f"{role_str:<10}", fg=color, bold=True)
        + click.style(subtask_str, fg="bright_black")
        + click.style(f" {entry.message}", fg=color)
    )


# ── Core Execution ────────────────────────────────────────────────

async def execute_task(
    task: str,
    workspace: str,
    plan_file: str | None = None,
    multi: bool = True,
) -> None:
    """Execute a task through the agentcli pipeline."""
    config = ExecutionConfig()
    sandbox = Sandbox(workspace)

    click.echo()
    click.echo(click.style("  ╭─────────────────────────────────────────╮", fg="bright_black"))
    click.echo(click.style("  │  ", fg="bright_black") + click.style("agentcli", fg="cyan", bold=True) + click.style(" — multi-agent orchestration  │", fg="bright_black"))
    click.echo(click.style("  ╰─────────────────────────────────────────╯", fg="bright_black"))
    click.echo()
    click.echo(click.style("  Task: ", fg="bright_white", bold=True) + click.style(task, fg="white"))
    click.echo(click.style("  Workspace: ", fg="bright_white", bold=True) + click.style(workspace, fg="bright_black"))
    click.echo(click.style("  Mode: ", fg="bright_white", bold=True) + click.style("multi-agent" if multi else "single-agent", fg="cyan"))
    click.echo()

    start_time = time.time()

    # Step 1: Planning
    click.echo(click.style("  ── Planning ──────────────────────────────", fg="bright_black"))

    if plan_file:
        plan = load_manual_plan(plan_file)
        click.echo(click.style(f"  Loaded manual plan: {len(plan.subtasks)} subtasks", fg="magenta"))
    else:
        plan = await generate_plan(task, config, on_event=print_event)

    if not multi and len(plan.subtasks) > 1:
        # Single-agent mode: collapse to one subtask
        from agentcli.planner import _fallback_plan
        plan = _fallback_plan(task)
        click.echo(click.style("  Single-agent mode: using single subtask", fg="yellow"))

    click.echo()

    # Display plan
    groups = {}
    for st in plan.subtasks:
        groups.setdefault(st.group, []).append(st)

    for group_num in sorted(groups):
        sts = groups[group_num]
        is_parallel = len(sts) > 1
        click.echo(
            click.style(f"  Group {group_num}", fg="bright_white", bold=True)
            + click.style(f" ({len(sts)} {'parallel' if is_parallel else 'sequential'})", fg="bright_black")
        )
        for st in sts:
            click.echo(
                click.style(f"    {STATUS_ICONS[st.status]} ", fg="bright_black")
                + click.style(f"[{st.role.value}]", fg="cyan")
                + click.style(f" {st.instruction[:80]}", fg="white")
            )
    click.echo()

    # Step 2: Execution
    click.echo(click.style("  ── Executing ─────────────────────────────", fg="bright_black"))

    orchestrator = Orchestrator(config=config, sandbox=sandbox, on_event=print_event)
    result = await orchestrator.execute(plan)

    click.echo()

    # Step 3: Results
    click.echo(click.style("  ── Results ───────────────────────────────", fg="bright_black"))

    for st in result.subtasks:
        icon = STATUS_ICONS.get(st.status, "?")
        color = "green" if st.status == SubtaskStatus.success else "red"
        duration = f" ({st.duration_ms:.0f}ms)" if st.duration_ms else ""

        click.echo(
            click.style(f"  {icon} ", fg=color)
            + click.style(f"[{st.role.value}]", fg="cyan")
            + click.style(f" {st.instruction[:60]}", fg="white")
            + click.style(duration, fg="bright_black")
        )

        if st.output:
            for line in st.output.splitlines()[:5]:
                click.echo(click.style(f"      {line[:100]}", fg="bright_black"))
        if st.error:
            click.echo(click.style(f"      Error: {st.error[:200]}", fg="red"))

    click.echo()

    # Summary
    elapsed = (time.time() - start_time) * 1000
    success_count = sum(1 for s in result.subtasks if s.status == SubtaskStatus.success)
    error_count = sum(1 for s in result.subtasks if s.status == SubtaskStatus.error)

    click.echo(
        click.style("  Done: ", fg="bright_white", bold=True)
        + click.style(f"{success_count} succeeded", fg="green")
        + (click.style(f", {error_count} failed", fg="red") if error_count else "")
        + click.style(f" in {elapsed:.0f}ms", fg="bright_black")
    )
    click.echo()

    # Step 4: Persist
    save_run_result(workspace, task, result)


# ── CLI Commands ──────────────────────────────────────────────────

@click.group(invoke_without_command=True)
@click.argument("task", required=False)
@click.option("--workspace", "-w", default=".", help="Workspace directory (default: current dir)")
@click.option("--multi/--single", default=True, help="Multi-agent mode (default: multi)")
@click.option("--plan", "-p", "plan_file", default=None, help="Path to manual plan file (JSON)")
@click.pass_context
def cli(ctx, task, workspace, multi, plan_file):
    """agentcli — Multi-Agent AI Orchestration System.

    Pass a TASK to execute it, or use a subcommand.

    Examples:

      agentcli "Build a REST API with Express"

      agentcli --multi "Create fizzbuzz, fibonacci, factorial scripts"

      agentcli --plan plan.json "Execute custom plan"

      agentcli sessions
    """
    if ctx.invoked_subcommand is None:
        if task:
            workspace = os.path.abspath(workspace)
            asyncio.run(execute_task(task, workspace, plan_file, multi))
        else:
            click.echo(ctx.get_help())


@cli.command()
@click.option("--workspace", "-w", default=".", help="Workspace directory")
def interactive(workspace):
    """Interactive REPL mode — enter tasks one at a time."""
    workspace = os.path.abspath(workspace)

    click.echo(click.style("\n  agentcli interactive mode", fg="cyan", bold=True))
    click.echo(click.style("  Type a task and press Enter. Type 'quit' to exit.\n", fg="bright_black"))

    while True:
        try:
            task = click.prompt(click.style("  > ", fg="cyan"), prompt_suffix="", type=str)
        except (KeyboardInterrupt, EOFError):
            click.echo("\n  Bye!")
            break

        task = task.strip()
        if task.lower() in ("quit", "exit", "q"):
            click.echo("  Bye!")
            break
        if not task:
            continue

        asyncio.run(execute_task(task, workspace, multi=True))


@cli.command()
def sessions():
    """List recent sessions."""
    entries = list_sessions(limit=10)
    if not entries:
        click.echo("  No sessions found.")
        return

    click.echo(click.style("\n  Recent Sessions", fg="bright_white", bold=True))
    click.echo(click.style("  ─────────────────────────────────────────", fg="bright_black"))

    for s in entries:
        status_color = "green" if s.status == RunStatus.done else "yellow" if s.status == RunStatus.executing else "red" if s.status == RunStatus.error else "white"
        click.echo(
            click.style(f"  [{s.status.value:>9}]", fg=status_color)
            + click.style(f" {s.task[:50]}", fg="white")
            + click.style(f"  ({s.subtask_count} subtasks, {s.created_at})", fg="bright_black")
        )

    click.echo()


@cli.command()
@click.argument("workspace")
def reset(workspace):
    """Reset (delete) session for a workspace."""
    workspace = os.path.abspath(workspace)
    if reset_session(workspace):
        click.echo(f"  Session reset for {workspace}")
    else:
        click.echo(f"  No session found for {workspace}")


# ── Entry Point ───────────────────────────────────────────────────

if __name__ == "__main__":
    cli()
