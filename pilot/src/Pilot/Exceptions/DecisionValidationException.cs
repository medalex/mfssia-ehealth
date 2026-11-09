namespace Pilot.Exceptions;

/// <summary>The agent's submit_decision arguments are missing a field, have a wrong type or break a decision rule.</summary>
public sealed class DecisionValidationException(string message) : Exception(message);
