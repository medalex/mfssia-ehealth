namespace Pilot.Configuration;

/// <summary>Section Pilot:OpenAi: OpenAI-compatible APIs ("oai:" models).</summary>
public sealed class OpenAiOptions
{
    /// <summary>PILOT_OPENAI_BASE_URL: required for "oai:" models.</summary>
    public string? BaseUrl { get; set; }

    /// <summary>PILOT_OPENAI_API_KEY; keep it in the environment, not in appsettings.json.</summary>
    public string ApiKey { get; set; } = "none";
}
