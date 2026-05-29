import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
            <Link href="/" className="font-semibold">Ask Your Notes</Link>
            <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">Documents</Link>
              <Link href="/upload" className="hover:text-zinc-900 dark:hover:text-zinc-100">Upload</Link>
              <Link href="/chat" className="hover:text-zinc-900 dark:hover:text-zinc-100">Chat</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-6 py-4 text-xs text-zinc-500">
          A learning project &middot;{" "}
          <a
            className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
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
