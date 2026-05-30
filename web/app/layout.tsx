import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthGate from "./AuthGate";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ask Your Notes",
  description: "Personal RAG: ask questions about your own notes, grounded with citations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-[color:var(--background)]/70 border-b border-[color:var(--border)]">
          <nav className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
              <span className="gradient-accent-text">Ask</span>
              <span>Your Notes</span>
            </Link>
            <div className="ml-auto flex gap-1 text-sm">
              <NavLink href="/">Documents</NavLink>
              <NavLink href="/upload">Upload</NavLink>
              <NavLink href="/chat">Chat</NavLink>
            </div>
          </nav>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 animate-fade-in-up">
          <AuthGate>{children}</AuthGate>
        </main>
        <footer className="mx-auto w-full max-w-3xl px-6 py-6 text-xs text-zinc-500">
          A learning project &middot;{" "}
          <a
            className="underline decoration-[color:var(--accent)]/50 underline-offset-2 hover:decoration-[color:var(--accent)]"
            href="https://github.com/dishant0815/ask-your-notes"
            target="_blank"
            rel="noreferrer"
          >
            repo
          </a>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
    >
      {children}
    </Link>
  );
}
