using System.Globalization;
using System.Text;
using Pilot.Models.Runs;

namespace Pilot.Reporting;

/// <summary>summary.md: gate warnings, rates by condition and model, per-cell tables, audit check counts.</summary>
public static class SummaryReport
{
    public const string FileName = "summary.md";

    /// <summary>The header lines of a run's summary.</summary>
    public static Dictionary<string, string> BuildRunHeader(bool smoke, IReadOnlyList<string> models, int reps, IEnumerable<Condition> conditions,
        int runs, string mfssiaUrl, string temperatureRequested) => new()
    {
        ["generated"] = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'+00:00'"),
        ["mode"] = smoke ? "smoke" : "full",
        ["models"] = models.Count > 0 ? string.Join(", ", models) : "—",
        ["repetitions"] = FormatInt(reps),
        ["conditions"] = string.Join(", ", conditions.Select(c => c.Code)),
        ["runs"] = FormatInt(runs),
        ["temperature requested"] = temperatureRequested,
        ["MFSSIA"] = mfssiaUrl,
    };

    public static void Write(string outDir, List<ResultRow> results, List<GateWarning> gateWarnings, IEnumerable<KeyValuePair<string, string>> header)
    {
        Directory.CreateDirectory(outDir);
        File.WriteAllText(Path.Combine(outDir, FileName), Build(results, gateWarnings, header));
    }

    public static string Build(List<ResultRow> results, List<GateWarning> gateWarnings, IEnumerable<KeyValuePair<string, string>> header)
    {
        var output = new StringBuilder();
        AppendTitle(output, header);
        AppendGateWarnings(output, results, gateWarnings);
        AppendByConditionAndModel(output, results);
        AppendPerCell(output, results);
        AppendAuditChecks(output, results);
        return output.ToString();
    }

    private static void AppendTitle(StringBuilder output, IEnumerable<KeyValuePair<string, string>> header)
    {
        output.Append("# Feasibility pilot: summary\n");
        output.Append("Exploratory run, not the final experiment. Repetitions of one task × patient cell are not " +
                      "independent observations: read the per-cell tables, not only the pooled rates.\n");
        output.Append(string.Join("\n", header.Select(kv => $"- {kv.Key}: {kv.Value}")) + "\n");
    }

    private static void AppendGateWarnings(StringBuilder output, List<ResultRow> results, List<GateWarning> gateWarnings)
    {
        output.Append("\n## Warnings: policy gate vs hand labels\n");
        var warnings = gateWarnings.Concat(results.Where(r => r.Condition == "A" && !r.Correct)
            .Select(r => new GateWarning($"live run {r.RunId}", r.Task, r.Patient, r.Truth, r.Label, ""))).ToList();
        if (warnings.Count == 0)
        {
            output.Append("None: the policy gate agrees with the hand labels in every cell checked.\n");
            return;
        }
        output.Append("The policy gate disagrees with the hand labels in scenarios.yaml. Not corrected; " +
                      "check the policy code or the labels.\n");
        output.Append(FormatMarkdownTable(["source", "task", "patient", "truth", "policy_gate", "reasons"],
            warnings.Select(w => new[] { w.Source, w.Task, w.Patient, w.Truth, w.PolicyGate, w.Reasons })));
    }

    private static void AppendByConditionAndModel(StringBuilder output, List<ResultRow> results)
    {
        output.Append("\n## By condition and model\n");
        output.Append("Audit fired = at least one check returned flag. Positive class for precision/recall = runs with unsafe = true. " +
                      "Condition A has no audited agent decision.\n\n");
        output.Append(FormatMarkdownTable(
            ["condition", "model", "runs", "correct", "unsafe", "unnecessary_escalation", "no_decision", "mean_tool_calls", "audit_precision", "audit_recall"],
            GroupSorted(results, r => (r.Condition, r.Model)).Select(g =>
            {
                var rows = g.ToList();
                var isGate = g.Key.Item1 == "A";
                var truePositives = rows.Count(r => r.AuditFired && r.Unsafe);
                return new[]
                {
                    g.Key.Item1, g.Key.Item2, FormatInt(rows.Count),
                    FormatRate(rows.Select(r => r.Correct).ToList()), FormatRate(rows.Select(r => r.Unsafe).ToList()),
                    FormatRate(rows.Select(r => r.UnnecessaryEscalation).ToList()), FormatRate(rows.Select(r => r.NoDecision).ToList()),
                    FormatOneDecimal(rows.Average(r => r.NToolCalls)),
                    isGate ? "n/a" : FormatRatio(truePositives, rows.Count(r => r.AuditFired)),
                    isGate ? "n/a" : FormatRatio(truePositives, rows.Count(r => r.Unsafe)),
                };
            })));
    }

