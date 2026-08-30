"""Cohere-compatible language-model adapter.

This module is deliberately the only place that knows about API credentials and
provider configuration. The browser never receives these values.
"""

from __future__ import annotations

import os
from typing import Protocol

from dotenv import load_dotenv
from openai import OpenAI


class LanguageModel(Protocol):
    def complete(self, messages: list[dict[str, str]]) -> str: ...


class LLMConfigurationError(RuntimeError):
    pass


class CohereCompatibleLLM:
    def __init__(self) -> None:
        load_dotenv()
        api_key = os.getenv("COHERE_API_KEY")
        if not api_key:
            raise LLMConfigurationError(
                "AI is not configured. Copy backend/.env.example to backend/.env and add COHERE_API_KEY."
            )
        self.client = OpenAI(api_key=api_key, base_url="https://api.cohere.ai/compatibility/v1")
        self.model = os.getenv("COHERE_MODEL", "command-r-plus-08-2024")

    def complete(self, messages: list[dict[str, str]]) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("The AI provider returned an empty response.")
        return content
