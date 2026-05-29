"use client";
// Chat page: a list of Q/A turns. Each turn calls POST /ask and renders the
// answer plus an expandable "n sources" panel. Strict grounding means the
// answer can be "I couldn't find that in your notes." -- still shows sources.

import { useState } from "react";
import { ask, type AskResult } from "@/lib/api";

type Turn = {
  question: string;
  result?: AskResult;
  error?: string;
  pending?: boolean;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    setTurns((t) => [...t, { question: q, pending: true }]);
    const idx = turns.length; // index this new turn will occupy
    try {
      const result = await ask(q);
      setTurns((t) => t.map((turn, i) => (i === idx ? { question: q, result } : turn)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTurns((t) => t.map((turn, i) => (i === idx ? { question: q, error: msg } : turn)));
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ask your notes</h1>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What did Priya say about the dashboard?"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Ask
        </button>
      </form>

      {turns.length === 0 && (
        <p className="text-sm text-zinc-500">
          Ask anything that might be in your uploaded notes. The bot only answers from your documents — if it can&apos;t find an answer there, it&apos;ll say so.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {turns.map((turn, i) => (
          <article key={i} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">You</div>
            <div className="font-medium">{turn.question}</div>

            <div className="text-xs uppercase tracking-wide text-zinc-500 pt-2">Answer</div>
            {turn.pending && <p className="text-sm text-zinc-500">Thinking…</p>}

            {turn.error && (
              <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {turn.error}
              </p>
            )}

            {turn.result && (
              <>
                <p className="whitespace-pre-wrap leading-relaxed">{turn.result.answer}</p>
                {turn.result.sources.length > 0 && (
                  <details className="mt-2 rounded-md border border-zinc-200 dark:border-zinc-800">
                    <summary className="cursor-pointer px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {turn.result.sources.length} source
                      {turn.result.sources.length === 1 ? "" : "s"}
                    </summary>
                    <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {turn.result.sources.map((s) => (
                        <li key={`${s.documentId}-${s.ordinal}`} className="p-3 text-sm">
                          <div className="mb-1 text-xs text-zinc-500">
                            {s.fileName} · chunk #{s.ordinal}
                          </div>
                          <blockquote className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                            {s.snippet.length > 400 ? s.snippet.slice(0, 400) + "…" : s.snippet}
                          </blockquote>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
