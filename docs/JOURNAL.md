# Build Journal

A milestone-by-milestone, plain-language story of how this project was built. Each entry is a snapshot of *what we did, what we learned, and what we cut on purpose*. For the formal "why" behind each decision, see [`decisions/`](decisions/).

---

## Milestone 0 — Decisions & dev environment

**Dates:** 2026-05-26
**Commit:** [`4f8a3e6`](https://github.com/dishant0815/ask-your-notes/commit/4f8a3e6) (combined with Milestone 1)

### What we did

- Set the **teaching contract** for the project: plain-language first, pause at decisions, milestone-based delivery, glossary inline, narrate every runtime output.
- Locked in the **stack**: Android (Kotlin) → .NET 10 → Postgres 17 + pgvector → Semantic Kernel → Google Gemini (free tier).
- Locked in the **first round of decisions** (see ADRs):
  - Free hosted AI provider: **Google Gemini** ([ADR-0001](decisions/0001-provider-gemini-free-tier.md))
  - Container engine: **Colima**, not Docker Desktop ([ADR-0002](decisions/0002-container-engine-colima.md))
  - Secret storage: **`dotnet user-secrets`** ([ADR-0003](decisions/0003-secret-storage-user-secrets.md))
- Installed **.NET 10 SDK** (10.0.300) via Microsoft's no-sudo script.
- Installed **Colima** + `docker` + `docker-compose` via Homebrew.
- Created project skeleton: `backend/`, `infra/`, `rag-primitive/`, `android/`.

### What we learned

- Why installers ask for an admin password — `/usr/local` and system networking are protected, your home folder isn't.
- That Homebrew can install `.pkg` casks needing `sudo`, which is incompatible with non-interactive flows — so the `dotnet-install.sh` script became the right tool for .NET.
- The Clean Architecture analogy (front desk / managers / back office), as a preview of what the backend would look like.

### What we cut on purpose

- Did not install **Android Studio** yet — deferred to Milestone 3.
- Did not set up a CI pipeline yet — deferred to closer to Milestone 4.

---

## Milestone 1 — Tiny RAG primitive

**Dates:** 2026-05-26
**Commit:** [`4f8a3e6`](https://github.com/dishant0815/ask-your-notes/commit/4f8a3e6)

### What we did

- Wrote `infra/docker-compose.yml` to run **Postgres 17 + pgvector** locally, with a named volume so data survives container restarts.
- Verified pgvector by running a hand-typed distance query — `[1,2,3] <-> [1,2,4]` returned **1**, `[1,2,3] <-> [9,8,7]` returned **10.77**.
- Built a C# console app in `rag-primitive/`:
  - Reads the Gemini API key from `dotnet user-secrets` (with an environment-variable fallback).
  - Calls `gemini-embedding-001` for three sentences.
  - Prints the first 8 of each vector's 3072 numbers.
  - Computes **cosine similarity** between query and candidates.
  - Picked **"recover forgotten login"** (0.684) over **"banana bread"** (0.478) for the query *"How do I reset my password?"* — confirming meaning-based retrieval works.

### What we learned

- An embedding is *literally* a list of decimal numbers — no longer abstract.
- Similar meanings produce close vectors regardless of shared vocabulary.
- Gemini embeddings have a high baseline similarity — the **relative gap** matters, not absolute thresholds.
- The first version of the script failed with `HTTP 404`. Reading the **server's error body** (`models/text-embedding-004 is not found`) told us exactly the fix: switch to `gemini-embedding-001` (3072 dim).

### What we cut on purpose

- Hardcoded the demo sentences (no CLI args, no file input) — focus on the embedding concept, not script ergonomics.
- The script passes the API key in the URL query string. Easy and visible; for production you'd use the `x-goog-api-key` header or a per-request auth scheme. Noted in the source comments.

---

## Milestone 2 — Backend (in progress)

**Dates:** 2026-05-27 →
**Commits so far:** [`7872eb5`](https://github.com/dishant0815/ask-your-notes/commit/7872eb5)

### Step 1 — Product decisions

Locked in the design choices that shape the rest of the backend:

- Backend structure: **Clean Architecture + EF Core 10** ([ADR-0004](decisions/0004-backend-clean-architecture-ef-core.md))
- Chunking: **~1000 chars, ~100 overlap**; **top-k = 5** ([ADR-0005](decisions/0005-retrieval-chunking-and-topk.md))
- No-answer behavior: **strict grounding**; citations: **answer + source list** ([ADR-0006](decisions/0006-strict-grounding-and-citations.md))
- Deployment timing: **defer to Milestone 4** ([ADR-0007](decisions/0007-deploy-timing-after-mvp.md))
- Repo visibility: **public** ([ADR-0008](decisions/0008-public-github-repo.md))

### Step 2 — Solution scaffold

- Created `AskYourNotes.sln` and four projects under `backend/src/`: `Domain`, `Application`, `Infrastructure`, `Api`.
- Wired references in the Clean Architecture dependency direction (arrows point inward toward `Domain`).
- Initial `dotnet build`: succeeded with **0 warnings, 0 errors**.

### Step 3 — Data model and migration

- Added packages: `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.2, `Pgvector.EntityFrameworkCore` 0.3.0, `Pgvector` (Domain), `Microsoft.EntityFrameworkCore.Design` (Api).
- `Domain/Document.cs` — entity for an uploaded file (Id, FileName, UploadedAtUtc, Chunks).
- `Domain/Chunk.cs` — entity for one slice of a document, including the **`Vector? Embedding`** column (3072-dim).
- `Infrastructure/AppDbContext.cs` — EF Core's view of the DB; enables the `vector` extension, maps both entities, sets cascade-delete from `Document` → `Chunks`.
- `Api/Program.cs` — registers the DbContext with `UseNpgsql(...).UseVector()`.
- `appsettings.json` — local-only connection string (not a real secret; see [ADR-0003](decisions/0003-secret-storage-user-secrets.md) and [ADR-0008](decisions/0008-public-github-repo.md)).
- Installed the `dotnet-ef` global tool (10.0.8).
- Generated `InitialCreate` migration and applied it to the running Postgres container.
- Verified the schema in `psql`:
  - `Documents` table.
  - `Chunks` table with `Embedding vector(3072)`, foreign key to `Documents`, cascade on delete.
  - `__EFMigrationsHistory` records `InitialCreate`.

### What we learned (so far)

- An EF Core **migration** is schema-as-code: `Up()` builds it, `Down()` rolls it back. The bookkeeping table `__EFMigrationsHistory` makes it idempotent.
- **`Failed to connect to 127.0.0.1:5432`** is the canonical "container engine isn't running" symptom: `colima start` → `docker compose up -d`.
- Putting `Pgvector.Vector` directly on a Domain entity is a small Clean Architecture impurity — accepted as a pragmatic shortcut, would be mapped in Infrastructure in a stricter codebase.

### Step 4 — Endpoints (`/docs` and `/ask`)

- Added packages to `Infrastructure`: `Microsoft.SemanticKernel` 1.77.0, `Microsoft.SemanticKernel.Connectors.Google` 1.77.0-alpha, `UglyToad.PdfPig` 1.7.0-custom-5, `Microsoft.Extensions.Http`.
- Defined the Application contracts: `IEmbeddingService`, `IAnswerService`, `ITextChunker`, `IDocumentTextExtractor`, `IDocumentStore`, plus the `SourceChunk` record.
- Built the orchestration services in Application: `DocumentIngestionService` (used by `/docs`) and `AskService` (used by `/ask`, hard-codes top-k = 5).
- Implemented in Infrastructure:
  - `SimpleTextChunker` — char-based chunker with overlap (1000 / 100 defaults from [ADR-0005](decisions/0005-retrieval-chunking-and-topk.md)).
  - `DocumentTextExtractor` — `.txt` and `.pdf` via PdfPig (copies stream into memory first because PdfPig needs a seekable source).
  - `GeminiEmbeddingService` — **raw HTTP** against `:embedContent` / `:batchEmbedContents` (see [ADR-0009](decisions/0009-embeddings-raw-http-chat-semantic-kernel.md)).
  - `GeminiAnswerService` — Semantic Kernel `Kernel` + `IChatCompletionService` via `AddGoogleAIGeminiChatCompletion` (`gemini-2.5-flash`). System prompt enforces strict grounding per [ADR-0006](decisions/0006-strict-grounding-and-citations.md).
  - `DocumentStore` — EF Core for writes; raw SQL `SELECT … ORDER BY "Embedding" <=> {queryVec} LIMIT {topK}` for the vector search, via `Database.SqlQuery<TopChunkRow>(...)`.
  - `DependencyInjection.AddInfrastructure(IConfiguration)` — one-stop registration.
- `Api/Program.cs` now exposes:
  - `GET /` — health check.
  - `POST /docs` — `multipart/form-data` with a `file` field; returns `{ documentId, fileName, chunkCount }`.
  - `POST /ask` — JSON `{ "question": "..." }`; returns `{ answer, sources: [{ documentId, fileName, ordinal, snippet }] }`.
- Initialized `dotnet user-secrets` for the Api project.
- Added `samples/personal-notes.txt` for end-to-end testing.

### Step 4 — what we observed

- Build is clean: 0 warnings, 0 errors, even with the SK Google connector still in alpha (SKEXP0070 suppressed at the file level rather than globally, to keep the experimental scope narrow).
- The API boots in ~2 seconds; `GET /` returns immediately.
- The first time the engine had stopped between sessions (laptop sleep): `Failed to connect to docker.sock` recovered with `colima start` then `docker compose up -d`. Same pattern as Milestone 2 / Step 3.

### Step 5 — End-to-end test

Set the Gemini key into the Api project's user-secrets, then:

```bash
# Start the API in Development (so user-secrets loads -- see "gotcha" below).
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS="http://127.0.0.1:5057" \
  dotnet run --project src/Api --no-launch-profile

# Upload the sample notes.
curl -X POST -F "file=@samples/personal-notes.txt" http://127.0.0.1:5057/docs
# -> { "documentId": "9ae97145-...", "fileName": "personal-notes.txt", "chunkCount": 3 }

# Positive test -- should answer from the notes.
curl -X POST -H "Content-Type: application/json" \
  -d '{"question":"What is the morning routine that finally stuck?"}' \
  http://127.0.0.1:5057/ask
# -> answer: "...wake at 6:15, drink a full glass of water before phone..."
#    sources: chunk 0 (the morning-routine paragraph) cited correctly.

# Negative test -- NOT in the notes; must refuse.
curl -X POST -H "Content-Type: application/json" \
  -d '{"question":"What is the capital of France?"}' \
  http://127.0.0.1:5057/ask
# -> answer: "I couldn't find that in your notes."
#    sources: closest chunks still returned (top-k is unconditional), but the
#    LLM correctly refused to answer from general knowledge.
```

Database state after the run:

```
document_count = 1
chunk_count    = 3   (avg 820 chars per chunk, target 1000)
```

### Gotcha worth remembering

`dotnet run --no-launch-profile` defaults to **`ASPNETCORE_ENVIRONMENT=Production`**, and **user-secrets only load in `Development`**. First test attempt returned `HTTP 500` with `Missing Gemini:ApiKey` even though the key was correctly set — the API just wasn't being told to look there. Setting `ASPNETCORE_ENVIRONMENT=Development` before `dotnet run` fixed it. The launch-profile (`Properties/launchSettings.json`) normally handles this for you; if you run without it, set the env variable yourself.

### What we learned

- **End-to-end RAG actually works on our stack.** Upload → chunk → embed → store → retrieve → answer + citations, all green.
- **Strict grounding (ADR-0006) is not just a setting; it is a tested behavior.** The negative test is the proof — a naïve setup would have answered "Paris."
- **Two stale-process gotchas** that are useful to recognize:
  - `dotnet run` in the background isn't fully killed by `kill <pid>` on the shell wrapper — the child .NET process can linger and hold the port. `pkill -f "AskYourNotes.Api"` is the reliable cleanup.
  - The "address already in use" stack trace from Kestrel tells you immediately: something is on your port. `lsof -nP -iTCP:<port> -sTCP:LISTEN` shows what.
- **The `Hosting environment: Production` log line at startup is a first-class diagnostic** — when a working app suddenly stops finding its config, check that line first.

### Milestone 2 — complete

`POST /docs` and `POST /ask` are working end-to-end. The backend is the full RAG MVP.

---

## Milestone 3 — Web frontend

**Dates:** 2026-05-29 → 2026-05-30
**Commits:** [`25b8526`](https://github.com/dishant0815/ask-your-notes/commit/25b8526), [`16448c6`](https://github.com/dishant0815/ask-your-notes/commit/16448c6), [`f90f387`](https://github.com/dishant0815/ask-your-notes/commit/f90f387), [`427dda5`](https://github.com/dishant0815/ask-your-notes/commit/427dda5), [`17abff1`](https://github.com/dishant0815/ask-your-notes/commit/17abff1), [`8092a7d`](https://github.com/dishant0815/ask-your-notes/commit/8092a7d)

### What we did

- **Added `GET /docs`** to the backend so a frontend list view has something to render. Newest-first, projects to a small DTO so the 3072-dim embedding can never accidentally serialize.
- **Started down the Android path.** Installed Android Studio via Homebrew, wrote [ADR-0010](decisions/0010-android-stack-retrofit-mvvm.md) committing to Retrofit + MVVM + Compose + manual DI. Then…
- **Pivoted to a web frontend mid-build.** The user paused before any Android code was written and asked, *"Do we specifically need Android for this project?"* That was the right PM question. The brief had said Android because *"the stack mirrors my real product"*, but the project's other goals — deploy publicly, portfolio reach, leverage existing skills, minimize cognitive load — all pointed to web. [ADR-0011](decisions/0011-web-frontend-supersedes-android.md) supersedes ADR-0010 with the new direction; the old ADR is preserved (not deleted) so future readers see the reasoning at the time and the link forward to what changed. **The first supersede in the project's ADR history.**
- **Scaffolded a Next.js 16.2.6 app** under `web/` via `create-next-app` (App Router, TypeScript, Tailwind v4, ESLint, npm). Added `lib/api.ts` — a thin typed client that wraps `GET /docs`, `POST /docs`, `POST /ask` in one module so the rest of the app never builds a fetch by hand.
- **Enabled CORS** on the backend (`AddCors` reading `Cors:AllowedOrigins` from config; `UseCors` before endpoint mapping). Browsers refuse cross-origin requests by default; without this, every `fetch` from Next dev would have been blocked.
- **Built three pages.** All `"use client"` because each holds state + calls the backend:
  - `app/page.tsx` (Documents) — `GET /docs`, friendly empty/error states.
  - `app/upload/page.tsx` (Upload) — file picker, `POST /docs`, success state.
  - `app/chat/page.tsx` (Chat) — Q/A turns, `POST /ask`, expandable source citations. Strict-grounding answers like *"I couldn't find that in your notes"* still render with sources, because top-k is unconditional.
- **Polished the UI into a real chatbot feel.** Soft indigo→violet accent palette in CSS variables, custom keyframes (`fadeInUp`, `typingDot`, `pulseGlow`) registered via `@layer utilities`, no animation libraries. Sticky blurred header with gradient brand wordmark; document cards with hover-lift; drag-and-drop style upload zone; right-aligned gradient user bubbles, left-aligned assistant bubbles with sparkle avatars, animated three-dot typing indicator, sticky composer pill, fade-and-slide on each new message, example-prompt chips on the empty state.
- **User-tested end to end.** Upload, positive ask, negative ask (out-of-notes refusal), all good. Both the curl path *and* the browser-driven path now prove RAG works.

### What we learned

- **The brief is the customer's first guess, not the spec.** Naming the underlying goals out loud (portfolio reach, deploy publicly, etc.) was what flipped the right decision. Worth doing earlier next time.
- **ADR supersede is the right pattern.** Reading the supersede chain (0010 → 0011) tells the story; rewriting 0010 in place would have erased it.
- **Tailwind v4's `@theme` + CSS-variable accent is enough for a real-feeling product.** Whole app re-skin = one file (`globals.css`) plus four CSS variables. No framework lock-in.
- **Next.js 16 has breaking changes vs prior versions.** The auto-generated `AGENTS.md` in the project warned us to consult `node_modules/next/dist/docs/` rather than rely on training data. Useful pattern.

### Gotchas worth remembering

- **`Hosting environment: Production` + missing user-secrets** — same trap as Milestone 2; user-secrets only load in `Development`. `--no-launch-profile` skips the `launchSettings.json` that would have set this for you.
- **Stale dev servers hold ports.** `kill <pid>` of a shell wrapper doesn't always reach the .NET / Next child. `pkill -f` on the executable name is the reliable cleanup. `lsof -nP -iTCP:<port> -sTCP:LISTEN` tells you what's there.

### Milestone 3 — complete

The web app is the working interface to the RAG backend, with the citations / strict-grounding contract from ADR-0006 fully exposed in the UI.

**Next:** Milestone 4 — make it public. Containerize the backend, add defense in depth ([ADR-0012](decisions/0012-public-deployment-defense-in-depth.md): shared password + size limits + per-IP rate limit + per-IP daily question cap), set a Gemini quota cap, then deploy: Neon (Postgres+pgvector), Fly.io (the .NET container), Vercel (the Next.js app).

---

## Milestone 4 — Defense in depth, then a deliberate stop

**Dates:** 2026-05-30
**Commits:** [`d7d003a`](https://github.com/dishant0815/ask-your-notes/commit/d7d003a), [`2637bd2`](https://github.com/dishant0815/ask-your-notes/commit/2637bd2), [`8d9feff`](https://github.com/dishant0815/ask-your-notes/commit/8d9feff), [`e3ad34b`](https://github.com/dishant0815/ask-your-notes/commit/e3ad34b), [`98077ae`](https://github.com/dishant0815/ask-your-notes/commit/98077ae) + this commit

### What we did

- **Picked an auth strategy** for the public-`/ask` problem (anyone with the URL spends your Gemini quota). Started with a four-layer defense-in-depth plan ([ADR-0012](decisions/0012-public-deployment-defense-in-depth.md): shared password + request size limits + per-IP rate limit + per-IP daily `/ask` cap + a Gemini quota cap set in AI Studio).
- **Trimmed it** to two layers when the project owner pushed back on whether all four were load-bearing. Honest re-assessment: shared password + size limits are real protection; the rate limiters mostly overlap with Google's free-tier built-in daily cap. ADR-0012 was **amended** with that reasoning rather than rewritten.
- **Implemented the trimmed plan:**
  - Backend (`backend/src/Api/Program.cs`): `API_PASSWORD` env-var-driven middleware gates `/docs` and `/ask`; `/` stays public for platform health checks. CORS preflights pass through. Missing password in Production fails closed at startup; missing in Development logs a loud warning. 5 MB form-data cap (Kestrel + FormOptions). 1000-char question cap.
  - Web (`web/lib/auth.ts`, `web/lib/api.ts`, `web/app/AuthGate.tsx`): localStorage-backed password, `Authorization: Bearer …` injected on every API call, 401 clears the stored password and re-shows the login screen. Login UI matches the gradient/accent vibe of the rest of the app.
- **Smoke-tested every path locally:** `/` 200, `/docs` 401 without auth and with wrong password, 200 with correct, `/ask` 400 on oversized question. Then in the browser through the login screen.
- **Improved the README with a full run-from-fresh guide** — one-time per-machine, one-time per fresh clone, daily three-terminal run, reset, troubleshooting table for the five errors we'd already debugged.
- **Containerized the backend** — multi-stage `Dockerfile` (sdk build stage → aspnet runtime stage), `.dockerignore`, listens on port 8080. First draft tripped on `AskYourNotes.sln` vs `.slnx` (the new .NET 10 XML format); fixed and verified the image runs and the auth + size-limit behavior is intact inside the container.
- **Provisioned a Neon Postgres database** and ran the `InitialCreate` migration against it — `Documents`, `Chunks`, `__EFMigrationsHistory`, pgvector extension all confirmed.

### Then the right PM moment

After Neon, before flyctl, the project owner asked:

> *"What exactly are we doing here? Why are we dealing with new things again and again? Can't we just simplify this app, and do we really need so many different tools to make this?"*

Honest answer (captured in [ADR-0013](decisions/0013-ship-on-github-not-the-cloud.md)): the deployment phase teaches **DevOps**, not RAG. The original learning goal — *understanding the RAG stack (web + .NET + Postgres+pgvector + Semantic Kernel + Gemini)* — was met at the end of Milestone 3. Each remaining step (Fly + Vercel + wiring) was a new platform to learn that didn't advance that goal.

The reframed conclusion: **the GitHub repo itself is the deliverable.** Code + ADRs + journal + commit history + a run-from-fresh guide are a stronger PM artifact than a half-deployed app would have been. The auth + Dockerfile we built stay in the repo as future-self groundwork; the deployment they were built for is descoped, with the reasoning preserved in ADR-0013 (which partially supersedes ADR-0007 and re-scopes ADR-0012).

### What we learned

- **Scope discipline is a PM skill, not a developer skill.** "Stop here unless I ask for more" was in the brief from day one — it took a Friday-afternoon question to actually invoke it. Worth practicing the question earlier next time: *"Does this next step advance the original goal, or am I just continuing because I started?"*
- **ADRs that supersede and amend are the right way to record a reversal.** Both ADR-0010 → ADR-0011 (Android → web) and ADR-0007/0012 → ADR-0013 (deploy → don't) preserve the original thinking forward-linked to what changed and why. Cleaner than editing in place.
- **Defense in depth scales to whatever threat model you actually have.** The same two layers (password + size limits) that were "trimmed" from the public-deploy plan are exactly right for a "share via a tunnel for an hour" model. Built once, useful in multiple scenarios.

### Milestone 4 — complete (re-scoped definition of done)

Definition of done: **the app runs locally from a fresh clone in ~10 minutes per the README, the build history tells the story, and a future reader can either run it themselves or follow the ADRs to ship it to the cloud.**

All three criteria met. Project shipped.

### Optional housekeeping the owner can do

- Delete the unused Neon project: Neon dashboard → Settings → Delete project.
- Stop dev servers when not in use: `Ctrl+C` in terminals, then `docker compose -f infra/docker-compose.yml down`, then `colima stop`.
- Uninstall Android Studio if desired: `brew uninstall --cask android-studio` (it's been unused since the M3 pivot).
