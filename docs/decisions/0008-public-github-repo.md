# ADR-0008: Host the repository publicly on GitHub

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Project owner

## Context

The project needs version control from day one (the user explicitly asked for "git commits during the development process"). Two questions had to be answered:

1. **Where** does the code live? — GitHub was the obvious answer; the user already pushes to `github.com/dishant0815`.
2. **Public or private?** — A real choice with portfolio and security implications.

## Decision

Host the repository **publicly** at **https://github.com/dishant0815/ask-your-notes**.

A commit lands at every meaningful step — decisions, scaffolding, data model, each endpoint — and is pushed immediately. The intent is that someone scrolling the commit history can follow the *reasoning* of the build, not just the final state.

Commit messages follow a lightweight convention:

> `Milestone N (part M): <one-line summary>`
>
> - Bulleted detail
>
> `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

## Alternatives considered

| Option | Why not |
|---|---|
| **Private repo** | Safer for half-finished code, but kills the portfolio value. The user is a PM showcasing that they can build, and a public commit history with ADRs is one of the strongest possible artifacts of that. |
| **Local-only git, no remote** | Loses backup and shareability. No upside. |
| **A different host (GitLab, Codeberg, Bitbucket)** | All valid, but the user already has a GitHub account, GitHub has the strongest ecosystem (Actions, Pages, social discovery), and the GitHub CLI is well-supported. |

## Consequences

- ✅ Portfolio-grade artifact from day one.
- ✅ Free hosting, Issues, Actions, Pages — all of GitHub's surface.
- ✅ The commit history *tells the story* of how this app was built, milestone by milestone.
- ⚠️ **Anything committed is publicly visible.** Forces strict discipline:
  - All real secrets go through `dotnet user-secrets` ([ADR-0003](0003-secret-storage-user-secrets.md)) — never `appsettings.json`.
  - The local DB connection string in `appsettings.json` uses a throwaway password (`notes`) for a localhost-only container — not a real secret.
- ⚠️ The history is permanent. Sloppy commit messages or bad-habit code are equally permanent. Worth a moment of care at every commit.
- 🔄 Can be flipped to private at any time via `gh repo edit --visibility private`.
