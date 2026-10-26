using Pilot.Models.Decisions;
using Pilot.Models.Mfssia;

namespace Pilot.Models.Runs;

public sealed class AgentResult
{
    public Decision? Decision { get; set; }
    public int Steps { get; set; }
    public List<ToolCallRecord> ToolCalls { get; } = [];
    /// <summary>Full MFSSIA answers as returned by MFSSIA (before EvidenceSubstitution), in call order.</summary>
    public List<EvidenceResponse> MfssiaResponses { get; } = [];
    public string EndReason { get; set; } = "";

    public List<string> CustodiansQueried =>
        ToolCalls.Where(c => c.Name == "get_evidence" && c.CustodianId is not null)
            .Select(c => c.CustodianId!).Distinct().Order(StringComparer.Ordinal).ToList();
}
