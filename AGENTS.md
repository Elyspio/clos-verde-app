# Copilot instructions for ClosVerdeApp

## Build, run, and lint

### .NET
- aspire run

### Frontend
Run these from `ClosVerdeApp.Front`:
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm check:types`
- `pnpm check:lint` (`eslint src --fix`)
- `pnpm format`
- `pnpm refresh-api`

### Tests
- No dedicated automated test project or test script is present in the repo.

## Architecture

- `ClosVerdeApp.slnx` contains the .NET solution entry points.
- `ClosVerdeApp.AppHost` uses Aspire to wire MongoDB, the API, and the Vite frontend together and injects environment variables for CORS, JWT, and API endpoints.
- `ClosVerdeApp.Api` is split into:
  - `ClosVerdeApp.Api.Abstractions`: DTOs, shared interfaces, exceptions, tracing helpers, and transport/entity models
  - `ClosVerdeApp.Api.Core`: business services such as auth and reservations
  - `ClosVerdeApp.Api.Adapters.Mongo`: MongoDB repositories and persistence helpers
  - `ClosVerdeApp.Api.Adapters.Rest`: external REST adapter layer
  - `ClosVerdeApp.Api.Web`: controllers, startup wiring, Swagger, CORS, JWT auth, SignalR, and telemetry
- `ClosVerdeApp.Front` is a Vite + React + TypeScript app with Redux Toolkit state, generated API clients, and SignalR-based reservation updates.

## Conventions

- Service and repository registration is done through `IDotnetModule` and Scrutor scanning. Keep new classes in the existing namespaces so they are picked up automatically.
- Controllers use tracing base classes and `HttpException`; API errors are shaped by the `HttpExceptionFilter`.
- Keep transport/models in `ClosVerdeApp.Api.Abstractions`; controllers and services should not depend on frontend types.
- User-facing messages are written in French in both backend and frontend code.
- JWT claims use `sub`, `email`, and `name`; the frontend stores the token in `sessionStorage` or `localStorage` under `clos-verde-app.token` with the `clos-verde-app.remember` flag.
- Frontend imports use the `@/` alias for `src/*`.
- Generated API types live in `ClosVerdeApp.Front/src/core/api/generated`; refresh them with `pnpm refresh-api`.
- Reservation realtime updates flow through SignalR events named `ReservationCreated`, `ReservationUpdated`, and `ReservationDeleted`, and the Redux store keeps month caches and leaderboard state in sync.
- MongoDB collection names are derived from entity class names by stripping the `Entity` suffix.
