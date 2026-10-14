from pilot.adapters.base import ModelAdapter, ToolCall, ToolSpec, Turn


def make_adapter(model_id: str, temperature: float | None) -> ModelAdapter:
    """Only Anthropic is implemented. An OpenAI-compatible adapter for an open model would go here."""
    from pilot.adapters.anthropic_adapter import AnthropicAdapter

    return AnthropicAdapter(model_id, temperature)


__all__ = ["ModelAdapter", "ToolCall", "ToolSpec", "Turn", "make_adapter"]
