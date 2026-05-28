using AskYourNotes.Application.Abstractions;

namespace AskYourNotes.Infrastructure.Chunking;

// Char-based chunker with overlap (ADR-0005). For production you'd want
// boundary-aware splitting (don't cut mid-sentence) and token-based sizing.
public class SimpleTextChunker : ITextChunker
{
    private readonly int _chunkSize;
    private readonly int _overlap;

    public SimpleTextChunker(int chunkSize = 1000, int overlap = 100)
    {
        if (chunkSize <= 0) throw new ArgumentOutOfRangeException(nameof(chunkSize));
        if (overlap < 0 || overlap >= chunkSize) throw new ArgumentOutOfRangeException(nameof(overlap));
        _chunkSize = chunkSize;
        _overlap = overlap;
    }

    public IReadOnlyList<string> Chunk(string text)
    {
        var clean = (text ?? string.Empty).Trim();
        if (clean.Length == 0) return Array.Empty<string>();
        if (clean.Length <= _chunkSize) return new[] { clean };

        var step = _chunkSize - _overlap;
        var chunks = new List<string>();
        for (int i = 0; i < clean.Length; i += step)
        {
            int len = Math.Min(_chunkSize, clean.Length - i);
            chunks.Add(clean.Substring(i, len));
            if (i + len >= clean.Length) break;
        }
        return chunks;
    }
}
