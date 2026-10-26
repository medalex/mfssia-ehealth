using Pilot.Evaluation;
using Pilot.Models.Policy;
using Pilot.Models.Scenario;
using Pilot.Reporting;

namespace Pilot.Services.ExperimentSetup;

/// <summary>Policy gate on the expected (seeded) evidence vs the hand labels. Disagreements are reported, not fixed.</summary>
public static class OfflineGateCheck
{
    public static List<GateWarning> FindWarnings(PilotData data)
    {
        var warnings = new List<GateWarning>();
        foreach (var patient in data.Patients)
        {
            var observations = GetExpectedObservations(patient);
            foreach (var task in data.Tasks)
            {
                var verdict = PolicyEvaluator.Evaluate(task.Id, observations, data);
                var got = verdict.Decision == "prescribe" ? verdict.Drug! : "escalate";
                if (got != patient.Truth[task.Id])
                    warnings.Add(new GateWarning("expected evidence (offline)", task.Id, patient.Label, patient.Truth[task.Id], got,
                        string.Join("; ", verdict.Reasons)));
            }
        }
        return warnings;
    }

    private static List<Observation> GetExpectedObservations(Patient patient) =>
        patient.ExpectedEvidence.Select(kv =>
        {
            var (custodian, attribute) = Patient.ParseEvidenceKey(kv.Key);
            var e = kv.Value;
            return new Observation(custodian, attribute, e.State, e.Value, e.Stale, e.MeasuredAt, e.Reason);
        }).ToList();
}
