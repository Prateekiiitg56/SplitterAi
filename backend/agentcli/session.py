"""Session persistence — SQLite-backed workspace sessions.

FR-20: Conversation history persists per-workspace.
FR-21: Support explicit reset.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Optional

from .schemas import RunResult, RunStatus, SessionEntry
from .db_supabase import (
    supabase_save_session,
    supabase_load_session,
    supabase_reset_session,
    supabase_list_sessions,
    supabase_rename_session,
    is_supabase_enabled,
)


def _get_db_path() -> Path:
    """Get the SQLite database path (~/.agentcli/sessions.db)."""
    base = Path.home() / ".agentcli"
    base.mkdir(parents=True, exist_ok=True)
    return base / "sessions.db"


def _run_migrations(conn: sqlite3.Connection) -> None:
    """Verify table schema and safely add missing columns if schema evolves."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(sessions)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    expected_columns = {
        "workspace": "TEXT PRIMARY KEY",
        "task": "TEXT NOT NULL DEFAULT ''",
        "status": "TEXT NOT NULL DEFAULT 'idle'",
        "messages_json": "TEXT NOT NULL DEFAULT '[]'",
        "subtask_count": "INTEGER NOT NULL DEFAULT 0",
        "created_at": "TEXT NOT NULL DEFAULT ''",
        "updated_at": "REAL NOT NULL DEFAULT 0",
        "name": "TEXT NOT NULL DEFAULT ''",
    }

    for col_name, col_def in expected_columns.items():
        if col_name not in existing_columns and "PRIMARY KEY" not in col_def:
            conn.execute(f"ALTER TABLE sessions ADD COLUMN {col_name} {col_def}")

    conn.commit()


def _get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with the schema initialized."""
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            workspace TEXT PRIMARY KEY,
            task TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'idle',
            messages_json TEXT NOT NULL DEFAULT '[]',
            subtask_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at REAL NOT NULL DEFAULT 0,
            name TEXT NOT NULL DEFAULT ''
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY,
            workspace TEXT NOT NULL,
            task TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'done',
            result_json TEXT NOT NULL DEFAULT '{}',
            logs_json TEXT NOT NULL DEFAULT '[]',
            created_at REAL NOT NULL DEFAULT 0
        )
    """)
    conn.commit()
    _run_migrations(conn)
    return conn


# ── Public API ────────────────────────────────────────────────────

def save_session(
    workspace: str,
    task: str,
    status: RunStatus,
    messages: list[dict] | None = None,
    subtask_count: int = 0,
) -> None:
    """Save or update a workspace session (SQLite + Supabase when configured)."""
    # 1. Save to local SQLite
    conn = _get_connection()
    try:
        messages_json = json.dumps(messages or [])
        now = time.time()
        created_at = time.strftime("%I:%M %p")

        conn.execute("""
            INSERT INTO sessions (workspace, task, status, messages_json, subtask_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(workspace) DO UPDATE SET
                task = excluded.task,
                status = excluded.status,
                messages_json = excluded.messages_json,
                subtask_count = excluded.subtask_count,
                updated_at = excluded.updated_at
        """, (workspace, task, status.value, messages_json, subtask_count, created_at, now))
        conn.commit()
    finally:
        conn.close()

    # 2. Sync to Supabase if configured
    if is_supabase_enabled():
        supabase_save_session(
            workspace=workspace,
            task=task,
            status_str=status.value,
            messages=messages,
            subtask_count=subtask_count,
        )


def load_session(workspace: str) -> Optional[dict]:
    """Load a session by workspace path (Supabase first if available, else SQLite)."""
    if is_supabase_enabled():
        sp_data = supabase_load_session(workspace)
        if sp_data:
            return sp_data

    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT workspace, task, status, messages_json, subtask_count, created_at, updated_at FROM sessions WHERE workspace = ?",
            (workspace,)
        ).fetchone()

        if not row:
            return None

        return {
            "workspace": row[0],
            "task": row[1],
            "status": row[2],
            "messages": json.loads(row[3]),
            "subtask_count": row[4],
            "created_at": row[5],
            "updated_at": row[6],
        }
    finally:
        conn.close()


