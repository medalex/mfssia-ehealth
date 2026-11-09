using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pilot.Models.Tools;

/// <summary>A JSON Schema of type object. Property schemas stay free-form; they go to the model API as written.</summary>
public sealed class ObjectSchema
{
    public string Type { get; init; } = "object";
    public Dictionary<string, JsonElement> Properties { get; init; } = [];
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public List<string>? Required { get; set; }
    [JsonPropertyName("additionalProperties"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? AdditionalProperties { get; init; }
}
