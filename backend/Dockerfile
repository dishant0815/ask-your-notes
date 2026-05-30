# syntax=docker/dockerfile:1.6
#
# Multi-stage build for the Ask Your Notes .NET 10 API.
#
# Stage 1 (build): full SDK image, restores packages and publishes a
#   self-contained Release output to /app/publish.
# Stage 2 (runtime): much smaller aspnet runtime image, copies the
#   published output and runs it. Listens on port 8080 (Fly.io / cloud
#   convention).
#
# All configuration comes from environment variables at runtime:
#   ConnectionStrings__Postgres   - "Host=...;Database=...;..."
#   Gemini__ApiKey                - your Google AI Studio key
#   API_PASSWORD                  - shared password (see ADR-0012)
#   Cors__AllowedOrigins__0       - first allowed origin (the Vercel URL)
#   ASPNETCORE_ENVIRONMENT        - "Production" (default in image below)

# ---- Stage 1: build ------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the .csproj/.sln files first so `dotnet restore` is cached
# across rebuilds when only source files change.
COPY AskYourNotes.slnx ./
COPY src/Domain/AskYourNotes.Domain.csproj                 src/Domain/
COPY src/Application/AskYourNotes.Application.csproj       src/Application/
COPY src/Infrastructure/AskYourNotes.Infrastructure.csproj src/Infrastructure/
COPY src/Api/AskYourNotes.Api.csproj                       src/Api/
RUN dotnet restore AskYourNotes.slnx

# Now copy the rest of the source and publish.
COPY src ./src
RUN dotnet publish src/Api/AskYourNotes.Api.csproj \
      -c Release \
      -o /app/publish \
      --no-restore

# ---- Stage 2: runtime ----------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "AskYourNotes.Api.dll"]
