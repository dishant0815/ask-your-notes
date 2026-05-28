using AskYourNotes.Domain;

namespace AskYourNotes.Application.Abstractions;

// Contract for "the place documents and their chunks are persisted".
// Hides EF Core / Postgres / pgvector from the rest of the app.
public interface IDocumentStore
{
    Task<Document> SaveDocumentAsync(
        string fileName,
        IReadOnlyList<string> chunkTexts,
        IReadOnlyList<float[]> chunkEmbeddings,
        CancellationToken ct = default);

    Task<IReadOnlyList<SourceChunk>> SearchAsync(
        float[] queryEmbedding,
        int topK,
        CancellationToken ct = default);

    Task<IReadOnlyList<Document>> ListDocumentsAsync(CancellationToken ct = default);
}
