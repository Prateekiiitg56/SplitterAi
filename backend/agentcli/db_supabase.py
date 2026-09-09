"""Supabase Database & Storage adapter for SplitterAI.

Provides PostgreSQL persistence for sessions and integrations as well as
Supabase Storage bucket management for workspace files and agent artifacts.

Falls back gracefully if SUPABASE_URL or SUPABASE_KEY are not set.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Try importing supabase
try:
    from supabase import create_client, Client
    HAS_SUPABASE_LIB = True
except ImportError:
    Client = Any  # type: ignore
    HAS_SUPABASE_LIB = False


_supabase_client: Optional[Client] = None
_client_initialized: bool = False


def get_supabase_client() -> Optional[Client]:
    """Retrieve initialized Supabase Client if env vars are present."""
    global _supabase_client, _client_initialized

    if _client_initialized:
        return _supabase_client

    _client_initialized = True

    if not HAS_SUPABASE_LIB:
        logger.debug("supabase-py library not installed.")
        return None

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not url or not key:
        logger.debug("SUPABASE_URL or SUPABASE_KEY not set.")
        return None

    try:
        _supabase_client = create_client(url, key)
        logger.info("Successfully initialized Supabase client connected to %s", url)
        return _supabase_client
    except Exception as exc:
        logger.warning("Failed to initialize Supabase client: %s", exc)
        return None


def is_supabase_enabled() -> bool:
    """Return True if Supabase client is successfully configured."""
    return get_supabase_client() is not None


def get_storage_bucket_name() -> str:
    """Get bucket name for workspace artifacts."""
    return os.getenv("SUPABASE_STORAGE_BUCKET", "workspace-artifacts").strip()


# ── Session Operations ───────────────────────────────────────────

def supabase_save_session(
    workspace: str,
    task: str,
    status_str: str,
    messages: list[dict] | None = None,
    subtask_count: int = 0,
) -> bool:
    """Save or update workspace session in Supabase 'sessions' table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        now_ts = time.time()
        created_at_str = time.strftime("%I:%M %p")
        messages_data = messages or []

        row = {
            "workspace": workspace,
            "task": task,
            "status": status_str,
            "messages_json": json.dumps(messages_data),
            "subtask_count": subtask_count,
            "created_at": created_at_str,
            "updated_at": now_ts,
        }

        # Upsert by primary key (workspace)
        client.table("sessions").upsert(row, on_conflict="workspace").execute()
        return True
    except Exception as exc:
        logger.error("Supabase error saving session for workspace %s: %s", workspace, exc)
        return False


def supabase_load_session(workspace: str) -> Optional[dict]:
    """Load session from Supabase 'sessions' table by workspace path."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.table("sessions").select("*").eq("workspace", workspace).execute()
        if not response.data or len(response.data) == 0:
            return None

        row = response.data[0]
        raw_msgs = row.get("messages_json", "[]")
        messages = json.loads(raw_msgs) if isinstance(raw_msgs, str) else raw_msgs

        return {
            "workspace": row.get("workspace"),
            "task": row.get("task", ""),
            "status": row.get("status", "idle"),
            "messages": messages,
            "subtask_count": row.get("subtask_count", 0),
            "created_at": row.get("created_at", ""),
            "updated_at": row.get("updated_at", 0),
        }
    except Exception as exc:
        logger.error("Supabase error loading session for workspace %s: %s", workspace, exc)
        return None


def supabase_reset_session(workspace: str) -> bool:
    """Delete workspace session from Supabase 'sessions' table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        response = client.table("sessions").delete().eq("workspace", workspace).execute()
        return bool(response.data)
    except Exception as exc:
        logger.error("Supabase error resetting session for workspace %s: %s", workspace, exc)
        return False


