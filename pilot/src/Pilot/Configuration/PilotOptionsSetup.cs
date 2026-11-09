using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Pilot.Configuration;

/// <summary>Fills PilotOptions from the "Pilot" configuration section and the environment variables (MFSSIA_URL, PILOT_*).</summary>
public sealed class PilotOptionsSetup(IConfiguration configuration) : IConfigureOptions<PilotOptions>
{
    public const string Section = "Pilot";

    public void Configure(PilotOptions options)
    {
        configuration.GetSection(Section).Bind(options);

        if (ReadNonEmpty("MFSSIA_URL") is { } url) options.Mfssia.Url = url;
        if (ReadNonEmpty("PILOT_MODELS") is { } models)
            options.Run.Models = models.Split(',').Select(m => m.Trim()).Where(m => m.Length > 0).ToList();
        if (ReadNonEmpty("PILOT_REPS") is { } reps) options.Run.Reps = int.Parse(reps, CultureInfo.InvariantCulture);
        if (configuration["PILOT_TEMPERATURE"] is { } temperature)
            options.Run.Temperature = temperature.Trim().ToLowerInvariant() is "" or "none" ? null : double.Parse(temperature, CultureInfo.InvariantCulture);
        if (ReadNonEmpty("PILOT_EFFORT") is { } effort) options.Anthropic.Effort = effort;
        if (ReadNonEmpty("PILOT_OPENAI_BASE_URL") is { } baseUrl) options.OpenAi.BaseUrl = baseUrl;
        if (ReadNonEmpty("PILOT_OPENAI_API_KEY") is { } key) options.OpenAi.ApiKey = key;
        if (ReadNonEmpty("PILOT_DIR") is { } dir) options.Data.PilotDir = dir;
    }

    private string? ReadNonEmpty(string key) => configuration[key] is { Length: > 0 } v ? v : null;
}
