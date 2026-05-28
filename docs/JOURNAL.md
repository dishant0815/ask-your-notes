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

### Coming next in Milestone 2

- User sets the Gemini key into the Api project's user-secrets:
  `dotnet user-secrets --project backend/src/Api set "Gemini:ApiKey" "<key>"`
- Run the API, `curl` an upload of `samples/personal-notes.txt`, ask a question that should be answered from those notes, and one that shouldn't (to verify the "not in your notes" path works).
- Commit + push the test session, close Milestone 2.
