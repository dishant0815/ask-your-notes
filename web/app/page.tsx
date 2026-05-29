"use client";
// Documents list. Calls GET /docs on mount and renders cards with a hover lift.

import { useEffect, useState } from "react";
import Link from "next/link";
import { listDocuments, type DocumentSummary } from "@/lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listDocuments();
        if (!cancelled) setDocs(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your documents</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Notes the chatbot can answer from.
          </p>
        </div>
        <Link
          href="/upload"
          className="gradient-accent-bg rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md focus-accent"
        >
          + Upload
        </Link>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="typing-dot" />
          <span className="typing-dot" style={{ animationDelay: "200ms" }} />
          <span className="typing-dot" style={{ animationDelay: "400ms" }} />
          <span className="ml-1">Loading…</span>
        </div>
      )}

      {error && (
        <div className="animate-fade-in-up rounded-2xl border border-red-300/60 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          <strong>Couldn&apos;t load documents.</strong> Is the backend running at the URL in <code>.env.local</code>?
          <div className="mt-1 opacity-75">{error}</div>
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="animate-fade-in-up surface rounded-2xl p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full gradient-accent-bg text-xl text-white">
            ✨
          </div>
          <p className="text-zinc-700 dark:text-zinc-300">No notes yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            <Link href="/upload" className="text-[color:var(--accent)] underline-offset-2 hover:underline">
              Upload your first one
            </Link>{" "}
            to start asking questions.
          </p>
        </div>
      )}

      {!loading && !error && docs.length > 0 && (
        <ul className="grid gap-3">
          {docs.map((d, i) => (
            <li
              key={d.documentId}
              className="animate-fade-in-up surface group flex items-center gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[color:var(--accent)]/40"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl surface-muted text-lg">
                📄
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.fileName}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(d.uploadedAtUtc).toLocaleString()} ·{" "}
                  <span className="text-[color:var(--accent)]">
                    {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
