using System.Globalization;
using System.Text;

namespace Pilot.Reporting;

/// <summary>results.csv: one ResultRow per line.</summary>
public static class ResultsCsv
{
    public const string FileName = "results.csv";

    private static string FormatBool(bool value) => value ? "True" : "False";
    private static bool ParseBool(string s) => s.Trim().ToLowerInvariant() is "true" or "1";
    private static int ParseInt(string s) => int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : 0;
    private static string FormatInt(int v) => v.ToString(CultureInfo.InvariantCulture);

    /// <summary>The columns in order, with how each is written and read.</summary>
    private static readonly (string Name, Func<ResultRow, string> Get, Action<ResultRow, string> Set)[] Columns =
    [
        ("task", r => r.Task, (r, v) => r.Task = v),
        ("patient", r => r.Patient, (r, v) => r.Patient = v),
        ("condition", r => r.Condition, (r, v) => r.Condition = v),
        ("model", r => r.Model, (r, v) => r.Model = v),
        ("rep", r => FormatInt(r.Rep), (r, v) => r.Rep = ParseInt(v)),
        ("runId", r => r.RunId, (r, v) => r.RunId = v),
        ("decision", r => r.Decision, (r, v) => r.Decision = v),
        ("drug", r => r.Drug, (r, v) => r.Drug = v),
        ("truth", r => r.Truth, (r, v) => r.Truth = v),
        ("correct", r => FormatBool(r.Correct), (r, v) => r.Correct = ParseBool(v)),
        ("unsafe", r => FormatBool(r.Unsafe), (r, v) => r.Unsafe = ParseBool(v)),
        ("unnecessary_escalation", r => FormatBool(r.UnnecessaryEscalation), (r, v) => r.UnnecessaryEscalation = ParseBool(v)),
        ("no_decision", r => FormatBool(r.NoDecision), (r, v) => r.NoDecision = ParseBool(v)),
        ("end_reason", r => r.EndReason, (r, v) => r.EndReason = v),
        ("steps", r => FormatInt(r.Steps), (r, v) => r.Steps = ParseInt(v)),
        ("n_tool_calls", r => FormatInt(r.NToolCalls), (r, v) => r.NToolCalls = ParseInt(v)),
        ("n_evidence_calls", r => FormatInt(r.NEvidenceCalls), (r, v) => r.NEvidenceCalls = ParseInt(v)),
        ("custodians_queried", r => r.CustodiansQueried, (r, v) => r.CustodiansQueried = v),
        ("audit_declaration_vs_journal", r => r.AuditDeclarationVsJournal, (r, v) => r.AuditDeclarationVsJournal = v),
        ("audit_decision_vs_declaration", r => r.AuditDecisionVsDeclaration, (r, v) => r.AuditDecisionVsDeclaration = v),
        ("audit_decision_vs_policy", r => r.AuditDecisionVsPolicy, (r, v) => r.AuditDecisionVsPolicy = v),
        ("audit_fired", r => FormatBool(r.AuditFired), (r, v) => r.AuditFired = ParseBool(v)),
        ("audit_reasons", r => r.AuditReasons, (r, v) => r.AuditReasons = v),
        ("gate_matches_truth", r => r.GateMatchesTruth is { } g ? FormatBool(g) : "", (r, v) => r.GateMatchesTruth = v == "" ? null : ParseBool(v)),
        ("temperature", r => r.Temperature, (r, v) => r.Temperature = v),
        ("effort", r => r.Effort, (r, v) => r.Effort = v),
        ("base_url", r => r.BaseUrl, (r, v) => r.BaseUrl = v),
        ("provider", r => r.Provider, (r, v) => r.Provider = v),
    ];

    public static IReadOnlyList<string> ColumnNames => Columns.Select(c => c.Name).ToList();

    public static void Write(IEnumerable<ResultRow> rows, string outDir)
    {
        Directory.CreateDirectory(outDir);
        var sb = new StringBuilder();
        sb.Append(string.Join(",", Columns.Select(c => Quote(c.Name)))).Append('\n');
        foreach (var row in rows) sb.Append(string.Join(",", Columns.Select(c => Quote(c.Get(row))))).Append('\n');
        File.WriteAllText(Path.Combine(outDir, FileName), sb.ToString());
    }

    public static List<ResultRow> Read(string path)
    {
        var records = ParseRecords(File.ReadAllText(path));
        if (records.Count == 0) return [];
        var index = records[0].Select((name, i) => (name, i)).ToDictionary(x => x.name, x => x.i);
        var rows = new List<ResultRow>();
        foreach (var record in records.Skip(1).Where(r => r.Any(f => f != "")))
        {
            var row = new ResultRow();
            foreach (var (name, _, set) in Columns)
                if (index.TryGetValue(name, out var i)) set(row, i < record.Count ? record[i] : "");
            rows.Add(row);
        }
        return rows;
    }

    private static string Quote(string s) =>
        s.IndexOfAny([',', '"', '\n', '\r']) >= 0 ? "\"" + s.Replace("\"", "\"\"") + "\"" : s;

    /// <summary>RFC 4180 records: quoted fields may hold commas, quotes ("") and line breaks.</summary>
    private static List<List<string>> ParseRecords(string text)
    {
        var records = new List<List<string>>();
        var record = new List<string>();
        var field = new StringBuilder();
        var quoted = false;
        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (quoted)
            {
                if (c == '"' && i + 1 < text.Length && text[i + 1] == '"') { field.Append('"'); i++; }
                else if (c == '"') quoted = false;
                else field.Append(c);
            }
            else if (c == '"') quoted = true;
            else if (c == ',') { record.Add(field.ToString()); field.Clear(); }
            else if (c is '\n' or '\r')
            {
                if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                record.Add(field.ToString());
                field.Clear();
                records.Add(record);
                record = [];
            }
            else field.Append(c);
        }
        if (field.Length > 0 || record.Count > 0) { record.Add(field.ToString()); records.Add(record); }
        return records;
    }
}
