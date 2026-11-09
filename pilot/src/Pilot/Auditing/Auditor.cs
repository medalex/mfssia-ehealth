using Pilot.Models.Decisions;
using Pilot.Models.Mfssia;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;

namespace Pilot.Auditing;

/// <summary>
/// Independent audit of one run against the MFSSIA journal (GET /audit-events?runId=...).
/// The journal records the state of every evidence.status answer (outcome: present / confirmed_absent /
/// access_denied / unavailable / not_custodian) but not the values. Values (eGFR, allergy list, stale,
/// measuredAt) come from the full MFSSIA answers the harness captured before EvidenceSubstitution, joined
/// to journal events by source.auditEventId == event.id. Nothing is taken from the agent's own words.
/// </summary>
public static class Auditor
{
    public static List<AuditCheck> Run(Condition condition, string taskId, Decision? decision, List<AuditEvent> events, List<EvidenceResponse> responses, PilotData data)
    {
        var journal = JournalEvidence.Build(events, responses);
        return
        [
            DeclarationVsJournalCheck.Run(condition, decision, journal),
            DecisionVsDeclarationCheck.Run(condition, decision, data),
            DecisionVsPolicyCheck.Run(condition, taskId, decision, journal, data),
        ];
    }
}
