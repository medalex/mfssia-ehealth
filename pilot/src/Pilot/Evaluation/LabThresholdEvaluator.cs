using System.Globalization;
using Pilot.Models.Mfssia;
using Pilot.Models.Policy;
using Pilot.Models.Scenario;

namespace Pilot.Evaluation;

public static class LabThresholdEvaluator
{
    /// <summary>The most recent non-stale value across the registry labs against the threshold; any unknown lab leaves it undetermined.</summary>
    public static (string Safety, List<string> Reasons) Evaluate(LabThreshold threshold, IReadOnlyDictionary<(string, string), Observation> patientEvidence, PilotData data)
    {
        var attribute = threshold.Attribute;
        var reasons = new List<string>();
        var usable = new List<Observation>();
        var labUnknown = false;
        foreach (var custodian in data.GetCustodiansHolding(attribute))
        {
            if (!patientEvidence.TryGetValue((custodian.Id, attribute), out var obs) || obs.State == "unknown")
            {
                labUnknown = true;
                reasons.Add($"{attribute}@{custodian.Id} unknown or not queried");
            }
            else if (obs.State == "present" && obs.Stale == false && obs.Value is not null)
            {
                usable.Add(obs);
            }
        }
        if (labUnknown) return ("undetermined", reasons);
        if (usable.Count == 0)
        {
            reasons.Add($"no non-stale {attribute} in any registry lab");
            return ("undetermined", reasons);
        }
        // The most recent value; of equal timestamps the first one is kept.
        var latest = usable.Aggregate((best, o) => string.CompareOrdinal(o.MeasuredAt ?? "", best.MeasuredAt ?? "") > 0 ? o : best);
        if (!EvidenceValue.TryNumber(latest.Value, out var value))
            throw new FormatException($"{attribute} value {EvidenceValue.ToText(latest.Value)} is not a number");
        reasons.Add(string.Create(CultureInfo.InvariantCulture, $"{attribute}={value}@{latest.CustodianId} {(value < threshold.Min ? "<" : ">=")} {threshold.Min}"));
        return (value < threshold.Min ? "contraindicated" : "safe", reasons);
    }
}
