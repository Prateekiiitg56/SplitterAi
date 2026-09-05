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


def _get_db_path() -> Path:
    """Get the SQLite database path (~/.agentcli/sessions.db)."""
    base = Path.home() / ".agentcli"
    base.mkdir(parents=True, exist_ok=True)
    return base / "sessions.db"


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
            updated_at REAL NOT NULL DEFAULT 0
        )
    """)
    conn.commit()
    return conn


# ── Public API ────────────────────────────────────────────────────

def save_session(
    workspace: str,
    task: str,
    status: RunStatus,
    messages: list[dict] | None = None,
    subtask_count: int = 0,
) -> None:
    """Save or update a workspace session."""
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


def load_session(workspace: str) -> Optional[dict]:
    """Load a session by workspace path."""
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
    """FR-21: Delete a workspace session."""
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM sessions WHERE workspace = ?", (workspace,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def list_sessions(limit: int = 20) -> list[SessionEntry]:
    """List recent sessions, newest first."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            "SELECT workspace, task, status, subtask_count, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?",
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
            )
            for row in rows
        ]
    finally:
        conn.close()


def save_run_result(workspace: str, task: str, result: RunResult) -> None:
    """Save a completed run result as a session."""
    save_session(
        workspace=workspace,
        task=task,
        status=result.status,
        messages=[st.model_dump() for st in result.subtasks],
        subtask_count=len(result.subtasks),
    )
