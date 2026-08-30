"""The Plan → Act → Observe agent loop for Phase 4."""

from __future__ import annotations

import json

from pydantic import ValidationError

from agent.prompts import SYSTEM_PROMPT
from agent.schemas import AgentEvent, AgentResult, AgentStep, PatchProposal
from agent.tools import run_tool
from services.llm import LanguageModel
from workspace import Workspace


MAX_TOOL_CALLS = 6
MAX_OBSERVATION_CHARS = 8_000


class AgentService:
    def __init__(self, llm: LanguageModel, workspace: Workspace) -> None:
        self.llm = llm
        self.workspace = workspace

    def run(self, user_prompt: str) -> AgentResult:
        self.workspace.require_root()
        events: list[AgentEvent] = []
        patches: list[PatchProposal] = []
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        tool_calls = 0

        for _ in range(MAX_TOOL_CALLS + 3):
            try:
                raw_response = self.llm.complete(messages)
                step = AgentStep.model_validate(json.loads(raw_response))
            except (json.JSONDecodeError, ValidationError) as error:
                return AgentResult(events=events, patches=patches, error=f"AI returned an invalid response: {error}")
            except Exception as error:
                return AgentResult(events=events, patches=patches, error=f"AI request failed: {error}")

            messages.append({"role": "assistant", "content": raw_response})
            if step.step == "plan":
                events.append(AgentEvent(kind="plan", content=step.content))
                continue
            if step.step == "answer":
                events.append(AgentEvent(kind="answer", content=step.content))
                return AgentResult(events=events, patches=patches, answer=step.content)

            if tool_calls >= MAX_TOOL_CALLS:
                return AgentResult(events=events, patches=patches, error="The AI reached its safe limit of 6 tool calls.")
            if not step.tool or step.input is None:
                return AgentResult(events=events, patches=patches, error="AI action did not include a valid tool and input.")

            events.append(AgentEvent(kind="tool", content=f"{step.tool}: {step.content}"))
            try:
                observation = run_tool(step.tool, step.input, self.workspace)
            except Exception as error:
                return AgentResult(events=events, patches=patches, error=f"Tool request was blocked: {error}")

            tool_calls += 1

            # Collect patch proposals from propose_patch results
            if step.tool == "propose_patch":
                try:
                    patch_data = json.loads(observation)
                    patches.append(PatchProposal(
                        path=patch_data["path"],
                        original=patch_data["original"],
                        modified=patch_data["modified"],
                        diff=patch_data["diff"],
                        explanation=step.content,
                        is_new_file=patch_data.get("is_new_file", False),
                    ))
                    events.append(AgentEvent(kind="patch", content=patch_data["diff"]))
                except (json.JSONDecodeError, KeyError):
                    pass

            safe_observation = observation[:MAX_OBSERVATION_CHARS]
            events.append(AgentEvent(kind="observation", content=safe_observation))
            messages.append({"role": "user", "content": f"Tool observation:\n{safe_observation}"})

        return AgentResult(events=events, patches=patches, error="The AI did not finish within the safe step limit.")

