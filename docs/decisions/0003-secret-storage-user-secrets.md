# ADR-0003: Use `dotnet user-secrets` for development secrets

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Project owner

## Context

The project holds a real secret: the Google Gemini API key. Anyone with that key can spend on the owner's account, so it must never enter the git repository — even accidentally, even in a `.env.example` that someone could fill in and forget about.

The repository is also **public** on GitHub ([ADR-0008](0008-public-github-repo.md)), which raises the cost of any accidental leak.

We needed a storage approach for local development that:

1. Cannot end up in git by accident.
2. Is idiomatic for .NET (so it's a transferable habit to enterprise projects).
3. Works seamlessly with `Microsoft.Extensions.Configuration`.

## Decision

Use **`dotnet user-secrets`** for all development secrets.

- Each .NET project gets a `UserSecretsId` via `dotnet user-secrets init`.
- The secret store lives in **`~/.microsoft/usersecrets/<id>/secrets.json`** — physically *outside* the repository.
- Keys are loaded automatically by `Microsoft.Extensions.Configuration` in the `Development` environment.
- Local-only, non-sensitive config (the local Postgres connection string with the throwaway password `notes`) stays in `appsettings.json`.

## Alternatives considered

| Option | Why not |
|---|---|
| **`.env` file** | Familiar from the Node/Next.js world, but the file lives **inside** the repo. Safety depends entirely on `.gitignore` discipline — one bad day from leaking. Also not the .NET-idiomatic pattern. |
| **Environment variables only** | Works, but the user has to re-set them every shell session. Not great as a default. |
| **Cloud secret manager (AWS Secrets Manager, Azure Key Vault, Doppler, etc.)** | Right answer for production. Overkill for local dev and adds a network dependency. Will be revisited at deployment time. |

## Consequences

- ✅ Secrets physically cannot be committed by accident — they aren't in the project folder at all.
- ✅ Works automatically with the standard .NET configuration pipeline; no extra package wiring beyond `Microsoft.Extensions.Configuration.UserSecrets`.
- ✅ Same pattern is used in real enterprise .NET shops — transferable skill.
- ⚠️ Only effective in `Development`. For **production deployment** (Milestone 4) we will switch to environment variables / a managed secret store on the chosen host. That will be its own ADR.
- ⚠️ Each .NET project has its **own** secret store. The Gemini key was set once in `rag-primitive/` (Milestone 1) and will be set again in `backend/src/Api/` (Milestone 2). This is a feature (least privilege per project) but worth noting.
