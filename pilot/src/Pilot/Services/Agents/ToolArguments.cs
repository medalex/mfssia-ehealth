using System.Text.Json;
using Pilot.Models.Llm;

namespace Pilot.Services.Agents;

/// <summary>Tool-call arguments to and from typed objects, with the pilot's serializer settings.</summary>
public sealed class ToolArguments(JsonSerializerOptions json)
{
    /// <summary>The arguments as T, or an error message for the model when they do not fit.</summary>
    public (T? Value, string? Error) Parse<T>(ToolCall call) where T : class
    {
        try
        {
            return (call.Input.Deserialize<T>(json) ?? throw new JsonException("arguments are null"), null);
        }
        catch (JsonException error)
        {
            return (null, error.Message);
        }
    }

    /// <summary>A call whose argument text is not a JSON object; its Input records the text as {"_raw": ...}.</summary>
    public ToolCall CreateMalformedCall(string id, string name, string raw) =>
        new(id, name, JsonSerializer.SerializeToElement(new Dictionary<string, string> { ["_raw"] = raw }, json), raw);
}
