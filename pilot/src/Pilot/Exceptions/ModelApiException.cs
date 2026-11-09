namespace Pilot.Exceptions;

/// <summary>The model API kept failing after the adapter's retries; the run ends without a decision (end_reason api_error).</summary>
public sealed class ModelApiException(string message) : Exception(message);
