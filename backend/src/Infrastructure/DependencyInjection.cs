using AskYourNotes.Application.Abstractions;
using AskYourNotes.Application.Asking;
using AskYourNotes.Application.Ingestion;
using AskYourNotes.Infrastructure.Answers;
using AskYourNotes.Infrastructure.Chunking;
using AskYourNotes.Infrastructure.Embeddings;
using AskYourNotes.Infrastructure.Extraction;
using AskYourNotes.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pgvector.EntityFrameworkCore;

namespace AskYourNotes.Infrastructure;

// One-stop DI registration: the Api project just calls AddInfrastructure(config)
// and gets EF Core + Gemini + chunker + extractor + orchestration services.
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        // EF Core + Postgres + pgvector type mapping.
        services.AddDbContext<AppDbContext>(opts => opts
            .UseNpgsql(
                config.GetConnectionString("Postgres"),
                npgsql => npgsql.UseVector()));

        // Embedding service uses HttpClient -- HttpClientFactory manages lifetime.
        services.AddHttpClient<IEmbeddingService, GeminiEmbeddingService>();

        // The Gemini chat answer service. Singleton: builds a Kernel once.
        services.AddSingleton<IAnswerService, GeminiAnswerService>();

        // Chunker (ADR-0005 defaults: 1000 chars, 100 overlap). Stateless -> singleton.
        services.AddSingleton<ITextChunker>(_ => new SimpleTextChunker(chunkSize: 1000, overlap: 100));

        // PDF / text extractor. Stateless -> singleton.
        services.AddSingleton<IDocumentTextExtractor, DocumentTextExtractor>();

        // Per-request persistence + orchestration services.
        services.AddScoped<IDocumentStore, DocumentStore>();
        services.AddScoped<DocumentIngestionService>();
        services.AddScoped<AskService>();

        return services;
    }
}
