using System.Globalization;
using System.Text.RegularExpressions;

namespace Pilot.Models.Runs;

/// <summary>
/// Which run: condition, task, patient, model and repetition. Its runId names the run in the MFSSIA journal,
/// the transcript file and results.csv. Vary one field with <c>with</c>, e.g. <c>cell with { Rep = 2 }</c>.
/// </summary>
public sealed record RunKey
{
    /// <summary>The Model of a condition-A run (no model; the policy gate decides).</summary>
    public const string PolicyGateModel = "policy_gate";

    /// <summary>MFSSIA accepts only runIds of this form (audit-log.service.ts, check-access.dto.ts).</summary>
    public static readonly Regex Pattern = new(@"^[A-Za-z0-9_-]{1,64}$");

    public required string Condition { get; init; }
    public required string Task { get; init; }
    public required string Patient { get; init; }
    /// <summary>A model id from PILOT_MODELS, or PolicyGateModel.</summary>
    public required string Model { get; init; }
    public required int Rep { get; init; }
    /// <summary>Suffix that keeps runIds unique when runs already in the journal are repeated (--tag).</summary>
    public string? Tag { get; init; }

    /// <summary>e.g. C2-diabetes-P1-opus-5-5-3: the "claude-" prefix is dropped, the policy gate is "gate".</summary>
    public string ToRunId()
    {
        var model = Model == PolicyGateModel ? "gate" : Model.StartsWith("claude-") ? Model["claude-".Length..] : Model;
        var parts = new List<string> { Condition, Task, Patient, model, Rep.ToString(CultureInfo.InvariantCulture) };
        if (!string.IsNullOrEmpty(Tag)) parts.Add(Tag);
        return Sanitize(string.Join("-", parts));
    }

    /// <summary>The runId of a preflight, e.g. preflight-20261022T084356; its queries stay out of the runs' journal.</summary>
    public static string PreflightRunId(DateTime utc) => Sanitize($"preflight-{utc:yyyyMMdd'T'HHmmss}");

    /// <summary>Maps any string onto Pattern: other characters become "-", repeated "-" merge, at most 64 characters.</summary>
    private static string Sanitize(string value)
    {
        var cleaned = Regex.Replace(value, @"[^A-Za-z0-9_-]+", "-").Trim('-');
        cleaned = Regex.Replace(cleaned, "-{2,}", "-");
        cleaned = cleaned[..Math.Min(64, cleaned.Length)].TrimEnd('-');
        if (cleaned.Length == 0) throw new ArgumentException($"runId is empty after sanitization: '{value}'");
        return cleaned;
    }
}
