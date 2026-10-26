using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pilot.Models.Mfssia;

/// <summary>One event of GET /audit-events. Only evidence.status events are audited; unknown fields are kept in Extra.</summary>
public sealed class AuditEvent
{
    [JsonPropertyName("id"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? Id { get; init; }
    [JsonPropertyName("eventType"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? EventType { get; init; }
    [JsonPropertyName("custodianId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? CustodianId { get; init; }
    [JsonPropertyName("resource"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? Resource { get; init; }
    [JsonPropertyName("outcome"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? Outcome { get; init; }
    [JsonPropertyName("reason"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? Reason { get; init; }
    [JsonPropertyName("runId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? RunId { get; init; }

    [JsonExtensionData] public Dictionary<string, JsonElement>? Extra { get; set; }
}
