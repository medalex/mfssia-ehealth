using Pilot.Models.Runs;
using Pilot.Models.Scenario;

namespace Pilot.Reporting;

/// <summary>One row of results.csv: a run, its score and its audit.</summary>
public sealed class ResultRow
{
    public string Task { get; set; } = "";
    public string Patient { get; set; } = "";
    public string Condition { get; set; } = "";
    public string Model { get; set; } = "";
    public int Rep { get; set; }
    public string RunId { get; set; } = "";
    public string Decision { get; set; } = "";
    public string Drug { get; set; } = "";
    public string Truth { get; set; } = "";
    public bool Correct { get; set; }
    public bool Unsafe { get; set; }
    public bool UnnecessaryEscalation { get; set; }
    public bool NoDecision { get; set; }
    public string EndReason { get; set; } = "";
    public int Steps { get; set; }
    public int NToolCalls { get; set; }
    public int NEvidenceCalls { get; set; }
    public string CustodiansQueried { get; set; } = "";
    public string AuditDeclarationVsJournal { get; set; } = "";
    public string AuditDecisionVsDeclaration { get; set; } = "";
    public string AuditDecisionVsPolicy { get; set; } = "";
    public bool AuditFired { get; set; }
    public string AuditReasons { get; set; } = "";
    /// <summary>Whether the policy gate (A) matched the hand label in this cell; null when A was not run.</summary>
    public bool? GateMatchesTruth { get; set; }
    public string Temperature { get; set; } = "";
    public string Effort { get; set; } = "";
    public string BaseUrl { get; set; } = "";
    public string Provider { get; set; } = "";

    public string Label => NoDecision ? "no_decision" : Decision == "prescribe" ? Drug : "escalate";

    /// <param name="gateMatchesTruth">For an agent run, whether the gate run of the same cell matched the label; a gate run uses its own result.</param>
    /// <param name="settings">What the model adapter actually sent (empty for the policy gate).</param>
    public static ResultRow From(Condition condition, PilotTask task, Patient patient, string model, int rep, string runId,
        RunOutcome outcome, IReadOnlyList<AuditCheck> checks, bool? gateMatchesTruth, IReadOnlyDictionary<string, string> settings)
    {
        var decision = outcome.Decision;
        var score = Score.Of(decision?.Kind, decision?.Drug, patient, task.Id);
        string StatusOf(string check) => checks.Single(c => c.Name == check).Status;
        return new ResultRow
        {
            Task = task.Id, Patient = patient.Label, Condition = condition.Code, Model = model, Rep = rep, RunId = runId,
            Decision = decision?.Kind ?? "", Drug = decision?.Drug ?? "",
            Truth = score.Truth, Correct = score.Correct, Unsafe = score.Unsafe,
            UnnecessaryEscalation = score.UnnecessaryEscalation, NoDecision = score.NoDecision,
            EndReason = outcome.EndReason, Steps = outcome.Steps, NToolCalls = outcome.NToolCalls, NEvidenceCalls = outcome.NEvidenceCalls,
            CustodiansQueried = string.Join(";", outcome.CustodiansQueried),
            AuditDeclarationVsJournal = StatusOf("declaration_vs_journal"),
            AuditDecisionVsDeclaration = StatusOf("decision_vs_declaration"),
            AuditDecisionVsPolicy = StatusOf("decision_vs_policy"),
            AuditFired = checks.Any(c => c.Status == "flag"),
            AuditReasons = string.Join(" | ", checks.Where(c => c.Status == "flag").Select(c => $"{c.Name}: {string.Join("; ", c.Reasons)}")),
            GateMatchesTruth = condition.Agent ? gateMatchesTruth : score.Correct,
            Temperature = settings.GetValueOrDefault("temperature", ""),
            Effort = settings.GetValueOrDefault("effort", ""),
            BaseUrl = settings.GetValueOrDefault("base_url", ""),
            Provider = settings.GetValueOrDefault("provider", ""),
        };
    }
}
