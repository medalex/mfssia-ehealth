namespace Pilot.Reporting;

/// <summary>A cell where the policy gate disagrees with the hand label in scenarios.yaml. Reported, never "fixed".</summary>
public sealed record GateWarning(string Source, string Task, string Patient, string Truth, string PolicyGate, string Reasons);
