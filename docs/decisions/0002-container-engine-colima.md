# ADR-0002: Use Colima instead of Docker Desktop for local containers

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Project owner

## Context

The project uses **Postgres 17 + pgvector**, run locally in a container during development. macOS doesn't run Linux containers natively, so we need a "container engine" — software that hosts a small Linux VM and exposes the standard `docker` CLI to it.

We attempted to install Docker Desktop via Homebrew first. The install reached its final step and then failed with:

```
sudo: a terminal is required to read the password
```

Docker Desktop's installer requires the user's macOS admin password to create `/usr/local/cli-plugins` and to set up a privileged background helper for networking and its embedded Linux VM. That admin step could not be completed unattended.

## Decision

Use **Colima** as the local container engine, plus Homebrew's standalone `docker` and `docker-compose` CLIs.

- Install: `brew install colima docker docker-compose`
- Start each session: `colima start`
- `~/.docker/config.json` updated with `cliPluginsExtraDirs` pointing at `/opt/homebrew/lib/docker/cli-plugins` so the Compose plugin is discovered.

## Alternatives considered

| Option | Why not |
|---|---|
| **Docker Desktop** | Excellent GUI dashboard (great for learning what containers are), but requires admin privileges to install/run and uses a per-seat license for larger orgs. The admin requirement was the blocker. |
| **Rancher Desktop** | Similar to Colima but heavier; no clear advantage for this use case. |
| **Podman Desktop** | Container API differences would mean extra work for `docker compose` workflows. |

## Consequences

- ✅ Fully user-space install — no admin password needed.
- ✅ Identical `docker` and `docker compose` commands work; the rest of the toolchain doesn't care.
- ✅ Free and open source, no licensing considerations.
- ⚠️ No GUI dashboard — you have to use `docker ps` / `docker logs` instead of clicking through a panel. Slight loss of "see what's happening" value for a learner.
- ⚠️ `colima start` is required at the start of each session; the VM does not auto-start on login by default.
- ⚠️ Container engine restarts (laptop sleep, manual stops) silently take down running containers — surfaced once as `Failed to connect to 127.0.0.1:5432` mid-build. Recognize the symptom, run `colima start` then `docker compose up -d` to recover.
