using Pilot.Models.Mfssia;

namespace Pilot.Services.Agents;

/// <summary>
/// What the get_evidence tool shows the agent: the tool wrapper between the agent and MFSSIA.
/// AsReturned passes the MFSSIA answer on (conditions C1, C3). StateHidden models a typical wrapper that
/// turns an answer into a list of records and drops the state and reason (conditions B, C2): "the custodian
/// confirmed it has nothing" and "we could not find out" both become []; a present answer becomes a
/// one-element list. MFSSIA still logs the real state in its audit journal.
/// </summary>
public static class EvidenceSubstitution
{
    public static EvidenceResponse AsReturned(EvidenceResponse response) => response;

    public static List<EvidenceResponse> StateHidden(EvidenceResponse response) => response.State == "present" ? [response] : [];
}
