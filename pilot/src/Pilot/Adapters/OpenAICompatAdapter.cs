using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Pilot.Configuration;
using Pilot.Exceptions;
using Pilot.Models.Llm;
using Pilot.Models.OpenAI;
using Pilot.Services.Agents;

namespace Pilot.Adapters;

/// <summary>
/// Manual tool-use loop over an OpenAI-compatible /chat/completions API (Ollama, Groq, Gemini, OpenRouter, ...).
/// Raw HTTP on purpose: providers differ in what they accept, so the request carries only standard fields.
///
/// - tools -> {"type": "function", "function": {name, description, parameters}}, tool_choice "auto";
/// - the system prompt is the first message with role "system";
/// - tool results -> role "tool" messages with tool_call_id; errors are marked with an "ERROR: " prefix
///   (this API has no is_error);
/// - tool arguments arrive as a JSON string; malformed JSON is answered by the agent loop as an invalid input;
/// - temperature is sent if configured; an HTTP 400 is retried once without it and recorded in Settings;
/// - HTTP 429 and a 200 without choices (a provider error some gateways send) are retried with exponential backoff,
///   up to 5 attempts in all (free tiers); then ModelApiException. A used-up daily quota throws ModelQuotaExceededException at once.
/// Settings: PilotOptions.OpenAi.BaseUrl (required), OpenAi.ApiKey (default "none"), Run.Temperature.
/// </summary>
public sealed class OpenAICompatAdapter : IModelAdapter
{
    public const int MaxRetryAttempts = 5;

    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly JsonSerializerOptions _json;
    private readonly ToolArguments _arguments;
    private readonly Dictionary<string, string> _settings;
    private double? _temperature;
    private List<ChatTool> _tools = [];

    /// <summary>Backoff delay before retry n (1-based): 1 s, 2 s, 4 s, 8 s. Replaceable in tests.</summary>
    public Func<int, Task> Sleep { get; set; } = attempt => Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt - 1)));

    /// <param name="handler">HTTP handler for tests.</param>
    public OpenAICompatAdapter(string modelId, PilotOptions options, JsonSerializerOptions json, ToolArguments arguments,
        HttpMessageHandler? handler = null)
    {
        ModelId = modelId;
        BaseUrl = (options.OpenAi.BaseUrl ?? throw new InvalidOperationException("PILOT_OPENAI_BASE_URL is not set")).TrimEnd('/');
        _apiKey = options.OpenAi.ApiKey;
        _json = json;
        _arguments = arguments;
        _http = handler is null ? new HttpClient() : new HttpClient(handler);
        _http.Timeout = TimeSpan.FromMinutes(10);
        var temperature = _temperature = options.Run.Temperature;
        _settings = new Dictionary<string, string>
        {
            ["base_url"] = BaseUrl, // never the key
            ["temperature"] = temperature?.ToString(CultureInfo.InvariantCulture) ?? "",
            ["provider"] = "openai-compatible",
        };
    }

    public string ModelId { get; }
    public string BaseUrl { get; }
    public IReadOnlyDictionary<string, string> Settings => _settings;
    public List<ChatMessage> Messages { get; private set; } = [];

    public void Start(string system, string user, IReadOnlyList<ToolSpec> tools)
    {
        Messages = [new ChatMessage("system", system), new ChatMessage("user", user)];
        _tools = tools.Select(t => new ChatTool(new ChatFunction(t.Name, t.Description, t.InputSchema))).ToList();
    }

    private async Task<(HttpStatusCode Status, string Text)> PostAsync(ChatRequest body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl + "/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(body, _json), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        using var response = await _http.SendAsync(request);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    /// <summary>Posts the conversation; retries a 429 or a response without choices with backoff, and a 400 once without temperature.</summary>
    /// <returns>The response text and its first choice.</returns>
    private async Task<(string Text, ChatChoice Choice)> PostWithRetriesAsync()
    {
        var withTemperature = _temperature is not null;
        var attempt = 0;
        while (true)
        {
            var (status, text) = await PostAsync(new ChatRequest(ModelId, Messages, _tools, Temperature: withTemperature ? _temperature : null));
            if (status == HttpStatusCode.BadRequest && withTemperature)
            {
                withTemperature = false;
                _temperature = null;
                _settings["temperature"] = "rejected by model; not applied";
                continue;
            }
            if (status == HttpStatusCode.TooManyRequests && IsDailyQuotaExceeded(text))
                throw new ModelQuotaExceededException($"daily request quota of {BaseUrl} is used up: {text}");
            if (status != HttpStatusCode.TooManyRequests && (int)status is < 200 or >= 300)
                throw new ModelApiException($"{(int)status} from {BaseUrl}: {text}");
            if (status != HttpStatusCode.TooManyRequests && FindFirstChoice(text) is { } choice)
                return (text, choice);

            attempt++;
            var problem = status == HttpStatusCode.TooManyRequests ? "429" : "a response without choices";
            if (attempt >= MaxRetryAttempts)
                throw new ModelApiException($"{problem} from {BaseUrl} after {attempt} attempts: {text}");
            await Sleep(attempt);
        }
    }

    /// <summary>OpenRouter's free tier answers a used-up daily allowance with a 429 that no backoff can clear.</summary>
    private static bool IsDailyQuotaExceeded(string text) => text.Contains("free-models-per-day");

    private ChatChoice? FindFirstChoice(string text)
    {
        try
        {
            return JsonSerializer.Deserialize<ChatCompletion>(text, _json)?.Choices?.FirstOrDefault();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task<Turn> StepAsync()
    {
        var (text, choice) = await PostWithRetriesAsync();
        var message = choice.Message ?? new ChatResponseMessage(null, null);

        var calls = new List<ToolCall>();
        var echoed = new List<ChatToolCall>();
        foreach (var call in message.ToolCalls ?? [])
        {
            var (id, name) = (call.Id ?? "", call.Function?.Name ?? "");
            var arguments = ReadArguments(call.Function?.Arguments);
            echoed.Add(new ChatToolCall(id, new ChatFunctionCall(name, arguments)));
            calls.Add(ParseCall(id, name, arguments));
        }
        Messages.Add(new ChatMessage("assistant", message.Content, echoed.Count > 0 ? echoed : null));
        return new Turn(message.Content ?? "", calls, choice.FinishReason ?? "", JsonSerializer.Deserialize<JsonElement>(text));
    }

    /// <summary>The argument text: a JSON string by the spec, an object from some providers.</summary>
    private static string ReadArguments(JsonElement? arguments) => arguments switch
    {
        null => "",
        { ValueKind: JsonValueKind.String } text => text.GetString()!,
        { } json => json.GetRawText(),
    };

    private ToolCall ParseCall(string id, string name, string arguments)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<JsonElement>(arguments);
            if (parsed.ValueKind == JsonValueKind.Object) return new ToolCall(id, name, parsed);
        }
        catch (JsonException)
        {
        }
        return _arguments.CreateMalformedCall(id, name, arguments);
    }

    public void AddToolResults(IReadOnlyList<(string CallId, string Content, bool IsError)> results)
    {
        foreach (var (callId, content, isError) in results)
            Messages.Add(new ChatMessage("tool", isError ? $"ERROR: {content}" : content, ToolCallId: callId));
    }

    public void AddUserText(string text) => Messages.Add(new ChatMessage("user", text));
}
