using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Pilot.Adapters;
using Pilot.Configuration;
using Pilot.Exceptions;
using Pilot.Models.Mfssia;
using Pilot.Models.Runs;
using Pilot.Models.Scenario;
using Pilot.Models.Tools;
using Pilot.Reporting;
using Pilot.Services.Mfssia;

namespace Pilot.Tests;

/// <summary>HTTP handler that answers requests from a script and records their bodies.</summary>
public sealed class ScriptedHandler(params (HttpStatusCode Status, string Body)[] responses) : HttpMessageHandler
{
    private readonly Queue<(HttpStatusCode, string)> _responses = new(responses);
    public List<JsonElement> Requests { get; } = [];
    public List<HttpRequestMessage> Messages { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Messages.Add(request);
        if (request.Content is not null)
            Requests.Add(JsonSerializer.Deserialize<JsonElement>(await request.Content.ReadAsStringAsync(cancellationToken)));
        var (status, body) = _responses.Dequeue();
        return new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
    }
}

public class MfssiaClientTests
{
    private static string Envelope(object data) =>
        JsonSerializer.Serialize(new { success = true, message = "Success", data, statusCode = 200, timestamp = "2026-10-10T00:00:00.000Z" });

    private static MfssiaClient Client(ScriptedHandler handler) =>
        new(Options.Create(new PilotOptions { Mfssia = new() { Url = "http://mfssia.test/api" } }), TestHost.Json, handler);

    [Fact]
    public async Task Get_evidence_unwraps_response_envelope()
    {
        var client = Client(new ScriptedHandler((HttpStatusCode.OK, Envelope(new { attribute = "lab:eGFR", custodianId = "lab-a", state = "present", value = 45 }))));
        var got = await client.GetEvidenceAsync("p", "d", "lab-a", "lab:eGFR", "r");
        Assert.Equal(("lab-a", "present", 45.0), (got.CustodianId, got.State, EvidenceValue.TryNumber(got.Value, out var egfr) ? egfr : double.NaN));
    }

    [Fact]
    public async Task Get_audit_events_unwraps_response_envelope()
    {
        var client = Client(new ScriptedHandler((HttpStatusCode.OK, Envelope(new[] { new { runId = "r" } }))));
        Assert.Equal("r", (await client.GetAuditEventsAsync("r"))[0].RunId);
    }

    [Fact]
    public async Task Unexpected_envelope_is_an_error()
    {
        var client = Client(new ScriptedHandler((HttpStatusCode.OK, """{"state": "present"}""")));
        var error = await Assert.ThrowsAsync<MfssiaException>(() => client.GetAuditEventsAsync("r"));
        Assert.Contains("envelope", error.Message);
    }

    [Fact]
    public async Task Query_parameters_are_sent()
    {
        var handler = new ScriptedHandler((HttpStatusCode.OK, Envelope(new { attribute = "a", custodianId = "c", state = "unknown" })));
        await Client(handler).GetEvidenceAsync("p1", "d1", "lab-a", "lab:eGFR", "run-1");
        Assert.Equal("http://mfssia.test/api/evidence-status/p1?doctorId=d1&custodianId=lab-a&attribute=lab%3AeGFR&runId=run-1",
            handler.Messages[0].RequestUri!.ToString());
    }
}

public class OpenAICompatAdapterTests
{
    private static readonly PilotData Data = TestHost.Data;

    private static string Completion(object message, string finishReason = "tool_calls") =>
        JsonSerializer.Serialize(new { choices = new[] { new { message, finish_reason = finishReason } } });

    private static object ToolCallMessage(string id, string name, string arguments) => new
    {
        role = "assistant", content = (string?)null, reasoning = "provider extra",
        tool_calls = new[] { new { id, type = "function", function = new { name, arguments } } },
    };

    private static object TextMessage(string content) => new { role = "assistant", content };

    private static OpenAICompatAdapter Make(ScriptedHandler handler, double? temperature = 0)
    {
        var options = new PilotOptions { OpenAi = new() { BaseUrl = "https://api.example.test/v1" }, Run = new() { Temperature = temperature } };
        return new OpenAICompatAdapter("test-model", options, TestHost.Json, TestHost.Arguments, handler) { Sleep = _ => Task.CompletedTask };
    }

