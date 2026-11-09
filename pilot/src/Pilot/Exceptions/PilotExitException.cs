namespace Pilot.Exceptions;

/// <summary>A clean stop of the runner with a message for the user (exit code 1).</summary>
public sealed class PilotExitException(string message) : Exception(message);
