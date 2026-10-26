using Pilot.Models.Policy;
using Pilot.Models.Scenario;

namespace Pilot.Evaluation;

public static class DrugSafetyEvaluator
{
    public static (string Safety, List<string> Reasons) Evaluate(string drug, IEnumerable<Observation> observations, PilotData data)
    {
        var rule = data.FindDrugRule(drug);
        if (rule is null) return ("undetermined", [$"no policy for {drug}"]);
        var patientEvidence = PrepareIndexedPatientEvidences(observations);
        var checks = new List<(string Safety, List<string> Reasons)>();
        if (rule.Requires.Contains("allergies")) checks.Add(AllergyEvaluator.Evaluate(rule, patientEvidence, data));
        foreach (var threshold in rule.LabThresholds ?? []) checks.Add(LabThresholdEvaluator.Evaluate(threshold, patientEvidence, data));

        var reasons = checks.SelectMany(c => c.Reasons).ToList();
        // A known contraindication refutes safety even if something else is unknown.
        if (checks.Any(c => c.Safety == "contraindicated")) return ("contraindicated", reasons);
        if (checks.Any(c => c.Safety == "undetermined")) return ("undetermined", reasons);
        return ("safe", reasons);
    }

    /// <summary>Last observation per (custodian, attribute); later queries supersede earlier ones.</summary>
    private static Dictionary<(string, string), Observation> PrepareIndexedPatientEvidences(IEnumerable<Observation> observations)
    {
        var output = new Dictionary<(string, string), Observation>();
        foreach (var obs in observations) output[(obs.CustodianId, obs.Attribute)] = obs;
        return output;
    }
}
