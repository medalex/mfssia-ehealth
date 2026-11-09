using Pilot.Exceptions;

namespace Pilot.Services.Experiment;

/// <summary>The command-line options of a run: --smoke, --conditions, --tasks, --patients, --models, --reps, --tag, --out.</summary>
public sealed class RunArguments
{
    public bool Smoke { get; set; }
    public string Conditions { get; set; } = "A,B,C1,C2,C3";
    public string? Tasks { get; set; }
    public string? Patients { get; set; }
    public string? Models { get; set; }
    public int? Reps { get; set; }
    public string? Tag { get; set; }
    /// <summary>Output folder; null = PilotPaths.OutDir.</summary>
    public string? Out { get; set; }

    public static RunArguments Parse(IReadOnlyList<string> args)
    {
        var parsed = new RunArguments();
        for (var i = 0; i < args.Count; i++)
        {
            string Next() => i + 1 < args.Count ? args[++i] : throw new PilotExitException($"{args[i]} expects a value");
            switch (args[i])
            {
                case "--smoke": parsed.Smoke = true; break;
                case "--conditions": parsed.Conditions = Next(); break;
                case "--tasks": parsed.Tasks = Next(); break;
                case "--patients": parsed.Patients = Next(); break;
                case "--models": parsed.Models = Next(); break;
                case "--reps":
                    parsed.Reps = int.TryParse(Next(), out var reps) ? reps : throw new PilotExitException("--reps expects an integer");
                    break;
                case "--tag": parsed.Tag = Next(); break;
                case "--out": parsed.Out = Next(); break;
                default: throw new PilotExitException($"unknown argument {args[i]}");
            }
        }
        return parsed;
    }
}
