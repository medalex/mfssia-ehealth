namespace Pilot.Models.Scenario;

public sealed class Patient
{
    public string Label { get; set; } = "";
    public required string PatientId { get; init; }
    /// <summary>key "attribute@custodian"</summary>
    public required Dictionary<string, ExpectedEvidence> ExpectedEvidence { get; init; }
    public required List<string> Contraindicated { get; init; }
    public required Dictionary<string, string> Truth { get; init; }

    /// <summary>Splits a key of ExpectedEvidence, "attribute@custodian".</summary>
    public static (string Custodian, string Attribute) ParseEvidenceKey(string key)
    {
        var at = key.LastIndexOf('@');
        return (key[(at + 1)..], key[..at]);
    }
}
