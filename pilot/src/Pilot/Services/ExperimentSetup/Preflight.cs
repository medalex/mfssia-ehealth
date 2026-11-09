using System.Globalization;
using Pilot.Exceptions;
using Pilot.Models.Mfssia;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;
using Pilot.Services.Mfssia;

namespace Pilot.Services.ExperimentSetup;

/// <summary>Before the runs: MFSSIA is reachable and /evidence-status returns what scenarios.yaml expects.</summary>
public sealed class Preflight(IMfssia client, PilotData data, TextWriter stdout)
{
    public async Task RunAsync()
    {
        var runId = RunKey.PreflightRunId(DateTime.UtcNow);
        await EnsureReachableAsync(runId);
        var problems = await FindProblemsAsync(runId);
        if (problems.Count > 0)
            throw new PilotExitException(
                "Preflight failed: /evidence-status does not match pilot/data/scenarios.yaml.\n" +
                "This is a seed/environment problem, not an agent problem. Start MFSSIA with PILOT_DEMO_SEED=true and " +
                "EVIDENCE_REFERENCE_TIME=2026-10-10T00:00:00Z and check the DKG records for P1-P4.\n  - " +
                string.Join("\n  - ", problems));
        stdout.WriteLine($"preflight ok ({runId})");
    }

    private async Task EnsureReachableAsync(string runId)
    {
        try
        {
            await client.GetAuditEventsAsync(runId);
        }
        catch (Exception error)
        {
            throw new PilotExitException($"MFSSIA is not reachable at {client.BaseUrl}: {error.Message}");
        }
    }

    private async Task<List<string>> FindProblemsAsync(string runId)
    {
        var problems = new List<string>();
        foreach (var patient in data.Patients)
        {
            foreach (var (key, expected) in patient.ExpectedEvidence)
            {
                var (custodian, attribute) = Patient.ParseEvidenceKey(key);
                try
                {
                    var got = await client.GetEvidenceAsync(patient.PatientId, data.DoctorId, custodian, attribute, runId);
                    problems.AddRange(FindMismatches(expected, got).Select(m => $"{patient.Label} {key}: {m}"));
                }
                catch (MfssiaException error)
                {
                    problems.Add($"{patient.Label} {key}: {error.Message}");
                }
            }
        }
        return problems;
    }

    /// <summary>The fields scenarios.yaml sets for one attribute@custodian that /evidence-status does not match.</summary>
    private static IEnumerable<string> FindMismatches(ExpectedEvidence want, EvidenceResponse have)
    {
        if (want.State != have.State) yield return $"expected state={want.State}, got {have.State}";
        if (want.Value is { } value && !IsSameValue(value, have.Value)) yield return $"expected value={EvidenceValue.ToText(value)}, got {EvidenceValue.ToText(have.Value)}";
        if (want.Stale is { } stale && stale != have.Stale) yield return $"expected stale={stale}, got {have.Stale?.ToString() ?? "null"}";
        if (want.MeasuredAt is { } at && !IsSameInstant(at, have.MeasuredAt)) yield return $"expected measuredAt={at}, got {have.MeasuredAt ?? "null"}";
        if (want.Reason is { } reason && reason != have.Reason) yield return $"expected reason={reason}, got {have.Reason ?? "null"}";
    }

    private static bool IsSameInstant(string expected, string? actual) =>
        DateTimeOffset.TryParse(expected, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var a) &&
        DateTimeOffset.TryParse(actual, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var b) &&
        a == b;

    /// <summary>Lists compare as sets of text, numbers numerically.</summary>
    private static bool IsSameValue(EvidenceValue expected, EvidenceValue? actual)
    {
        if (expected is EvidenceValue.List want)
            return actual is EvidenceValue.List have &&
                   want.Items.Select(EvidenceValue.ToText).Order(StringComparer.Ordinal)
                       .SequenceEqual(have.Items.Select(EvidenceValue.ToText).Order(StringComparer.Ordinal));
        if (EvidenceValue.TryNumber(expected, out var x) && EvidenceValue.TryNumber(actual, out var y)) return x == y;
        return EvidenceValue.ToText(expected) == EvidenceValue.ToText(actual);
    }
}
