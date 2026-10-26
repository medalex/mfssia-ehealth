using Pilot.Models.Mfssia;

namespace Pilot.Services.Mfssia;

/// <summary>The pilot talks to MFSSIA only through these two endpoints.</summary>
public interface IMfssiaClient
{
    string BaseUrl { get; }

    Task<EvidenceResponse> GetEvidenceAsync(string patientId, string doctorId, string custodianId, string attribute, string runId);

    Task<List<AuditEvent>> GetAuditEventsAsync(string runId);
}
