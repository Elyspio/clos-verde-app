# Clos Verde App - Issue Report

Audit date: 2026-05-08  
Scope: `P:\own\web\clos-verde-app\.claude\worktrees\cool-johnson-378378`  
Focus: technical defects, functional defects, data/state consistency, security posture, and user-facing workflow risks.

## Verification Run

- `dotnet build ClosVerdeApp.slnx`: passed, but emitted package vulnerability warnings.
- `pnpm check:types`: passed.
- `pnpm check:lint`: passed. Note: the script runs with auto-fix behavior (`vp check --fix`), so running it can format files.

## Findings

### 1. High - Race-condition rollback can delete every objection on a reservation

Evidence:
- `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/ObjectionService.cs:49`
- `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/ObjectionService.cs:53`
- `ClosVerdeApp.Api/ClosVerdeApp.Api.Adapters.Mongo/Repositories/ObjectionRepository.cs:59`

`Object()` inserts the current user's objection, then increments the reservation objection count. If the count update fails because the reservation changed state concurrently, rollback calls `RemoveByReservation(reservationId)`. That deletes all objections for the reservation, not only the one just inserted.

Functional impact: one unlucky race can erase other users' objections and their reasons. The creator may then see an incorrect objection state or lose discussion context.

Recommendation: add a repository method that deletes only `(reservationId, userId)` or the inserted objection id. Do not use reservation-wide deletion for single-insert rollback.

### 2. High - Auto-cancelled reservations remain visible in cached calendars

