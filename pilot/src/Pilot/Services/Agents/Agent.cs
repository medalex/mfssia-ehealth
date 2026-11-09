using System.Text.Json;
using Pilot.Adapters;
using Pilot.Exceptions;
using Pilot.Models.Decisions;
using Pilot.Models.Llm;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;
using Pilot.Models.Tools;
using Pilot.Reporting;
using Pilot.Services.ExperimentSetup;
using Pilot.Services.Mfssia;

namespace Pilot.Services.Agents;

/// <summary>Agent conditions B, C1, C2, C3: tool loop around a model adapter.</summary>
public sealed class Agent(
    PilotData data,
    IMfssia client,
    Prompts prompts,
    YamlLoader yaml,
    ToolArguments arguments,
    DecisionValidator validator,
    JsonSerializerOptions json)
{
    public const int MaxSteps = 12;

    public List<ToolSpec> BuildToolSpecs(Condition condition)
    {
        var defs = yaml.Parse<Dictionary<string, ToolDefinition>>(prompts.Read("tools.yaml"));
        var specs = new List<ToolSpec>();
        foreach (var (name, body) in defs)
        {
            var schema = body.InputSchema;
            if (name == "submit_decision" && condition.Declaration)
            {
                foreach (var (prop, value) in body.DeclarationProperties ?? []) schema.Properties[prop] = value;
                schema.Required = [.. schema.Required ?? [], "declaration", "relied_on", "missing"];
            }
            specs.Add(new ToolSpec(name, body.Description.Trim(), JsonSerializer.SerializeToElement(schema, json)));
        }
        return specs;
    }

    public string BuildSystemPrompt(Condition condition) =>
        prompts.Read("system.txt") + (condition.Declaration ? prompts.Read("declaration.txt") : "");

    public string BuildUserPrompt(PilotTask task, Patient patient) =>
        prompts.Read("user.txt")
            .Replace("{patient_label}", patient.Label)
            .Replace("{task_description}", task.Description)
            .Replace("{candidates}", string.Join(", ", task.Candidates));

    public async Task<AgentResult> RunAsync(Condition condition, PilotTask task, Patient patient, IModelAdapter adapter,
        string runId, Transcript transcript)
    {
        var result = new AgentResult();
        var toolbox = new Toolbox(condition, data, client, arguments, patient, runId, result);
        var (system, user, tools) = (BuildSystemPrompt(condition), BuildUserPrompt(task, patient), BuildToolSpecs(condition));
        transcript.Write("start", new
        {
            RunId = runId, Condition = condition.Code, Task = task.Id, Patient = patient.Label, Model = adapter.ModelId,
            System = system, User = user, Tools = tools,
        });
        adapter.Start(system, user, tools);

        while (result.Steps < MaxSteps)
        {
            Turn turn;
            try
            {
                turn = await adapter.StepAsync();
            }
            catch (ModelApiException error)
            {
                result.EndReason = "api_error";
                transcript.Write("harness", new { Step = result.Steps + 1, Note = $"model API error: {error.Message}" });
                break;
            }
            result.Steps++;
            transcript.Write("assistant", new
            {
                Step = result.Steps, turn.StopReason, turn.Text, turn.ToolCalls, Raw = turn.Raw ?? JsonSerializer.SerializeToElement(new { }, json),
            });
            if (turn.StopReason == "refusal")
            {
                result.EndReason = "refusal";
                break;
            }
            if (turn.ToolCalls.Count == 0)
            {
                adapter.AddUserText(prompts.Read("nudge.txt").Trim());
                transcript.Write("harness", new { Step = result.Steps, Note = "no tool call; reminded to call submit_decision" });
                continue;
            }

            var (toolResults, submitted) = await ExecuteToolCallsAsync(turn, condition, toolbox, result, transcript);
            if (submitted is not null)
            {
                result.Decision = submitted;
                result.EndReason = "submitted";
                break;
            }
            adapter.AddToolResults(toolResults);
        }

        if (result.Decision is null && result.EndReason == "") result.EndReason = "step_limit";
        transcript.Write("decision", new { result.EndReason, result.Steps, result.Decision });
        return result;
    }

    /// <returns>The results for the model, in call order, and the first accepted decision of the turn.</returns>
    private async Task<(List<(string CallId, string Content, bool IsError)> Results, Decision? Submitted)> ExecuteToolCallsAsync(
        Turn turn, Condition condition, Toolbox toolbox, AgentResult result, Transcript transcript)
    {
        var toolResults = new List<(string, string, bool)>();
        Decision? submitted = null;
        foreach (var call in turn.ToolCalls)
        {
            var outcome = await ExecuteToolCallAsync(call, condition, toolbox, alreadySubmitted: submitted is not null);
            submitted ??= outcome.Decision;
            var record = new ToolCallRecord(result.Steps, call.Id, call.Name, call.Input,
                JsonSerializer.SerializeToElement(outcome.Output, outcome.Output.GetType(), json), outcome.IsError,
                call.Name == "get_evidence" && !outcome.IsError ? result.MfssiaResponses[^1] : null, outcome.CustodianId);
            result.ToolCalls.Add(record);
            transcript.Write("tool", record);
            toolResults.Add((call.Id, JsonSerializer.Serialize(outcome.Output, outcome.Output.GetType(), json), outcome.IsError));
        }
        return (toolResults, submitted);
    }

    private async Task<ToolOutcome> ExecuteToolCallAsync(ToolCall call, Condition condition, Toolbox toolbox, bool alreadySubmitted)
    {
        if (call.MalformedArguments is not null)
            return new ToolOutcome(new ToolError($"invalid tool input: malformed JSON arguments: {call.MalformedArguments}"), true);
        if (call.Name != "submit_decision") return await toolbox.CallAsync(call);
        if (alreadySubmitted) return new ToolOutcome(new ToolError("submit_decision was already called in this step"), true);
        return SubmitDecision(call, condition);
    }

    private ToolOutcome SubmitDecision(ToolCall call, Condition condition)
    {
        Decision decision;
        try
        {
            decision = validator.Validate(call);
        }
        catch (DecisionValidationException error)
        {
            return RejectDecision(error.Message);
        }
        if (condition.Declaration && (decision.Declaration is null || decision.ReliedOn is null || decision.Missing is null))
            return RejectDecision("declaration, relied_on and missing are required");
        return new ToolOutcome(new SubmitAccepted(), false, Decision: decision);
    }

    private static ToolOutcome RejectDecision(string message) => new(new ToolError($"invalid submit_decision: {message}"), true);
}
