"use client";
// Chat page: user/assistant bubbles, animated typing indicator, sticky composer.

import { useEffect, useRef, useState } from "react";
import { ask, type AskResult } from "@/lib/api";

type Turn = {
  question: string;
  result?: AskResult;
  error?: string;
  pending?: boolean;
};

const EXAMPLES = [
  "What did Priya say about the dashboard?",
  "What's the morning routine that finally stuck?",
  "What's the gym programming for the next 8 weeks?",
];

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Smoothly scroll to the newest message whenever turns change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function send(q: string) {
    if (!q.trim()) return;
    setQuestion("");
    const idx = turns.length;
    setTurns((t) => [...t, { question: q, pending: true }]);
    try {
      const result = await ask(q);
      setTurns((t) => t.map((turn, i) => (i === idx ? { question: q, result } : turn)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTurns((t) => t.map((turn, i) => (i === idx ? { question: q, error: msg } : turn)));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(question);
  }

  return (
    <section className="flex h-[calc(100vh-13rem)] flex-col gap-4">
      {/* -- Conversation pane ------------------------------------------- */}
      <div className="flex-1 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="animate-fade-in-up flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-accent-bg text-2xl text-white shadow-lg animate-pulse-glow">
              ✨
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Ask <span className="gradient-accent-text">your notes</span> anything.
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                The bot only answers from your uploaded documents. If it can&apos;t find an answer, it&apos;ll say so.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => send(e)}
                  className="surface rounded-full px-3 py-1.5 text-xs text-zinc-600 transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)] dark:text-zinc-400"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-2">
            {turns.map((turn, i) => (
              <ChatTurn key={i} turn={turn} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* -- Composer (sticky bottom) ------------------------------------ */}
      <form
        onSubmit={handleSubmit}
        className="surface sticky bottom-4 flex items-center gap-2 rounded-full p-2 pl-5 shadow-lg backdrop-blur"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your notes…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="gradient-accent-bg flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40 disabled:hover:translate-y-0 focus-accent"
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </section>
  );
}

/* -- One Q + A pair --------------------------------------------------- */
function ChatTurn({ turn }: { turn: Turn }) {
  return (
    <div className="flex flex-col gap-3">
      {/* User bubble (right) */}
      <div className="animate-fade-in-up flex justify-end gap-2">
        <div className="gradient-accent-bg max-w-[80%] rounded-3xl rounded-br-lg px-4 py-2.5 text-sm text-white shadow-sm">
          {turn.question}
        </div>
        <Avatar tone="user">Y</Avatar>
      </div>

      {/* Assistant bubble (left) */}
      <div className="animate-fade-in-up flex justify-start gap-2" style={{ animationDelay: "60ms" }}>
        <Avatar tone="assistant">✨</Avatar>
        <div className="surface max-w-[85%] rounded-3xl rounded-bl-lg px-4 py-3 text-sm shadow-sm">
          {turn.pending && (
            <div className="flex items-center gap-1 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "200ms" }} />
              <span className="typing-dot" style={{ animationDelay: "400ms" }} />
            </div>
          )}
          {turn.error && (
            <p className="text-red-600 dark:text-red-400">{turn.error}</p>
          )}
          {turn.result && (
            <>
              <p className="whitespace-pre-wrap leading-relaxed">{turn.result.answer}</p>
              {turn.result.sources.length > 0 && (
                <details className="mt-3 rounded-xl border border-[color:var(--border)] surface-muted">
                  <summary className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-[color:var(--accent)]">
                    {turn.result.sources.length} source
                    {turn.result.sources.length === 1 ? "" : "s"}
                  </summary>
                  <ol className="divide-y divide-[color:var(--border)] px-3 pb-3">
                    {turn.result.sources.map((s) => (
                      <li key={`${s.documentId}-${s.ordinal}`} className="py-3 text-xs">
                        <div className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
                          {s.fileName}{" "}
                          <span className="text-[color:var(--accent)]">· chunk #{s.ordinal}</span>
                        </div>
                        <blockquote className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                          {s.snippet.length > 400 ? s.snippet.slice(0, 400) + "…" : s.snippet}
                        </blockquote>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ tone, children }: { tone: "user" | "assistant"; children: React.ReactNode }) {
  const base =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium select-none";
  if (tone === "user") {
    return <div className={`${base} surface-muted text-zinc-600 dark:text-zinc-300`}>{children}</div>;
  }
  return <div className={`${base} gradient-accent-bg text-white shadow-sm`}>{children}</div>;
}
