namespace AskYourNotes.Application.Abstractions;

// Contract for "turn text into a meaning-vector".
public interface IEmbeddingService
{
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
    Task<IReadOnlyList<float[]>> EmbedManyAsync(IReadOnlyList<string> texts, CancellationToken ct = default);
}
