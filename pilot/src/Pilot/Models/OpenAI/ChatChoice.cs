namespace Pilot.Models.OpenAI;

public sealed record ChatChoice(ChatResponseMessage? Message, string? FinishReason);
