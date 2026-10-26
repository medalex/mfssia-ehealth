using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pilot.Models.Mfssia;

/// <summary>JSON to EvidenceValue and back; the only place that looks at the JSON of a value.</summary>
public sealed class EvidenceValueConverter : JsonConverter<EvidenceValue>
{
    public override EvidenceValue? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var document = JsonDocument.ParseValue(ref reader);
        return From(document.RootElement);
    }

    private static EvidenceValue? From(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        JsonValueKind.Number => new EvidenceValue.Number(element.GetRawText()),
        JsonValueKind.String => new EvidenceValue.Text(element.GetString()!),
        JsonValueKind.Array => new EvidenceValue.List(element.EnumerateArray().Select(From).ToList(), element.GetRawText()),
        JsonValueKind.Object => new EvidenceValue.Other(element.GetRawText(), !element.EnumerateObject().Any()),
        _ => new EvidenceValue.Other(element.GetRawText(), false),
    };

    public override void Write(Utf8JsonWriter writer, EvidenceValue value, JsonSerializerOptions options) => WriteValue(writer, value);

    private static void WriteValue(Utf8JsonWriter writer, EvidenceValue? value)
    {
        switch (value)
        {
            case null:
                writer.WriteNullValue();
                break;
            case EvidenceValue.Number n:
                writer.WriteRawValue(n.Raw);
                break;
            case EvidenceValue.Text t:
                writer.WriteStringValue(t.Value);
                break;
            case EvidenceValue.List l:
                writer.WriteStartArray();
                foreach (var item in l.Items) WriteValue(writer, item);
                writer.WriteEndArray();
                break;
            case EvidenceValue.Other o:
                using (var document = JsonDocument.Parse(o.Raw)) document.RootElement.WriteTo(writer);
                break;
        }
    }
}
