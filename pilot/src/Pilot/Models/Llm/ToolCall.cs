using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pilot.Models.Llm;

/// <param name="Input">The arguments as the model sent them; {"_raw": "..."} when they were not valid JSON.</param>
/// <param name="MalformedArguments">The argument text when it was not a JSON object; the agent loop answers it as an invalid input.</param>
public sealed record ToolCall(string Id, string Name, JsonElement Input, [property: JsonIgnore] string? MalformedArguments = null);
