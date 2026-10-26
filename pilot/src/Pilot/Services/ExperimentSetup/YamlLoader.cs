using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace Pilot.Services.ExperimentSetup;

/// <summary>
/// YAML files deserialised into classes. Plain scalars are typed by the YAML 1.2 core schema:
/// 30 is a number, true a boolean, null null, quoted text a string. The document
/// passes through System.Text.Json so the same classes and naming rules apply as for JSON.
/// </summary>
public sealed class YamlLoader(JsonSerializerOptions json)
{
    public T Load<T>(string path) => Parse<T>(File.ReadAllText(path));

    public T Parse<T>(string text)
    {
        var stream = new YamlStream();
        stream.Load(new StringReader(text));
        var node = stream.Documents.Count == 0 ? null : Convert(stream.Documents[0].RootNode);
        return node.Deserialize<T>(json) ?? throw new InvalidDataException($"empty YAML document for {typeof(T).Name}");
    }

    private static readonly Regex IntegerPattern = new(@"^[-+]?[0-9]+$");
    private static readonly Regex FloatPattern = new(@"^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$");

    private static JsonNode? Convert(YamlNode node) => node switch
    {
        YamlMappingNode map => ConvertMapping(map),
        YamlSequenceNode seq => new JsonArray(seq.Children.Select(Convert).ToArray()),
        YamlScalarNode scalar => ConvertScalar(scalar),
        _ => null,
    };

    private static JsonObject ConvertMapping(YamlMappingNode map)
    {
        var obj = new JsonObject();
        foreach (var (key, value) in map.Children) obj[((YamlScalarNode)key).Value!] = Convert(value);
        return obj;
    }

    private static JsonNode? ConvertScalar(YamlScalarNode scalar)
    {
        var v = scalar.Value ?? "";
        if (scalar.Style is ScalarStyle.SingleQuoted or ScalarStyle.DoubleQuoted or ScalarStyle.Literal or ScalarStyle.Folded)
            return JsonValue.Create(v);
        if (v is "" or "~" or "null" or "Null" or "NULL") return null;
        if (v is "true" or "True" or "TRUE") return JsonValue.Create(true);
        if (v is "false" or "False" or "FALSE") return JsonValue.Create(false);
        if (IntegerPattern.IsMatch(v)) return JsonValue.Create(long.Parse(v, CultureInfo.InvariantCulture));
        if (FloatPattern.IsMatch(v) && v.Any(char.IsDigit)) return JsonValue.Create(double.Parse(v, CultureInfo.InvariantCulture));
        return JsonValue.Create(v);
    }
}
