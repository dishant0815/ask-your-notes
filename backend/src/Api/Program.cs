using AskYourNotes.Application.Asking;
using AskYourNotes.Application.Ingestion;
using AskYourNotes.Infrastructure;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// --- Limits ---------------------------------------------------------------
// Two hard caps so a single request can't blow our free tier or token budget.
// See ADR-0012 for why these two layers were chosen over the full menu.
const long MaxUploadBytes = 5_000_000;   // 5 MB per uploaded file
const int  MaxQuestionChars = 1000;      // characters in /ask body.Question

builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = MaxUploadBytes;
});

builder.WebHost.ConfigureKestrel(o =>
{
    // Also caps oversized non-multipart bodies before they reach handlers.
    o.Limits.MaxRequestBodySize = MaxUploadBytes;
});

builder.Services.AddOpenApi();

// EF Core + Gemini + chunker + extractor + orchestration services -- all in one call.
builder.Services.AddInfrastructure(builder.Configuration);

// --- CORS -----------------------------------------------------------------
// Browsers refuse cross-origin requests by default. The Next.js dev server
// runs at http://localhost:3000; the deployed origin is added via the
// Cors:AllowedOrigins config (env: Cors__AllowedOrigins__0, etc.) in M4.
builder.Services.AddCors(options =>
{
    var allowed = builder.Configuration
        .GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? new[] { "http://localhost:3000" };

    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowed)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();   // must run before endpoint mapping for CORS headers to attach.

// --- Auth: shared password (ADR-0012) -------------------------------------
// Every protected endpoint requires `Authorization: Bearer <API_PASSWORD>`.
// Missing in Production = fail closed at startup. Missing in Development =
// API runs open with a loud warning, so local dev stays frictionless.
var apiPassword = builder.Configuration["API_PASSWORD"];
if (string.IsNullOrWhiteSpace(apiPassword) && !app.Environment.IsDevelopment())
{
    throw new InvalidOperationException(
        "API_PASSWORD environment variable is required outside Development.");
}

if (string.IsNullOrWhiteSpace(apiPassword))
{
    app.Logger.LogWarning(
        "API_PASSWORD is not set. Authentication is DISABLED for this Development run.");
}
else
{
    app.Use(async (ctx, next) =>
    {
        // Only /docs and /ask are gated; the health check at / stays public so
        // hosting platforms (Fly.io) can probe it. CORS preflight (OPTIONS)
        // passes through too -- the CORS middleware above handles it.
        var path = ctx.Request.Path.Value ?? "";
        var needsAuth =
            path.StartsWith("/docs", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/ask",  StringComparison.OrdinalIgnoreCase);

        if (!needsAuth || ctx.Request.Method == "OPTIONS")
        {
            await next();
            return;
        }

        const string scheme = "Bearer ";
        var auth = ctx.Request.Headers.Authorization.ToString();
        var ok = auth.StartsWith(scheme, StringComparison.OrdinalIgnoreCase)
              && string.Equals(auth[scheme.Length..], apiPassword, StringComparison.Ordinal);

        if (!ok)
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.Response.Headers.WWWAuthenticate = "Bearer";
            await ctx.Response.WriteAsJsonAsync(new { error = "Unauthorized." });
            return;
        }

        await next();
    });
}

// --- Health check ---------------------------------------------------------
app.MapGet("/", () => "Ask Your Notes API is running.");

// --- GET /docs ------------------------------------------------------------
// List every uploaded document, newest first. The web app's Documents page
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

    IFormCollection form;
    try
    {
        form = await req.ReadFormAsync(ct);
    }
    catch (InvalidDataException ex)
    {
        // Thrown when MultipartBodyLengthLimit is exceeded.
        return Results.BadRequest(new { error = $"Upload too large (max {MaxUploadBytes / 1_000_000} MB). {ex.Message}" });
    }

    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "No file uploaded (expected form field 'file')." });

    if (file.Length > MaxUploadBytes)
        return Results.BadRequest(new { error = $"File exceeds {MaxUploadBytes / 1_000_000} MB limit." });

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

    if (body.Question.Length > MaxQuestionChars)
        return Results.BadRequest(new { error = $"Question must be {MaxQuestionChars} characters or fewer." });

    var result = await ask.AskAsync(body.Question, ct);
    return Results.Ok(result);
});

app.Run();

// Request DTO for /ask. Top-level record next to Program.cs keeps it discoverable.
public record AskRequest(string Question);
