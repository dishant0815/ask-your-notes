# ADR-0001: Use Google Gemini (free tier) for both LLM and embeddings

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Project owner

## Context

This is a personal learning project and the brief explicitly required a **hosted** LLM and embedding API (no local model hosting). The provider needed to cover both **chat completion** (the LLM that writes the answer) and **embeddings** (the vectors used for semantic retrieval), ideally from one vendor to minimize moving parts.

Two further constraints shaped the choice:

1. The project must cost **zero dollars** during development.
2. The backend is .NET 10 + Semantic Kernel, so SDK / connector quality matters.

## Decision

Use **Google Gemini's free tier** for both chat and embeddings:

- Chat model: `gemini-2.x-flash` (selected at code-time)
- Embedding model: `gemini-embedding-001` (3072 dimensions)
- Integration: `Microsoft.SemanticKernel.Connectors.Google` (first-class .NET / Semantic Kernel connector)

## Alternatives considered

| Option | Why not (yet) |
|---|---|
| **OpenAI** | Cheap but not *free*; requires a billing-enabled account from day one. Best SK support, would be the default for a paid project. |
| **Azure OpenAI** | Same models as OpenAI plus enterprise features, but a heavier setup (Azure account + deployments) for a learning project. Would mirror corporate-.NET reality if cost weren't a constraint. |
| **Mistral AI** | Free experimental tier with both chat + embeddings and a clean SK connector, but the free tier requires phone verification and has stricter rate limits. |
| **Hugging Face Inference** | Free, but Semantic Kernel integration is more manual — too much plumbing for a project where the goal is to learn RAG, not connector wiring. |

## Consequences

- ✅ Zero cost during all of development.
- ✅ One API key covers both chat and embeddings.
- ✅ First-class Semantic Kernel connector means very little glue code.
- ⚠️ Free-tier **rate limits** (RPM caps) — fine for a single-developer learning app, will need re-evaluation if/when this is deployed publicly.
- ⚠️ Per Google's terms, content submitted on the **free tier may be used to improve their models** and may be reviewed by humans. For a personal-notes app this is a real privacy consideration — flagged for the user and accepted.
- ⚠️ Provider lock-in for retrieval: 3072-dim vectors are non-trivial to migrate to a smaller-dim provider later. Mitigation: hide Gemini behind `IEmbeddingService` / `IAnswerService` interfaces so the implementation is swappable.
- 🔄 If we ever need higher rate limits, paid privacy guarantees, or enterprise compliance, we re-open this ADR.
