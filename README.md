# Ask Your Notes

A personal RAG (Retrieval-Augmented Generation) app: upload your notes or PDFs, ask questions in a chat, and get answers grounded in **your** documents — with citations pointing back to the source.

> **Status:** ✅ Shipped. Runs locally per the [run guide](#run-it-locally). The repository — code, ADRs, journal, and commit history — is the deliverable; see [ADR-0013](docs/decisions/0013-ship-on-github-not-the-cloud.md) for why we did not pursue a hosted public deployment.

## Why this exists

This is a learning vehicle. The author is a Product Manager + NYU MOT grad student building on the same stack he manages in his real product, so the goal is **understanding the tech stack by building it** — not shipping a commercial product. Every meaningful trade-off is documented as an [Architecture Decision Record](docs/decisions/) so future readers (and future-me) can see the *reasoning* behind each choice.

## The stack

| Layer | Choice |
|---|---|
| Frontend | **Next.js 15** (App Router, TypeScript, Tailwind) — see [ADR-0011](docs/decisions/0011-web-frontend-supersedes-android.md) for why this replaced the original Native Android plan |
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
└── web/                      # Milestone 3: Next.js web app
```

## Milestones

| # | Title | Status |
|---|---|---|
| 0 | Decisions & dev environment | ✅ Complete |
| 1 | Tiny RAG primitive (Postgres + pgvector + embedding demo) | ✅ Complete |
| 2 | .NET backend: `/docs` ingest + `/ask` answer-with-citations | ✅ Complete |
| 3 | Web app (Next.js): Documents / Upload / Chat screens + chatbot UI polish | ✅ Complete |
| 4 | Defense in depth + ship as a GitHub-hosted repo (no public deployment) | ✅ Complete |

Full chronological detail in [`docs/JOURNAL.md`](docs/JOURNAL.md).

## Run it locally

Requires: macOS, [Homebrew](https://brew.sh/), an internet connection, and a free [Google Gemini API key](https://aistudio.google.com/app/apikey).

### One-time, per machine

```bash
# .NET 10 SDK (Microsoft's no-sudo installer)
curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0
echo 'export DOTNET_ROOT="$HOME/.dotnet"'                  >> ~/.zshrc
echo 'export PATH="$PATH:$HOME/.dotnet:$HOME/.dotnet/tools"' >> ~/.zshrc

# Container engine + Docker CLI + Compose plugin
brew install colima docker docker-compose
mkdir -p ~/.docker && echo '{"cliPluginsExtraDirs":["/opt/homebrew/lib/docker/cli-plugins"]}' > ~/.docker/config.json

# EF Core CLI (used for migrations)
dotnet tool install --global dotnet-ef
```

### One-time, per fresh clone of this repo

```bash
git clone https://github.com/dishant0815/ask-your-notes.git
cd ask-your-notes

# Boot Postgres + pgvector
colima start
docker compose -f infra/docker-compose.yml up -d

# Create the schema
dotnet ef database update \
  --project backend/src/Infrastructure \
  --startup-project backend/src/Api

# Store your Gemini key in user-secrets (lives outside the repo)
dotnet user-secrets --project backend/src/Api set "Gemini:ApiKey" "<paste-your-key>"

# Optional: set a local password so you can exercise the auth gate
dotnet user-secrets --project backend/src/Api set "API_PASSWORD" "testpw"

# Install web dependencies
(cd web && npm install)
```

### Daily run (three terminals)

```bash
# Terminal 1 — container engine + Postgres (no-op if already running)
colima start
docker compose -f infra/docker-compose.yml up -d

# Terminal 2 — backend on http://localhost:5057
cd backend && dotnet run --project src/Api

# Terminal 3 — web on http://localhost:3000
cd web && npm run dev
```

Open **http://localhost:3000**, enter the password you set (`testpw`, or anything if you skipped `API_PASSWORD`), and you're in.

### Run the Milestone 1 embedding demo (standalone)

```bash
cd rag-primitive
dotnet user-secrets set "Gemini:ApiKey" "<paste-your-key>"
dotnet run
```

### Reset (wipes all uploaded documents)

```bash
docker compose -f infra/docker-compose.yml down -v   # -v also deletes the Postgres volume
docker compose -f infra/docker-compose.yml up -d
dotnet ef database update --project backend/src/Infrastructure --startup-project backend/src/Api
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to connect to 127.0.0.1:5432` | Container engine / Postgres is down: `colima start && docker compose -f infra/docker-compose.yml up -d` |
| `Missing Gemini:ApiKey` at startup | Backend isn't running in `Development` (where user-secrets load) — check the `Hosting environment:` line in the log |
| `Address already in use` on 5057 or 3000 | A stale server is holding the port: `pkill -f AskYourNotes.Api` or `pkill -f "next dev"` |
| Login screen rejects the password | Backend's `API_PASSWORD` doesn't match what you typed — reset it via `dotnet user-secrets ... set "API_PASSWORD" "newpw"` and restart the backend |
| Browser shows a CORS error | Backend is down, or `Cors:AllowedOrigins` in `backend/src/Api/appsettings.json` no longer includes `http://localhost:3000` |

## Key product decisions (the short version)

For each, the full reasoning lives in [`docs/decisions/`](docs/decisions/):

- **Free hosted AI (Gemini)** over OpenAI / Azure — zero cost during learning ([ADR-0001](docs/decisions/0001-provider-gemini-free-tier.md))
- **Colima** for local containers over Docker Desktop — no admin password required ([ADR-0002](docs/decisions/0002-container-engine-colima.md))
- **`dotnet user-secrets`** for keys — physically outside the repo ([ADR-0003](docs/decisions/0003-secret-storage-user-secrets.md))
- **Clean Architecture + EF Core** — mirrors a real enterprise .NET shop ([ADR-0004](docs/decisions/0004-backend-clean-architecture-ef-core.md))
- **~1000-char chunks, top-k = 5** for retrieval ([ADR-0005](docs/decisions/0005-retrieval-chunking-and-topk.md))
- **Strict grounding** — say "not in your notes" rather than guess ([ADR-0006](docs/decisions/0006-strict-grounding-and-citations.md))
- **Deploy after the MVP works locally** (Milestone 4) ([ADR-0007](docs/decisions/0007-deploy-timing-after-mvp.md))
- **Embeddings via raw HTTP, chat via Semantic Kernel** — pragmatic split given SK Google connector is still in alpha ([ADR-0009](docs/decisions/0009-embeddings-raw-http-chat-semantic-kernel.md))
- **Web frontend (Next.js) instead of Native Android** — questioned the brief mid-build, picked the option that aligned with the deploy-publicly goal ([ADR-0011](docs/decisions/0011-web-frontend-supersedes-android.md), supersedes ADR-0010)
- **Defense in depth for the public deploy** — shared password + request size limits + Gemini free-tier built-in cap; rate limiters deferred as scope trim ([ADR-0012](docs/decisions/0012-public-deployment-defense-in-depth.md))
- **Ship as a GitHub repo, not a hosted public URL** — the deploy-related code (auth, Dockerfile) stays in the repo for future use; the deployment itself was scoped out as not advancing the learning goal ([ADR-0013](docs/decisions/0013-ship-on-github-not-the-cloud.md))

## License

This is a personal learning project; no license file yet. If you want to use any of it, open an issue.
