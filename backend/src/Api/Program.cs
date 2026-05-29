using AskYourNotes.Application.Asking;
using AskYourNotes.Application.Ingestion;
using AskYourNotes.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// EF Core + Gemini + chunker + extractor + orchestration services -- all in one call.
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// --- Health check ---------------------------------------------------------
app.MapGet("/", () => "Ask Your Notes API is running.");

// --- GET /docs ------------------------------------------------------------
// List every uploaded document, newest first. The Android "Documents" screen
// calls this to populate its list. We project to a small DTO so we never
// accidentally serialize the 3072-number embedding column to the client.
app.MapGet("/docs", async (AppDbContext db, CancellationToken ct) =>
{
    var docs = await db.Documents
        .OrderByDescending(d => d.UploadedAtUtc)
        .Select(d => new
        {
            documentId = d.Id,
            fileName = d.FileName,
            uploadedAtUtc = d.UploadedAtUtc,
            chunkCount = d.Chunks.Count
        })
        .ToListAsync(ct);
    return Results.Ok(docs);
});

// --- POST /docs -----------------------------------------------------------
// Upload a .txt or .pdf. The backend extracts text, chunks it (~1000 chars,
// ~100 overlap), embeds each chunk via Gemini, and stores everything in
// Postgres + pgvector. Returns the new DocumentId and the chunk count.
app.MapPost("/docs", async (HttpRequest req, DocumentIngestionService ingest, CancellationToken ct) =>
{
    if (!req.HasFormContentType)
        return Results.BadRequest(new { error = "Send a multipart/form-data request with a 'file' field." });

    var form = await req.ReadFormAsync(ct);
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "No file uploaded (expected form field 'file')." });

    try
    {
        await using var stream = file.OpenReadStream();
        var result = await ingest.IngestAsync(stream, file.FileName, ct);
        return Results.Ok(result);
    }
    catch (NotSupportedException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.DisableAntiforgery();   // a simple personal API; no CSRF token required for now.

// --- POST /ask ------------------------------------------------------------
// Body: { "question": "..." }
// Returns: { "answer": "...", "sources": [ { documentId, fileName, ordinal, snippet }, ... ] }
app.MapPost("/ask", async (AskRequest body, AskService ask, CancellationToken ct) =>
{
    if (body is null || string.IsNullOrWhiteSpace(body.Question))
        return Results.BadRequest(new { error = "Body must include a non-empty 'question'." });

    var result = await ask.AskAsync(body.Question, ct);
    return Results.Ok(result);
});

app.Run();

// Request DTO for /ask. Top-level record next to Program.cs keeps it discoverable.
public record AskRequest(string Question);
