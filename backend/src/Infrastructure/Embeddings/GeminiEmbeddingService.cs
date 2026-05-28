using System.Net.Http.Json;
using System.Text.Json;
using AskYourNotes.Application.Abstractions;
using Microsoft.Extensions.Configuration;

namespace AskYourNotes.Infrastructure.Embeddings;

// Implements IEmbeddingService against Gemini's REST API directly.
// We use raw HTTP here (instead of the SK embedding generator) for two reasons:
//   1) The SK Google connector's embedding generator API has been in flux
//      across alpha versions; raw HTTP is stable and provider-documented.
//   2) Calling embedContent / batchEmbedContents directly makes the wire
//      format visible -- pedagogically clearer for a learning project.
public class GeminiEmbeddingService : IEmbeddingService
{
    private const string Model = "gemini-embedding-001";        // 3072 dims (ADR-0001)
    private const int BatchSize = 100;                          // Gemini :batchEmbedContents limit

    private readonly HttpClient _http;
    private readonly string _apiKey;

    public GeminiEmbeddingService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _apiKey = config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException(
                "Missing Gemini:ApiKey. Set it with: " +
                "`dotnet user-secrets --project src/Api set \"Gemini:ApiKey\" \"<your-key>\"`");
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:embedContent?key={_apiKey}";
        var body = new
        {
            model = $"models/{Model}",
            content = new { parts = new[] { new { text } } }
        };

        var resp = await _http.PostAsJsonAsync(url, body, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"Gemini embedContent failed: {(int)resp.StatusCode}. Body: {json}");

        using var doc = JsonDocument.Parse(json);
        var values = doc.RootElement.GetProperty("embedding").GetProperty("values");
        return ToFloatArray(values);
    }

    public async Task<IReadOnlyList<float[]>> EmbedManyAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        var all = new List<float[]>(texts.Count);

        // Slice into batches of <=100 (Gemini's :batchEmbedContents cap).
        for (int offset = 0; offset < texts.Count; offset += BatchSize)
        {
            var batch = texts.Skip(offset).Take(BatchSize).ToList();

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:batchEmbedContents?key={_apiKey}";
            var body = new
            {
                requests = batch.Select(t => new
                {
                    model = $"models/{Model}",
                    content = new { parts = new[] { new { text = t } } }
                }).ToArray()
            };

            var resp = await _http.PostAsJsonAsync(url, body, ct);
            var json = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
                throw new HttpRequestException(
                    $"Gemini batchEmbedContents failed: {(int)resp.StatusCode}. Body: {json}");

            using var doc = JsonDocument.Parse(json);
            var embeddings = doc.RootElement.GetProperty("embeddings");
            foreach (var e in embeddings.EnumerateArray())
            {
                all.Add(ToFloatArray(e.GetProperty("values")));
            }
        }

        return all;
    }

    private static float[] ToFloatArray(JsonElement arr)
    {
        var result = new float[arr.GetArrayLength()];
        int i = 0;
        foreach (var v in arr.EnumerateArray())
            result[i++] = v.GetSingle();
        return result;
    }
}
