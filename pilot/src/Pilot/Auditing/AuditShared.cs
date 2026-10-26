using Pilot.Models.Decisions;
using Pilot.Models.Runs;

namespace Pilot.Auditing;

/// <summary>Pieces the audit checks share.</summary>
internal static class AuditShared
{
    /// <summary>The n/a result of a check that needs a declaration, when the condition has none or there is no decision.</summary>
    public static AuditCheck NotApplicableWithoutDeclaration(string name, Condition condition) =>
        new(name, "n/a", [!condition.Declaration ? "no declaration in this condition" : "no decision"]);

    public static string GetPrescribedDrug(Decision decision) => (decision.Drug ?? "").ToLowerInvariant();

    public static string FormatSortedSet(IEnumerable<string> items) =>
        "[" + string.Join(", ", items.Distinct().Order(StringComparer.Ordinal)) + "]";
}
