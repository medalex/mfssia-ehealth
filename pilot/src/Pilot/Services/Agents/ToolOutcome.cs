using Pilot.Models.Decisions;

namespace Pilot.Services.Agents;

/// <summary>What one tool call answers the model.</summary>
/// <param name="Output">Serialised as the tool result.</param>
/// <param name="CustodianId">The custodian a get_evidence call named.</param>
/// <param name="Decision">The decision an accepted submit_decision carries.</param>
internal sealed record ToolOutcome(object Output, bool IsError, string? CustodianId = null, Decision? Decision = null);
