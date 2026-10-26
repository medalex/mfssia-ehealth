using System.Text.Json.Serialization;

namespace Pilot.Models.Policy;

/// <summary>The structured part of a drug rule, as get_policy shows it.</summary>
public class DrugRuleBody
{
    public List<string> Requires { get; init; } = [];
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public List<string>? ContraindicatedAllergies { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public List<string>? ContraindicatedAllergyClasses { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public List<LabThreshold>? LabThresholds { get; init; }
}
