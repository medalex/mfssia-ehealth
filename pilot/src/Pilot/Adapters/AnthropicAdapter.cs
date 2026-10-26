using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;
using Pilot.Configuration;
using Pilot.Models.Llm;

namespace Pilot.Adapters;

/// <summary>
/// Manual tool-use loop over the Messages API (official Anthropic C# SDK).
/// - tool_choice stays "auto": current models reject forced tool choice, so the obligation to finish with
///   submit_decision is stated in the system prompt and enforced by the loop.
/// - temperature: never sent. The C# SDK (13.x) has no sampling parameters, as current Claude models reject
///   them with HTTP 400; when PILOT_TEMPERATURE is set, Settings records that it was not applied.
/// - The assistant content is appended back verbatim, thinking blocks with their signatures included.
/// Settings: ANTHROPIC_API_KEY (read by the SDK), PilotOptions.Anthropic.Effort (optional: low | medium | high | xhigh | max).
/// </summary>
public sealed class AnthropicAdapter : IModelAdapter
{
    private readonly AnthropicClient _client;
    private readonly string? _effort;
    private readonly Dictionary<string, string> _settings;
    private string _system = "";
    private List<ToolUnion> _tools = [];
    private List<MessageParam> _messages = [];

    public AnthropicAdapter(string modelId, PilotOptions options, AnthropicClient? client = null)
    {
        ModelId = modelId;
        _client = client ?? new AnthropicClient();
        _effort = options.Anthropic.Effort is { Length: > 0 } e ? e : null;
        _settings = new Dictionary<string, string>
        {
            ["temperature"] = options.Run.Temperature is null ? "" : "not supported by the SDK; not applied",
            ["effort"] = _effort ?? "model default",
        };
    }

    public string ModelId { get; }
    public IReadOnlyDictionary<string, string> Settings => _settings;

    public void Start(string system, string user, IReadOnlyList<ToolSpec> tools)
    {
        _system = system;
        _tools = tools.Select(t => (ToolUnion)ToTool(t)).ToList();
        _messages = [new UserMessageParam { Content = user }];
    }

    /// <summary>The whole JSON schema goes through, additionalProperties included.</summary>
    private static Tool ToTool(ToolSpec spec) => new()
    {
        Name = spec.Name,
        Description = spec.Description,
        InputSchema = InputSchema.FromRawUnchecked(
            spec.InputSchema.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone())),
    };

    private MessageCreateParams BuildParams()
    {
        var p = new MessageCreateParams
        {
            Model = ModelId,
            MaxTokens = 16000,
            System = _system,
            Tools = _tools,
            Messages = _messages,
        };
        if (_effort is not null) p = p with { OutputConfig = new OutputConfig { Effort = ParseEffort(_effort) } };
        return p;
    }

    private static Effort ParseEffort(string effort) => effort.ToLowerInvariant() switch
    {
        "low" => Effort.Low,
        "medium" => Effort.Medium,
        "high" => Effort.High,
        "xhigh" => Effort.Xhigh,
        "max" => Effort.Max,
        _ => throw new ArgumentException($"unknown PILOT_EFFORT {effort}"),
    };

    public async Task<Turn> StepAsync()
    {
        var response = await _client.Messages.Create(BuildParams());
        var echo = new List<ContentBlockParam>();
        var calls = new List<ToolCall>();
        var text = new System.Text.StringBuilder();
        foreach (var block in response.Content)
        {
            if (block.TryPickText(out TextBlock? t))
            {
                echo.Add(new TextBlockParam { Text = t.Text });
                text.Append(t.Text);
            }
            else if (block.TryPickThinking(out ThinkingBlock? thinking))
            {
                // Signature must be preserved - the API rejects tampering.
                echo.Add(new ThinkingBlockParam { Thinking = thinking.Thinking, Signature = thinking.Signature });
            }
            else if (block.TryPickRedactedThinking(out RedactedThinkingBlock? redacted))
            {
                echo.Add(new RedactedThinkingBlockParam { Data = redacted.Data });
            }
            else if (block.TryPickToolUse(out ToolUseBlock? toolUse))
            {
                echo.Add(new ToolUseBlockParam { ID = toolUse.ID, Name = toolUse.Name, Input = toolUse.Input });
                calls.Add(new ToolCall(toolUse.ID, toolUse.Name, JsonSerializer.SerializeToElement(toolUse.Input)));
            }
        }
        _messages.Add(new AssistantMessageParam { Content = echo });
        // The wire form of the response, for the transcript; stop_reason is read from it as the API sends it.
        var raw = JsonSerializer.SerializeToElement(response);
        var stopReason = raw.TryGetProperty("stop_reason", out var sr) && sr.ValueKind == JsonValueKind.String ? sr.GetString()! : "";
        return new Turn(text.ToString(), calls, stopReason, raw);
    }

    public void AddToolResults(IReadOnlyList<(string CallId, string Content, bool IsError)> results) =>
        _messages.Add(new UserMessageParam
        {
            Content = results.Select(r => (ContentBlockParam)new ToolResultBlockParam
            {
                ToolUseID = r.CallId, Content = r.Content, IsError = r.IsError,
            }).ToList(),
        });

    public void AddUserText(string text) => _messages.Add(new UserMessageParam { Content = text });
}
