using System.Text.Json;

namespace Pilot.Models.OpenAI;

public sealed record ChatFunction(string Name, string Description, JsonElement Parameters);
