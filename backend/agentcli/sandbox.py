"""Sandbox — path-restricted workspace security.

FR-17: All paths resolved against workspace root; escaping is rejected.
FR-18: Shell commands with timeout + output truncation.
NFR-3: No agent action may touch filesystem outside workspace.
"""

from __future__ import annotations

import os
from pathlib import Path


class SandboxEscapeError(Exception):
    """Raised when a path or command attempts to escape the sandbox."""

    def __init__(self, attempted: str, workspace: str):
        self.attempted = attempted
        self.workspace = workspace
        super().__init__(
            f"Sandbox violation: '{attempted}' escapes workspace '{workspace}'"
        )


class Sandbox:
    """Filesystem sandbox restricting all operations to a workspace root."""

    def __init__(self, workspace: str):
        self.workspace = Path(workspace).resolve()
        # Create workspace if it doesn't exist
        self.workspace.mkdir(parents=True, exist_ok=True)

    def resolve_path(self, path: str) -> Path:
        """Resolve a relative path against the workspace root.

        Handles:
        - Relative paths: "foo/bar.py" → workspace/foo/bar.py
        - Current dir: "." → workspace
        - Parent traversal: "../secret" → BLOCKED
        - Absolute paths outside workspace → BLOCKED
        - Symlinks pointing outside → BLOCKED

        Returns:
            Resolved absolute Path within workspace.

        Raises:
            SandboxEscapeError: If resolved path is outside workspace.
        """
        # Handle absolute paths
        candidate = Path(path)
        if candidate.is_absolute():
            resolved = candidate.resolve()
        else:
            resolved = (self.workspace / path).resolve()

        # Security check: must be within workspace
        try:
            resolved.relative_to(self.workspace)
        except ValueError:
            raise SandboxEscapeError(path, str(self.workspace))

        return resolved

    def validate_path(self, path: str) -> str:
        """Convenience: resolve and return as string. Raises on escape."""
        return str(self.resolve_path(path))

    @property
    def root(self) -> str:
        """The workspace root as a string."""
        return str(self.workspace)
