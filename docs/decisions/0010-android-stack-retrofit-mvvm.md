# ADR-0010: Android stack — Retrofit for HTTP, MVVM with ViewModel + StateFlow

- **Status:** **Superseded by [ADR-0011](0011-web-frontend-supersedes-android.md)** (2026-05-29). The frontend choice was re-opened the same day and Native Android was replaced with a Next.js web app. The reasoning here is preserved so future readers can see what was decided and why we changed course.
- **Original status:** Accepted
- **Date:** 2026-05-29
- **Deciders:** Project owner

## Context

The Milestone 3 Android app has three screens — Documents, Upload, Chat — and talks to the existing .NET API for everything. Two architectural questions had to be answered up front:

1. **HTTP client library** — how Kotlin code calls the backend.
2. **App architecture** — how state and logic are organized inside the app.

Both decisions affect every screen and the muscle memory the user takes away from the project.

## Decision

### 1. HTTP client: **Retrofit** (+ OkHttp + kotlinx.serialization)

- Define a `BackendApi` interface with `@GET`, `@POST`, `@Multipart` annotations; Retrofit generates the implementation.
- JSON conversion via `kotlinx.serialization` (Kotlin-native, no reflection).
- Single `OkHttpClient` configured with a logging interceptor in `Debug` builds for visibility into requests.

### 2. App architecture: **MVVM with Jetpack ViewModel + StateFlow + Compose**

- One `ViewModel` per screen (`DocumentsViewModel`, `UploadViewModel`, `ChatViewModel`).
- UI state expressed as immutable `data class` snapshots, exposed as `StateFlow<UiState>`.
- Compose subscribes via `collectAsStateWithLifecycle()` and renders.
- Navigation handled by Jetpack `Navigation Compose`.
- Dependency Injection: lightweight — a single `AppContainer` constructed in `Application.onCreate()`. (Hilt is overkill for a 3-screen MVP and would be its own learning curve. A follow-up ADR could swap it in.)

### Base URL configuration

The app talks to the backend at **`http://10.0.2.2:5057`** in the emulator (`10.0.2.2` is the Android emulator's special alias for the host machine's `localhost`). For a physical device on the same Wi-Fi, this would be the Mac's LAN IP. The base URL is held in `BuildConfig` so it can vary by build type without changing code.

Cleartext HTTP is allowed only for the dev/debug build via a `network_security_config.xml` that whitelists `10.0.2.2`.

## Alternatives considered

### HTTP client

| Option | Why not |
|---|---|
| **Ktor Client** | Kotlin-native, more explicit request building, friendly to Kotlin Multiplatform. Less ubiquitous in Android job listings; fewer ready-made patterns; weaker portfolio signal for "real Android shop" credibility. |
| **OkHttp directly** | What Retrofit uses underneath. Lowest abstraction, most boilerplate. Loses the declarative interface benefit. |
| **HttpURLConnection** | Built into the JDK. Verbose, awkward async story, no JSON handling. Not seriously considered. |

### Architecture

| Option | Why not |
|---|---|
| **Plain composable state** | Simplest, fewest concepts. Fine for 3 screens, but loses state on rotation and doesn't mirror the patterns the user manages in his real product. Misses the learning value. |
| **MVI (Model-View-Intent)** | Stricter unidirectional data flow than MVVM. Excellent pattern, but more concepts to introduce simultaneously. Saved for a follow-up project. |
| **MVVM with Hilt DI** | The "full" enterprise pattern. Hilt's setup is its own learning project. Pure manual DI via an `AppContainer` is enough for an MVP and easier to read. |

## Consequences

- ✅ **Retrofit + MVVM is the most common stack in real Android shops** — directly transferable PM/dev knowledge.
- ✅ **ViewModels survive screen rotation** without manual state-restoration code.
- ✅ **UI state as immutable data classes** makes Compose rendering predictable.
- ⚠️ More moving parts than necessary for a 3-screen MVP — Retrofit interface, ViewModels, StateFlow, AppContainer. Worth it for learning value.
- ⚠️ Cleartext HTTP whitelist for `10.0.2.2` is **debug-only**. Production (deployed) builds will talk HTTPS to the public backend; no cleartext config in release.
- ⚠️ Manual DI via `AppContainer` will eventually creak for a larger app — swappable for Hilt later with a follow-up ADR.
- 🔄 The emulator-specific base URL `10.0.2.2:5057` will be replaced by the deployed backend URL in Milestone 4.
