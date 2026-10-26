namespace Pilot.Models.OpenAI;

public sealed record ChatResponseMessage(string? Content, List<ChatResponseToolCall>? ToolCalls);
