# ADR-0012: Defense-in-depth for the public deployment — shared password + 4 layers

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Project owner
- **Resolves the deferred auth question from:** [ADR-0007](0007-deploy-timing-after-mvp.md)

## Context

[ADR-0007](0007-deploy-timing-after-mvp.md) called out that the moment `/ask` is reachable on the public internet, anyone who finds the URL can spend the project owner's Gemini quota. It flagged that "optional auth" effectively becomes required at deployment and deferred the decision. Milestone 4 is now starting, so the decision comes due.

The realistic threats from a publicly-reachable Ask Your Notes deployment:

| Threat | Plausibility | Damage |
|---|---|---|
| Casual visitor stumbles on the URL and hits `/ask` a few times | High | Tiny — eats some free quota |
| URL ends up in a tweet / blog post → flood of traffic | Medium | Could exhaust the daily Gemini cap in minutes; possibly trip Neon storage limits |
| Adversarial actor enumerates the URL and abuses upload/ask | Low–Medium | Quota exhaustion; garbage in the DB; potentially using the API as a free LLM proxy |
| Password leaks (screenshot, accidental commit, friend forwards it) | Medium | Same as above, until rotated |
| DDoS / volumetric attack | Low for a portfolio project | Cost amplification, downtime |

Auth alone is brittle (passwords leak). Rate-limiting alone leaves cost exposure if someone keeps under the cap. The honest answer is **defense in depth** — several thin walls so any single failure doesn't blow the whole budget.

## Decision

Add **all four** layers below to the public deployment:

### 1. Shared password (the primary gate)
- Backend reads `API_PASSWORD` from an environment variable on the host.
- Every protected endpoint (`POST /docs`, `POST /ask`, and `GET /docs`) requires `Authorization: Bearer <password>`. The health endpoint `GET /` stays public so platforms can probe it.
- Web app shows a one-time password prompt, persists the value in `localStorage`, and attaches it as the `Authorization` header on every API call. A 401 from the API clears the password and re-prompts.
- The password can be rotated by changing the env var and redeploying.

### 2. Request size limits
- Upload: maximum **5 MB**.
- Question body: maximum **2 KB** (`~1000-character` `question` field after JSON overhead).
- Enforced via `MultipartBodyLengthLimit` for `/docs` and explicit checks in the `/ask` handler.

### 3. Per-IP rate limiting
- ASP.NET Core's built-in `AddRateLimiter` with a **fixed window: 60 requests / minute / IP** across all endpoints.
- A `429 Too Many Requests` response when exceeded.

### 4. Per-IP daily question cap
- A separate fixed window of **100 `/ask` requests / day / IP**.
- Applied as a partitioned policy specifically to the `/ask` endpoint.

### Out-of-band layer (not in code)

A daily request/spend cap is set directly on the Gemini API key in **Google AI Studio**. This is the hard ceiling — even if the password leaks *and* the rate limiter has a bug, your bill cannot exceed the cap.

## Alternatives considered

| Option | Why not |
|---|---|
| **Rate limit only, no password** | Open to the world. A tweet that goes viral could exhaust the daily Gemini cap before the rate limiter even kicks in (the rate limiter is per-IP; many IPs add up). Wrong fit for a personal RAG. |
| **Per-user accounts (OAuth via Google/GitHub)** | Real engineering work (extra day+), session management, account model, the works. Right answer if the app ever becomes a real product; overkill for "I want a clickable portfolio demo." |
| **Cloudflare in front with bot protection** | A strong fifth layer, but more infra than the MVP needs. Reopen if abuse actually becomes a problem. |
| **mTLS / API key per consumer** | Right for B2B APIs; absurd for a personal app. |

## Consequences

- ✅ **Threats are layered.** Password → rate limit → request size cap → Gemini quota cap. Three layers have to break before damage gets serious.
- ✅ **All in-code layers live in `Program.cs`** — easy to read, easy to remove if we ever truly want to make it public.
- ✅ **Rotation is one env var + redeploy.** If the password ever leaks, the fix is fast.
- ⚠️ **Shared password is not real auth.** Anyone with the password is "you" to the API. Don't reuse this pattern for anything sensitive.
- ⚠️ **Per-IP is fakable.** An attacker with multiple IPs can multiply their cap. The Gemini quota cap remains the hard wall.
- ⚠️ **`localStorage` on the web side** is readable by JavaScript on the same origin. Fine for a shared password used by people you trust; not fine if this became a real product.
- ⚠️ **Behavioral note (worth its own line):** even with four layers, do not upload genuinely sensitive notes to this app. A learning project's security posture is not designed for that.
