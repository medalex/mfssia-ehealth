from __future__ import annotations

import os
from typing import Any

import anthropic

from pilot.adapters.base import ModelAdapter, ToolCall, ToolSpec, Turn


class AnthropicAdapter(ModelAdapter):
    """Manual tool-use loop over the Messages API.

    - tool_choice stays "auto": current models reject forced tool choice, so the obligation to
      finish with submit_decision is stated in the system prompt and enforced by the loop.
    - temperature: sent if configured. Current Claude models reject sampling parameters with
      HTTP 400; in that case the request is repeated once without it and `settings` records
      that no temperature was applied, for every later call of this adapter.
    - The assistant content is appended back verbatim (including thinking blocks).
    """

    def __init__(self, model_id: str, temperature: float | None, client: anthropic.Anthropic | None = None):
        self.model_id = model_id
        self.client = client or anthropic.Anthropic()
        self.temperature = temperature
        self.effort = os.environ.get("PILOT_EFFORT") or None
        self.settings: dict[str, Any] = {"temperature": temperature, "effort": self.effort or "model default"}
        self.system = ""
        self.tools: list[dict[str, Any]] = []
        self.messages: list[dict[str, Any]] = []

    def start(self, system: str, user: str, tools: list[ToolSpec]) -> None:
        self.system = system
        self.tools = [{"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools]
        self.messages = [{"role": "user", "content": user}]

    def _create(self) -> anthropic.types.Message:
        params: dict[str, Any] = dict(
            model=self.model_id, max_tokens=16000, system=self.system, tools=self.tools, messages=self.messages,
        )
        if self.effort:
            params["output_config"] = {"effort": self.effort}
        if self.temperature is None:
            return self.client.messages.create(**params)
        try:
            return self.client.messages.create(**params, temperature=self.temperature)
        except anthropic.BadRequestError:
            response = self.client.messages.create(**params)
            self.temperature = None
            self.settings["temperature"] = "rejected by model; not applied"
            return response

    def step(self) -> Turn:
        response = self._create()
        self.messages.append({"role": "assistant", "content": response.content})
        calls = [ToolCall(b.id, b.name, dict(b.input)) for b in response.content if b.type == "tool_use"]
        text = "".join(b.text for b in response.content if b.type == "text")
        return Turn(text=text, tool_calls=calls, stop_reason=response.stop_reason or "", raw=response.model_dump(mode="json"))

    def add_tool_results(self, results: list[tuple[str, str, bool]]) -> None:
        self.messages.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": call_id, "content": content, "is_error": is_error}
            for call_id, content, is_error in results
        ]})

    def add_user_text(self, text: str) -> None:
        self.messages.append({"role": "user", "content": text})