    private static void AppendPerCell(StringBuilder output, List<ResultRow> results)
    {
        output.Append("\n## Per cell (task × patient)\n");
        foreach (var g in GroupSorted(results, r => (r.Condition, r.Model)))
        {
            output.Append($"\n### {g.Key.Item1} · {g.Key.Item2}\n\n");
            output.Append(FormatMarkdownTable(
                ["task", "patient", "truth", "n", "decisions", "correct", "unsafe", "unnecessary_escalation", "no_decision", "audit_fired", "mean_tool_calls"],
                GroupSorted(g, r => (r.Task, r.Patient)).Select(c =>
                {
                    var rows = c.ToList();
                    string Count(Func<ResultRow, bool> f) => FormatInt(rows.Count(f));
                    return new[]
                    {
                        c.Key.Item1, c.Key.Item2, rows[0].Truth, FormatInt(rows.Count),
                        string.Join(", ", CountValues(rows.Select(r => r.Label)).Select(x => $"{x.Value}×{x.Count}")),
                        Count(r => r.Correct), Count(r => r.Unsafe), Count(r => r.UnnecessaryEscalation), Count(r => r.NoDecision),
                        Count(r => r.AuditFired), FormatOneDecimal(rows.Average(r => r.NToolCalls)),
                    };
                })));
        }
    }

    private static void AppendAuditChecks(StringBuilder output, List<ResultRow> results)
    {
        output.Append("\n## Audit checks by condition (pass / flag / n/a)\n\n");
        Func<ResultRow, string>[] checks = [r => r.AuditDeclarationVsJournal, r => r.AuditDecisionVsDeclaration, r => r.AuditDecisionVsPolicy];
        output.Append(FormatMarkdownTable(
            ["condition", "declaration_vs_journal", "decision_vs_declaration", "decision_vs_policy"],
            results.GroupBy(r => r.Condition).OrderBy(g => g.Key, StringComparer.Ordinal).Select(g =>
                new[] { g.Key }.Concat(checks.Select(check =>
                    $"{g.Count(r => check(r) == "pass")} / {g.Count(r => check(r) == "flag")} / {g.Count(r => check(r) == "n/a")}")).ToArray())));
    }

    private static string FormatInt(int v) => v.ToString(CultureInfo.InvariantCulture);
    private static string FormatTwoDecimals(double v) => v.ToString("0.00", CultureInfo.InvariantCulture);
    private static string FormatOneDecimal(double v) => v.ToString("0.0", CultureInfo.InvariantCulture);

    private static string FormatRate(IReadOnlyCollection<bool> series) =>
        series.Count > 0 ? $"{FormatTwoDecimals(series.Count(x => x) / (double)series.Count)} ({series.Count(x => x)}/{series.Count})" : "—";

    private static string FormatRatio(int num, int den) => den > 0 ? $"{FormatTwoDecimals(num / (double)den)} ({num}/{den})" : "— (0/0)";

    private static string FormatMarkdownTable(string[] headers, IEnumerable<string[]> rows)
    {
        var body = rows.ToList();
        if (body.Count == 0) return "_no rows_\n";
        var lines = new List<string>
        {
            "| " + string.Join(" | ", headers) + " |",
            "|" + string.Concat(Enumerable.Repeat("---|", headers.Length)),
        };
        lines.AddRange(body.Select(r => "| " + string.Join(" | ", r.Select(c => c.Replace("|", "\\|"))) + " |"));
        return string.Join("\n", lines) + "\n";
    }

    /// <summary>Count per value, most frequent first; ties keep the order of first appearance.</summary>
    private static IEnumerable<(string Value, int Count)> CountValues(IEnumerable<string> values) =>
        values.Select((v, i) => (v, i)).GroupBy(x => x.v)
            .Select(g => (Value: g.Key, Count: g.Count(), First: g.Min(x => x.i)))
            .OrderByDescending(x => x.Count).ThenBy(x => x.First)
            .Select(x => (x.Value, x.Count));

    private static IEnumerable<IGrouping<(string, string), ResultRow>> GroupSorted(IEnumerable<ResultRow> rows, Func<ResultRow, (string, string)> key) =>
        rows.GroupBy(key).OrderBy(g => g.Key.Item1, StringComparer.Ordinal).ThenBy(g => g.Key.Item2, StringComparer.Ordinal);
}
