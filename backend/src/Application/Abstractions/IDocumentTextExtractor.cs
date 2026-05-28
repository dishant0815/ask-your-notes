namespace AskYourNotes.Application.Abstractions;

// Contract for "given a file stream, give me the raw text".
// Supports .txt and .pdf for the MVP; chooses by file name.
public interface IDocumentTextExtractor
{
    string Extract(Stream content, string fileName);
}
