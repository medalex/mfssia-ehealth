namespace Pilot.Models.Scenario;

public sealed record Custodian(string Id, string Description, List<string> Attributes)
{
    public bool Holds(string attribute) =>
        Attributes.Contains(attribute) || (attribute.StartsWith("lab:") && Attributes.Contains("lab:*"));
}
