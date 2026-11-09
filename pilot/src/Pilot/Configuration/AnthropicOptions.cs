namespace Pilot.Configuration;

/// <summary>Section Pilot:Anthropic. The API key is ANTHROPIC_API_KEY, read by the SDK.</summary>
public sealed class AnthropicOptions
{
    /// <summary>PILOT_EFFORT: low | medium | high | xhigh | max; null = model default.</summary>
    public string? Effort { get; set; }
}
