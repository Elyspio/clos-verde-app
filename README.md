# ClosVerdeApp

ClosVerdeApp is a full-stack reservation app built with **.NET 10**, **Aspire**, **MongoDB**, and a **React + Vite** frontend. It includes:

- JWT authentication with register/login flow
- Reservation creation, update, deletion, and monthly browsing
- A leaderboard view based on reservation usage
- SignalR-powered realtime reservation updates

## Project layout

- `ClosVerdeApp.AppHost` — Aspire host that wires the API, MongoDB, and frontend together
- `ClosVerdeApp.Api` — backend solution split into:
  - `ClosVerdeApp.Api.Abstractions` for shared DTOs, interfaces, models, and helpers
  - `ClosVerdeApp.Api.Core` for business logic
  - `ClosVerdeApp.Api.Adapters.Mongo` for persistence
  - `ClosVerdeApp.Api.Adapters.Rest` for external REST integrations
  - `ClosVerdeApp.Api.Web` for controllers, startup, Swagger, auth, CORS, telemetry, and SignalR
- `ClosVerdeApp.Front` — React frontend with Redux Toolkit state and generated API clients
- `Deployment/build` — Docker build scripts for packaging the app

## Prerequisites

- .NET 10 SDK
- Node.js 24+
- pnpm 10
- MongoDB when running the API outside Aspire

## Local development

### Run everything together

From the repository root:

```bash
dotnet run --project ClosVerdeApp.AppHost/ClosVerdeApp.AppHost.csproj
```

This starts the API, frontend, and MongoDB with the Aspire host.

### Run the API only

```bash
dotnet run --project ClosVerdeApp.Api/ClosVerdeApp.Api.Web/ClosVerdeApp.Api.Web.csproj
```

### Run the frontend only

From `ClosVerdeApp.Front`:

```bash
pnpm install
pnpm dev
```

## Common commands

### Backend

```bash
dotnet build ClosVerdeApp.slnx
dotnet run --project ClosVerdeApp.AppHost/ClosVerdeApp.AppHost.csproj
dotnet run --project ClosVerdeApp.Api/ClosVerdeApp.Api.Web/ClosVerdeApp.Api.Web.csproj
```

### Frontend

From `ClosVerdeApp.Front`:

```bash
pnpm build
pnpm check:types
pnpm check:lint
pnpm format
pnpm refresh-api
```

`pnpm check:lint` runs ESLint with `--fix`.

## Configuration

The Aspire host injects the main runtime values for local development:

- API base URL for the frontend
- Allowed CORS origin
- JWT issuer, audience, secret, and expiration
- MongoDB connection details

The API also reads `appsettings.docker.json` when present.

## API and frontend flow

- Authentication is handled by `api/auth/register`, `api/auth/login`, and `api/auth/me`
- Reservations are served from `api/reservations`
- Realtime reservation updates are broadcast over SignalR at `/hubs/reservations`
- The frontend stores the auth token in browser storage and hydrates the session on startup

## Deployment

The `Deployment/build/build.ts` script wraps `docker compose build --push` and publishes the app image from `Deployment/build/dockerfile`.
