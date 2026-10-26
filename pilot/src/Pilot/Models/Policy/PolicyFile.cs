namespace Pilot.Models.Policy;

public sealed class PolicyFile
{
    public required GeneralPolicy General { get; init; }
    public required Dictionary<string, List<string>> AllergyClasses { get; init; }
    public required Dictionary<string, DrugRule> Drugs { get; init; }
}
