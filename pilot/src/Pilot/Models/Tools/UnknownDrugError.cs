namespace Pilot.Models.Tools;

public sealed record UnknownDrugError(string Error, List<string> KnownDrugs);
