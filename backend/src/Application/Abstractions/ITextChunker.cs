namespace AskYourNotes.Application.Abstractions;

// Contract for "split a document into ~1000-char index cards" (ADR-0005).
public interface ITextChunker
{
    IReadOnlyList<string> Chunk(string text);
}
