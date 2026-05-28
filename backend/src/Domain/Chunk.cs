using Pgvector;

namespace AskYourNotes.Domain;

// A Chunk is one ~1000-character slice of a document, plus the embedding (meaning-vector)
// we computed for it. This is the row we search over when answering a question.
public class Chunk
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }               // which document this slice belongs to
    public Document? Document { get; set; }            // navigation back to the parent

    public int Ordinal { get; set; }                   // 0,1,2... position within the document
    public string Text { get; set; } = string.Empty;   // the actual slice of text

    // The 3072-number embedding from gemini-embedding-001. pgvector stores this
    // as a native "vector" column so Postgres can measure distance between chunks.
    public Vector? Embedding { get; set; }
}
