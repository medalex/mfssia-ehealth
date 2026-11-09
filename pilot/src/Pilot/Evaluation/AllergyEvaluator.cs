using Pilot.Models.Mfssia;
using Pilot.Models.Policy;
using Pilot.Models.Scenario;

namespace Pilot.Evaluation;

public static class AllergyEvaluator
{
    /// <summary>No allergy to the drug or its class at any allergy custodian; an unknown custodian leaves it undetermined.</summary>
    public static (string Safety, List<string> Reasons) Evaluate(DrugRule rule, IReadOnlyDictionary<(string, string), Observation> patientEvidence, PilotData data)
    {
        var reasons = new List<string>();
        var contraindicated = false;
        var undetermined = false;
        var banned = new HashSet<string>((rule.ContraindicatedAllergies ?? []).Select(s => s.ToLowerInvariant()));
        foreach (var cls in rule.ContraindicatedAllergyClasses ?? [])
            banned.UnionWith(data.Policy.AllergyClasses.GetValueOrDefault(cls, []).Select(s => s.ToLowerInvariant()));
        foreach (var custodian in data.GetCustodiansHolding("allergies"))
        {
            if (!patientEvidence.TryGetValue((custodian.Id, "allergies"), out var obs) || obs.State == "unknown")
            {
                undetermined = true;
                reasons.Add($"allergies@{custodian.Id} unknown or not queried");
                continue;
            }
            var hits = ParseAllergies(obs.State == "present" ? obs.Value : null).Where(banned.Contains).Distinct().Order(StringComparer.Ordinal).ToList();
            if (hits.Count > 0)
            {
                contraindicated = true;
                reasons.Add($"allergy to {string.Join(", ", hits)} (allergies@{custodian.Id})");
            }
        }
        return (contraindicated ? "contraindicated" : undetermined ? "undetermined" : "safe", reasons);
    }

    private static List<string> ParseAllergies(EvidenceValue? value) => value switch
    {
        EvidenceValue.List items => items.Items.Select(i => EvidenceValue.ToText(i).Trim().ToLowerInvariant()).Where(s => s.Length > 0).ToList(),
        null => [],
        _ => EvidenceValue.ToText(value).Trim().ToLowerInvariant() is { Length: > 0 } one ? [one] : [],
    };
}
