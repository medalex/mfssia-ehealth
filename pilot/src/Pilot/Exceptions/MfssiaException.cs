namespace Pilot.Exceptions;

/// <summary>MFSSIA answered with an error status or an unexpected response envelope.</summary>
public sealed class MfssiaException(string message) : Exception(message);
