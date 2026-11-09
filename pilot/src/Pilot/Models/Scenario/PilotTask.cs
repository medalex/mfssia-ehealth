namespace Pilot.Models.Scenario;

public sealed record PilotTask(string Id, string Description, List<string> Candidates);
