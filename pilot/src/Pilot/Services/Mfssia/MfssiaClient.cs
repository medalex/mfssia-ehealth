using System.Text.Json;
using Microsoft.Extensions.Options;
using Pilot.Configuration;
using Pilot.Exceptions;
using Pilot.Models.Mfssia;

namespace Pilot.Services.Mfssia;

public sealed class MfssiaClient : IMfssiaClient
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    /// <param name="options">MfssiaUrl: MFSSIA base URL including the API prefix, e.g. http://localhost:3000/api.</param>
    /// <param name="handler">HTTP handler for tests.</param>
    public MfssiaClient(IOptions<PilotOptions> options, JsonSerializerOptions json, HttpMessageHandler? handler = null)
    {
        BaseUrl = options.Value.Mfssia.Url.TrimEnd('/');
        _json = json;
        _http = handler is null ? new HttpClient() : new HttpClient(handler);
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public string BaseUrl { get; }

    public Task<EvidenceResponse> GetEvidenceAsync(string patientId, string doctorId, string custodianId, string attribute, string runId) =>
        GetAsync<EvidenceResponse>($"/evidence-status/{patientId}",
            ("doctorId", doctorId), ("custodianId", custodianId), ("attribute", attribute), ("runId", runId));

    public Task<List<AuditEvent>> GetAuditEventsAsync(string runId) => GetAsync<List<AuditEvent>>("/audit-events", ("runId", runId));

    private async Task<T> GetAsync<T>(string path, params (string Key, string Value)[] query)
    {
        var url = BaseUrl + path + "?" + string.Join("&", query.Select(q => $"{Uri.EscapeDataString(q.Key)}={Uri.EscapeDataString(q.Value)}"));
        var request = $"GET {path}" + (path == "/audit-events" ? $"?runId={query[0].Value}" : "");
        using var response = await _http.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();
        if ((int)response.StatusCode != 200)
            throw new MfssiaException($"{request} -> {(int)response.StatusCode}: {Truncate(body)}");
        if (TryDeserializeEnvelope<T>(body) is not { Success: true, Data: not null } envelope)
            throw new MfssiaException($"unexpected MFSSIA response envelope: {Truncate(body)}");
        return envelope.Data;
    }

    private MfssiaEnvelope<T>? TryDeserializeEnvelope<T>(string body)
    {
        try
        {
            return JsonSerializer.Deserialize<MfssiaEnvelope<T>>(body, _json);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string Truncate(string s) => s.Length <= 300 ? s : s[..300];
}
