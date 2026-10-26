using Pilot.Models.Policy;

namespace Pilot.Models.Tools;

public sealed record PolicyAnswer(string Drug, string Text, DrugRuleBody Rule, string General, Dictionary<string, List<string>> AllergyClasses);
