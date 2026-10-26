using Pilot.Models.Decisions;
using Pilot.Models.Mfssia;

namespace Pilot.Models.Runs;

/// <summary>What one run produced, whether the agent or the policy gate made the decision.</summary>
public sealed record RunOutcome(
    Decision? Decision,
    List<EvidenceResponse> MfssiaResponses,
    int NToolCalls,
    int NEvidenceCalls,
    List<string> CustodiansQueried,
    int Steps,
    string EndReason)
{
    public static RunOutcome Of(AgentResult result) => new(
        result.Decision, result.MfssiaResponses, result.ToolCalls.Count, result.ToolCalls.Count(c => c.Name == "get_evidence"),
        result.CustodiansQueried, result.Steps, result.EndReason);

    public static RunOutcome Of(GateResult gate) => new(
        new Decision { Kind = gate.Verdict.Decision, Drug = gate.Verdict.Drug, Rationale = string.Join("; ", gate.Verdict.Reasons) },
        gate.MfssiaResponses, gate.Queries.Count, gate.Queries.Count,
        gate.Queries.Select(q => q.Custodian).Distinct().Order(StringComparer.Ordinal).ToList(), 0, "policy_gate");
}
