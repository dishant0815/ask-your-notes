# ADR-0009: Embeddings via raw HTTP, chat via Semantic Kernel

- **Status:** Accepted
- **Date:** 2026-05-28
- **Deciders:** Project owner

## Context

The brief specifies **Semantic Kernel (SK)** as the project's "AI orchestration" layer. Implementing the two Gemini-facing services (`IEmbeddingService` and `IAnswerService`) raised a finer-grained question:

- The SK Google connector (`Microsoft.SemanticKernel.Connectors.Google`) at the version we resolved (`1.77.0-alpha`) is explicitly **experimental** (the `[Experimental]` attribute, suppressed via `#pragma warning disable SKEXP0070`).
- For **chat completion**, SK adds real value: a `Kernel` abstraction, `ChatHistory`, future-friendly hooks for prompt templates, function calling, and middleware.
- For **embeddings**, SK is mostly a thin wrapper — its embedding generator API has churned across alpha versions, and what we actually do is call one REST endpoint and read a JSON array.

## Decision

Split the two:

- **`IEmbeddingService` → raw HTTP** against Gemini's `:embedContent` / `:batchEmbedContents` REST endpoints (with `HttpClientFactory`).
- **`IAnswerService` → Semantic Kernel** with `AddGoogleAIGeminiChatCompletion` and a `ChatHistory`.

Both implementations stay behind the interfaces defined in Application, so neither choice leaks past the Infrastructure layer.

## Alternatives considered

| Option | Why not |
|---|---|
| **SK for both** (use SK's embedding generator) | More uniform on paper, but the embedding generator API in the Google connector has been less stable across alpha versions. Wire-level visibility (request/response JSON) also helps learning. |
| **Raw HTTP for both** (skip SK entirely) | Throws away the orchestration value SK offers — prompt templates, chat history, future plugins. The brief mandates SK as orchestration; using it for the chat path honors that intent where it matters. |
| **OpenAI-style SDK (community packages)** | More mature in places, but adds a third-party dependency tree for no clear gain on this stack. |

## Consequences

- ✅ Chat side gets SK's `Kernel` + `ChatHistory` — easy to grow into prompt templates and function calling later.
- ✅ Embedding side has no SK alpha churn risk; the wire format is visible in `GeminiEmbeddingService.cs`.
- ✅ Embeddings batch up to 100 per request via `:batchEmbedContents`, friendlier to the free tier's RPM limits.
- ⚠️ Two different "how we talk to Gemini" styles in one project. Worth noting in code comments and onboarding; otherwise it could surprise a future reader.
- ⚠️ When the Google connector exits alpha and embeddings stabilize, this ADR is a candidate for re-evaluation (a follow-up "supersedes ADR-0009" entry).
