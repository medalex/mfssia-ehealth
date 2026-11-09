namespace Pilot.Models.Runs;

/// <param name="Status">pass | flag | n/a</param>
public sealed record AuditCheck(string Name, string Status, List<string> Reasons);
