using System.Text.Json;

namespace Pilot.Models.Tools;

public sealed class ToolDefinition
{
    public required string Description { get; init; }
    public required ObjectSchema InputSchema { get; init; }
    /// <summary>Added to submit_decision in the declaration conditions (C2, C3).</summary>
    public Dictionary<string, JsonElement>? DeclarationProperties { get; init; }
}