def supabase_list_sessions(limit: int = 20) -> Optional[list[dict]]:
    """List recent sessions from Supabase, ordered by updated_at descending."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = (
            client.table("sessions")
            .select("workspace, task, status, subtask_count, created_at, updated_at")
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as exc:
        logger.error("Supabase error listing sessions: %s", exc)
        return None


# ── Integrations Operations ──────────────────────────────────────

def supabase_save_integration(integration: dict) -> bool:
    """Save or update integration in Supabase 'integrations' table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        row = {
            "id": integration["id"],
            "type": integration["type"],
            "name": integration["name"],
            "status": integration["status"],
            "connected_at": integration.get("connectedAt", ""),
            "config_json": json.dumps(integration.get("config", {})),
            "scopes_json": json.dumps(integration.get("scopes", [])),
            "allowed_roles_json": json.dumps(integration.get("allowedRoles", [])),
            "last_error": integration.get("lastError"),
        }

        client.table("integrations").upsert(row, on_conflict="id").execute()
        return True
    except Exception as exc:
        logger.error("Supabase error saving integration %s: %s", integration.get("id"), exc)
        return False


def supabase_load_all_integrations() -> Optional[dict[str, dict]]:
    """Load all integrations from Supabase 'integrations' table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.table("integrations").select("*").execute()
        if response.data is None:
            return {}

        result = {}
        for row in response.data:
            config_raw = row.get("config_json", "{}")
            scopes_raw = row.get("scopes_json", "[]")
            roles_raw = row.get("allowed_roles_json", "[]")

            config = json.loads(config_raw) if isinstance(config_raw, str) else config_raw
            scopes = json.loads(scopes_raw) if isinstance(scopes_raw, str) else scopes_raw
            roles = json.loads(roles_raw) if isinstance(roles_raw, str) else roles_raw

            integ_dict = {
                "id": row["id"],
                "type": row["type"],
                "name": row["name"],
                "status": row["status"],
                "connectedAt": row.get("connected_at", ""),
                "config": config,
                "scopes": scopes,
                "allowedRoles": roles,
                "lastError": row.get("last_error"),
            }
            result[row["id"]] = integ_dict

        return result
    except Exception as exc:
        logger.error("Supabase error loading integrations: %s", exc)
        return None


def supabase_delete_integration(integration_id: str) -> bool:
    """Delete integration from Supabase 'integrations' table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        response = client.table("integrations").delete().eq("id", integration_id).execute()
        return bool(response.data)
    except Exception as exc:
        logger.error("Supabase error deleting integration %s: %s", integration_id, exc)
        return False


def supabase_update_integration_roles(integration_id: str, allowed_roles: list[str]) -> Optional[dict]:
    """Update allowed roles for an integration in Supabase."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        client.table("integrations").update({
            "allowed_roles_json": json.dumps(allowed_roles)
        }).eq("id", integration_id).execute()

        all_integrations = supabase_load_all_integrations()
        if all_integrations and integration_id in all_integrations:
            return all_integrations[integration_id]
        return None
    except Exception as exc:
        logger.error("Supabase error updating roles for integration %s: %s", integration_id, exc)
        return None


# ── Supabase Object Storage Operations ────────────────────────────

def supabase_upload_file(
    storage_path: str,
    file_content: bytes | str,
    content_type: str = "text/plain",
    bucket_name: str | None = None,
) -> Optional[str]:
    """Upload a workspace file artifact to Supabase Storage bucket.
    
    Returns public/download URL if successful, else None.
    """
    client = get_supabase_client()
    if not client:
        return None

    bucket = bucket_name or get_storage_bucket_name()

    try:
        data_bytes = file_content.encode("utf-8") if isinstance(file_content, str) else file_content
        
        try:
            client.storage.from_(bucket).upload(
                path=storage_path,
                file=data_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception:
            client.storage.from_(bucket).update(
                path=storage_path,
                file=data_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )

        url_resp = client.storage.from_(bucket).get_public_url(storage_path)
        return url_resp
    except Exception as exc:
        logger.error("Supabase Storage error uploading %s to bucket %s: %s", storage_path, bucket, exc)
        return None


def supabase_download_file(
    storage_path: str,
    bucket_name: str | None = None,
) -> Optional[bytes]:
    """Download a file artifact from Supabase Storage bucket."""
    client = get_supabase_client()
    if not client:
        return None

    bucket = bucket_name or get_storage_bucket_name()

    try:
        file_bytes = client.storage.from_(bucket).download(storage_path)
        return file_bytes
    except Exception as exc:
        logger.error("Supabase Storage error downloading %s from bucket %s: %s", storage_path, bucket, exc)
        return None
