// Thin typed client for the Ask Your Notes backend.
//
// One module, three calls -- the entire contract between the web app and the
// .NET API. Keeping it in one place means the rest of the app (pages,
// components) never builds a fetch by hand and the TypeScript types travel
// with every response.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5057";

// -- Types mirror the backend DTOs -----------------------------------------

export type DocumentSummary = {
  documentId: string;
  fileName: string;
  uploadedAtUtc: string; // ISO 8601 from the server
  chunkCount: number;
};

export type IngestResult = {
  documentId: string;
  fileName: string;
  chunkCount: number;
};

export type Citation = {
  documentId: string;
  fileName: string;
  ordinal: number;
  snippet: string;
};

export type AskResult = {
  answer: string;
  sources: Citation[];
};

// -- Calls ------------------------------------------------------------------

/** GET /docs -- list all uploaded documents, newest first. */
export async function listDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch(`${BASE_URL}/docs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /docs failed: ${res.status} ${res.statusText}`);
  return res.json();
}

/** POST /docs (multipart) -- upload a .txt or .pdf, returns the new doc + chunk count. */
export async function uploadDocument(file: File): Promise<IngestResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/docs`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST /docs failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

/** POST /ask -- send a question, get an answer + source citations back. */
export async function ask(question: string): Promise<AskResult> {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST /ask failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}
