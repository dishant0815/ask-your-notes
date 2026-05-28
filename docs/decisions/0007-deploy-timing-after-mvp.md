# ADR-0007: Deploy publicly only after the MVP works locally (Milestone 4)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Project owner

## Context

The user wants the app to eventually be reachable on the public internet (Android client → public backend URL). This adds three cloud responsibilities:

1. A host for the **.NET API**.
2. A managed **Postgres + pgvector** instance.
3. **Secret management** in the cloud (no more `dotnet user-secrets`).

The question is *when* to take this on — early (set up cloud infrastructure during development) or late (after the local MVP works).

## Decision

Defer the actual deployment to **Milestone 4**, after `POST /docs`, `POST /ask`, and the Android app are all working locally. **Version control still runs from day one** — every meaningful step is committed and pushed to the public GitHub repo ([ADR-0008](0008-public-github-repo.md)) immediately.

When deployment time comes, the target stack is:

| Concern | Likely choice |
|---|---|
| Postgres + pgvector | **Neon** or **Supabase** free tier (both support pgvector) |
| .NET API | A container host: **Fly.io**, **Google Cloud Run**, or **Render** (free / generous-free tiers) |
| Secrets | The host's environment-variable / secret panel |
| Gemini key | Stays **server-side only**; the Android app never holds it |

The exact provider mix is recorded in a follow-up ADR at deployment time.

## Alternatives considered

| Option | Why not |
|---|---|
| **Deploy from day one (continuous deployment)** | Realistic to real production engineering, but every code change becomes a slow cloud round-trip. Vastly more time fighting deploy/config issues than learning RAG. Wrong trade for a learning project. |
| **Never deploy** | The brief explicitly asks to deploy. Public deployment also validates the architecture (it has to actually work outside `localhost`). |

## Consequences

- ✅ Fast local feedback loops during the most experimental phase of the project.
- ✅ One focused deployment session in Milestone 4 instead of N small ones.
- ⚠️ **Real product concern surfaced now so it's not a surprise later:** a public `/ask` endpoint on the free Gemini tier means anyone who finds the URL can spend your quota. The "optional" auth in Milestone 4 effectively becomes **required** for a public deployment. Flagged here so we don't ship without it.
- ⚠️ Deferring deployment means we won't catch cloud-specific issues (cold starts, container size, region/latency) until late. Acceptable for a learning MVP.
