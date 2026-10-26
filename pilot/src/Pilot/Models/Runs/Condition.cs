namespace Pilot.Models.Runs;

/// <param name="Agent">false: deterministic policy gate, no LLM</param>
/// <param name="HidesEvidenceState">the get_evidence tool hides the evidence state: present -> value, confirmed_absent/unknown -> [] (EvidenceSubstitution.StateHidden)</param>
/// <param name="Declaration">submit_decision requires declaration / relied_on / missing</param>
public sealed record Condition(string Code, bool Agent, bool HidesEvidenceState, bool Declaration)
{
    public static readonly IReadOnlyDictionary<string, Condition> All = new Dictionary<string, Condition>
    {
        ["A"] = new("A", Agent: false, HidesEvidenceState: false, Declaration: false),
        ["B"] = new("B", Agent: true, HidesEvidenceState: true, Declaration: false),
        ["C1"] = new("C1", Agent: true, HidesEvidenceState: false, Declaration: false),
        ["C2"] = new("C2", Agent: true, HidesEvidenceState: true, Declaration: true),
        ["C3"] = new("C3", Agent: true, HidesEvidenceState: false, Declaration: true),
    };
}
