using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Pilot.Adapters;
using Pilot.Models.Llm;
using Pilot.Models.Scenario;
using Pilot.Models.Tools;
using Pilot.Reporting;
using Pilot.Services.Experiment;
using Pilot.Services.Mfssia;

namespace Pilot.Tests;

/// <summary>Runner against a fake MFSSIA and a scripted model: produces results.csv, summary.md, transcripts.</summary>
public class RunEndToEndTests
{
    private static readonly PilotData Data = TestHost.Data;

    private sealed class AlwaysPrescribeFirstCandidate : ScriptedAdapter
    {
        public AlwaysPrescribeFirstCandidate(string modelId) : base([]) => ModelId = modelId;

        public override void Start(string system, string user, IReadOnlyList<ToolSpec> tools)
        {
            var first = user.Split("preference: ")[1].Split(',')[0].Trim();
            object submit = system.Contains("declaration", StringComparison.OrdinalIgnoreCase)
                ? new { Decision = "prescribe", Drug = first, Rationale = "r", Declaration = Array.Empty<object>(), ReliedOn = Array.Empty<string>(), Missing = Array.Empty<string>() }
                : new { Decision = "prescribe", Drug = first, Rationale = "r" };
            Turns = new Queue<Turn>([Call("get_evidence", new GetEvidenceArgs("hospital-1", "allergies")), Call("submit_decision", submit)]);
        }
    }

    /// <summary>The runner as Program builds it, with a fake MFSSIA, scripted models and no console output.</summary>
    private static Runner Runner(IMfssia mfssia, Func<string, IModelAdapter> models, IReadOnlyDictionary<string, string?>? config = null) =>
        TestHost.Build(config, s =>
        {
            s.AddSingleton(mfssia);
            s.AddSingleton<IModelAdapterFactory>(new ScriptedAdapterFactory(models));
            s.AddSingleton(TextWriter.Null);
        }).GetRequiredService<Runner>();

    private static string TempDir() => Path.Combine(Path.GetTempPath(), "pilot-test-" + Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Smoke_pipeline()
    {
        var outDir = TempDir();
        var fake = new FakeMfssia(Data);
        try
        {
            var runner = Runner(fake, model => new AlwaysPrescribeFirstCandidate(model),
                new Dictionary<string, string?> { ["PILOT_MODELS"] = "claude-test-model,claude-other-model" });
            Assert.Equal(0, await runner.MainAsync(["--smoke", "--out", outDir]));

            var results = ResultsCsv.Read(Path.Combine(outDir, "results.csv"));
            Assert.Equal(8 + 8 * 4, results.Count); // A once per cell + 4 agent conditions, one model, one rep
            Assert.Equal(["claude-test-model", "policy_gate"], results.Select(r => r.Model).Distinct().Order());
            Assert.All(results.Where(r => r.Condition == "A"), r => Assert.True(r.Correct));
            var reckless = results.Where(r => r.Condition != "A" && r.Task == "diabetes" && r.Patient == "P1").ToList();
            Assert.All(reckless, r => Assert.True(r.Unsafe)); // metformin with eGFR 20
            Assert.All(reckless, r => Assert.True(r.AuditFired)); // never asked the labs -> policy check flags
            Assert.All(results, r => Assert.True(r.GateMatchesTruth));
            Assert.Equal(ResultsCsv.ColumnNames, File.ReadLines(Path.Combine(outDir, "results.csv")).First().Split(','));

            var summary = await File.ReadAllTextAsync(Path.Combine(outDir, "summary.md"));
            Assert.Contains("## By condition and model", summary);
            Assert.Contains("### C2 · claude-test-model", summary);
            var transcript = Path.Combine(outDir, "transcripts", "C3-diabetes-P1-test-model-1.jsonl");
            var kinds = (await File.ReadAllLinesAsync(transcript))
                .Select(l => JsonSerializer.Deserialize<JsonElement>(l).GetProperty("kind").GetString()).ToList();
            Assert.Equal("start", kinds[0]);
            Assert.Contains("decision", kinds);
            Assert.Equal("audit", kinds[^1]);

            Assert.Equal(0, await runner.MainAsync(["report", "--out", outDir])); // summary rebuilt from results.csv
        }
        finally
        {
            if (Directory.Exists(outDir)) Directory.Delete(outDir, recursive: true);
        }
    }

    [Fact]
    public async Task Existing_run_id_in_the_journal_stops_the_run()
    {
        var fake = new FakeMfssia(Data);
        await fake.GetEvidenceAsync(Data.GetPatient("P1").PatientId, Data.DoctorId, "hospital-1", "allergies", "A-diabetes-P1-gate-1");
        var runner = Runner(fake, _ => new ScriptedAdapter([]));
        var outDir = TempDir();
        try
        {
            Assert.Equal(1, await runner.MainAsync(["--conditions", "A", "--tasks", "diabetes", "--patients", "P1", "--out", outDir]));
        }
        finally
        {
            if (Directory.Exists(outDir)) Directory.Delete(outDir, recursive: true);
        }
    }
}
