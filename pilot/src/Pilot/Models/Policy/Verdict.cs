namespace Pilot.Models.Policy;

public sealed class Verdict
{
    public string Decision { get; set; } = "escalate"; // prescribe | escalate
    public string? Drug { get; set; }
    public List<string> Reasons { get; } = [];
    public Dictionary<string, string> Safety { get; } = []; // drug -> safe | contraindicated | undetermined
}
