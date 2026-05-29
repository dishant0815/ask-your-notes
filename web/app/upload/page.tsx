"use client";
// Upload page: pick a .txt or .pdf, POST it to the backend, show what happened.

import { useState } from "react";
import Link from "next/link";
import { uploadDocument, type IngestResult } from "@/lib/api";

type Status = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("uploading");
    setError(null);
    setResult(null);
    try {
      const r = await uploadDocument(file);
      setResult(r);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Upload a document</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-white hover:file:bg-zinc-700 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-zinc-300"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || status === "uploading"}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {status === "uploading" ? "Uploading…" : "Upload"}
          </button>
          <Link href="/" className="text-sm text-zinc-600 hover:underline">
            Back to documents
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          Accepts .txt and .pdf. The file is chunked (~1000 chars), embedded via Gemini, and stored in pgvector.
        </p>
      </form>

      {result && (
        <div className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <strong>Uploaded.</strong> {result.fileName} was split into {result.chunkCount} chunk
          {result.chunkCount === 1 ? "" : "s"} and embedded.{" "}
          <Link href="/" className="underline">
            View documents
          </Link>{" "}
          or{" "}
          <Link href="/chat" className="underline">
            ask a question
          </Link>
          .
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <strong>Upload failed.</strong>
          <br />
          <span className="opacity-75">{error}</span>
        </div>
      )}
    </section>
  );
}
