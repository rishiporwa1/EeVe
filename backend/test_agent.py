"""Deterministic tests for Mivi's Phase 4 agent loop and patch tools."""

from pathlib import Path
from tempfile import TemporaryDirectory
import json
import unittest

from agent.service import AgentService, MAX_TOOL_CALLS
from agent.tools import run_tool
from workspace import Workspace


class FakeLLM:
    def __init__(self, responses: list[object]) -> None:
        self.responses = list(responses)

    def complete(self, messages: list[dict[str, str]]) -> str:
        response = self.responses.pop(0)
        return response if isinstance(response, str) else json.dumps(response)


class AgentSafetyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        root = Path(self.temporary_directory.name)
        (root / "main.py").write_text("def hello():\n    return 'hello'\n", encoding="utf-8")
        self.workspace = Workspace()
        self.workspace.select(str(root))

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_agent_can_plan_search_and_answer(self) -> None:
        llm = FakeLLM([
            {"step": "plan", "content": "I will search for the function."},
            {"step": "action", "content": "Search for hello.", "tool": "search_code", "input": {"query": "hello"}},
            {"step": "answer", "content": "The hello function is in main.py."},
        ])

        result = AgentService(llm, self.workspace).run("Where is hello?")

        self.assertEqual(result.answer, "The hello function is in main.py.")
        self.assertEqual([event.kind for event in result.events], ["plan", "tool", "observation", "answer"])
        self.assertIn("main.py", result.events[2].content)

    def test_agent_blocks_unsupported_tools(self) -> None:
        llm = FakeLLM([
            {"step": "action", "content": "Write a file.", "tool": "write_file", "input": {"path": "main.py"}},
        ])

        result = AgentService(llm, self.workspace).run("Change main.py")

        self.assertIsNone(result.answer)
        self.assertIn("not permitted", result.error or "")

    def test_agent_handles_invalid_model_json(self) -> None:
        result = AgentService(FakeLLM(["this is not JSON"]), self.workspace).run("Explain the project")
        self.assertIn("invalid response", result.error or "")

    def test_agent_stops_after_six_tool_calls(self) -> None:
        actions = [
            {"step": "action", "content": "List files.", "tool": "list_files", "input": {}}
            for _ in range(MAX_TOOL_CALLS + 1)
        ]
        result = AgentService(FakeLLM(actions), self.workspace).run("Keep looking")
        self.assertIn("safe limit", result.error or "")
        self.assertEqual(len([event for event in result.events if event.kind == "tool"]), MAX_TOOL_CALLS)


class ProposePatchToolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "app.py").write_text("def greet(name):\n    return f'Hello {name}'\n", encoding="utf-8")
        self.workspace = Workspace()
        self.workspace.select(str(self.root))

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_propose_patch_returns_valid_diff(self) -> None:
        result = run_tool("propose_patch", {
            "path": "app.py",
            "original": "def greet(name):\n    return f'Hello {name}'",
            "modified": "def greet(name: str) -> str:\n    if not name:\n        raise ValueError('name is required')\n    return f'Hello {name}'",
        }, self.workspace)

        data = json.loads(result)
        self.assertEqual(data["path"], "app.py")
        self.assertIn("---", data["diff"])
        self.assertIn("+++", data["diff"])
        # File must NOT be modified
        on_disk = (self.root / "app.py").read_text(encoding="utf-8")
        self.assertIn("def greet(name):", on_disk)
        self.assertNotIn("ValueError", on_disk)

    def test_propose_patch_rejects_wrong_original(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            run_tool("propose_patch", {
                "path": "app.py",
                "original": "this text does not exist in the file",
                "modified": "replacement",
            }, self.workspace)
        self.assertIn("not found", str(ctx.exception))

    def test_propose_patch_rejects_missing_fields(self) -> None:
        with self.assertRaises(ValueError):
            run_tool("propose_patch", {"path": "app.py"}, self.workspace)


class AgentProposePatchIntegrationTests(unittest.TestCase):
    """End-to-end: agent reads a file, proposes a patch, answers."""

    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        root = Path(self.temporary_directory.name)
        (root / "calc.py").write_text("def add(a, b):\n    return a + b\n", encoding="utf-8")
        self.workspace = Workspace()
        self.workspace.select(str(root))

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_agent_collects_patches(self) -> None:
        llm = FakeLLM([
            {"step": "plan", "content": "Read the file, then propose adding type hints."},
            {"step": "action", "content": "Read calc.py to get exact content.", "tool": "read_file", "input": {"path": "calc.py"}},
            {"step": "action", "content": "Adding type hints to the add function.", "tool": "propose_patch", "input": {
                "path": "calc.py",
                "original": "def add(a, b):\n    return a + b",
                "modified": "def add(a: int, b: int) -> int:\n    return a + b",
            }},
            {"step": "answer", "content": "I proposed adding type hints to the add function."},
        ])

        result = AgentService(llm, self.workspace).run("Add type hints to calc.py")

        self.assertEqual(result.answer, "I proposed adding type hints to the add function.")
        self.assertEqual(len(result.patches), 1)
        self.assertEqual(result.patches[0].path, "calc.py")
        self.assertIn("int", result.patches[0].diff)
        # Verify patch event exists in the timeline
        patch_events = [e for e in result.events if e.kind == "patch"]
        self.assertEqual(len(patch_events), 1)


class ApplyPatchTests(unittest.TestCase):
    """Test the apply_patch helper directly."""

    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "target.py").write_text("x = 1\ny = 2\n", encoding="utf-8")
        self.workspace = Workspace()
        self.workspace.select(str(self.root))

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_apply_patch_writes_file(self) -> None:
        from api.patches import ApplyPatchRequest, apply_patch
        request = ApplyPatchRequest(path="target.py", original="x = 1", modified="x = 42")
        result = apply_patch(request, self.workspace)
        self.assertEqual(result.message, "Patch applied")
        content = (self.root / "target.py").read_text(encoding="utf-8")
        self.assertIn("x = 42", content)
        self.assertIn("y = 2", content)

    def test_apply_patch_conflict_on_stale_content(self) -> None:
        from fastapi import HTTPException
        from api.patches import ApplyPatchRequest, apply_patch
        request = ApplyPatchRequest(path="target.py", original="this is not in the file", modified="replacement")
        with self.assertRaises(HTTPException) as ctx:
            apply_patch(request, self.workspace)
        self.assertEqual(ctx.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
