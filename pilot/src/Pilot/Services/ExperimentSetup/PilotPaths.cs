using Microsoft.Extensions.Options;
using Pilot.Configuration;

namespace Pilot.Services.ExperimentSetup;

/// <summary>Location of the pilot's data, prompts and output: pilot/data, pilot/prompts, pilot/out.</summary>
public sealed class PilotPaths
{
    /// <param name="pilotDir">The pilot folder (…/pilot) holding data/ and prompts/.</param>
    public PilotPaths(string pilotDir) => PilotDir = Path.GetFullPath(pilotDir);

    public PilotPaths(IOptions<PilotOptions> options) : this(options.Value.Data.PilotDir ?? Find()) { }

    public string PilotDir { get; }
    public string DataDir => Path.Combine(PilotDir, "data");
    public string PromptsDir => Path.Combine(PilotDir, "prompts");

    /// <summary>Default output folder: pilot/out.</summary>
    public string OutDir => Path.Combine(PilotDir, "out");

    /// <summary>The first …/pilot with data/scenarios.yaml above the application or the working directory.</summary>
    public static string Find()
    {
        foreach (var start in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
        {
            for (var dir = new DirectoryInfo(start); dir != null; dir = dir.Parent)
            {
                var candidate = Path.Combine(dir.FullName, "pilot");
                if (File.Exists(Path.Combine(candidate, "data", "scenarios.yaml"))) return candidate;
            }
        }
        throw new DirectoryNotFoundException("pilot/data/scenarios.yaml not found above the working directory; set PILOT_DIR.");
    }
}
