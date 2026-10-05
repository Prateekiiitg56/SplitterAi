"""SQLite-backed integration persistence — survives restarts.

Reuses the same DB path as session.py (~/.agentcli/sessions.db) to keep
the data co-located without adding another database file.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Optional


from . import db, vault
from .db_supabase import (
    supabase_save_integration,
    supabase_load_all_integrations,
    supabase_delete_integration,
    supabase_update_integration_roles,
    is_supabase_enabled,
)


def _get_db_path() -> Path:
    """Get the SQLite database path (~/.agentcli/sessions.db)."""
    base = Path(os.getenv("SPLITTER_DATA_DIR") or Path.home() / ".agentcli")
    base.mkdir(parents=True, exist_ok=True)
    return base / "sessions.db"


def _run_migrations(conn: sqlite3.Connection) -> None:
    """Verify integrations table schema and safely add missing columns if schema evolves."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(integrations)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    expected_columns = {
        "id": "TEXT PRIMARY KEY",
        "type": "TEXT NOT NULL",
        "name": "TEXT NOT NULL",
        "status": "TEXT NOT NULL DEFAULT 'connected'",
        "connected_at": "TEXT NOT NULL DEFAULT ''",
        "config_json": "TEXT NOT NULL DEFAULT '{}'",
        "scopes_json": "TEXT NOT NULL DEFAULT '[]'",
        "allowed_roles_json": "TEXT NOT NULL DEFAULT '[]'",
        "last_error": "TEXT",
    }

    for col_name, col_def in expected_columns.items():
        if col_name not in existing_columns and "PRIMARY KEY" not in col_def:
            conn.execute(f"ALTER TABLE integrations ADD COLUMN {col_name} {col_def}")

    conn.commit()


def _init_schema(conn: sqlite3.Connection) -> None:
    """Create tables and run migrations; runs once per database file per process."""
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
    # Secrets stay local and encrypted; they are never synced to Supabase or returned by the API.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS integration_secrets (
            id TEXT PRIMARY KEY,
            secret_enc TEXT NOT NULL
        )
    """)
    conn.commit()
    _run_migrations(conn)


def _connection():
    """The process-wide connection to this store's database (serialized)."""
    return db.connection(_get_db_path(), _init_schema)


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
    """Insert or update an integration (SQLite + Supabase when configured)."""
    # 1. Save to local SQLite
    with _connection() as conn:
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

    # 2. Sync to Supabase if enabled
    if is_supabase_enabled():
        supabase_save_integration(integration)


def load_all_integrations() -> dict[str, dict]:
    """Load all integrations as a {id: integration_dict} mapping (Supabase first if available)."""
    if is_supabase_enabled():
        sp_integrations = supabase_load_all_integrations()
        if sp_integrations is not None:
            return sp_integrations

    with _connection() as conn:
        rows = conn.execute(
            "SELECT id, type, name, status, connected_at, config_json, scopes_json, allowed_roles_json, last_error FROM integrations"
        ).fetchall()
        return {row[0]: _row_to_dict(row) for row in rows}


def delete_integration(integration_id: str) -> bool:
    """Delete an integration by ID from SQLite and Supabase."""
    sp_deleted = False
    if is_supabase_enabled():
        sp_deleted = supabase_delete_integration(integration_id)

    with _connection() as conn:
        cursor = conn.execute("DELETE FROM integrations WHERE id = ?", (integration_id,))
        conn.execute("DELETE FROM integration_secrets WHERE id = ?", (integration_id,))
        conn.commit()
        return (cursor.rowcount > 0) or sp_deleted


def update_integration_roles(integration_id: str, allowed_roles: list[str]) -> Optional[dict]:
    """Update allowed roles for an integration. Returns updated dict or None."""
    sp_updated = None
    if is_supabase_enabled():
        sp_updated = supabase_update_integration_roles(integration_id, allowed_roles)

    with _connection() as conn:
        conn.execute(
            "UPDATE integrations SET allowed_roles_json = ? WHERE id = ?",
            (json.dumps(allowed_roles), integration_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, type, name, status, connected_at, config_json, scopes_json, allowed_roles_json, last_error FROM integrations WHERE id = ?",
            (integration_id,),
        ).fetchone()
        
        sqlite_res = _row_to_dict(row) if row else None
        return sp_updated or sqlite_res



def save_secret(integration_id: str, secret: str) -> None:
    with _connection() as conn:
        conn.execute("INSERT OR REPLACE INTO integration_secrets (id, secret_enc) VALUES (?, ?)",
                     (integration_id, vault.encrypt(secret)))
        conn.commit()


def get_secret(integration_id: str) -> Optional[str]:
    with _connection() as conn:
        row = conn.execute("SELECT secret_enc FROM integration_secrets WHERE id = ?", (integration_id,)).fetchone()
    return vault.decrypt(row[0]) if row else None
