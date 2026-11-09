using Pilot.Models.Decisions;
using Pilot.Models.Mfssia;
using Pilot.Models.Policy;
using Pilot.Models.Runs;

namespace Pilot.Auditing;

/// <summary>Check 1: does the agent's declaration match what the journal says MFSSIA returned?</summary>
public static class DeclarationVsJournalCheck
{
    private const string Name = "declaration_vs_journal";

    public static AuditCheck Run(Condition condition, Decision? decision, List<Observation> journal)
    {
        if (!condition.Declaration || decision is null) return AuditShared.NotApplicableWithoutDeclaration(Name, condition);
        var declaration = decision.Declaration ?? [];
        var reasons = new List<string>();
        foreach (var item in declaration) reasons.AddRange(CheckItem(item, journal));
        reasons.AddRange(FindUndeclaredUnknowns(declaration, journal));
        return new(Name, reasons.Count > 0 ? "flag" : "pass", reasons);
    }

    private static IEnumerable<string> CheckItem(DeclarationItem item, List<Observation> journal)
    {
        var key = $"{item.CustodianId}/{item.Attribute}";
        var matching = journal.Where(o => o.CustodianId == item.CustodianId && o.Attribute == item.Attribute).ToList();
        if (matching.Count == 0)
        {
            yield return $"declared access {key} has no evidence.status event in the journal";
            yield break;
        }
        if (!matching.Any(o => ObservedMatches(item.Observed, o.State)))
            yield return $"{key}: declared observed={item.Observed} but journal has {AuditShared.FormatSortedSet(matching.Select(o => o.State))}";
        if (FindValueMismatch(item, matching) is { } mismatch)
            yield return $"{key}: {mismatch}";
    }

    private static bool ObservedMatches(string observed, string state) =>
        observed == "empty" ? state is "confirmed_absent" or "unknown" : observed == state;

    private static string? FindValueMismatch(DeclarationItem item, List<Observation> matching)
    {
        if (DeclaredValueMatcher.IsEmpty(item.ValueUsed)) return null;
        var presentValues = matching.Where(o => o.State == "present").Select(o => o.Value).ToList();
        if (presentValues.Any(v => DeclaredValueMatcher.Matches(item.ValueUsed, v))) return null;
        var returned = presentValues.Count > 0 ? "[" + string.Join(", ", presentValues.Select(EvidenceValue.ToText)) + "]" : "no value";
        return $"declared value_used={EvidenceValue.ToText(item.ValueUsed)} was not returned by MFSSIA (returned: {returned})";
    }

    private static IEnumerable<string> FindUndeclaredUnknowns(List<DeclarationItem> declaration, List<Observation> journal)
    {
        var declaredKeys = declaration.Select(i => (i.CustodianId, i.Attribute)).ToHashSet();
        return journal
            .Where(obs => obs.State == "unknown" && !declaredKeys.Contains((obs.CustodianId, obs.Attribute)))
            .Select(obs => $"journal has unknown ({obs.Reason ?? "null"}) for {obs.CustodianId}/{obs.Attribute}; not declared");
    }
}
