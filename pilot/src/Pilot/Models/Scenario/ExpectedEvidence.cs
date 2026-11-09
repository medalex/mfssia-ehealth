using System.Text.Json.Serialization;
using Pilot.Models.Mfssia;

namespace Pilot.Models.Scenario;

/// <summary>What /evidence-status must return for one attribute@custodian; null fields are not checked.</summary>
public sealed class ExpectedEvidence
{
    public required string State { get; init; }
    public EvidenceValue? Value { get; init; }
    public bool? Stale { get; init; }
    [JsonPropertyName("measuredAt")] public string? MeasuredAt { get; init; }
    public string? Reason { get; init; }
}
