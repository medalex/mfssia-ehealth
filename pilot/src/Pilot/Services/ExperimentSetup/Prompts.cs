namespace Pilot.Services.ExperimentSetup;

/// <summary>The prompt files in pilot/prompts.</summary>
public sealed class Prompts(PilotPaths paths)
{
    public string Read(string name) => File.ReadAllText(Path.Combine(paths.PromptsDir, name));
}
