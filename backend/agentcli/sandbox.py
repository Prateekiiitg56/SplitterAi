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

    def __init__(self, workspace: str | Path):
        self.workspace = Path(workspace).resolve()
        # Fail loudly if workspace doesn't exist rather than silently creating
        if not self.workspace.exists():
            raise ValueError(
                f"Workspace directory does not exist: '{self.workspace}'. "
                f"Create it manually or set the correct workspace path."
            )

    def is_within_workspace(self, target: Path) -> bool:
        """Check whether target Path lies strictly inside self.workspace.

        Handles Windows drive letter case-folding (e.g. d:\\ vs D:\\).
        """
        try:
            target_resolved = target.resolve()
            ws_resolved = self.workspace.resolve()

            # Attempt standard relative_to check
            try:
                target_resolved.relative_to(ws_resolved)
                return True
            except ValueError:
                pass

            # On Windows, try case-folded string prefix matching as secondary check
            if os.name == "nt":
                t_str = target_resolved.as_posix().lower()
                ws_str = ws_resolved.as_posix().lower()
                return t_str == ws_str or t_str.startswith(ws_str.rstrip("/") + "/")

            return False
        except Exception:
            return False

    def resolve_path(self, path: str | Path) -> Path:
        """Resolve a path against the workspace root with strict containment checks.

        Handles:
        - Relative paths: "foo/bar.py" → workspace/foo/bar.py
        - Current dir: "." → workspace
        - Parent traversal: "../secret" → BLOCKED
        - Absolute paths outside workspace → BLOCKED
        - Symlinks pointing outside → BLOCKED
        - Non-existent creation targets via outside symlink ancestors → BLOCKED

        Returns:
            Resolved absolute Path within workspace.

        Raises:
            SandboxEscapeError: If resolved path is outside workspace.
        """
        path_str = str(path)
        if "\x00" in path_str:
            raise SandboxEscapeError(path_str, str(self.workspace))

        candidate = Path(path_str)
        if candidate.is_absolute():
            target_path = candidate
        else:
            target_path = self.workspace / candidate

        # 1. Resolve symlinks for existing path or nearest existing parent ancestor
        resolved = target_path.resolve()

        # If path does not exist yet, find its nearest existing parent to check for ancestor symlink escapes
        curr = target_path
        while not curr.exists() and curr != curr.parent:
            curr = curr.parent
        resolved_ancestor = curr.resolve()

        # 2. Containment checks
        if not self.is_within_workspace(resolved) or not self.is_within_workspace(resolved_ancestor):
            raise SandboxEscapeError(path_str, str(self.workspace))

        return resolved

    def validate_path(self, path: str | Path) -> str:
        """Convenience: resolve and return as string. Raises on escape."""
        return str(self.resolve_path(path))

    @property
    def root(self) -> str:
        """The workspace root as a string."""
        return str(self.workspace)

