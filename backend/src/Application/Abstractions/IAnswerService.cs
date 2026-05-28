namespace AskYourNotes.Application.Abstractions;

// One chunk we're handing the LLM as context, plus the metadata to cite it.
public record SourceChunk(
    Guid DocumentId,
    string FileName,
    int Ordinal,
    string Snippet);

// Contract for "given a question and supporting chunks, produce an answer".
// The implementation is responsible for STRICT GROUNDING (ADR-0006):
// if the chunks don't contain the answer, the response must say so.
public interface IAnswerService
{
    Task<string> AnswerAsync(
        string question,
        IReadOnlyList<SourceChunk> sources,
        CancellationToken ct = default);
}
