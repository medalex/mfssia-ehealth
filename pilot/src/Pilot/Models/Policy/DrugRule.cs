namespace Pilot.Models.Policy;

public sealed class DrugRule : DrugRuleBody
{
    public required string Text { get; init; }

    public DrugRuleBody ToBody() => new()
    {
        Requires = Requires, ContraindicatedAllergies = ContraindicatedAllergies,
        ContraindicatedAllergyClasses = ContraindicatedAllergyClasses, LabThresholds = LabThresholds,
    };
}
