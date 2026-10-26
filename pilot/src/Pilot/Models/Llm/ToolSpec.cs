using System.Text.Json;

namespace Pilot.Models.Llm;

/// <param name="InputSchema">JSON Schema of the arguments, sent to the model API as is.</param>
public sealed record ToolSpec(string Name, string Description, JsonElement InputSchema);
