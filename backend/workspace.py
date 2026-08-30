"""Workspace-scoped filesystem helpers for Mivi.

The browser never gets direct filesystem access. Every path passes through this
module so a Mivi session can only see and change its selected project folder.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException


MAX_FILE_SIZE_BYTES = 1_000_000
EXCLUDED_NAMES = {".git", ".venv", "venv", "node_modules", "__pycache__"}


class Workspace:
    """Stores the one project folder available to the current local Mivi run."""

    def __init__(self) -> None:
        self.root: Path | None = None

    def select(self, raw_path: str) -> Path:
        candidate = Path(raw_path).expanduser().resolve()
        if not candidate.is_dir():
            raise HTTPException(status_code=400, detail="Workspace path must be an existing folder.")
        self.root = candidate
        return candidate

    def require_root(self) -> Path:
        if self.root is None:
            raise HTTPException(status_code=400, detail="Open a workspace before using files.")
        return self.root

    def resolve_file(self, relative_path: str) -> Path:
        """Resolve and validate a workspace-relative path."""
        root = self.require_root()
        requested = Path(relative_path)
        if requested.is_absolute():
            raise HTTPException(status_code=400, detail="File paths must be relative to the workspace.")

        candidate = (root / requested).resolve()
        try:
            candidate.relative_to(root)
        except ValueError as error:
            raise HTTPException(status_code=403, detail="Path is outside the active workspace.") from error

        if any(is_excluded(part) for part in candidate.relative_to(root).parts):
            raise HTTPException(status_code=403, detail="This path is excluded from Mivi.")
        return candidate


def is_excluded(name: str) -> bool:
    """Hide generated, private, and dependency folders from the first MVP."""
    return name in EXCLUDED_NAMES or name.startswith(".env")


def build_file_tree(folder: Path, root: Path) -> list[dict[str, object]]:
    """Return an alphabetical, safe recursive tree for the file Explorer."""
    items: list[dict[str, object]] = []
    try:
        children = sorted(folder.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
    except PermissionError:
        return items

    for child in children:
        if is_excluded(child.name) or child.is_symlink():
            continue
        relative_path = child.relative_to(root).as_posix()
        if child.is_dir():
            items.append({"name": child.name, "path": relative_path, "type": "directory", "children": build_file_tree(child, root)})
        elif child.is_file() and child.stat().st_size <= MAX_FILE_SIZE_BYTES:
            items.append({"name": child.name, "path": relative_path, "type": "file"})
    return items


def read_text_file(path: Path) -> str:
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File does not exist.")
    if path.stat().st_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large to open in Mivi.")
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=415, detail="Only UTF-8 text files can be opened.") from error
