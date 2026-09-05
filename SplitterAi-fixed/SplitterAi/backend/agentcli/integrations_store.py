"""SQLite-backed integration persistence — survives restarts.

Reuses the same DB path as session.py (~/.agentcli/sessions.db) to keep
the data co-located without adding another database file.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Optional


def _get_db_path() -> Path:
    """Get the SQLite database path (~/.agentcli/sessions.db)."""
    base = Path.home() / ".agentcli"
    base.mkdir(parents=True, exist_ok=True)
    return base / "sessions.db"


def _get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with integrations schema initialized."""
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS integrations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'connected',
            connected_at TEXT NOT NULL DEFAULT '',
            config_json TEXT NOT NULL DEFAULT '{}',
            scopes_json TEXT NOT NULL DEFAULT '[]',
            allowed_roles_json TEXT NOT NULL DEFAULT '[]',
            last_error TEXT
        )
    """)
    conn.commit()
    return conn


def _row_to_dict(row: tuple) -> dict:
    """Convert a DB row to an integration dict matching the API shape."""
    return {
        "id": row[0],
        "type": row[1],
        "name": row[2],
        "status": row[3],
        "connectedAt": row[4],
        "config": json.loads(row[5]),
        "scopes": json.loads(row[6]),
        "allowedRoles": json.loads(row[7]),
        "lastError": row[8],
    }


# ── Public API ────────────────────────────────────────────────────

def save_integration(integration: dict) -> None:
    """Insert or update an integration."""
    conn = _get_connection()
    try:
        conn.execute("""
            INSERT INTO integrations (id, type, name, status, connected_at, config_json, scopes_json, allowed_roles_json, last_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                type = excluded.type,
                name = excluded.name,
                status = excluded.status,
                connected_at = excluded.connected_at,
                config_json = excluded.config_json,
                scopes_json = excluded.scopes_json,
                allowed_roles_json = excluded.allowed_roles_json,
                last_error = excluded.last_error
        """, (
            integration["id"],
            integration["type"],
            integration["name"],
            integration["status"],
            integration.get("connectedAt", ""),
            json.dumps(integration.get("config", {})),
            json.dumps(integration.get("scopes", [])),
            json.dumps(integration.get("allowedRoles", [])),
            integration.get("lastError"),
        ))
        conn.commit()
    finally:
        conn.close()


def load_all_integrations() -> dict[str, dict]:
    """Load all integrations as a {id: integration_dict} mapping."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            "SELECT id, type, name, status, connected_at, config_json, scopes_json, allowed_roles_json, last_error FROM integrations"
        ).fetchall()
        return {row[0]: _row_to_dict(row) for row in rows}
    finally:
        conn.close()


def delete_integration(integration_id: str) -> bool:
    """Delete an integration by ID. Returns True if it existed."""
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM integrations WHERE id = ?", (integration_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def update_integration_roles(integration_id: str, allowed_roles: list[str]) -> Optional[dict]:
    """Update allowed roles for an integration. Returns updated dict or None."""
    conn = _get_connection()
    try:
        conn.execute(
            "UPDATE integrations SET allowed_roles_json = ? WHERE id = ?",
            (json.dumps(allowed_roles), integration_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, type, name, status, connected_at, config_json, scopes_json, allowed_roles_json, last_error FROM integrations WHERE id = ?",
            (integration_id,),
        ).fetchone()
        return _row_to_dict(row) if row else None
    finally:
        conn.close()
