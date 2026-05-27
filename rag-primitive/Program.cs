using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Text.Json;

// --- 1. Read the Gemini API key from user-secrets (stored outside the repo) ---
var config = new ConfigurationBuilder()
    .AddUserSecrets<Program>()
    .Build();

var apiKey = config["Gemini:ApiKey"];
if (string.IsNullOrWhiteSpace(apiKey))
{
    Console.WriteLine("No API key found. Store it once with:");
    Console.WriteLine("  dotnet user-secrets set \"Gemini:ApiKey\" \"YOUR_KEY_HERE\"");
    return;
}

// --- 2. The sentences we'll compare. One query, two candidate answers. ---
string query      = "How do I reset my password?";
string candidateA = "Steps to recover access when you've forgotten your login.";
string candidateB = "A delicious recipe for homemade banana bread.";

// --- 3. Turn each sentence into an embedding (a list of numbers capturing meaning) ---
using var http = new HttpClient();
float[] queryVec = await Embed(query);
float[] vecA     = await Embed(candidateA);
float[] vecB     = await Embed(candidateB);

// --- 4. Show what an embedding actually looks like ---
Console.WriteLine($"Each embedding is a list of {queryVec.Length} numbers.");
Console.WriteLine("First 8 numbers of the query's embedding:");
Console.WriteLine("  [" + string.Join(", ", queryVec.Take(8).Select(x => x.ToString("0.0000"))) + ", ... ]");
Console.WriteLine();

// --- 5. Compare meanings with cosine similarity (1.0 = same direction, 0 = unrelated) ---
double simA = CosineSimilarity(queryVec, vecA);
double simB = CosineSimilarity(queryVec, vecB);

Console.WriteLine($"Query:       \"{query}\"");
Console.WriteLine($"Candidate A: \"{candidateA}\"");
Console.WriteLine($"             similarity to query = {simA:0.000}");
Console.WriteLine($"Candidate B: \"{candidateB}\"");
Console.WriteLine($"             similarity to query = {simB:0.000}");
Console.WriteLine();
Console.WriteLine(simA > simB
    ? ">> Candidate A is closer in meaning to the query. (Correct!)"
    : ">> Candidate B is closer in meaning to the query.");

// --- helper: ask Gemini for the embedding of one piece of text ---
async Task<float[]> Embed(string text)
{
    const string model = "gemini-embedding-001";
    var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent?key={apiKey}";
    var body = new
    {
        model = $"models/{model}",
        content = new { parts = new[] { new { text } } }
    };

    var response = await http.PostAsJsonAsync(url, body);
    var json = await response.Content.ReadAsStringAsync();
    if (!response.IsSuccessStatusCode)
    {
        Console.WriteLine($"Gemini returned {(int)response.StatusCode}. Here's what it said:");
        Console.WriteLine(json);
        Environment.Exit(1);
    }

    using var doc = JsonDocument.Parse(json);
    return doc.RootElement
              .GetProperty("embedding")
              .GetProperty("values")
              .EnumerateArray()
              .Select(v => v.GetSingle())
              .ToArray();
}

// --- helper: cosine similarity = how aligned two vectors are, ignoring length ---
static double CosineSimilarity(float[] a, float[] b)
{
    double dot = 0, magA = 0, magB = 0;
    for (int i = 0; i < a.Length; i++)
    {
        dot  += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.Sqrt(magA) * Math.Sqrt(magB));
}
