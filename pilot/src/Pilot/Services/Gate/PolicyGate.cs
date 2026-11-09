using Pilot.Evaluation;
using Pilot.Models.Policy;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;
using Pilot.Models.Tools;
using Pilot.Reporting;
using Pilot.Services.Mfssia;

namespace Pilot.Services.Gate;

/// <summary>
/// Condition A: deterministic workflow with a policy gate, no LLM. For the task it asks every registry
/// custodian that holds an attribute required by any candidate drug, sees the full MFSSIA answers,
/// and applies PolicyEvaluator.Evaluate.
/// </summary>
public sealed class PolicyGate(PilotData data, IMfssia client)
{
    public List<(string Custodian, string Attribute)> PlanQueries(PilotTask task) =>
        GetRequiredAttributes(task)
            .SelectMany(attribute => data.GetCustodiansHolding(attribute).Select(c => (c.Id, attribute)))
            .ToList();

    /// <summary>The attributes required by any candidate drug of the task, each once, in policy order.</summary>
    private List<string> GetRequiredAttributes(PilotTask task)
    {
        var attrs = new List<string>();
        foreach (var drug in task.Candidates)
            foreach (var attribute in data.FindDrugRule(drug)!.Requires)
                if (!attrs.Contains(attribute)) attrs.Add(attribute);
        return attrs;
    }

    public async Task<GateResult> RunAsync(PilotTask task, Patient patient, string runId, Transcript transcript)
    {
        transcript.Write("start", new { RunId = runId, Condition = "A", Task = task.Id, Patient = patient.Label, Model = "policy_gate" });
        var result = new GateResult();
        foreach (var (custodianId, attribute) in PlanQueries(task))
        {
            var response = await client.GetEvidenceAsync(patient.PatientId, data.DoctorId, custodianId, attribute, runId);
            result.Queries.Add((custodianId, attribute));
            result.MfssiaResponses.Add(response);
            transcript.Write("tool", new { Name = "get_evidence", Input = new GetEvidenceArgs(custodianId, attribute), Output = response });
        }
        result.Verdict = PolicyEvaluator.Evaluate(task.Id, result.MfssiaResponses.Select(Observation.From), data);
        transcript.Write("decision", new { EndReason = "policy_gate", Decision = result.Verdict });
        return result;
    }
}