Evidence:
- Backend excludes cancelled reservations from reads: `ClosVerdeApp.Api/ClosVerdeApp.Api.Adapters.Mongo/Repositories/ReservationRepository.cs:29`, `:37`
- Scanner publishes cancelled reservations as updates: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Background/ReservationValidationScanner.cs:70`, `:73`
- Frontend treats every `ReservationUpdated` as a cache upsert: `ClosVerdeApp.Front/src/core/realtime/reservations.ts:25`
- Cache upsert does not filter `status === "Cancelled"`: `ClosVerdeApp.Front/src/store/modules/reservations/reservations.types.ts:30`, `:36`

When the scanner auto-cancels a pending reservation with objections, it broadcasts `ReservationUpdated` with `status = Cancelled`. The frontend then keeps or inserts that reservation in cached month lists because `refreshCachedMonths()` only checks date overlap.

Functional impact: users can continue seeing a cancelled reservation in the calendar until a full month refetch, while fresh API reads would hide it. This creates inconsistent availability and can confuse users about whether the place is still blocked.

Recommendation: either publish `ReservationDeleted` for auto-cancel, or make `refreshCachedMonths()` remove reservations with `status === "Cancelled"`.

### 3. High - Editing an objected reservation keeps stale objections and discussion metadata

Evidence:
- Edit path only updates dates, note, and deadline: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/ReservationService.cs:117`, `:139`
- Objection count and topic id are preserved in transport: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/ReservationService.cs:255`, `:256`
- The UI explicitly tells the creator to "modifiez" in response to objections: `ClosVerdeApp.Front/src/view/components/reservation/CreatorDecisionPanel.tsx:88`

The creator can modify a pending reservation after objections, but the backend leaves `ObjectionCount`, existing objections, and the reservation topic unchanged. The objection reasons may refer to the old period, and the topic name is not updated.

Functional impact: after a creator fixes the reservation, it can still look blocked by obsolete objections. Other users and the creator may continue discussing the wrong period.

Recommendation: define the business rule explicitly. Common options are: clear objections and post a system message when dates change, keep objections but mark them resolved/stale, or force the creator to decide before editing.

### 4. Medium - Mentions are usually unavailable unless the leaderboard was loaded earlier

Evidence:
- Composer derives mentionable users from leaderboard state only: `ClosVerdeApp.Front/src/view/components/messages/MessageComposer.tsx:11`, `:32`, `:43`
- The leaderboard is fetched only from `LeaderboardPage`: `ClosVerdeApp.Front/src/view/components/leaderboard/LeaderboardPage.tsx:12`
- App startup fetches topics, not leaderboard/users: `ClosVerdeApp.Front/src/view/router/AppRouter.tsx:41`

The message composer says it supports `@mention`, but the list is populated from `reservations.leaderboard`. On a direct visit to Messages, that slice is empty unless the user previously visited the leaderboard.

Functional impact: `@` suggestions are empty for normal messaging usage. Users cannot reliably mention people.

Recommendation: introduce a proper users/members endpoint for mention candidates, or fetch the leaderboard/users when entering the messaging area. Do not couple mention availability to whether the leaderboard page has been opened.

### 5. Medium - Topic ordering becomes stale after real-time updates

Evidence:
- Initial topic list is ordered by backend `GetAll()`: `ClosVerdeApp.Api/ClosVerdeApp.Api.Adapters.Mongo/Repositories/TopicRepository.cs:28`
- Real-time topic updates only upsert and append new ids: `ClosVerdeApp.Front/src/store/modules/topics/topics.reducer.ts:13`, `:15`
- The rendered selector uses `allIds` order: `ClosVerdeApp.Front/src/store/modules/topics/topics.actions.ts:11`

When a topic receives a new message, the backend bumps `LastMessageAt` and broadcasts `TopicUpdated`, but the frontend does not reorder `allIds`.

Functional impact: active discussions do not move to the top until a full topic refetch. Users can miss new activity, especially with many reservation topics.

Recommendation: sort `allIds` after topic upserts by `lastMessageAt ?? createdAt`, or keep the selector sorted.

### 6. Medium - First unread count can include the user's own/deleted messages

Evidence:
- No read receipt path falls back to raw `t.MessageCount`: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/TopicService.cs:45`
- Accurate count path excludes current user's messages and deleted messages: `ClosVerdeApp.Api/ClosVerdeApp.Api.Adapters.Mongo/Repositories/MessageRepository.cs:107`
- Soft delete does not decrement topic `MessageCount`: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/MessageService.cs:134`

For a topic a user has never read, unread count is set to `MessageCount`, which includes all historical messages, including their own and soft-deleted ones. The accurate `CountAfter()` logic is only used after a read receipt exists.

Functional impact: unread badges can be inflated the first time a user sees a topic, and deleted messages may still count as unread.

Recommendation: for no receipt, count unread messages through the same repository logic using an early timestamp, excluding current user and deleted messages.

### 7. Medium - Message count is never reduced after soft delete

Evidence:
- Message create increments topic count: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/MessageService.cs:56`, `:80`
- Soft delete only updates the message and publishes it: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/Services/MessageService.cs:125`
- Topic list displays the denormalized count: `ClosVerdeApp.Front/src/view/components/messages/TopicList.tsx:48`

Soft-deleted messages still count in `Topic.MessageCount`. If that is intended as "historical message count", the UI label is ambiguous. If it is intended as visible message count, it is wrong.

Functional impact: topic rows can say "3 messages" while fewer visible messages remain.

Recommendation: either decrement visible count on delete and publish `TopicUpdated`, or rename the label/field to communicate historical count.

### 8. Medium - Users cannot add another objection once one exists

Evidence:
- UI allows objecting only when `reservation.objectionCount === 0`: `ClosVerdeApp.Front/src/view/components/calendar/DeleteReservationDialog.tsx:26`, `:97`
- Backend supports one objection per user, not one per reservation: `ClosVerdeApp.Api/ClosVerdeApp.Api.Adapters.Mongo/Repositories/ObjectionRepository.cs:16`

The backend model supports multiple users objecting to the same reservation, but the UI hides the "S'opposer" action as soon as any objection exists.

Functional impact: the creator sees only the first objection even if several people disagree. Later users can only open the discussion if a topic exists; they cannot register their own formal objection/reason.

Recommendation: make the UI decision per current user, not per reservation count. Fetch existing objections or expose `hasObjectedByCurrentUser`.

### 9. Low - CORS falls back to `AllowAnyOrigin` when origins are not configured

Evidence:
- `ClosVerdeApp.Api/ClosVerdeApp.Api.Web/Technical/Extensions/ApiExtentions.cs:94`
- `ClosVerdeApp.Api/ClosVerdeApp.Api.Web/Technical/Extensions/ApiExtentions.cs:105`

If `Cors:AllowedOrigins` is absent or empty, the API permits any origin. This may be convenient locally, but it is unsafe as a production fallback.

Functional/security impact: a misconfigured deployment silently opens browser access to every origin.

Recommendation: make production fail startup without configured origins, or at least choose a restrictive production default.

### 10. Low - JWT audience validation is disabled

Evidence:
- `ClosVerdeApp.Api/ClosVerdeApp.Api.Web/Start/AppBuilder.cs:55`
- Additional `azp` check is present: `ClosVerdeApp.Api/ClosVerdeApp.Api.Web/Start/AppBuilder.cs:64`

The application disables audience validation and relies on `azp` matching the configured client id. That may be acceptable for this Keycloak setup, but it is narrower than standard token validation and should be documented intentionally.

Functional/security impact: a future identity-provider change or token shape change could admit tokens that were not meant for this API.

Recommendation: validate `aud` when possible, or document why `azp` is the authoritative claim in this realm.

### 11. Low - Known vulnerable backend packages are present

Evidence:
- Build reported `Snappier 1.0.0` high severity vulnerability `GHSA-pggp-6c3x-2xmx`.
- Build reported `HtmlSanitizer 9.0.886` moderate severity vulnerability `GHSA-j92c-7v7g-gj3f`.
- Direct `HtmlSanitizer` reference: `ClosVerdeApp.Api/ClosVerdeApp.Api.Core/ClosVerdeApp.Api.Core.csproj:17`
- MongoDB packages likely bring `Snappier` transitively: `ClosVerdeApp.Api/ClosVerdeApp.Api.Adapters.Mongo/ClosVerdeApp.Api.Adapters.Mongo.csproj:11`, `ClosVerdeApp.AppHost/ClosVerdeApp.AppHost.csproj:13`

Functional/security impact: the app currently builds but ships with known vulnerable dependencies.

Recommendation: update direct/transitive package versions and rerun `dotnet build` or `dotnet list package --vulnerable --include-transitive`.

## Additional Observations

- `dotnet build`, `pnpm check:types`, and `pnpm check:lint` do not fail, so the main risks are behavioral and state consistency issues.
- There is no dedicated automated backend test project in the repository instructions. The new reservation validation and messaging workflows are stateful and race-prone; they need targeted service/repository tests even if the repo previously had no test project.
- The frontend has e2e tests under `ClosVerdeApp.Front/tests/e2e`, despite the root instructions saying no dedicated test script exists. They should be extended for objections, auto-cancel, topic ordering, unread counts, and mentions.

## Suggested Test Coverage

- Objection race rollback deletes only the inserted objection.
- Auto-cancelled reservations disappear from Redux month caches after SignalR update.
- Editing an objected reservation follows the chosen business rule for stale objections.
- Multiple users can object to one reservation if they have not personally objected.
- Direct navigation to `/messages` provides mention candidates.
- Topic list reorders after `TopicUpdated`.
- Unread counts exclude own and deleted messages before and after read receipts.
