using AskYourNotes.Application.Abstractions;
using AskYourNotes.Domain;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace AskYourNotes.Infrastructure.Persistence;

// Implements IDocumentStore against EF Core + pgvector.
// The similarity search uses a small piece of raw SQL on purpose -- it makes
// the pgvector mechanics visible (the <=> cosine-distance operator).
public class DocumentStore : IDocumentStore
{
    private readonly AppDbContext _db;

    public DocumentStore(AppDbContext db) { _db = db; }

    public async Task<Document> SaveDocumentAsync(
        string fileName,
        IReadOnlyList<string> chunkTexts,
        IReadOnlyList<float[]> chunkEmbeddings,
        CancellationToken ct = default)
    {
        if (chunkTexts.Count != chunkEmbeddings.Count)
            throw new ArgumentException("Chunk texts and embeddings must have the same count.");

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            FileName = fileName,
            UploadedAtUtc = DateTime.UtcNow,
        };

        for (int i = 0; i < chunkTexts.Count; i++)
        {
            doc.Chunks.Add(new Chunk
            {
                Id = Guid.NewGuid(),
                DocumentId = doc.Id,
                Ordinal = i,
                Text = chunkTexts[i],
                Embedding = new Vector(chunkEmbeddings[i]),
            });
        }

        _db.Documents.Add(doc);
        await _db.SaveChangesAsync(ct);
        return doc;
    }

    public async Task<IReadOnlyList<SourceChunk>> SearchAsync(
        float[] queryEmbedding,
        int topK,
        CancellationToken ct = default)
    {
        var queryVec = new Vector(queryEmbedding);

        // <=> is pgvector's COSINE DISTANCE operator. Smaller = more similar.
        // We join Documents so we can return the file name for citations.
        var rows = await _db.Database.SqlQuery<TopChunkRow>($"""
            SELECT c."Id"          AS "Id",
                   c."DocumentId"  AS "DocumentId",
                   c."Ordinal"     AS "Ordinal",
                   c."Text"        AS "Text",
                   d."FileName"    AS "FileName"
            FROM "Chunks" c
            JOIN "Documents" d ON d."Id" = c."DocumentId"
            ORDER BY c."Embedding" <=> {queryVec}
            LIMIT {topK}
        """).ToListAsync(ct);

        return rows
            .Select(r => new SourceChunk(r.DocumentId, r.FileName, r.Ordinal, r.Text))
            .ToList();
    }

    public async Task<IReadOnlyList<Document>> ListDocumentsAsync(CancellationToken ct = default)
        => await _db.Documents
            .AsNoTracking()
            .OrderByDescending(d => d.UploadedAtUtc)
            .ToListAsync(ct);

    // Tiny row type used only as a SqlQuery projection target.
    private record TopChunkRow(Guid Id, Guid DocumentId, int Ordinal, string Text, string FileName);
}
