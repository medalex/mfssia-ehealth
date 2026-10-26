namespace Pilot.Models.OpenAI;

public sealed record ChatToolCall(string Id, ChatFunctionCall Function, string Type = "function");