    [Fact]
    public async Task Tool_cycle_uses_openai_messages_and_completes_submit_decision()
    {
        var handler = new ScriptedHandler(
            (HttpStatusCode.OK, Completion(ToolCallMessage("tool-1", "get_policy", """{"drug":"metformin"}"""))),
            (HttpStatusCode.OK, Completion(ToolCallMessage("tool-2", "submit_decision", """{"decision":"escalate","rationale":"Insufficient evidence"}"""))));
        var adapter = Make(handler);
        var result = await TestHost.Agent(new FakeMfssia(Data)).RunAsync(Condition.All["C1"], Data.GetTask("diabetes"), Data.GetPatient("P2"), adapter,
            "openai-test", Transcript.None);

        Assert.Equal("escalate", result.Decision!.Kind);
        Assert.Equal(2, result.Steps);
        var messages = adapter.Messages;
        Assert.Equal(["system", "user", "assistant", "tool"], messages.Take(4).Select(m => m.Role));
        // Standard fields only: no "reasoning", no null content.
        Assert.Equal("""{"role":"assistant","tool_calls":[{"id":"tool-1","function":{"name":"get_policy","arguments":"{\"drug\":\"metformin\"}"},"type":"function"}]}""",
            TestHost.Serialize(messages[2]));
        Assert.Equal("tool-1", messages[3].ToolCallId);
        Assert.Equal("metformin", JsonSerializer.Deserialize<JsonElement>(messages[3].Content!).GetProperty("drug").GetString());
        var first = handler.Requests[0];
        Assert.Equal("auto", first.GetProperty("tool_choice").GetString());
        Assert.Equal("function", first.GetProperty("tools")[0].GetProperty("type").GetString());
        Assert.Equal(0, first.GetProperty("temperature").GetDouble());
        Assert.Equal("Bearer none", handler.Messages[0].Headers.Authorization!.ToString());
        Assert.Equal(new Dictionary<string, string>
        {
            ["base_url"] = "https://api.example.test/v1", ["temperature"] = "0", ["provider"] = "openai-compatible",
        }, adapter.Settings);
    }

    [Fact]
    public async Task Malformed_tool_json_becomes_tool_error()
    {
        var handler = new ScriptedHandler(
            (HttpStatusCode.OK, Completion(ToolCallMessage("bad-call", "get_policy", """{"drug":"""))),
            (HttpStatusCode.OK, Completion(ToolCallMessage("decision", "submit_decision", """{"decision":"escalate","rationale":"Invalid request was rejected"}"""))));
        var adapter = Make(handler);
        var result = await TestHost.Agent(new FakeMfssia(Data)).RunAsync(Condition.All["C1"], Data.GetTask("diabetes"), Data.GetPatient("P2"), adapter,
            "bad-json-test", Transcript.None);

        Assert.Equal("""{"drug":""", result.ToolCalls[0].Input.GetProperty("_raw").GetString());
        Assert.True(result.ToolCalls[0].IsError);
        Assert.Equal("tool", adapter.Messages[3].Role);
        Assert.StartsWith("ERROR:", adapter.Messages[3].Content);
        Assert.Contains("malformed JSON arguments", adapter.Messages[3].Content);
    }

    [Fact]
    public async Task Rate_limit_retries_with_exponential_backoff()
    {
        var handler = new ScriptedHandler(
            (HttpStatusCode.TooManyRequests, """{"error":"rate limited"}"""),
            (HttpStatusCode.TooManyRequests, """{"error":"rate limited"}"""),
            (HttpStatusCode.OK, Completion(TextMessage("ready"), "stop")));
        var adapter = Make(handler);
        var sleeps = new List<int>();
        adapter.Sleep = attempt => { sleeps.Add(attempt); return Task.CompletedTask; };
        adapter.Start("system prompt", "user prompt", []);

        var turn = await adapter.StepAsync();

        Assert.Equal(("ready", "stop"), (turn.Text, turn.StopReason));
        Assert.Equal("stop", turn.Raw!.Value.GetProperty("choices")[0].GetProperty("finish_reason").GetString());
        Assert.Equal(3, handler.Requests.Count);
        Assert.Equal([1, 2], sleeps); // 1 s, 2 s
    }

    [Fact]
    public async Task Rate_limit_gives_up_after_five_attempts()
    {
        var handler = new ScriptedHandler(Enumerable.Repeat((HttpStatusCode.TooManyRequests, "{}"), 5).ToArray());
        var adapter = Make(handler);
        adapter.Start("s", "u", []);
        await Assert.ThrowsAsync<ModelApiException>(adapter.StepAsync);
        Assert.Equal(5, handler.Requests.Count);
    }

    [Fact]
    public async Task Response_without_choices_is_retried()
    {
        var handler = new ScriptedHandler(
            (HttpStatusCode.OK, """{"error":{"message":"upstream error","code":502}}"""),
            (HttpStatusCode.OK, Completion(TextMessage("ready"), "stop")));
        var adapter = Make(handler);
        var sleeps = new List<int>();
        adapter.Sleep = attempt => { sleeps.Add(attempt); return Task.CompletedTask; };
        adapter.Start("s", "u", []);

        var turn = await adapter.StepAsync();

        Assert.Equal("ready", turn.Text);
        Assert.Equal([1], sleeps);
    }

