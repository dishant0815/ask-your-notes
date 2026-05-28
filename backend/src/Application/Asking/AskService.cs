using AskYourNotes.Application.Abstractions;

namespace AskYourNotes.Application.Asking;

// DTO returned to /ask callers. "Citation" mirrors SourceChunk but is the
// stable API contract -- if SourceChunk gains internal fields, this stays clean.
public record Citation(Guid DocumentId, string FileName, int Ordinal, string Snippet);

public record AskResult(string Answer, IReadOnlyList<Citation> Sources);

// Orchestrates the /ask pipeline:
//   question -> embed -> top-k retrieve -> answer with strict grounding.
public class AskService
{
    private const int TopK = 5; // ADR-0005

    private readonly IEmbeddingService _embeddings;
    private readonly IDocumentStore _store;
    private readonly IAnswerService _answers;

    public AskService(
        IEmbeddingService embeddings,
        IDocumentStore store,
        IAnswerService answers)
    {
        _embeddings = embeddings;
        _store = store;
        _answers = answers;
    }

    public async Task<AskResult> AskAsync(string question, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(question))
            throw new ArgumentException("Question is empty.", nameof(question));

        // 1. Embed the question (3072 floats).
        var queryVec = await _embeddings.EmbedAsync(question, ct);

        // 2. Pull the top-5 nearest chunks by cosine distance (raw SQL via pgvector).
        var sources = await _store.SearchAsync(queryVec, TopK, ct);

        // 3. If retrieval found nothing, short-circuit honestly (ADR-0006).
        if (sources.Count == 0)
        {
            return new AskResult(
                "I couldn't find anything in your notes about that.",
                Array.Empty<Citation>());
        }

        // 4. Ask the LLM to answer using only those chunks.
        var answer = await _answers.AnswerAsync(question, sources, ct);

        var citations = sources
            .Select(s => new Citation(s.DocumentId, s.FileName, s.Ordinal, s.Snippet))
            .ToList();

        return new AskResult(answer, citations);
    }
}
