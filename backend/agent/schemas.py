"""Validated shapes exchanged by the Mivi agent and its UI."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentStep(BaseModel):
    step: Literal["plan", "action", "answer"]
    content: str = Field(min_length=1, max_length=8_000)
    tool: str | None = None
    input: dict[str, Any] | None = None


class PatchProposal(BaseModel):
    path: str
    original: str
    modified: str
    diff: str
    explanation: str
    is_new_file: bool = False


class AgentEvent(BaseModel):
    kind: Literal["plan", "tool", "observation", "answer", "error", "patch"]
    content: str


class AgentResult(BaseModel):
    events: list[AgentEvent]
    answer: str | None = None
    error: str | None = None
    patches: list[PatchProposal] = Field(default_factory=list)

