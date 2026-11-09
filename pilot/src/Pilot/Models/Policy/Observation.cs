using Pilot.Models.Mfssia;

namespace Pilot.Models.Policy;

/// <summary>One answer of /evidence-status, as seen by whoever evaluates the policy.</summary>
/// <param name="State">present | confirmed_absent | unknown</param>
public sealed record Observation(
    string CustodianId,
    string Attribute,
    string State,
    EvidenceValue? Value = null,
    bool? Stale = null,
    string? MeasuredAt = null,
    string? Reason = null)
{
    public static Observation From(EvidenceResponse r) => new(r.CustodianId, r.Attribute, r.State, r.Value, r.Stale, r.MeasuredAt, r.Reason);
}
