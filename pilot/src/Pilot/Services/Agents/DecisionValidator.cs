using Pilot.Exceptions;
using Pilot.Models.Decisions;
using Pilot.Models.Llm;

namespace Pilot.Services.Agents;

/// <summary>Reads the agent's submit_decision call into a Decision.</summary>
public sealed class DecisionValidator(ToolArguments arguments)
{
    /// <summary>Required fields and types come from deserialisation; the value rules are checked here.</summary>
    /// <exception cref="DecisionValidationException">The arguments do not form a valid decision.</exception>
    public Decision Validate(ToolCall call)
    {
        var (decision, error) = arguments.Parse<Decision>(call);
        if (decision is null) throw new DecisionValidationException(error!);
        if (decision.Kind is not ("prescribe" or "escalate"))
            throw new DecisionValidationException("decision must be 'prescribe' or 'escalate'");
        foreach (var item in decision.Declaration ?? [])
            if (!DeclarationItem.ObservedValues.Contains(item.Observed))
                throw new DecisionValidationException($"declaration observed must be one of {string.Join(", ", DeclarationItem.ObservedValues)}");
        if (decision.Kind == "prescribe" && string.IsNullOrEmpty(decision.Drug))
            throw new DecisionValidationException("drug is required when decision is prescribe");
        return decision;
    }
}
