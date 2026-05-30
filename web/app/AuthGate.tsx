"use client";
// Renders children if the user has stored a password; otherwise shows a
// login screen. Listens for password changes (including 401-triggered
// clears from lib/api.ts and changes from other tabs) and re-renders.

import { useEffect, useState } from "react";
import { getPassword, onAuthChanged, setPassword } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  // null = still resolving on the client (SSR-safe). true/false = decided.
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");

  useEffect(() => {
    setAuthed(!!getPassword());
    return onAuthChanged(() => setAuthed(!!getPassword()));
  }, []);

  if (authed === null) return null;     // brief blank on first paint, avoids flash
  if (authed) return <>{children}</>;

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = pw.trim();
          if (v) setPassword(v);
        }}
        className="surface animate-fade-in-up w-full max-w-sm rounded-2xl p-8 shadow-lg"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full gradient-accent-bg text-xl text-white shadow-sm animate-pulse-glow">
            🔒
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="gradient-accent-text">Unlock</span> Ask Your Notes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Shared password protects the demo from public abuse.
          </p>
        </div>

        <label className="block text-xs font-medium text-zinc-500 mb-1">
          Password
        </label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
        />

        <button
          type="submit"
          disabled={!pw.trim()}
          className="gradient-accent-bg mt-4 w-full rounded-full py-2 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40 disabled:hover:translate-y-0 focus-accent"
        >
          Unlock
        </button>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Don&apos;t have the password? Ask the owner of this demo.
        </p>
      </form>
    </div>
  );
}
