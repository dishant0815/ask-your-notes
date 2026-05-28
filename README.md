# Ask Your Notes

A personal RAG (Retrieval-Augmented Generation) app: upload your notes or PDFs, ask questions in a chat, and get answers grounded in **your** documents — with citations pointing back to the source.

> **Status:** Active learning project. See [Milestones](#milestones) below.

## Why this exists

This is a learning vehicle. The author is a Product Manager + NYU MOT grad student building on the same stack he manages in his real product, so the goal is **understanding the tech stack by building it** — not shipping a commercial product. Every meaningful trade-off is documented as an [Architecture Decision Record](docs/decisions/) so future readers (and future-me) can see the *reasoning* behind each choice.

## The stack

| Layer | Choice |
|---|---|
| Frontend | Native Android (Kotlin + Jetpack Compose) |
| Backend | .NET 10 Web API (Clean Architecture) |
| Database | PostgreSQL 17 + [pgvector](https://github.com/pgvector/pgvector) |
| AI orchestration | [Semantic Kernel](https://github.com/microsoft/semantic-kernel) |
| LLM + embeddings | Google Gemini (free tier) — `gemini-embedding-001` (3072-dim) |
| Local container engine | [Colima](https://github.com/abiosoft/colima) |
| Data access | EF Core 10 + Npgsql + Pgvector.EntityFrameworkCore |
| Secret storage | `dotnet user-secrets` (dev) |

## Repository layout

```
ask-your-notes/
├── README.md                 # you are here
├── docs/
│   ├── decisions/            # Architecture Decision Records (ADRs)
│   └── JOURNAL.md            # build journal, milestone by milestone
├── infra/
│   └── docker-compose.yml    # Postgres 17 + pgvector
├── rag-primitive/            # Milestone 1: tiny "feel an embedding" demo
├── backend/                  # Milestone 2: .NET API (Clean Architecture)
│   └── src/
│       ├── Domain/           # core entities (Document, Chunk)
│       ├── Application/      # use-cases, interfaces
│       ├── Infrastructure/   # DB + Gemini implementations
│       └── Api/              # HTTP endpoints
└── android/                  # Milestone 3: Android app
```

## Milestones

| # | Title | Status |
|---|---|---|
| 0 | Decisions & dev environment | ✅ Complete |
| 1 | Tiny RAG primitive (Postgres + pgvector + embedding demo) | ✅ Complete |
| 2 | .NET backend: `/docs` ingest + `/ask` answer-with-citations | 🟡 In progress |
| 3 | Android app: Documents / Upload / Chat screens | ⏳ |
| 4 | Polish + deployment (Neon/Supabase + container host) | ⏳ |

Full chronological detail in [`docs/JOURNAL.md`](docs/JOURNAL.md).

## Run it locally

Requires: macOS, [Homebrew](https://brew.sh/), an internet connection, and a free [Google Gemini API key](https://aistudio.google.com/app/apikey).

```bash
# One-time setup
brew install colima docker docker-compose gh                  # container engine + GitHub CLI
curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0   # .NET 10 SDK

# Each session
colima start                                                  # start the container engine
docker compose -f infra/docker-compose.yml up -d              # Postgres 17 + pgvector
```

### Run the Milestone 1 embedding demo
```bash
cd rag-primitive
dotnet user-secrets set "Gemini:ApiKey" "YOUR_KEY_HERE"
dotnet run
```

### Run the backend (Milestone 2 — in progress)
```bash
cd backend
dotnet ef database update --project src/Infrastructure --startup-project src/Api
dotnet user-secrets --project src/Api set "Gemini:ApiKey" "YOUR_KEY_HERE"
dotnet run --project src/Api
```

## Key product decisions (the short version)

For each, the full reasoning lives in [`docs/decisions/`](docs/decisions/):

- **Free hosted AI (Gemini)** over OpenAI / Azure — zero cost during learning ([ADR-0001](docs/decisions/0001-provider-gemini-free-tier.md))
- **Colima** for local containers over Docker Desktop — no admin password required ([ADR-0002](docs/decisions/0002-container-engine-colima.md))
- **`dotnet user-secrets`** for keys — physically outside the repo ([ADR-0003](docs/decisions/0003-secret-storage-user-secrets.md))
- **Clean Architecture + EF Core** — mirrors a real enterprise .NET shop ([ADR-0004](docs/decisions/0004-backend-clean-architecture-ef-core.md))
- **~1000-char chunks, top-k = 5** for retrieval ([ADR-0005](docs/decisions/0005-retrieval-chunking-and-topk.md))
- **Strict grounding** — say "not in your notes" rather than guess ([ADR-0006](docs/decisions/0006-strict-grounding-and-citations.md))
- **Deploy after the MVP works locally** (Milestone 4) ([ADR-0007](docs/decisions/0007-deploy-timing-after-mvp.md))

## License

This is a personal learning project; no license file yet. If you want to use any of it, open an issue.
