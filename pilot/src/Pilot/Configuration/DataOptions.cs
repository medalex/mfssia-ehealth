namespace Pilot.Configuration;

/// <summary>Section Pilot:Data: where the pilot's data and prompts are.</summary>
public sealed class DataOptions
{
    /// <summary>PILOT_DIR: the pilot folder with data/ and prompts/; found by walking up when null.</summary>
    public string? PilotDir { get; set; }
}
