namespace Pilot.Configuration;

/// <summary>
/// Settings of the pilot. Read from the "Pilot" section of appsettings.json, then from the environment
/// variables (MFSSIA_URL, PILOT_MODELS, ...), which win; see PilotOptionsSetup.
/// Command-line options (--models, --reps) override these for one run.
/// </summary>
public sealed class PilotOptions
{
    /// <summary>Pilot:Mfssia: where MFSSIA is.</summary>
    public MfssiaOptions Mfssia { get; set; } = new();

    /// <summary>Pilot:Run: models, repetitions, temperature.</summary>
    public RunOptions Run { get; set; } = new();

    /// <summary>Pilot:Anthropic: settings of Claude models.</summary>
    public AnthropicOptions Anthropic { get; set; } = new();

    /// <summary>Pilot:OpenAi: settings of OpenAI-compatible APIs.</summary>
    public OpenAiOptions OpenAi { get; set; } = new();

    /// <summary>Pilot:Data: where the data and prompts are.</summary>
    public DataOptions Data { get; set; } = new();
}
