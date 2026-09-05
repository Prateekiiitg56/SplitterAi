"""Unit tests for Module B1: Security & Execution Sandbox (using standard library unittest).

Tests path containment, symlink attack rejection, shell environment isolation,
SSRF / metadata probe blocking, and subprocess timeout handling.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

# Ensure backend root is on sys.path for importing agentcli
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.sandbox import Sandbox, SandboxEscapeError
from agentcli.tools import (
    execute_tool,
    list_directory,
    read_file,
    run_shell,
    search_code,
    write_file,
)


class TestSandboxSecurity(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory(prefix="sandbox_test_")
        self.tmp_workspace = Path(self.tmp_dir.name).resolve()
        # Create a sample file and subfolder
        (self.tmp_workspace / "hello.txt").write_text("hello world", encoding="utf-8")
        (self.tmp_workspace / "subdir").mkdir()
        (self.tmp_workspace / "subdir" / "nested.txt").write_text("nested content", encoding="utf-8")
        self.sandbox = Sandbox(self.tmp_workspace)

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_sandbox_valid_path_resolution(self):
        # Relative path
        res = self.sandbox.resolve_path("hello.txt")
        assert res == self.tmp_workspace / "hello.txt"
        assert res.exists()

        # Nested path
        res_nested = self.sandbox.resolve_path("subdir/nested.txt")
        assert res_nested == self.tmp_workspace / "subdir" / "nested.txt"

        # Current directory
        res_curr = self.sandbox.resolve_path(".")
        assert res_curr == self.tmp_workspace

    def test_sandbox_rejects_parent_traversal(self):
        with self.assertRaises(SandboxEscapeError):
            self.sandbox.resolve_path("../secret.txt")

        with self.assertRaises(SandboxEscapeError):
            self.sandbox.resolve_path("subdir/../../etc/passwd")

    def test_sandbox_rejects_absolute_path_outside(self):
        outside = Path(tempfile.gettempdir()).resolve()
        with self.assertRaises(SandboxEscapeError):
            self.sandbox.resolve_path(outside)

    def test_sandbox_rejects_symlink_escape(self):
        with tempfile.TemporaryDirectory(prefix="outside_target_") as outside_dir:
            outside_file = Path(outside_dir) / "secret.txt"
            outside_file.write_text("secret_data", encoding="utf-8")

            symlink_path = self.tmp_workspace / "symlink_out"
            try:
                os.symlink(outside_file, symlink_path)
            except (OSError, NotImplementedError):
                self.skipTest("Symlinks not supported on this platform/privilege level")

            with self.assertRaises(SandboxEscapeError):
                self.sandbox.resolve_path("symlink_out")

    def test_file_read_write(self):
        # Write inside workspace
        write_res = write_file(self.sandbox, "docs/notes.md", "some notes")
        assert "Successfully wrote" in write_res
        assert (self.tmp_workspace / "docs" / "notes.md").read_text(encoding="utf-8") == "some notes"

        # Read inside workspace
        read_res = read_file(self.sandbox, "docs/notes.md")
        assert read_res == "some notes"

        # Write attempt outside workspace
        write_blocked = execute_tool(
            self.sandbox, "write_file", {"path": "../outside.txt", "content": "data"}
        )
        assert "BLOCKED" in write_blocked

    def test_run_shell_environment_isolation(self):
        # Pass a dummy secret in os.environ to test that it is NOT leaked to subprocess
        os.environ["SECRET_TEST_KEY_12345"] = "super_secret_val"

        try:
            if os.name == "nt":
                cmd = "echo %SECRET_TEST_KEY_12345%"
            else:
                cmd = "echo $SECRET_TEST_KEY_12345"

            out = run_shell(self.sandbox, cmd)
            assert "super_secret_val" not in out
        finally:
            os.environ.pop("SECRET_TEST_KEY_12345", None)

    def test_run_shell_ssrf_probe_blocked(self):
        with self.assertRaises(SandboxEscapeError):
            run_shell(self.sandbox, "curl http://169.254.169.254/latest/meta-data/")

    def test_run_shell_timeout(self):
        if os.name == "nt":
            cmd = "powershell -Command Start-Sleep -Seconds 5"
        else:
            cmd = "sleep 5"

        out = run_shell(self.sandbox, cmd, timeout=1)
        assert "timed out after 1s" in out


if __name__ == "__main__":
    unittest.main()
