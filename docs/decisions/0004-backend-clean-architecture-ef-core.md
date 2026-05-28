# ADR-0004: Clean Architecture + EF Core for the backend

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Project owner

## Context

The backend is a .NET 10 Web API doing two things: ingesting documents (chunk → embed → store) and answering questions (embed → retrieve → answer). The brief specified **Clean Architecture** as the structuring pattern.

A separate but related question: how should the backend talk to PostgreSQL + pgvector? Two mainstream .NET options exist:

1. **EF Core** — the mainstream ORM (Object-Relational Mapper). Mostly C#, very little SQL, built-in migration tooling.
2. **Dapper / raw Npgsql** — write the SQL by hand. More transparent, more boilerplate.

## Decision

Use **Clean Architecture** with four projects, and **EF Core 10** for data access.

### Project layout

```
backend/
└── src/
    ├── Domain/           — entities; depends on nothing
    ├── Application/      — use-cases and interfaces; depends on Domain
    ├── Infrastructure/   — Postgres + Gemini implementations; depends on Application
    └── Api/              — HTTP endpoints; depends on Application + Infrastructure
```

Dependency arrows point **inward**. The core business logic in Application/Domain has no knowledge of Postgres or Gemini, so either could be swapped by changing only Infrastructure.

### Data access

- **EF Core 10** with `Npgsql.EntityFrameworkCore.PostgreSQL` and `Pgvector.EntityFrameworkCore`.
- Schema is versioned via **`dotnet ef migrations`** — the schema lives in code, applied repeatably.
- The **vector similarity search** in `/ask` will be implemented as a small piece of **raw SQL** (`ORDER BY embedding <=> @queryVec LIMIT 5`) for clarity, even though EF wraps everything else.

## Alternatives considered

| Option | Why not |
|---|---|
| **Three-layer or two-layer architecture** | Less ceremony, but doesn't enforce the dependency direction that's the whole point of the pattern. Clean Architecture is the brief's spec and mirrors the user's real enterprise stack. |
| **Dapper / raw Npgsql** | More transparent for learning — you literally see the SQL. But more boilerplate, hand-written schema/migration, and doesn't match the real .NET enterprise stack the user manages. Mitigation: we still use raw SQL for the vector search, so the pgvector mechanics stay visible. |
| **Vertical Slice Architecture** | Modern alternative to Clean Architecture for small APIs. Excellent fit for many projects, but Clean Architecture was specified and is more recognizable on a PM portfolio. |

## Consequences

- ✅ Clean separation: business rules don't depend on Postgres or Gemini.
- ✅ Migrations give you schema-as-code; the DB rebuild is one command.
- ✅ Matches the enterprise .NET pattern most readers will recognize.
- ⚠️ More ceremony than necessary for an MVP — four projects to maintain references between.
- ⚠️ The Domain `Chunk` entity references `Pgvector.Vector`, which is a small impurity (Domain technically depends on a persistence-adjacent type). Accepted as a pragmatic trade-off; a stricter version would map `float[]` ↔ `Vector` in Infrastructure.
- ⚠️ EF Core's auto-generated SQL is sometimes worth inspecting (`ToQueryString()`); we'll note any places where it surprises us.
