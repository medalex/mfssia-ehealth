"""Provider-neutral interface between the agent loop and a model API.

The adapter owns the provider's native message history; the agent loop only sees
neutral Turn / ToolCall objects. To add an open model behind an OpenAI-compatible endpoint,
implement ModelAdapter for that API (convert ToolSpec -> function tools, tool results ->
role="tool" messages) and register it in adapters/__init__.py.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class Turn:
    text: str
    tool_calls: list[ToolCall]
    stop_reason: str
    raw: dict[str, Any] = field(default_factory=dict)  # provider response, JSON-serialisable, for the transcript


class ModelAdapter(ABC):
    model_id: str
    # What sampling settings were actually sent (recorded in results; some models reject temperature).
    settings: dict[str, Any]

    @abstractmethod
    def start(self, system: str, user: str, tools: list[ToolSpec]) -> None: ...

    @abstractmethod
    def step(self) -> Turn: ...

    @abstractmethod
    def add_tool_results(self, results: list[tuple[str, str, bool]]) -> None:
        """results: (tool_call_id, content, is_error), all answering the previous Turn."""

    @abstractmethod
    def add_user_text(self, text: str) -> None: ...
