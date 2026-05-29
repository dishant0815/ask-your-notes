"use client";
// Upload page: file picker + status. Drag-drop visual is CSS-only -- the input
// itself covers the drop zone with opacity-0 so any native drop works.

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
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Upload a document</h1>
        <p className="mt-1 text-sm text-zinc-500">
          We&apos;ll chunk it (~1000 chars), embed each piece with Gemini, and store everything in pgvector.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="surface group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border)] p-10 text-center transition-colors hover:border-[color:var(--accent)]/60 hover:bg-[color:var(--accent-soft)]">
          <input
            type="file"
            accept=".txt,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {!file ? (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full gradient-accent-bg text-xl text-white">
                ↑
              </div>
              <p className="text-sm font-medium">
                Click to choose a file, or drop one here
              </p>
              <p className="mt-1 text-xs text-zinc-500">.txt or .pdf</p>
            </>
          ) : (
            <div className="flex items-center gap-3 animate-fade-in-up">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl surface-muted text-lg">
                📄
              </div>
              <div className="text-left">
                <div className="font-medium">{file.name}</div>
                <div className="text-xs text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB · ready to upload
                </div>
              </div>
            </div>
          )}
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || status === "uploading"}
            className="gradient-accent-bg rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm focus-accent"
          >
            {status === "uploading" ? (
              <span className="flex items-center gap-2">
                <span className="typing-dot bg-white" style={{ background: "white" }} />
                <span className="typing-dot" style={{ background: "white", animationDelay: "200ms" }} />
                <span className="typing-dot" style={{ background: "white", animationDelay: "400ms" }} />
                <span className="ml-1">Uploading</span>
              </span>
            ) : (
              "Upload"
            )}
          </button>
          <Link href="/" className="text-sm text-zinc-500 hover:text-[color:var(--accent)]">
            Back to documents
          </Link>
        </div>
      </form>

      {result && (
        <div className="animate-fade-in-up mt-6 rounded-2xl border border-emerald-300/60 bg-emerald-50/80 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
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
        <div className="animate-fade-in-up mt-6 rounded-2xl border border-red-300/60 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          <strong>Upload failed.</strong>
          <div className="mt-1 opacity-75">{error}</div>
        </div>
      )}
    </section>
  );
}
