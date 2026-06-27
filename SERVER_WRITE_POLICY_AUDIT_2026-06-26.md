# Server Write Policy Audit - 2026-06-26

Цель: понять, где клиент пишет на сервер или вызывает Cloud Functions, и не допустить модели "каждый tap = billable write".

Runtime changes in this direction are limited to safe telemetry queues: `app_activity_queue_v1` and `analytics_queue` no longer reread the full local queue on every accepted event. T0 progress/shards/premium/cloud authority were not changed.

## Проверенные группы

- `writeToFirestore: true`
- `httpsCallable` / Cloud Functions clients
- Прямые Firestore writes: `.set`, `.update`, `.add`, `.delete`, batch, transaction
- T0 sync/progress/shards paths

## Явные telemetry Firestore writes

Текущий owner-reviewed allowlist:

- `app/app_activity.ts`: 1
- `app/app_health.ts`: 1
- `app/firebase.ts`: 1
- `app/firestore_friend_requests.ts`: 1
- `app/(tabs)/friends.tsx`: 2
- `app/friends_screen.tsx`: 1
- `app/shards_shop.tsx`: 4
- `app/streak_wager.ts`: 1
- `components/onboarding.tsx`: 3

Текущий механизм защиты:

- `app_activity_queue_v1` capped at 200.
- `app_activity_queue_v1` uses an in-memory queue cache after first storage read, while still writing the capped queue back to storage after each accepted event.
- `app_activity` drops exact duplicates inside 750 ms.
- `analytics_queue` capped at 200 and uses an in-memory queue cache after first storage read.
- `analytics_queue` still writes the capped queue back to storage after each accepted event, so local debug backup remains durable.
- `analytics` drops exact duplicate events inside 750 ms before Firebase/PostHog/local backup.
- Routine activity stays local unless `writeToFirestore: true` or sampled error.
- Error sampling is 1% by default.
- `app_health` throttles repeated warnings for 30 minutes and critical errors for 10 minutes.
- `app_health` uses a bounded in-memory throttle cache before storage/server work, so repeated identical diagnostics in one session are dropped before another local read or `app_error` report.
- `client_reports` reuses the `submitClientReport` callable and dedupes concurrent AppCheck warmup; this reduces setup work but does not change which reports are sent.
- `ideas_client` reuses the `submitUserIdea` callable and dedupes concurrent AppCheck warmup; this reduces setup work but keeps every idea submit as an explicit user action.

Policy:

- New `writeToFirestore: true` is not allowed silently.
- It must be user-action critical, funnel-critical, error-critical, or owner-approved revenue/debug event.
- It must have at least one of: dedupe, throttle, cap, sample, TTL, or callable-side protection.

## Cloud Functions / callable writes

Main categories:

- T0 progress: `app/progress_events_client.ts`
  - Queued, capped, serialized, idempotency key, server ledger.
  - Do not change without owner-approved T0 plan.

- Broad cloud sync: `app/cloud_sync.ts`
  - Debounced and serialized.
  - `forceNow` call sites are owner-reviewed separately.

- Shards/economy: `app/shards_system.ts`, `app/release_wave_bonus.ts`, `app/profile_card_system.ts`, `app/collectibles/storage.ts`
  - Needs owner approval before runtime semantics change.

- Social/league/friends: `app/firestore_friends.ts`, `app/firestore_leagues.ts`, `app/firestore_league_chat.ts`, `app/friend_gifts.ts`, `app/friend_activity_likes.ts`, `app/league_group_boosts.ts`
  - Mostly user-action writes. Candidate for batching only if UX freshness stays acceptable.

- Arena: `app/services/arena_*`, `app/arena_bot_profile_write.ts`
  - Active multiplayer writes. Do not delay blindly.

- AI/voice/explain clients:
  - User-triggered callables. Cost policy should be quota/limit based, not hidden background retry.

- Presence: `app/online_presence.ts`
  - Already optimized separately: active-only, 5-minute heartbeat.

## Direct Firestore writes

Acceptable current classes:

- User action state:
  - app messages read/dismiss/reaction/vote
  - friends request/accept/delete
  - league chat send/report
  - arena room/session actions
  - settings display name

- Profile/device mirrors:
  - public profile snapshot
  - push token registration
  - auth identity linking

- T0/economy:
  - shards transactions
  - release wave bonus
  - league group transactions
  - cloud sync user doc

Policy:

- Direct Firestore writes are acceptable for explicit user actions and narrow mirrors.
- Background writes must be debounced, throttled, idempotent, or owner-approved.
- T0 writes must be monotonic/idempotent and cannot reduce user-visible progress.

