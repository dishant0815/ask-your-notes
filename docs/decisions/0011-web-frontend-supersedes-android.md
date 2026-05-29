# ADR-0011: Replace Native Android with a Next.js web frontend

- **Status:** Accepted (supersedes [ADR-0010](0010-android-stack-retrofit-mvvm.md))
- **Date:** 2026-05-29
- **Deciders:** Project owner

## Context

The original brief specified Native Android (Kotlin + Jetpack Compose) as the frontend, with the rationale *"this stack mirrors the one I manage in my real product."* [ADR-0010](0010-android-stack-retrofit-mvvm.md) then locked in Retrofit + MVVM as the way to build it.

Partway through Milestone 3 setup — after installing Android Studio but before scaffolding the project — the user paused and asked: *"Do we specifically need Android for this project?"*

That re-opened the question, and the honest answer was **no**. The backend is a plain HTTP API; any client that can `POST` JSON and form-data works.

Re-examining the underlying goals:

| Goal | How Android served it | How a web frontend serves it |
|---|---|---|
| Have a working personal RAG app | Yes, eventually | Yes, faster |
| Deploy publicly (Milestone 4) | Distribution friction: APK install, Play Store | Trivial: anyone visits a URL |
| Strong PM portfolio piece | Lower reach (people can't try it without effort) | High reach (clickable demo) |
| Learn the user's real product stack | Yes (if real product is Android-first) | No (but Next.js is a stack the user already ships) |
| Minimize learning curve in front of RAG | High — Kotlin + Compose + Gradle + emulator | Low — user already shipped Next.js (CashFlow13) |

The "mirror my real stack" rationale was real, but on reflection, the user's *other* goals (deploy publicly, portfolio reach, leverage existing skills) all point the same direction — web — and they outweigh the stack-mirroring benefit for this particular learning project.

## Decision

Replace the Native Android frontend with a **Next.js 15 web app** under `web/`.

### Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** (matches CashFlow13's conventions; least new ground for the user) |
| Component library | None initially — plain Tailwind. Add shadcn/ui later if needed. |
| HTTP from client | Native **`fetch`** — no library needed |
| State | React `useState` / `useEffect` per page; no Redux/Zustand for 3 pages |
| Package manager | **npm** (matches CashFlow13's lockfile) |

### Three pages (same product features as the original brief)

1. **Documents** (`/`) — list uploaded docs (calls `GET /docs`).
2. **Upload** (`/upload`) — file picker + progress (`POST /docs`).
3. **Chat** (`/chat`) — question, streamed-feel answer, expandable citations (`POST /ask`).

### Backend changes required

`POST /ask` and `POST /docs` need **CORS** enabled for the web origin (the browser refuses cross-origin requests by default). One-line addition to `Program.cs`.

## Alternatives considered

| Option | Why not |
|---|---|
| **Stick with Native Android (ADR-0010)** | Honors the original brief, but conflicts with the rest of the goals once they were named explicitly. The user is the customer here; the brief is just the customer's first guess. |
| **Skip the frontend entirely** | Honest option, considered. Rejected because the user wants a clickable demo for portfolio value. |
| **Plain HTML + JS, no framework** | Even faster than Next.js but loses routing, TypeScript, and the deployment polish (Vercel one-click). Not worth the corner-cutting. |
| **Different framework (SvelteKit, Astro, plain React + Vite)** | All defensible. Next.js wins because the user already ships it and the deploy path is well-trodden. |

## Consequences

- ✅ Faster path to a working MVP (the user's existing Next.js skill carries over).
- ✅ Public deployment becomes near-trivial (Vercel free tier, ~5 minutes).
- ✅ Anyone with the deployed URL can try the app — strongest portfolio reach.
- ✅ Lower cognitive load: no Kotlin / Compose / Gradle / emulator on top of the .NET + Postgres stack we already have to maintain.
- ⚠️ **Backend must enable CORS** for the web origin. Done as part of the M3 scaffold.
- ⚠️ We lose the stated stack-mirror benefit for Android. If the user later wants to also ship to a mobile native client, that's a separate (future) project on the same backend.
- ⚠️ The repository layout changes: `android/` is removed, `web/` takes its place. The empty `android/.gitkeep` deletion that was already staged gets rolled into the scaffold commit.
- ⚠️ Android Studio is installed but unused. Harmless on disk; can be uninstalled with `brew uninstall --cask android-studio` if desired.

### Note on process

This is the first ADR in this project that **supersedes** another. The pattern: write the new ADR, mark the old one as "Superseded by ADR-NNNN", link both ways. Never edit the old ADR's reasoning — preserving it is the point. Someone reading ADR-0010 will see exactly what we thought at the time and follow the link forward to see what changed.
