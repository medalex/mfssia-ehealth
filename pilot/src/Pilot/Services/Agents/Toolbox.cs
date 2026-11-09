using Pilot.Exceptions;
using Pilot.Models.Llm;
using Pilot.Models.Mfssia;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;
using Pilot.Models.Tools;
using Pilot.Services.Mfssia;

namespace Pilot.Services.Agents;

/// <summary>The agent's information tools: list_custodians, get_policy, get_evidence.</summary>
internal sealed class Toolbox(Condition condition, PilotData data, IMfssia client, ToolArguments arguments, Patient patient, string runId, AgentResult result)
{
    public async Task<ToolOutcome> CallAsync(ToolCall call) => call.Name switch
    {
        "list_custodians" => new ToolOutcome(data.Custodians, false),
        "get_policy" => GetPolicy(call),
        "get_evidence" => await GetEvidenceAsync(call),
        _ => new ToolOutcome(new ToolError($"unknown tool {call.Name}"), true),
    };

    private ToolOutcome GetPolicy(ToolCall call)
    {
        var (args, error) = arguments.Parse<GetPolicyArgs>(call);
        if (args is null) return InvalidInput(error);
        var rule = data.FindDrugRule((args.Drug ?? "").Trim().ToLowerInvariant());
        if (rule is null)
            return new ToolOutcome(new UnknownDrugError($"no policy for drug '{args.Drug}'", data.Policy.Drugs.Keys.Order(StringComparer.Ordinal).ToList()), true);
        return new ToolOutcome(new PolicyAnswer(args.Drug!, rule.Text.Trim(), rule.ToBody(), data.Policy.General.Text.Trim(), data.Policy.AllergyClasses), false);
    }

    /// <summary>Asks MFSSIA, keeps the full answer for the audit and shows the agent what the condition's tool wrapper shows.</summary>
    private async Task<ToolOutcome> GetEvidenceAsync(ToolCall call)
    {
        var (args, error) = arguments.Parse<GetEvidenceArgs>(call);
        if (args is null) return InvalidInput(error);
        EvidenceResponse response;
        try
        {
            response = await client.GetEvidenceAsync(patient.PatientId, data.DoctorId, args.CustodianId ?? "", args.Attribute ?? "", runId);
        }
        catch (MfssiaException mfssia)
        {
            return new ToolOutcome(new ToolError(mfssia.Message), true, args.CustodianId);
        }
        result.MfssiaResponses.Add(response);
        object shown = condition.HidesEvidenceState ? EvidenceSubstitution.StateHidden(response) : EvidenceSubstitution.AsReturned(response);
        return new ToolOutcome(shown, false, args.CustodianId);
    }

    private static ToolOutcome InvalidInput(string? error) => new(new ToolError($"invalid tool input: {error}"), true);
}
