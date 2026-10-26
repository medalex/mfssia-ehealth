using System.Text.Json;
using Pilot.Adapters;
using Pilot.Models.Llm;
using Pilot.Models.Mfssia;
using Pilot.Models.Scenario;
using Pilot.Services.Mfssia;

namespace Pilot.Tests;

/// <summary>Fake MFSSIA built from scenarios.yaml expected evidence: answers + journal, no network.</summary>
public sealed class FakeMfssia(PilotData data) : IMfssia
{
    private static int _ids;
    private readonly Dictionary<string, List<AuditEvent>> _journal = [];

    public string BaseUrl => "fake://mfssia";

    public static EvidenceResponse Response(string custodian, string attribute, string state, object? value = null, bool? stale = null,
        string? reason = null, string? eventId = null, string? measuredAt = null) => new()
    {
        Attribute = attribute,
        CustodianId = custodian,
        State = state,
        Reason = reason,
        Value = state == "present" && value is not null ? value as EvidenceValue ?? JsonSerializer.Deserialize<EvidenceValue>(JsonSerializer.Serialize(value)) : null,
        Stale = stale,
        MeasuredAt = stale is null ? null : measuredAt ?? (stale.Value ? "2025-10-10T00:00:00.000Z" : "2026-10-03T00:00:00.000Z"),
        Source = new EvidenceSource(custodian, eventId ?? $"evt-{Interlocked.Increment(ref _ids)}"),
    };

    public static AuditEvent EventFor(EvidenceResponse resp, string runId = "run") => new()
    {
        Id = resp.Source!.AuditEventId, EventType = "evidence.status", CustodianId = resp.CustodianId, Resource = resp.Attribute,
        Outcome = resp.Reason ?? resp.State, Reason = resp.Reason, RunId = runId,
    };

    public Task<EvidenceResponse> GetEvidenceAsync(string patientId, string doctorId, string custodianId, string attribute, string runId)
    {
        var patient = data.Patients.First(p => p.PatientId == patientId);
        var resp = patient.ExpectedEvidence.TryGetValue($"{attribute}@{custodianId}", out var e)
            ? Response(custodianId, attribute, e.State, e.Value, e.Stale, e.Reason, measuredAt: e.MeasuredAt)
            : Response(custodianId, attribute, "unknown", reason: "not_custodian");
        if (!_journal.TryGetValue(runId, out var events)) _journal[runId] = events = [];
        events.Add(new AuditEvent { EventType = "access.decision", Outcome = "granted", RunId = runId });
        events.Add(EventFor(resp, runId));
        return Task.FromResult(resp);
    }

    public Task<List<AuditEvent>> GetAuditEventsAsync(string runId) => Task.FromResult(_journal.GetValueOrDefault(runId, []).ToList());
}

/// <summary>Model adapter that replays scripted turns: no API calls.</summary>
public class ScriptedAdapter(IEnumerable<Turn> turns) : IModelAdapter
{
    public Queue<Turn> Turns { get; set; } = new(turns);
    public List<object> Results { get; } = [];
    public IReadOnlyList<ToolSpec> Tools { get; private set; } = [];
    public string ModelId { get; set; } = "scripted";
    public IReadOnlyDictionary<string, string> Settings { get; } = new Dictionary<string, string>();

    public virtual void Start(string system, string user, IReadOnlyList<ToolSpec> tools) => Tools = tools;

    public Task<Turn> StepAsync() => Task.FromResult(Turns.Count > 0 ? Turns.Dequeue() : new Turn("thinking...", [], "end_turn"));

    public void AddToolResults(IReadOnlyList<(string CallId, string Content, bool IsError)> results) => Results.Add(results);

    public void AddUserText(string text) => Results.Add(text);

    /// <summary>A turn with one tool call; args is any object, serialised with the pilot's snake_case names.</summary>
    public static Turn Call(string name, object? args = null) =>
        new("", [new ToolCall($"id-{name}", name, JsonSerializer.SerializeToElement(args ?? new { }, (args ?? new { }).GetType(), TestHost.Json))], "tool_use");
}
