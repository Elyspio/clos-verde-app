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
- JWT claims use `sub`, `email`, and `name`; the frontend stores the token in `sessionStorage` or `localStorage` under `clos-verde-app.token`.
- Frontend imports use the `@/` alias for `src/*`.
- Generated API types live in `ClosVerdeApp.Front/src/core/api/generated`; refresh them with `pnpm refresh-api`.
- Realtime updates flow through aggregate-level SignalR events such as `ReservationChanged`, `TopicChanged`, and `MessageChanged`; targeted read receipts continue to use `ReadReceiptUpdated`.
- MongoDB collection names are derived from entity class names by stripping the `Entity` suffix.
- For MongoDB persistence, prefer NoSQL aggregate modeling with embedded subdocuments or dictionaries inside the owning document instead of relational-style join collections, unless an explicit independent query/use case requires a separate collection.
- Never update frontend's api client or DTOs manually; always update the backend models and run `pnpm refresh-api` to regenerate them.
- Always add unit / integration tests or E2E tests for new features and bug fixes, and update existing tests if the behavior changes. If you are unsure about how to write tests for a particular change, ask for guidance.