def reset_session(workspace: str) -> bool:
    """FR-21: Delete a workspace session from SQLite and Supabase."""
    sp_deleted = False
    if is_supabase_enabled():
        sp_deleted = supabase_reset_session(workspace)

    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM sessions WHERE workspace = ?", (workspace,))
        conn.execute("DELETE FROM runs WHERE workspace = ?", (workspace,))
        conn.commit()
        return (cursor.rowcount > 0) or sp_deleted
    finally:
        conn.close()


def rename_session(workspace: str, name: str) -> bool:
    """Set a project's display name. Runs never overwrite it (save_session leaves `name` alone)."""
    conn = _get_connection()
    try:
        cursor = conn.execute("UPDATE sessions SET name = ? WHERE workspace = ?", (name, workspace))
        conn.commit()
        found = cursor.rowcount > 0
    finally:
        conn.close()
    if is_supabase_enabled():
        found = supabase_rename_session(workspace, name) or found
    return found


def _local_names() -> dict[str, str]:
    conn = _get_connection()
    try:
        return {ws: name for ws, name in conn.execute("SELECT workspace, name FROM sessions WHERE name != ''")}
    finally:
        conn.close()


def list_sessions(limit: int = 20) -> list[SessionEntry]:
    """List recent sessions, newest first."""
    if is_supabase_enabled():
        sp_list = supabase_list_sessions(limit)
        if sp_list is not None and len(sp_list) > 0:
            # The Supabase table may predate the name column; names are always kept locally too.
            names = _local_names()
            entries = []
            for item in sp_list:
                st_val = item.get("status", "idle")
                entries.append(
                    SessionEntry(
                        workspace=item.get("workspace", ""),
                        task=item.get("task", ""),
                        name=item.get("name") or names.get(item.get("workspace", ""), ""),
                        status=RunStatus(st_val) if st_val in RunStatus.__members__ else RunStatus.idle,
                        subtask_count=item.get("subtask_count", 0),
                        created_at=item.get("created_at", ""),
                        updated_at=item.get("updated_at", 0.0),
                    )
                )
            return entries

    conn = _get_connection()
    try:
        rows = conn.execute(
            "SELECT workspace, task, status, subtask_count, created_at, updated_at, name FROM sessions ORDER BY updated_at DESC LIMIT ?",
            (limit,)
        ).fetchall()

        return [
            SessionEntry(
                workspace=row[0],
                task=row[1],
                status=RunStatus(row[2]) if row[2] in RunStatus.__members__ else RunStatus.idle,
                subtask_count=row[3],
                created_at=row[4],
                updated_at=row[5],
                name=row[6],
            )
            for row in rows
        ]
    finally:
        conn.close()


def save_run_result(workspace: str, task: str, result: RunResult, logs: list[dict] | None = None) -> None:
    """Save a completed run as the workspace's session, and in run history when it has a run id."""
    save_session(
        workspace=workspace,
        task=task,
        status=result.status,
        messages=[st.model_dump() for st in result.subtasks],
        subtask_count=len(result.subtasks),
    )
    if not result.run_id:
        return
    conn = _get_connection()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO runs (run_id, workspace, task, status, result_json, logs_json, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (result.run_id, workspace, task, result.status.value, result.model_dump_json(),
             json.dumps(logs or []), time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def load_run(run_id: str) -> Optional[dict]:
    """A finished run in the same shape as the live run snapshot."""
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT run_id, workspace, task, status, result_json, logs_json, created_at FROM runs WHERE run_id = ?",
            (run_id,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    result = json.loads(row[4])
    return {"run_id": row[0], "workspace": row[1], "task": row[2], "status": row[3],
            "subtasks": result.get("subtasks", []), "logs": json.loads(row[5]), "result": result,
            "created_at": row[6]}


def list_runs(workspace: str, limit: int = 20) -> list[dict]:
    """Finished runs of one workspace, newest first, without logs."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            "SELECT run_id, task, status, created_at FROM runs WHERE workspace = ? ORDER BY created_at DESC LIMIT ?",
            (workspace, limit),
        ).fetchall()
    finally:
        conn.close()
    return [{"run_id": r[0], "workspace": workspace, "task": r[1], "status": r[2], "created_at": r[3]} for r in rows]
