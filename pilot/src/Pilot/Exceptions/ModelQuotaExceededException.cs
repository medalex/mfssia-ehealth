namespace Pilot.Exceptions;

/// <summary>The provider's daily request quota is used up; every further run would fail, so the runner stops the plan.</summary>
public sealed class ModelQuotaExceededException(string message) : Exception(message);
