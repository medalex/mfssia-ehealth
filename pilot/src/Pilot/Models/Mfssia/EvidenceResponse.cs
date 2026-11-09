using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pilot.Models.Mfssia;

/// <summary>
/// One answer of GET /evidence-status. Fields are declared in MFSSIA's order; fields MFSSIA leaves out stay
/// out when the answer is shown to the model, and unknown fields are kept in Extra.
/// </summary>
public sealed class EvidenceResponse
{
    [JsonPropertyName("attribute")] public required string Attribute { get; init; }
    [JsonPropertyName("custodianId")] public required string CustodianId { get; init; }
    [JsonPropertyName("state")] public required string State { get; init; } // present | confirmed_absent | unknown
    [JsonPropertyName("reason")] public string? Reason { get; init; }

    /// <summary>eGFR is a number, allergies a list of strings.</summary>
    [JsonPropertyName("value"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public EvidenceValue? Value { get; init; }

    [JsonPropertyName("measuredAt"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? MeasuredAt { get; init; }

    [JsonPropertyName("stale"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Stale { get; init; }

    [JsonPropertyName("source"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public EvidenceSource? Source { get; init; }

    [JsonExtensionData] public Dictionary<string, JsonElement>? Extra { get; set; }
}
