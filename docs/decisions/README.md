# Architecture Decision Records

This folder records every meaningful technical or product decision on this project, using a lightweight version of [Michael Nygard's ADR template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md).

Each ADR is a small markdown file with four sections:

- **Context** — what was the situation that forced a decision?
- **Decision** — what did we choose?
- **Alternatives considered** — what else was on the table, and why was it not picked?
- **Consequences** — what does this mean for the project going forward (good and bad)?

ADRs are **append-only**. If a decision is later reversed, we add a new ADR that "supersedes" the old one rather than rewriting history. That preserves the reasoning at the time it was made.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-provider-gemini-free-tier.md) | Use Google Gemini (free tier) for both LLM and embeddings | Accepted | 2026-05-26 |
| [0002](0002-container-engine-colima.md) | Use Colima instead of Docker Desktop for local containers | Accepted | 2026-05-26 |
| [0003](0003-secret-storage-user-secrets.md) | Use `dotnet user-secrets` for development secrets | Accepted | 2026-05-26 |
| [0004](0004-backend-clean-architecture-ef-core.md) | Clean Architecture + EF Core for the backend | Accepted | 2026-05-27 |
| [0005](0005-retrieval-chunking-and-topk.md) | ~1000-char chunks with ~10% overlap, top-k = 5 | Accepted | 2026-05-27 |
| [0006](0006-strict-grounding-and-citations.md) | Strict grounding; return answer + source-list citations | Accepted | 2026-05-27 |
| [0007](0007-deploy-timing-after-mvp.md) | Deploy publicly only after MVP works locally | Accepted | 2026-05-27 |
| [0008](0008-public-github-repo.md) | Host the repository publicly on GitHub | Accepted | 2026-05-27 |
| [0009](0009-embeddings-raw-http-chat-semantic-kernel.md) | Embeddings via raw HTTP; chat via Semantic Kernel | Accepted | 2026-05-28 |
