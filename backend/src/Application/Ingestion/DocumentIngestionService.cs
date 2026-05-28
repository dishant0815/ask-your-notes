using AskYourNotes.Application.Abstractions;

namespace AskYourNotes.Application.Ingestion;

// Result returned to the API after a successful upload.
public record IngestionResult(Guid DocumentId, string FileName, int ChunkCount);

// Orchestrates the /docs pipeline:
//   file -> extract text -> chunk -> embed each chunk -> store.
// Knows NOTHING about Postgres, Gemini, or PDF parsing -- only contracts.
public class DocumentIngestionService
{
    private readonly IDocumentTextExtractor _extractor;
    private readonly ITextChunker _chunker;
    private readonly IEmbeddingService _embeddings;
    private readonly IDocumentStore _store;

    public DocumentIngestionService(
        IDocumentTextExtractor extractor,
        ITextChunker chunker,
        IEmbeddingService embeddings,
        IDocumentStore store)
    {
        _extractor = extractor;
        _chunker = chunker;
        _embeddings = embeddings;
        _store = store;
    }

    public async Task<IngestionResult> IngestAsync(
        Stream fileStream,
        string fileName,
        CancellationToken ct = default)
    {
        // 1. Extract raw text (.txt as-is; .pdf via PdfPig).
        var text = _extractor.Extract(fileStream, fileName);
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException(
                $"No extractable text in '{fileName}'. " +
                "(Scanned/image-only PDFs would need OCR -- out of scope for the MVP.)");

        // 2. Slice into ~1000-char chunks with ~100-char overlap (ADR-0005).
        var chunkTexts = _chunker.Chunk(text);
        if (chunkTexts.Count == 0)
            throw new InvalidOperationException("Extracted text produced zero chunks.");

        // 3. Get an embedding (3072 floats) for each chunk in one batch call.
        var vectors = await _embeddings.EmbedManyAsync(chunkTexts, ct);

        // 4. Persist the Document + its Chunks (with embeddings) to Postgres.
        var doc = await _store.SaveDocumentAsync(fileName, chunkTexts, vectors, ct);

        return new IngestionResult(doc.Id, doc.FileName, chunkTexts.Count);
    }
}
