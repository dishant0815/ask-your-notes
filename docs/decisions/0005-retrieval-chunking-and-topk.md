# ADR-0005: ~1000-character chunks with ~10% overlap; retrieve top-5

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Project owner

## Context

RAG quality is dominated by two retrieval parameters:

1. **Chunk size** — how big the "index cards" are that we embed and store.
2. **top-k** — how many of those cards we hand to the LLM as context for each question.

Both are real trade-offs with user-visible consequences (precision, cost, latency, answer quality).

## Decision

| Parameter | Value | Rationale |
|---|---|---|
| Chunk size | **~1000 characters** (~150 words, roughly one paragraph) | Balanced precision vs. cost. Standard starting point for notes/PDFs. |
| Overlap | **~100 characters** (~10%) | Prevents losing a sentence that straddles a chunk boundary. |
| top-k | **5** | Enough context to answer most questions; well under free-tier token limits. |

These values are **defaults**, encoded as configuration so they can be tuned without code changes.

## Alternatives considered

### Chunk size

| Option | Trade-off |
|---|---|
| **Small (~500 chars)** | Sharper retrieval (pinpoints exact facts) but more chunks → more embedding API calls and storage. Risks severing context mid-thought. |
| **Medium (~1000 chars)** ✅ | The chosen balance. |
| **Large (~2000 chars)** | Cheaper (fewer chunks) and keeps more context per piece, but retrieval is fuzzier and answers can be diluted by irrelevant text in the same chunk. |

### top-k

| Option | Trade-off |
|---|---|
| **3** | Tightly focused, cheapest. Risks missing answers that span several chunks. |
| **5** ✅ | The chosen balance. |
| **8** | Broader coverage for complex questions but sends more tokens to the LLM, slower, closer to free-tier limits, can dilute the answer. |

## Consequences

- ✅ Sensible defaults — the system answers most reasonable questions out of the box.
- ✅ Both values are tunable from configuration; we are not married to them.
- ⚠️ Chunking measured in **characters**, not tokens, for simplicity. Tokens (~4 chars each on average) are what the model actually counts, so the real chunk size in tokens varies slightly with content. Good enough for an MVP.
- ⚠️ **No re-ranking** in the MVP. We trust pgvector's cosine distance ordering directly. For production, a re-ranker (a second pass that scores the top-k more carefully) would improve answer quality at the cost of an extra model call.
- 🔄 If the bot starts giving wrong or empty answers in practice, we tune chunk size and top-k empirically by testing against a small set of question/answer pairs — and log the new values in a follow-up ADR.
