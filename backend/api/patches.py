"""Patch-apply helpers for Phase 4 (extended with new-file creation)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from fastapi import HTTPException

from workspace import Workspace, read_text_file


class ApplyPatchRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    original: str = Field(default="")
    modified: str


class ApplyPatchResponse(BaseModel):
    path: str
    message: str


def apply_patch(request: ApplyPatchRequest, workspace: Workspace) -> ApplyPatchResponse:
    """Apply a user-approved patch to a workspace file.

    Two modes:
      - Edit (original non-empty): re-reads the file and verifies the original
        text still exists before writing. Returns 409 if changed.
      - Create (original empty): writes a brand-new file. Returns 409 if the
        file already exists.
    """
    file_path = workspace.resolve_file(request.path)
    is_new_file = request.original == ""

    if is_new_file:
        if file_path.is_file():
            raise HTTPException(
                status_code=409,
                detail="The file already exists. Cannot create over an existing file.",
            )
        # Ensure parent directories exist within the workspace
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(request.modified, encoding="utf-8")
        return ApplyPatchResponse(path=request.path, message="File created")

    # Edit mode — verify original text still present
    current_content = read_text_file(file_path)

    if request.original not in current_content:
        raise HTTPException(
            status_code=409,
            detail="The file has changed since the AI read it. The patch cannot be applied safely.",
        )

    new_content = current_content.replace(request.original, request.modified, 1)
    file_path.write_text(new_content, encoding="utf-8")

    return ApplyPatchResponse(path=request.path, message="Patch applied")
