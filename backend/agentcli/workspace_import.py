"""Workspace Import — safe zip archive extraction into sandboxed workspace.

Implements zip-slip security verification, file count & uncompressed size caps,
and directory skipping (node_modules, .git, venv, dist, etc.).
"""

from __future__ import annotations

import io
import os
import uuid
import zipfile
from pathlib import Path

DEFAULT_WORKSPACES_ROOT = Path.home() / ".agentcli" / "workspaces"

SKIP_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    "venv",
    ".venv",
    "dist",
    ".next",
    "build",
    "out",
    ".coverage",
}

MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024  # 200MB limit
MAX_FILE_COUNT = 5000  # 5000 files limit


def extract_zip_to_workspace(
    zip_bytes: bytes, workspaces_root: Path | str | None = None
) -> tuple[Path, int]:
    """Extract zip archive bytes into a new UUID-named workspace directory.

    Args:
        zip_bytes: Raw bytes of the uploaded .zip file.
        workspaces_root: Directory under which to create the new workspace.
            Defaults to ~/.agentcli/workspaces.

    Returns:
        tuple[Path, int]: (absolute_workspace_path, extracted_file_count)

    Raises:
        ValueError: If zip-slip escape attempt detected, or if size/count limit exceeded.
    """
    if not zip_bytes:
        raise ValueError("Uploaded zip file is empty.")

    if workspaces_root is None:
        workspaces_root = DEFAULT_WORKSPACES_ROOT
    workspaces_root = Path(workspaces_root).resolve()
    workspaces_root.mkdir(parents=True, exist_ok=True)

    # Create UUID-named workspace directory
    ws_name = f"ws-{uuid.uuid4().hex[:12]}"
    target_dir = (workspaces_root / ws_name).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    file_count = 0
    total_uncompressed_bytes = 0

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            infolist = zf.infolist()
            if not infolist:
                raise ValueError("Zip archive contains no files.")

            for info in infolist:
                # Standardize relative archive path
                archive_path = Path(info.filename)
                parts = archive_path.parts

                # Skip ignored directories and hidden metadata files
                if any(part in SKIP_DIRS for part in parts):
                    continue

                # Zip-slip protection check using path resolution against target_dir
                target_path = (target_dir / archive_path).resolve()
                try:
                    target_path.relative_to(target_dir)
                except ValueError:
                    raise ValueError(
                        f"Security violation: Zip entry '{info.filename}' attempts to escape target workspace."
                    )

                if info.is_dir():
                    target_path.mkdir(parents=True, exist_ok=True)
                    continue

                # Check max file count cap
                file_count += 1
                if file_count > MAX_FILE_COUNT:
                    raise ValueError(
                        f"Zip archive exceeds maximum allowed file count ({MAX_FILE_COUNT} files)."
                    )

                # Ensure parent directories exist
                target_path.parent.mkdir(parents=True, exist_ok=True)

                # Extract file contents in chunks while tracking size limit
                with zf.open(info) as src, open(target_path, "wb") as dst:
                    while chunk := src.read(8192):
                        total_uncompressed_bytes += len(chunk)
                        if total_uncompressed_bytes > MAX_UNCOMPRESSED_BYTES:
                            max_mb = MAX_UNCOMPRESSED_BYTES // (1024 * 1024)
                            raise ValueError(
                                f"Zip archive exceeds maximum uncompressed size limit ({max_mb}MB)."
                            )
                        dst.write(chunk)

        return target_dir, file_count

    except Exception:
        # Cleanup partially extracted workspace on error
        if target_dir.exists():
            import shutil

            shutil.rmtree(target_dir, ignore_errors=True)
        raise


def cleanup_expired_workspaces(
    max_age_seconds: int = 7 * 86400,
    workspaces_root: Path | str | None = None,
) -> tuple[int, int]:
    """Purge extracted workspace directories older than max_age_seconds under workspaces_root.

    Returns:
        tuple[int, int]: (deleted_workspace_count, freed_bytes)
    """
    if workspaces_root is None:
        workspaces_root = DEFAULT_WORKSPACES_ROOT
    root = Path(workspaces_root).resolve()

    if not root.exists():
        return 0, 0

    import shutil
    import time

    now = time.time()
    deleted_count = 0
    freed_bytes = 0

    for item in root.iterdir():
        if item.is_dir() and item.name.startswith("ws-"):
            try:
                mtime = item.stat().st_mtime
                if now - mtime > max_age_seconds:
                    dir_size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                    shutil.rmtree(item, ignore_errors=True)
                    deleted_count += 1
                    freed_bytes += dir_size
            except Exception:
                continue

    return deleted_count, freed_bytes

