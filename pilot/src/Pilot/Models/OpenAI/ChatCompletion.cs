namespace Pilot.Models.OpenAI;

public sealed record ChatCompletion(List<ChatChoice>? Choices);
