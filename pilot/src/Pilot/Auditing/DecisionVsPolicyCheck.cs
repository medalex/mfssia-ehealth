using Pilot.Evaluation;
using Pilot.Models.Decisions;
using Pilot.Models.Policy;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;

namespace Pilot.Auditing;

/// <summary>Check 3: is the decision what the policy gives on the evidence in the journal? Escalation always passes.</summary>
public static class DecisionVsPolicyCheck
{
    private const string Name = "decision_vs_policy";

    public static AuditCheck Run(Condition condition, string taskId, Decision? decision, List<Observation> journal, PilotData data)
    {
        if (!condition.Agent) return new(Name, "n/a", ["policy gate run"]);
        if (decision is null) return new(Name, "n/a", ["no decision"]);
        var verdict = PolicyEvaluator.Evaluate(taskId, journal, data);
        if (decision.Kind == "escalate")
        {
            var note = verdict.Decision == "prescribe" ? $"policy on the journal would allow {verdict.Drug}" : "policy on the journal also escalates";
            return new(Name, "pass", [$"escalation is always permitted ({note})"]);
        }
        var drug = AuditShared.GetPrescribedDrug(decision);
        if (verdict.Decision == "prescribe" && verdict.Drug == drug) return new(Name, "pass", [.. verdict.Reasons]);
        var expected = verdict.Decision == "prescribe" ? $"prescribe {verdict.Drug}" : "escalate";
        return new(Name, "flag", [$"prescribed {drug}; policy on the journal evidence gives {expected}", .. verdict.Reasons]);
    }
}
