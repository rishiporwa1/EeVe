"""Read-only tools available to the Mivi agent (Phase 4 adds propose_patch)."""

from __future__ import annotations

import difflib
import json
from pathlib import Path

from fastapi import HTTPException

from workspace import MAX_FILE_SIZE_BYTES, Workspace, build_file_tree, is_excluded, read_text_file


ALLOWED_TOOLS = {"list_files", "read_file", "search_code", "propose_patch"}
MAX_SEARCH_RESULTS = 30


def run_tool(tool: str, tool_input: dict[str, object], workspace: Workspace) -> str:
    """Execute a permitted agent tool and return the observation string."""
    if tool not in ALLOWED_TOOLS:
        raise ValueError(f"Tool '{tool}' is not permitted.")

    if tool == "list_files":
        root = workspace.require_root()
        return json.dumps({"items": build_file_tree(root, root)}, ensure_ascii=False)

    if tool == "read_file":
        path = _required_text(tool_input, "path")
        return read_text_file(workspace.resolve_file(path))

    if tool == "search_code":
        query = _required_text(tool_input, "query")
        return json.dumps({"matches": _search_code(query, workspace)}, ensure_ascii=False)

    if tool == "propose_patch":
        return _propose_patch(tool_input, workspace)

    raise ValueError(f"Tool '{tool}' is not implemented.")


# ---------------------------------------------------------------------------
# propose_patch
# ---------------------------------------------------------------------------

def _propose_patch(tool_input: dict[str, object], workspace: Workspace) -> str:
    """Generate a unified diff without writing anything to disk.

    Supports two modes:
      - Edit: original is non-empty, must match text in the existing file.
      - Create: original is "" (empty string), file must not already exist.

    Input keys:
        path     — workspace-relative file path
        original — the exact text to replace, or "" to create a new file
        modified — the replacement text (full file content for creation)
    """
    path_str = _required_text(tool_input, "path")
    original = tool_input.get("original")
    modified = tool_input.get("modified")

    if not isinstance(original, str):
        raise ValueError("propose_patch requires an 'original' string (empty string for new files).")
    if not isinstance(modified, str):
        raise ValueError("propose_patch requires a 'modified' string.")

    file_path = workspace.resolve_file(path_str)
    is_new_file = original == ""

    if is_new_file:
        # New-file creation mode
        if file_path.is_file():
            raise ValueError(
                f"Cannot create '{path_str}' — it already exists. "
                "To edit an existing file, set 'original' to the text you want to replace."
            )
        old_lines: list[str] = []
        new_lines = modified.splitlines(keepends=True)
        diff = "".join(difflib.unified_diff(old_lines, new_lines, fromfile="/dev/null", tofile=path_str))
    else:
        # Edit-existing-file mode
        current_content = read_text_file(file_path)
        if original not in current_content:
            raise ValueError(
                "The 'original' text was not found in the current file. "
                "Re-read the file and try again with the exact text."
            )
        old_lines = current_content.splitlines(keepends=True)
        new_content = current_content.replace(original, modified, 1)
        new_lines = new_content.splitlines(keepends=True)
        diff = "".join(difflib.unified_diff(old_lines, new_lines, fromfile=path_str, tofile=path_str))

    return json.dumps({
        "path": path_str,
        "original": original,
        "modified": modified,
        "diff": diff,
        "is_new_file": is_new_file,
    }, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _required_text(values: dict[str, object], name: str) -> str:
    value = values.get(name)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Tool input '{name}' must be a non-empty string.")
    if len(value) > 200:
        raise ValueError(f"Tool input '{name}' is too long.")
    return value.strip()


def _search_code(query: str, workspace: Workspace) -> list[dict[str, object]]:
    root = workspace.require_root()
    matches: list[dict[str, object]] = []
    for file_path in _workspace_text_files(root):
        try:
            lines = read_text_file(file_path).splitlines()
        except HTTPException:
            continue
        for line_number, line in enumerate(lines, start=1):
            if query.lower() in line.lower():
                matches.append({
                    "path": file_path.relative_to(root).as_posix(),
                    "line": line_number,
                    "preview": line.strip()[:300],
                })
                if len(matches) >= MAX_SEARCH_RESULTS:
                    return matches
    return matches


def _workspace_text_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if path.is_symlink() or any(is_excluded(part) for part in path.relative_to(root).parts):
            continue
        if path.is_file() and path.stat().st_size <= MAX_FILE_SIZE_BYTES:
            files.append(path)
    return files

