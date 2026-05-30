# ADR-0013: Ship the project on GitHub, not as a hosted public deployment

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Project owner
- **Partially supersedes / re-scopes:** [ADR-0007](0007-deploy-timing-after-mvp.md), [ADR-0012](0012-public-deployment-defense-in-depth.md)

## Context

The original brief said *"I want to deploy this publicly"* as an extension to the MVP. [ADR-0007](0007-deploy-timing-after-mvp.md) accepted that and deferred the actual deploy to Milestone 4. [ADR-0012](0012-public-deployment-defense-in-depth.md) added the auth + defense-in-depth required to make a public deploy safe.

Mid-Milestone 4, partway through the deploy steps — after auth was implemented and committed, the backend was containerized, and a Neon Postgres database was provisioned — the project owner paused and asked:

> *"What exactly are we doing here? Why are we dealing with new things again and again? Can't we just simplify this app, and do we really need so many different tools to make this?"*

That re-opened the real question: **what was deployment for, given this is a personal learning project about RAG?**

Honest accounting of what each remaining deploy step would teach vs. cost:

| Step | Teaches | Costs |
|---|---|---|
| Neon Postgres signup | "How managed Postgres works" | 1 account, password rotation hygiene |
| Fly.io signup + flyctl + fly.toml | "How container hosting works" | 1 account, credit card on file, new CLI |
| Vercel signup + GitHub integration | "How serverless web hosting works" | 1 account, env var config |
| Wiring all three together | "How three clouds talk to each other" | Real (debugging CORS, secrets, regions) |

None of those answers further the learning goal stated in the brief: *understanding the RAG stack — Android/web client → .NET + Semantic Kernel → Postgres + pgvector → Gemini.* They teach **DevOps**, which is a different (also valuable) topic.

## Decision

Conclude the project **without** a public hosted deployment. The deliverable is:

- **The GitHub repository** at https://github.com/dishant0815/ask-your-notes — the build history, ADRs, journal, and code are themselves the portfolio artifact.
- **A "run-from-fresh" guide** in the README that lets anyone clone the repo and have it working on their own Mac in ~10 minutes.
- **The local app** itself — backend on `localhost:5057`, web on `localhost:3000`, Postgres+pgvector in a Colima container — exactly as built through Milestone 3.

What we keep in the codebase for the future, even though we're not deploying *now*:

- The **shared-password auth + request size limits** in `backend/src/Api/Program.cs`. They cost nothing locally and make the app safe to share via a tunnel (Cloudflare Tunnel, ngrok) if the owner ever wants a temporary public URL.
- The **`Dockerfile` and `.dockerignore`**. They are documentation for "how this app would containerize" and a working starting point if a future-self picks up deployment.
- All Milestone-4 commits and ADRs — they record the path that was tried and the reason we stopped.

The **Neon Postgres database** provisioned during the deployment attempt is unused and can be deleted by the project owner. The connection string was shared in a chat transcript; rotation is moot if the project is deleted.

## Alternatives considered

| Option | Why not |
|---|---|
| **Cloudflare Tunnel for occasional public demo** | A real option, kept available (the auth + size limits in the code support it). Not the default because most of the time the app should just run locally; a tunnel can be spun up in ~5 minutes when needed without committing to it permanently. |
| **Continue with Fly + Neon + Vercel as planned** | Defensible but no longer aligned with the project's actual goal once that goal was named explicitly. The remaining work would teach DevOps, not RAG. |
| **Switch to Render or single-VM as a simpler deploy** | Same problem in smaller form — still adds new platforms to learn for limited learning value. |

## Consequences

- ✅ **The project is shippable as of this commit.** The brief's MVP is met; the user can use the app today; the repo tells the story for anyone who looks.
- ✅ **No ongoing infrastructure cost or surface area to maintain.** No accounts to remember, no bills to monitor, no SSL certs to renew, no security updates to apply.
- ✅ **The decision itself is captured.** Future readers of the repo see both the deploy plan (ADR-0007, ADR-0012, the commits for auth + Dockerfile) and the reason it was scoped out (this ADR). That's a stronger PM artifact than a half-deployed app.
- ⚠️ **No live URL** to share with people who don't want to clone and run it. Mitigation: Cloudflare Tunnel is a 5-minute future option; the README walks anyone through running it locally in ~10 minutes.
- ⚠️ **Deployment-related skills are deferred.** If/when the owner wants to learn cloud deployment specifically, this codebase is a good starting point — the Dockerfile and auth are already in place.
- 🔄 If the project ever needs a hosted deployment, this ADR doesn't block it. A new ADR superseding this one captures the new "yes, now we deploy" decision and references the work already done in [ADR-0012](0012-public-deployment-defense-in-depth.md).
