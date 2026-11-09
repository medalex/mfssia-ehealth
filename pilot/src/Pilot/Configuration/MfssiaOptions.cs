namespace Pilot.Configuration;

/// <summary>Section Pilot:Mfssia.</summary>
public sealed class MfssiaOptions
{
    /// <summary>MFSSIA_URL: MFSSIA base URL including the API prefix.</summary>
    public string Url { get; set; } = "http://localhost:3000/api";
}