## Best Future Savings Candidates

1. `app/shards_shop.tsx`
   - Several explicit `writeToFirestore: true` revenue/debug events.
   - Safe fix applied: `shards_shop:open` now writes Firestore only once per mounted shop tab; repeated focus still logs local activity without server write.
   - Future path: submitClientReport batching for the remaining purchase/click revenue events, if revenue dashboard still gets needed signals.

2. `app/paywall_funnel.ts`
   - Direct Firestore `.add` for funnel events with TTL and `shown` dedupe.
   - Safe fix applied: identical funnel events are now dropped inside a 750 ms in-session window, with a 64-key in-memory cap.
   - Future path: batch per session or route through client reports.

3. Friends/onboarding telemetry
   - Keep critical funnel events, but avoid adding more explicit Firestore writes without owner review.

4. League bonus / league group writes
   - Do not batch until freshness and rewards are audited.

## Guardrails Added

- `tests/owner_direction_runtime_contract.test.ts` now locks all explicit `writeToFirestore: true` call sites.
- New explicit Firestore telemetry writes must update the allowlist intentionally.
- `tests/owner_direction_runtime_contract.test.ts` now also locks `paywall_funnel` TTL + short-term duplicate protection.
- `tests/owner_direction_runtime_contract.test.ts` locks `shards_shop:open` so it cannot return to Firestore-write-on-every-focus.
- `tests/owner_direction_runtime_contract.test.ts` locks the `app_activity` queue cache so telemetry does not reread the full local queue on every event.
- `tests/owner_direction_runtime_contract.test.ts` locks the `analytics_queue` cache so product analytics does not reread the full local queue on every event.
- `tests/analytics_queue_cache.test.ts` behavior-checks that accepted analytics events keep durable storage writes while avoiding repeated full queue reads.
- `tests/app_health_throttle_cache.test.ts` behavior-checks that repeated identical app-health warnings keep one durable throttle write and one server report.
- `tests/owner_direction_runtime_contract.test.ts` locks the `app_health` throttle cache so repeated diagnostics cannot return to storage/server work on every occurrence.
- `tests/client_reports_cache.test.ts` behavior-checks callable reuse and concurrent AppCheck warmup dedupe while preserving each actual report call.
- `tests/owner_direction_runtime_contract.test.ts` locks `client_reports` callable cache and in-flight AppCheck warmup.
- `tests/ideas_client_cache.test.ts` behavior-checks callable reuse and concurrent AppCheck warmup dedupe while preserving each actual idea submit.
- `tests/owner_direction_runtime_contract.test.ts` locks `ideas_client` callable cache and payload fields.

## User Report Throttle Cache - 2026-06-27

- `app/user_report.ts`: shared throttle for `submitUserReport` and `submitPackReport` now has an in-memory timestamp cache.
- First successful report still awaits `submitClientReport` and only then writes `last_user_report_ts` to `AsyncStorage`.
- A repeated report inside 30 seconds is now dropped before another `AsyncStorage.getItem(last_user_report_ts)` and before another server report.
- Payload, Cloud Function route (`submitClientReport`) and UI result contract (`sent` / `throttled` / `failed`) were not changed.
- If server delivery fails, throttle is not written, same as before: the UI can show retry/failure and the user can try again.
- This is non-T0: XP, progress, streak, shards, premium, auth and cloud sync were not changed.
- `tests/user_report_throttle_cache.test.ts` behavior-checks first report sent, second shared user/pack report throttled, one throttle storage read, one server call.
- `tests/owner_direction_runtime_contract.test.ts` locks `reportThrottleCacheTs`, awaited delivery and shared user/pack report throttle.

## Error Report Throttle Cache - 2026-06-27

- `app/error_report.ts`: lesson bug reports now reuse an in-memory throttle timestamp after the first successful delivery in the session.
- The delivery order is preserved: `submitClientReport('error_report')` is awaited first, durable throttle storage is written second, non-blocking XP bonus starts third.
- A repeated report inside 60 seconds is dropped before another throttle storage read, metadata collection, server write, or XP bonus path.
- Server report payload, failure behavior and XP event id policy were not changed.
- `tests/error_report_throttle_cache.test.ts` behavior-checks one server report and one XP call for two immediate attempts.
- `tests/owner_direction_runtime_contract.test.ts` locks cache and server -> throttle -> XP order.

## Next Step

Safe non-T0 report/server-cost pass is closed for the approved scope.

T0 progress/shards/sync authority remains owner-approved only.

Recommended next runtime step, only after explicit owner scope: choose one T0 authority area, define idempotency keys, monotonic merge, retry/ledger behavior and rollback protection before touching production logic.
