using Pilot.Models.Mfssia;

namespace Pilot.Auditing;

/// <summary>Compares the value_used an agent declares with a value MFSSIA returned.</summary>
public static class DeclaredValueMatcher
{
    /// <summary>True for a value_used that says "nothing": null, empty, "none", "n/a", "[]".</summary>
    public static bool IsEmpty(EvidenceValue? value) => value switch
    {
        null => true,
        EvidenceValue.List a => a.Items.Count == 0,
        EvidenceValue.Other o => o.IsEmptyObject,
        EvidenceValue.Text s => s.Value.Trim().ToLowerInvariant() is "" or "none" or "null" or "n/a" or "[]",
        _ => false,
    };

    public static bool Matches(EvidenceValue? declared, EvidenceValue? actual)
    {
        if (actual is EvidenceValue.List actualList)
        {
            var actualItems = actualList.Items.Select(Normalize).ToHashSet();
            IReadOnlyList<EvidenceValue?> declaredItems = declared is EvidenceValue.List d ? d.Items : [declared];
            return declaredItems.All(item => actualItems.Contains(Normalize(item)));
        }
        if (EvidenceValue.TryNumber(declared, out var x) && EvidenceValue.TryNumber(actual, out var y)) return x == y;
        return Normalize(declared) == Normalize(actual);
    }

    private static string Normalize(EvidenceValue? value) => EvidenceValue.ToText(value).Trim().ToLowerInvariant();
}
