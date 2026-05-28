# ADR-0006: Strict grounding; return answer + source-list citations

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Project owner

## Context

Two related product decisions shape what `/ask` returns:

1. **What should the bot do when the retrieved chunks do not contain the answer?**
2. **How should we present "where this answer came from" — i.e., citations?**

These are PM-level trust decisions, not technical ones. They define the contract the app makes with the user.

## Decision

### 1. Strict grounding

If none of the retrieved chunks contain the answer, the bot will say something like:

> "I couldn't find that in your notes."

It will **not** fall back to the model's general knowledge.

This is enforced at the **prompt** layer: the system prompt instructs the model to answer **only** from the provided chunks and to say "not in your notes" otherwise.

### 2. Citation format: answer + source list

`POST /ask` returns:

```jsonc
{
  "answer": "…",
  "sources": [
    { "documentId": "…", "fileName": "notes.pdf", "ordinal": 7, "snippet": "…the relevant chunk text…" }
  ]
}
```

The answer text is plain prose; citations live in a separate `sources` array. The Android UI can render them however it likes (footnote list, expandable cards, etc.).

## Alternatives considered

### No-answer behavior

| Option | Why not |
|---|---|
| **Fall back to general knowledge** | Feels more helpful in the moment but defeats the entire premise of "answers from *your* documents." The bot would confidently hallucinate things that are not in the notes. For a notes app, that breaks trust on the first wrong answer. |
| **Refuse to answer at all** | Too rigid; users want a useful "I don't know" message, not silence. |

### Citation format

| Option | Why not |
|---|---|
| **Inline markers `[1][2]` + numbered list** | More precise about which sentence came from where, but Gemini formats these inconsistently. Adds parsing complexity to the Android UI. |
| **Document names only (no snippets)** | Simplest, but the user can't see the supporting text without re-opening the original document. Weakest for trust. |

## Consequences

- ✅ Trust-first behavior: the bot can be wrong, but it can't *quietly* be wrong. Citations make every answer verifiable.
- ✅ Clean API contract — answer and sources are structurally separate, so the UI has full control over rendering.
- ⚠️ Strict grounding means the bot will refuse questions that *are* common knowledge but happen to not be in the user's notes. That's the right trade-off for a notes app, but it is a trade-off.
- ⚠️ Prompt-based enforcement of "answer only from chunks" is **not bulletproof** — LLMs occasionally still draw on prior knowledge. Mitigation strategies (re-ranking, post-hoc verification) are out of scope for the MVP and would warrant a new ADR.
- ⚠️ Snippets in the API response add to payload size. For a personal app this is negligible; we'd revisit if/when serving many users.
