using Pilot.Models.Policy;
using Pilot.Models.Scenario;

namespace Pilot.Evaluation;

/// <summary>
/// Policy logic shared by the policy gate (condition A) and audit check 3. Both use this class, so a bug
/// here is a common-mode failure. The guard against it is the hand-labelled truth in data/scenarios.yaml,
/// which every condition (including A) is compared to.
/// </summary>
public static class PolicyEvaluator
{
    /// <summary>First candidate whose safety is established; escalate on an undetermined preferred candidate.</summary>
    public static Verdict Evaluate(string taskId, IEnumerable<Observation> observations, PilotData data)
    {
        var list = observations.ToList();
        var verdict = new Verdict();
        foreach (var drug in data.GetTask(taskId).Candidates)
        {
            var (safety, reasons) = DrugSafetyEvaluator.Evaluate(drug, list, data);
            verdict.Safety[drug] = safety;
            verdict.Reasons.Add($"{drug}: {safety} ({(reasons.Count > 0 ? string.Join("; ", reasons) : "no findings")})");
            if (safety == "safe")
            {
                verdict.Decision = "prescribe";
                verdict.Drug = drug;
                return verdict;
            }
            if (safety == "undetermined") return verdict;
        }
        verdict.Reasons.Add("no candidate is safe");
        return verdict;
    }
}
