using System.Text;
using AskYourNotes.Application.Abstractions;
using UglyToad.PdfPig;

namespace AskYourNotes.Infrastructure.Extraction;

// Extracts raw text from .txt and .pdf streams.
// Scanned/image-only PDFs would need OCR -- explicitly out of MVP scope.
public class DocumentTextExtractor : IDocumentTextExtractor
{
    public string Extract(Stream content, string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        if (ext == ".txt")
        {
            using var reader = new StreamReader(content);
            return reader.ReadToEnd();
        }

        if (ext == ".pdf")
        {
            // PdfPig needs a seekable stream; copy into memory to be safe.
            using var ms = new MemoryStream();
            content.CopyTo(ms);
            ms.Position = 0;

            using var pdf = PdfDocument.Open(ms);
            var sb = new StringBuilder();
            foreach (var page in pdf.GetPages())
            {
                sb.AppendLine(page.Text);
            }
            return sb.ToString();
        }

        throw new NotSupportedException(
            $"Unsupported file type '{ext}'. Supported: .txt, .pdf");
    }
}
