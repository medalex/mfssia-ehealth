using System.Globalization;
using Microsoft.Extensions.Options;
using Pilot.Adapters;
using Pilot.Auditing;
using Pilot.Configuration;
using Pilot.Exceptions;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;
using Pilot.Reporting;
using Pilot.Services.Agents;
using Pilot.Services.ExperimentSetup;
using Pilot.Services.Gate;
using Pilot.Services.Mfssia;

namespace Pilot.Services.Experiment;

/// <summary>
/// Feasibility pilot runner.
///   dotnet run --project src/Pilot -- --smoke      one repetition, first model in PILOT_MODELS
///   dotnet run --project src/Pilot --              full matrix
///   dotnet run --project src/Pilot -- report       rebuild summary.md from results.csv
/// Settings come from PilotOptions (environment variables MFSSIA_URL, PILOT_MODELS, PILOT_REPS, PILOT_TEMPERATURE,
/// PILOT_EFFORT, PILOT_OPENAI_*, PILOT_DIR, or the "Pilot" section of appsettings.json); --models and --reps override them.
/// Runs are strictly sequential so that the order of events in the MFSSIA journal is unambiguous.
/// </summary>
public sealed class Runner(
    PilotData data,
    IMfssia client,
    IModelAdapterFactory adapterFactory,
    Agent agent,
    PolicyGate gate,
    Preflight preflight,
    ITranscriptFactory transcripts,
    PilotPaths paths,
    IOptions<PilotOptions> options,
    TextWriter stdout)
{
    public async Task<int> MainAsync(IReadOnlyList<string> args)
    {
        try
        {
            if (args.Count > 0 && args[0] == "report") return RegenerateSummary(args.Skip(1).ToList());
            await RunAsync(RunArguments.Parse(args));
            return 0;
        }
        catch (PilotExitException exit)
        {
            Console.Error.WriteLine(exit.Message);
            return 1;
        }
    }

    private int RegenerateSummary(List<string> args)
    {
        var outDir = args.Count >= 2 && args[0] == "--out" ? args[1] : paths.OutDir;
        var results = ResultsCsv.Read(Path.Combine(outDir, ResultsCsv.FileName));
        var header = new Dictionary<string, string> { ["regenerated from"] = "results.csv (gate warnings not re-evaluated)" };
        SummaryReport.Write(outDir, results, [], header);
        stdout.WriteLine($"wrote {Path.Combine(outDir, SummaryReport.FileName)}");
        return 0;
    }

    public async Task RunAsync(RunArguments args)
    {
        var outDir = args.Out ?? paths.OutDir;
        var conditions = ResolveConditions(args.Conditions);
        var tasks = args.Tasks is null ? data.Tasks : args.Tasks.Split(',').Select(data.GetTask).ToList();
        var patients = args.Patients is null ? data.Patients : args.Patients.Split(',').Select(data.GetPatient).ToList();
        var reps = args.Smoke ? 1 : args.Reps ?? options.Value.Run.Reps;
        var models = ResolveModels(args.Models);
        if (args.Smoke) models = models.Take(1).ToList();
        if (conditions.Any(c => c.Agent) && models.Count == 0)
            throw new PilotExitException("PILOT_MODELS is empty; set it (comma-separated model ids) or run --conditions A only.");

        var gateWarnings = OfflineGateCheck.FindWarnings(data);
        foreach (var w in gateWarnings)
            stdout.WriteLine($"WARNING policy gate vs labels: {w.Task} {w.Patient}: truth={w.Truth} gate={w.PolicyGate}");

        await preflight.RunAsync();

        var plan = BuildPlan(conditions, tasks, patients, models, reps, args.Tag);
        stdout.WriteLine($"{plan.Count} runs planned ({plan.Count(p => Condition.All[p.Condition].Agent)} agent runs)");

        var (rows, stopReason) = await ExecutePlanAsync(plan, outDir);

        ResultsCsv.Write(rows, outDir);
        SummaryReport.Write(outDir, rows, gateWarnings, SummaryReport.BuildRunHeader(args.Smoke, models, reps, conditions, rows.Count, client.BaseUrl,
            options.Value.Run.Temperature?.ToString(CultureInfo.InvariantCulture) ?? "none"));
        stdout.WriteLine($"wrote {Path.Combine(outDir, ResultsCsv.FileName)}, {Path.Combine(outDir, SummaryReport.FileName)}, transcripts in {Path.Combine(outDir, "transcripts")}");
        if (stopReason is not null)
            throw new PilotExitException($"{stopReason}\nThe results above cover the finished runs only; rerun the plan with a new --tag.");
    }

    private static List<Condition> ResolveConditions(string codes) =>
        codes.Split(',').Select(c => Condition.All.TryGetValue(c.Trim(), out var condition)
            ? condition : throw new PilotExitException($"unknown condition {c.Trim()}")).ToList();

    /// <summary>The models of this run: --models if given, else PilotOptions.Run.Models. Aliases such as "latest" are refused.</summary>
    public List<string> ResolveModels(string? cliModels)
    {
        var models = cliModels is null
            ? options.Value.Run.Models
            : cliModels.Split(',').Select(m => m.Trim()).Where(m => m.Length > 0).ToList();
        foreach (var model in models)
            if (model.Contains("latest")) throw new PilotExitException($"Model id '{model}' looks like an alias; use a pinned model id.");
        return models;
    }

    /// <summary>One run per condition × task × patient × model × repetition; condition A runs once per cell, without a model.</summary>
    private static List<RunKey> BuildPlan(List<Condition> conditions, List<PilotTask> tasks, List<Patient> patients,
        List<string> models, int reps, string? tag)
    {
        var plan = new List<RunKey>();
        foreach (var condition in conditions)
            foreach (var task in tasks)
                foreach (var patient in patients)
                {
                    if (!condition.Agent)
                    {
                        plan.Add(new RunKey { Condition = condition.Code, Task = task.Id, Patient = patient.Label, Model = RunKey.PolicyGateModel, Rep = 1, Tag = tag });
                        continue;
                    }
                    foreach (var model in models)
                    {
                        var cell = new RunKey { Condition = condition.Code, Task = task.Id, Patient = patient.Label, Model = model, Rep = 1, Tag = tag };
                        for (var rep = 1; rep <= reps; rep++)
                            plan.Add(cell with { Rep = rep });
                    }
                }
        return plan.OrderBy(p => Condition.All[p.Condition].Agent).ToList(); // A first, so every agent row can say whether A matched the labels
    }

    /// <returns>The rows of the finished runs, and why the plan stopped early (null when every run finished).</returns>
    private async Task<(List<ResultRow> Rows, string? StopReason)> ExecutePlanAsync(List<RunKey> plan, string outDir)
    {
        var rows = new List<ResultRow>();
        var gateCorrect = new Dictionary<(string, string), bool>();
        var adapters = new Dictionary<string, IModelAdapter>();
        for (var index = 1; index <= plan.Count; index++)
        {
            ResultRow row;
            try
            {
                row = await ExecuteRunAsync(plan[index - 1], outDir, gateCorrect, adapters);
            }
            catch (ModelQuotaExceededException quota)
            {
                return (rows, $"stopped at run {index}/{plan.Count} ({plan[index - 1].ToRunId()}): {quota.Message}");
            }
            rows.Add(row);
            ResultsCsv.Write(rows, outDir);
            stdout.WriteLine($"[{index}/{plan.Count}] {row.RunId}: {(row.NoDecision ? "no_decision" : row.Decision)} {row.Drug} " +
                           $"(truth {row.Truth}) audit={(row.AuditFired ? "flag" : "ok")}");
        }
        return (rows, null);
    }

    /// <param name="gateCorrect">Whether the policy gate matched the label, per (task, patient); filled by the A runs, read by the agent runs.</param>
    /// <param name="adapters">One adapter per model, reused across its runs.</param>
    private async Task<ResultRow> ExecuteRunAsync(RunKey key, string outDir, Dictionary<(string, string), bool> gateCorrect,
        Dictionary<string, IModelAdapter> adapters)
    {
        var (condition, task, patient) = (Condition.All[key.Condition], data.GetTask(key.Task), data.GetPatient(key.Patient));
        var runId = key.ToRunId();
        if ((await client.GetAuditEventsAsync(runId)).Count > 0)
            throw new PilotExitException($"runId {runId} already has events in the MFSSIA journal; rerun with --tag <suffix>.");
        var transcript = transcripts.CreateForRun(outDir, runId);

        var (outcome, settings) = await DecideAsync(condition, task, patient, key.Model, runId, transcript, adapters);

        var events = await client.GetAuditEventsAsync(runId);
        var checks = Auditor.Run(condition, task.Id, outcome.Decision, events, outcome.MfssiaResponses, data);
        transcript.Write("audit", new { Events = events, Checks = checks });
        var gateMatches = gateCorrect.TryGetValue((task.Id, patient.Label), out var matches) ? matches : (bool?)null;
        var row = ResultRow.From(condition, task, patient, key.Model, key.Rep, runId, outcome, checks, gateMatches, settings);
        if (!condition.Agent) gateCorrect[(task.Id, patient.Label)] = row.Correct;
        return row;
    }

    /// <returns>The outcome, and the settings the model adapter actually sent (empty for the policy gate).</returns>
    private async Task<(RunOutcome Outcome, IReadOnlyDictionary<string, string> Settings)> DecideAsync(Condition condition, PilotTask task,
        Patient patient, string model, string runId, Transcript transcript, Dictionary<string, IModelAdapter> adapters)
    {
        if (!condition.Agent)
            return (RunOutcome.Of(await gate.RunAsync(task, patient, runId, transcript)), new Dictionary<string, string>());
        // One adapter per model: Start() resets the conversation, settings (e.g. a rejected temperature) persist.
        if (!adapters.TryGetValue(model, out var adapter)) adapters[model] = adapter = adapterFactory.Create(model);
        var outcome = RunOutcome.Of(await agent.RunAsync(condition, task, patient, adapter, runId, transcript));
        return (outcome, adapter.Settings);
    }
}
