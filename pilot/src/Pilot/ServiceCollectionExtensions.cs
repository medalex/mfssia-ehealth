using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Pilot.Adapters;
using Pilot.Configuration;
using Pilot.Models.Scenario;
using Pilot.Reporting;
using Pilot.Services.Agents;
using Pilot.Services.Experiment;
using Pilot.Services.ExperimentSetup;
using Pilot.Services.Gate;
using Pilot.Services.Mfssia;

namespace Pilot;

public static class ServiceCollectionExtensions
{
    /// <summary>Registers the whole pilot. Program and the tests use the same registrations.</summary>
    public static IServiceCollection AddPilot(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<PilotOptions>();
        services.AddSingleton<IConfigureOptions<PilotOptions>>(new PilotOptionsSetup(configuration));

        services.AddSingleton(CreateJsonOptions());
        services.AddSingleton(sp => new PilotPaths(sp.GetRequiredService<IOptions<PilotOptions>>()));
        services.AddSingleton<YamlLoader>();
        services.AddSingleton<Prompts>();
        services.AddSingleton<PilotDataLoader>();
        services.AddSingleton(sp => sp.GetRequiredService<PilotDataLoader>().Load());

        services.AddSingleton<IMfssia>(sp => new MfssiaClient(sp.GetRequiredService<IOptions<PilotOptions>>(), sp.GetRequiredService<JsonSerializerOptions>()));
        services.AddSingleton<ToolArguments>();
        services.AddSingleton<DecisionValidator>();
        services.AddSingleton<IModelAdapterFactory, ModelAdapterFactory>();
        services.AddSingleton<ITranscriptFactory, TranscriptFactory>();
        services.AddSingleton<Agent>();
        services.AddSingleton<PolicyGate>();
        services.AddSingleton<Preflight>();
        services.AddSingleton(Console.Out);
        services.AddSingleton<Runner>();
        return services;
    }

    /// <summary>
    /// The serializer settings for everything the pilot writes or reads: snake_case names for the pilot's own
    /// records (MFSSIA types name their camelCase fields explicitly), compact output with non-ASCII text kept
    /// as is, nullable annotations enforced on reading. The same text goes to the model as tool results.
    /// </summary>
    private static JsonSerializerOptions CreateJsonOptions() => new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        RespectNullableAnnotations = true,
    };
}
