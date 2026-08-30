"""Tests for the Phase 5 controlled Python runner."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from fastapi import HTTPException

from api.runner import RunRequest, run_command
from workspace import Workspace


class RunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "hello.py").write_text("print('Hello from Mivi')\n", encoding="utf-8")
        (self.root / "fail.py").write_text("raise ValueError('expected error')\n", encoding="utf-8")
        (self.root / "data.txt").write_text("not a python file\n", encoding="utf-8")
        self.workspace = Workspace()
        self.workspace.select(str(self.root))

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_run_python_file_success(self) -> None:
        request = RunRequest(command="python", file="hello.py")
        result = run_command(request, self.workspace)
        self.assertEqual(result.exit_code, 0)
        self.assertIn("Hello from Mivi", result.stdout)
        self.assertFalse(result.timed_out)
        self.assertEqual(result.command_display, "python hello.py")

    def test_run_python_file_with_error(self) -> None:
        request = RunRequest(command="python", file="fail.py")
        result = run_command(request, self.workspace)
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn("ValueError", result.stderr)
        self.assertFalse(result.timed_out)

    def test_run_rejects_non_py_file(self) -> None:
        request = RunRequest(command="python", file="data.txt")
        with self.assertRaises(HTTPException) as ctx:
            run_command(request, self.workspace)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn(".py", ctx.exception.detail or "")

    def test_run_rejects_path_traversal(self) -> None:
        request = RunRequest(command="python", file="../outside.py")
        with self.assertRaises(HTTPException) as ctx:
            run_command(request, self.workspace)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_run_rejects_missing_file(self) -> None:
        request = RunRequest(command="python", file="nonexistent.py")
        with self.assertRaises(HTTPException) as ctx:
            run_command(request, self.workspace)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_run_python_requires_file(self) -> None:
        request = RunRequest(command="python")
        with self.assertRaises(HTTPException) as ctx:
            run_command(request, self.workspace)
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
