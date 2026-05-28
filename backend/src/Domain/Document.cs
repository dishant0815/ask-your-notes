namespace AskYourNotes.Domain;

// A Document is one uploaded file (a .txt or .pdf) plus the chunks we sliced it into.
public class Document
{
    public Guid Id { get; set; }                       // unique id (a random GUID)
    public string FileName { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; }

    // One document has many chunks. This is the "parent -> children" link.
    public List<Chunk> Chunks { get; set; } = new();
}
