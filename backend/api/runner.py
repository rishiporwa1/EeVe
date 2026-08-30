"""Controlled Python command runner for Phase 5.

Only two command shapes are allowed:
  - python <workspace-relative .py file>
  - pytest

All execution is workspace-scoped with a 30-second timeout.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from pydantic import BaseModel, Field

from fastapi import HTTPException

from workspace import Workspace


TIMEOUT_SECONDS = 30
ALLOWED_COMMANDS = {"python", "pytest"}
MAX_OUTPUT_CHARS = 50_000


class RunRequest(BaseModel):
    command: str = Field(pattern=r"^(python|pytest)$")
    file: str | None = Field(default=None, max_length=500)


class RunResult(BaseModel):
    command_display: str
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool


def run_command(request: RunRequest, workspace: Workspace) -> RunResult:
    """Execute a safe, user-confirmed Python command inside the workspace."""
    root = workspace.require_root()

    if request.command == "python":
        if not request.file:
            raise HTTPException(status_code=400, detail="A file path is required when running python.")
        # Validate the file is inside the workspace
        file_path = workspace.resolve_file(request.file)
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="File does not exist.")
        if file_path.suffix != ".py":
            raise HTTPException(status_code=400, detail="Only .py files can be executed.")
        cmd = [sys.executable, str(file_path)]
        display = f"python {request.file}"

    elif request.command == "pytest":
        cmd = [sys.executable, "-m", "pytest", "-v"]
        display = "pytest -v"

    else:
        raise HTTPException(status_code=400, detail=f"Command '{request.command}' is not allowed.")

    try:
        result = subprocess.run(
            cmd,
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
        )
        return RunResult(
            command_display=display,
            stdout=result.stdout[:MAX_OUTPUT_CHARS],
            stderr=result.stderr[:MAX_OUTPUT_CHARS],
            exit_code=result.returncode,
            timed_out=False,
        )
    except subprocess.TimeoutExpired:
        return RunResult(
            command_display=display,
            stdout="",
            stderr=f"Command timed out after {TIMEOUT_SECONDS} seconds.",
            exit_code=-1,
            timed_out=True,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to execute command: {error}")
