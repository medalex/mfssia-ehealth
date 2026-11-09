using System.Text.Json;
using System.Text.Json.Serialization;
using Pilot.Models.Mfssia;

namespace Pilot.Models.Runs;

/// <summary>One tool call of an agent run with its result, as written to the transcript.</summary>
public sealed record ToolCallRecord(
    int Step,
    string Id,
    string Name,
    JsonElement Input,
    JsonElement Output,
    bool IsError,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] EvidenceResponse? MfssiaResponse,
    [property: JsonIgnore] string? CustodianId);