    [Fact]
    public async Task Used_up_daily_quota_stops_without_retrying()
    {
        var handler = new ScriptedHandler(
            (HttpStatusCode.TooManyRequests, """{"error":{"message":"Rate limit exceeded: free-models-per-day","code":429}}"""));
        var adapter = Make(handler);
        adapter.Start("s", "u", []);
        await Assert.ThrowsAsync<ModelQuotaExceededException>(adapter.StepAsync);
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task Bad_request_retries_without_temperature()
    {
        var handler = new ScriptedHandler(
            (HttpStatusCode.BadRequest, """{"error":"temperature is unsupported"}"""),
            (HttpStatusCode.OK, Completion(TextMessage("ready"), "stop")));
        var adapter = Make(handler);
        adapter.Start("system prompt", "user prompt", []);

        await adapter.StepAsync();

        Assert.True(handler.Requests[0].TryGetProperty("temperature", out _));
        Assert.False(handler.Requests[1].TryGetProperty("temperature", out _));
        Assert.Equal("rejected by model; not applied", adapter.Settings["temperature"]);
    }

}

public class ModelAdapterFactoryTests
{
    private static IModelAdapterFactory Factory(IReadOnlyDictionary<string, string?> config) =>
        TestHost.Build(config).GetRequiredService<IModelAdapterFactory>();

    [Fact]
    public void Oai_prefix_goes_to_the_openai_compatible_adapter_and_is_stripped()
    {
        var adapter = Factory(new Dictionary<string, string?> { ["PILOT_OPENAI_BASE_URL"] = "http://localhost:11434/v1" }).Create("oai:qwen3:14b");
        Assert.IsType<OpenAICompatAdapter>(adapter);
        Assert.Equal("qwen3:14b", adapter.ModelId);
        Assert.Equal("http://localhost:11434/v1", adapter.Settings["base_url"]);
    }

    [Fact]
    public void Unprefixed_models_go_to_anthropic() =>
        Assert.IsType<AnthropicAdapter>(Factory(new Dictionary<string, string?>()).Create("claude-opus-5-5"));
}

public class AnthropicAdapterTests
{
    /// <summary>A Messages API response with thinking, text and a tool call, as the API sends it.</summary>
    private const string ToolUseResponse = """
        {"id":"msg_1","type":"message","role":"assistant","model":"claude-opus-5-5",
         "content":[{"type":"thinking","thinking":"","signature":"sig-1"},
                    {"type":"text","text":"Checking the policy."},
                    {"type":"tool_use","id":"toolu_1","name":"get_policy","input":{"drug":"metformin"}}],
         "stop_reason":"tool_use","stop_sequence":null,"stop_details":null,
         "usage":{"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}
        """;

    private static (AnthropicAdapter, ScriptedHandler) Make(params string[] bodies)
    {
        var handler = new ScriptedHandler(bodies.Select(b => (HttpStatusCode.OK, b)).ToArray());
        var client = new Anthropic.AnthropicClient { ApiKey = "test-key", BaseUrl = "https://api.anthropic.test", HttpClient = new HttpClient(handler) };
        return (new AnthropicAdapter("claude-opus-5-5", new PilotOptions { Run = new() { Temperature = 0 } }, client), handler);
    }

    [Fact]
    public async Task Step_parses_tool_calls_and_echoes_the_assistant_turn()
    {
        var (adapter, handler) = Make(ToolUseResponse, ToolUseResponse);
        adapter.Start("system prompt", "user prompt", TestHost.Agent(new FakeMfssia(TestHost.Data)).BuildToolSpecs(Condition.All["C1"]));

        var turn = await adapter.StepAsync();
        Assert.Equal(("tool_use", "Checking the policy."), (turn.StopReason, turn.Text));
        var call = Assert.Single(turn.ToolCalls);
        Assert.Equal(("toolu_1", "get_policy"), (call.Id, call.Name));
        Assert.Equal("metformin", TestHost.Arguments.Parse<GetPolicyArgs>(call).Value!.Drug);
        Assert.Equal("msg_1", turn.Raw!.Value.GetProperty("id").GetString());

        adapter.AddToolResults([("toolu_1", """{"drug":"metformin"}""", false)]);
        await adapter.StepAsync();

        var first = handler.Requests[0];
        Assert.Equal("system prompt", first.GetProperty("system").GetString());
        Assert.False(first.TryGetProperty("temperature", out _)); // the SDK has no sampling parameters
        Assert.False(first.GetProperty("tools")[0].GetProperty("input_schema").GetProperty("additionalProperties").GetBoolean()); // full schema goes through
        var second = handler.Requests[1].GetProperty("messages");
        Assert.Equal(3, second.GetArrayLength());
        var echoed = second[1].GetProperty("content");
        Assert.Equal(["thinking", "text", "tool_use"], echoed.EnumerateArray().Select(b => b.GetProperty("type").GetString()));
        Assert.Equal("sig-1", echoed[0].GetProperty("signature").GetString()); // signature preserved
        var toolResult = second[2].GetProperty("content")[0];
        Assert.Equal(("tool_result", "toolu_1"), (toolResult.GetProperty("type").GetString(), toolResult.GetProperty("tool_use_id").GetString()));
        Assert.Equal("not supported by the SDK; not applied", adapter.Settings["temperature"]);
    }
}

