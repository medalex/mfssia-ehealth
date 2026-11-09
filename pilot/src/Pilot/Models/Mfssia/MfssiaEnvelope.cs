using System.Text.Json.Serialization;

namespace Pilot.Models.Mfssia;

/// <summary>MFSSIA wraps every response as {success, message, data, statusCode, timestamp} (ApiResponseInterceptor).</summary>
public sealed class MfssiaEnvelope<T>
{
    [JsonPropertyName("success")] public bool Success { get; init; }
    [JsonPropertyName("data")] public T? Data { get; init; }
}
