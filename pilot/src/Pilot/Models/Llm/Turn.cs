using System.Text.Json;

namespace Pilot.Models.Llm;

/// <param name="Raw">Provider response, for the transcript.</param>
public sealed record Turn(string Text, List<ToolCall> ToolCalls, string StopReason, JsonElement? Raw = null);
