using Pilot.Models.Mfssia;
using Pilot.Models.Policy;

namespace Pilot.Models.Runs;

public sealed class GateResult
{
    public Verdict Verdict { get; set; } = new();
    public List<EvidenceResponse> MfssiaResponses { get; } = [];
    public List<(string Custodian, string Attribute)> Queries { get; } = [];
}
