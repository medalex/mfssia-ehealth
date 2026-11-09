using System.Text;
using System.Text.Json;

namespace Pilot.Reporting;

/// <summary>Append-only JSONL log of one run: prompts, model turns, tool calls, MFSSIA answers, decision, audit.</summary>
public sealed class Transcript
{
    private readonly string? _path;
    private readonly JsonSerializerOptions _json;

    /// <param name="path">The .jsonl file, created empty; null writes nothing.</param>
    public Transcript(string? path, JsonSerializerOptions json)
    {
        (_path, _json) = (path, json);
        if (path is null) return;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, "");
    }

    /// <summary>A transcript that writes nothing (tests).</summary>
    public static Transcript None { get; } = new(null, JsonSerializerOptions.Default);

    /// <summary>Writes {"ts": ..., "kind": ..., ...payload} as one line; payload is any record or anonymous object.</summary>
    public void Write(string kind, object payload)
    {
        if (_path is null) return;
        using var buffer = new MemoryStream();
        using (var writer = new Utf8JsonWriter(buffer, new JsonWriterOptions { Encoder = _json.Encoder }))
        {
            writer.WriteStartObject();
            writer.WriteString("ts", DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff'+00:00'"));
            writer.WriteString("kind", kind);
            foreach (var property in JsonSerializer.SerializeToElement(payload, payload.GetType(), _json).EnumerateObject())
                property.WriteTo(writer);
            writer.WriteEndObject();
        }
        File.AppendAllText(_path, Encoding.UTF8.GetString(buffer.ToArray()) + "\n");
    }
}

public interface ITranscriptFactory
{
    /// <summary>The transcript of one run: {outDir}/transcripts/{runId}.jsonl.</summary>
    Transcript CreateForRun(string outDir, string runId);
}

public sealed class TranscriptFactory(JsonSerializerOptions json) : ITranscriptFactory
{
    public Transcript CreateForRun(string outDir, string runId) => new(Path.Combine(outDir, "transcripts", $"{runId}.jsonl"), json);
}
