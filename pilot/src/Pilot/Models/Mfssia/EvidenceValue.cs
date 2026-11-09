using System.Globalization;
using System.Text.Json.Serialization;

namespace Pilot.Models.Mfssia;

/// <summary>
/// The value of one piece of evidence: eGFR is a number, allergies a list of strings. The same shape is used
/// for what MFSSIA returns, for what scenarios.yaml expects and for the value_used an agent declares, so it
/// also takes a numeric string ("45") or anything else a model may write (Other). JSON null is a null value.
/// EvidenceValueConverter writes each value back in the form it was read, so the agent sees MFSSIA's answer as returned.
/// </summary>
[JsonConverter(typeof(EvidenceValueConverter))]
public abstract record EvidenceValue
{
    /// <param name="Raw">The JSON number as written ("45", "1.10").</param>
    public sealed record Number(string Raw) : EvidenceValue;

    public sealed record Text(string Value) : EvidenceValue;

    /// <param name="Raw">The JSON array as written, for messages.</param>
    public sealed record List(IReadOnlyList<EvidenceValue?> Items, string Raw) : EvidenceValue;

    /// <summary>An object or a boolean.</summary>
    /// <param name="Raw">The JSON as written.</param>
    public sealed record Other(string Raw, bool IsEmptyObject) : EvidenceValue;

    /// <summary>A value as a number: JSON numbers and numeric strings ("45"), as the policy reads lab values.</summary>
    public static bool TryNumber(EvidenceValue? value, out double number)
    {
        number = 0;
        return value switch
        {
            Number n => double.TryParse(n.Raw, NumberStyles.Float, CultureInfo.InvariantCulture, out number) && double.IsFinite(number),
            Text t => double.TryParse(t.Value.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out number),
            _ => false,
        };
    }

    /// <summary>A value as text for comparisons and messages: strings as they are, anything else as JSON.</summary>
    public static string ToText(EvidenceValue? value) => value switch
    {
        null => "null",
        Number n => n.Raw,
        Text t => t.Value,
        List l => l.Raw,
        Other o => o.Raw,
        _ => throw new InvalidOperationException($"unknown evidence value {value.GetType().Name}"),
    };
}
