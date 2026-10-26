using System.Text.Json;
using Microsoft.Extensions.Options;
using Pilot.Configuration;
using Pilot.Models.Llm;
using Pilot.Services.Agents;

namespace Pilot.Adapters;

/// <summary>
/// Provider-neutral interface between the agent loop and a model API. The adapter owns the provider's
/// native message history; the agent loop only sees neutral Turn / ToolCall objects.
/// </summary>
public interface IModelAdapter
{
    string ModelId { get; }

    /// <summary>What sampling settings were actually sent (recorded in results; some models reject temperature).</summary>
    IReadOnlyDictionary<string, string> Settings { get; }

    void Start(string system, string user, IReadOnlyList<ToolSpec> tools);

    Task<Turn> StepAsync();

    /// <summary>All results answer the previous Turn, in the order of its tool calls.</summary>
    void AddToolResults(IReadOnlyList<(string CallId, string Content, bool IsError)> results);

    void AddUserText(string text);
}

/// <summary>Creates the adapter for a model id from PILOT_MODELS.</summary>
public interface IModelAdapterFactory
{
    IModelAdapter Create(string modelId);
}

/// <summary>Selects an adapter by model-id prefix: "oai:" goes to an OpenAI-compatible API, the rest to Anthropic.</summary>
public sealed class ModelAdapterFactory(IOptions<PilotOptions> options, JsonSerializerOptions json, ToolArguments arguments) : IModelAdapterFactory
{
    public IModelAdapter Create(string modelId) =>
        modelId.StartsWith("oai:")
            ? new OpenAICompatAdapter(modelId["oai:".Length..], options.Value, json, arguments)
            : new AnthropicAdapter(modelId, options.Value);
}
