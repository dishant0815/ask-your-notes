// Thin typed client for the Ask Your Notes backend.
//
// One module, three calls -- the entire contract between the web app and the
// .NET API. Keeping it in one place means the rest of the app (pages,
// components) never builds a fetch by hand and the TypeScript types travel
// with every response.

import { clearPassword, getPassword } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5057";

// -- Errors -----------------------------------------------------------------

/** Thrown when the API rejects our credentials. UI re-shows the login screen. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

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

// -- Internal helpers -------------------------------------------------------

function authHeader(): HeadersInit {
  const pw = getPassword();
  return pw ? { Authorization: `Bearer ${pw}` } : {};
}

async function handleResponse(res: Response, label: string): Promise<Response> {
  if (res.status === 401) {
    clearPassword();
    throw new UnauthorizedError("Wrong password. Please re-enter.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${label} failed (${res.status}): ${body || res.statusText}`);
  }
  return res;
}

// -- Calls ------------------------------------------------------------------

/** GET /docs -- list all uploaded documents, newest first. */
export async function listDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch(`${BASE_URL}/docs`, {
    cache: "no-store",
    headers: authHeader(),
  });
  await handleResponse(res, "GET /docs");
  return res.json();
}

/** POST /docs (multipart) -- upload a .txt or .pdf, returns the new doc + chunk count. */
export async function uploadDocument(file: File): Promise<IngestResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/docs`, {
    method: "POST",
    body: form,
    headers: authHeader(),
  });
  await handleResponse(res, "POST /docs");
  return res.json();
}

/** POST /ask -- send a question, get an answer + source citations back. */
export async function ask(question: string): Promise<AskResult> {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ question }),
  });
  await handleResponse(res, "POST /ask");
  return res.json();
}
