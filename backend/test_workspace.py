"""Focused Phase 2 safety tests using only Python's built-in test framework."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from fastapi import HTTPException

from workspace import Workspace, build_file_tree, read_text_file


class WorkspaceSafetyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "src").mkdir()
        (self.root / "src" / "main.py").write_text("print('hello')\n", encoding="utf-8")
        (self.root / ".git").mkdir()
        (self.root / ".git" / "config").write_text("private", encoding="utf-8")
        self.workspace = Workspace()
        self.workspace.select(str(self.root))

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_reads_a_file_inside_the_workspace(self) -> None:
        path = self.workspace.resolve_file("src/main.py")
        self.assertEqual(read_text_file(path), "print('hello')\n")

    def test_rejects_a_path_outside_the_workspace(self) -> None:
        with self.assertRaises(HTTPException) as error:
            self.workspace.resolve_file("../outside.py")
        self.assertEqual(error.exception.status_code, 403)

    def test_rejects_excluded_paths(self) -> None:
        with self.assertRaises(HTTPException) as error:
            self.workspace.resolve_file(".git/config")
        self.assertEqual(error.exception.status_code, 403)

    def test_hides_excluded_folders_from_file_tree(self) -> None:
        tree = build_file_tree(self.root, self.root)
        self.assertEqual([item["name"] for item in tree], ["src"])


if __name__ == "__main__":
    unittest.main()
