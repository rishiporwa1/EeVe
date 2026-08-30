"""The FastAPI backend for Mivi.

Phase 5 adds POST /run for controlled Python execution.
"""

from pydantic import BaseModel, Field

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.schemas import AgentResult
from agent.service import AgentService
from api.patches import ApplyPatchRequest, ApplyPatchResponse, apply_patch
from api.runner import RunRequest, RunResult, run_command
from services.llm import CohereCompatibleLLM, LLMConfigurationError
from workspace import Workspace, build_file_tree, read_text_file


app = FastAPI(title="Mivi API", version="0.3.0")

# The React development server runs on a different local port. This explicit
# allow-list lets it call the API while keeping the rule narrow.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)

workspace = Workspace()


class WorkspaceRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)


class SaveFileRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content: str = Field(max_length=1_000_000)


class AgentRunRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4_000)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Return a small response proving that the Mivi backend is available."""
    return {"status": "ok", "message": "Mivi backend is running"}


@app.post("/workspace")
def open_workspace(request: WorkspaceRequest) -> dict[str, str]:
    """Select the only folder this local Mivi session may access."""
    root = workspace.select(request.path)
    return {"path": str(root), "name": root.name}


@app.get("/files")
def list_files() -> dict[str, object]:
    root = workspace.require_root()
    return {"root": str(root), "items": build_file_tree(root, root)}


@app.get("/files/content")
def get_file_content(path: str) -> dict[str, str]:
    file_path = workspace.resolve_file(path)
    return {"path": file_path.relative_to(workspace.require_root()).as_posix(), "content": read_text_file(file_path)}


@app.put("/files/content")
def save_file_content(request: SaveFileRequest) -> dict[str, str]:
    from fastapi import HTTPException
    file_path = workspace.resolve_file(request.path)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File does not exist. Creating files comes in a later phase.")
    if file_path.stat().st_size > 1_000_000:
        raise HTTPException(status_code=413, detail="File is too large to save in Mivi.")
    file_path.write_text(request.content, encoding="utf-8")
    return {"path": request.path, "message": "File saved"}


@app.post("/agent/run", response_model=AgentResult)
def run_agent(request: AgentRunRequest) -> AgentResult:
    """Run an AI request within the active workspace."""
    try:
        llm = CohereCompatibleLLM()
    except LLMConfigurationError as error:
        return AgentResult(events=[], error=str(error))
    return AgentService(llm, workspace).run(request.prompt)


@app.post("/patches/apply", response_model=ApplyPatchResponse)
def apply_patch_endpoint(request: ApplyPatchRequest) -> ApplyPatchResponse:
    """Apply a user-approved AI patch to a workspace file."""
    return apply_patch(request, workspace)


@app.post("/run", response_model=RunResult)
def run_python(request: RunRequest) -> RunResult:
    """Run a user-confirmed Python command inside the active workspace."""
    return run_command(request, workspace)


