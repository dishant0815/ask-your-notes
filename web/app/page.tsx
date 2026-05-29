"use client";
// The Documents list page. Calls GET /docs on mount and renders the list.
// "use client" makes this an interactive (client-side) component -- the default
// in App Router is server components, but we need state + effects here.

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
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Link
          href="/upload"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Upload
        </Link>
      </header>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <strong>Couldn&apos;t load documents.</strong> Is the backend running at the URL in <code>.env.local</code>?
          <br />
          <span className="opacity-75">{error}</span>
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No documents yet.{" "}
          <Link href="/upload" className="underline">
            Upload one
          </Link>{" "}
          to get started.
        </p>
      )}

      {!loading && !error && docs.length > 0 && (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {docs.map((d) => (
            <li key={d.documentId} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{d.fileName}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(d.uploadedAtUtc).toLocaleString()} · {d.chunkCount} chunk
                  {d.chunkCount === 1 ? "" : "s"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
