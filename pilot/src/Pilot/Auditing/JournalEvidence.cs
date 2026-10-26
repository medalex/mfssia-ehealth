using Pilot.Models.Mfssia;
using Pilot.Models.Policy;

namespace Pilot.Auditing;

/// <summary>What MFSSIA returned in a run: the journal's evidence.status events joined to the captured full answers.</summary>
public static class JournalEvidence
{
    private static readonly HashSet<string> KnownStates = ["present", "confirmed_absent"];

    public static List<Observation> Build(IEnumerable<AuditEvent> events, IEnumerable<EvidenceResponse> responses)
    {
        // A missing id on either side joins with the other side's missing id (the empty key).
        var byEventId = new Dictionary<string, EvidenceResponse>();
        foreach (var r in responses) byEventId[r.Source?.AuditEventId ?? ""] = r;

        return events.Where(e => e.EventType == "evidence.status").Select(evt =>
        {
            var state = GetState(evt);
            var response = byEventId.GetValueOrDefault(evt.Id ?? "");
            return new Observation(
                CustodianId: evt.CustodianId ?? "",
                Attribute: evt.Resource ?? "",
                State: state, // the journal's state wins over anything else
                Value: state == "present" ? response?.Value : null,
                Stale: response?.Stale,
                MeasuredAt: response?.MeasuredAt,
                Reason: evt.Reason);
        }).ToList();
    }

    private static string GetState(AuditEvent evt) =>
        evt.Outcome is { } outcome && KnownStates.Contains(outcome) ? outcome : "unknown";
}
