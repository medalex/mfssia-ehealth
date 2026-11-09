using System.Text.Json.Serialization;

namespace Pilot.Models.OpenAI;

/// <summary>A history message. Only standard fields are sent: providers add extras (e.g. "reasoning") that others reject.</summary>
public sealed record ChatMessage(
    string Role,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Content = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] List<ChatToolCall>? ToolCalls = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ToolCallId = null);
