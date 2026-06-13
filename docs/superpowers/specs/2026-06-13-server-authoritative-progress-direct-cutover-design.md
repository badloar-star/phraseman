# Server-Authoritative Progress Direct Cutover

Date: 2026-06-13
Mode: direct cutover, no shadow mode

## Goal

Move all important learning progress authority from the device to Cloud Functions so one account can safely be used on multiple devices. After cutover, the server is the source of truth for XP, streak, lesson completion, exam completion, unlocks, and critical reward claims.

## Non-Negotiables

- No shadow mode.
- No client-side overwrite of critical progress after cutover.
- Every accepted progress event must be idempotent by `eventId`.
- Old users must be migrated before server-owned writes become strict.
- Offline play must queue events and replay them safely.
- Premium/VIP stays server-owned as today.

## Server Event API

Add callable `progressSubmitEvent`.

Required request fields:

- `eventId`: stable unique id generated on device and persisted until acknowledged.
- `stableId`: canonical user id.
- `type`: event type.
- `clientCreatedAt`: device timestamp for diagnostics, not authority.
- `payload`: event-specific data.
- `appVersion`, `platform`: diagnostics.

Initial event types:

- `lesson_answer`
- `lesson_complete`
- `quiz_answer`
- `exam_complete`
- `daily_task_reward`
- `achievement_reward`
- `daily_login_bonus`
- `bonus_chest`
- `vocabulary_learned`
- `verb_learned`
- `preposition_drill_answer`
- `preposition_drill_perfect`
- `review_answer`
- `diagnostic_test`
- `plan_task_complete`
- `wager_win`

The server writes `users/{stableId}/progress_events/{eventId}` first inside a transaction. If it already exists, it returns the already-computed result and does not grant again.

## Server-Owned Fields

After cutover, clients must not write these `users/{stableId}.progress` keys:

- `user_total_xp`
- `user_prev_xp`
- `weekly_xp`
- `weekly_xp_period_start`
- `streak_count`
- `last_active_date`
- `streak_last_date`
- `week_points_v2`
- `week_points`
- `unlocked_lessons`
- `lesson*_best_score`
- `lesson*_pass_count`
- `lesson*_progress`
- `level_exam_*`
- reward one-shot markers for server-paid rewards

The client can still write local UI preferences and non-critical state such as language, avatar selection where allowed, display settings, and local screen hints.

## Migration

Add callable `progressMigrateSnapshot`.

On first launch after cutover:

1. Client reads current AsyncStorage progress snapshot.
2. Client calls `progressMigrateSnapshot` once with a migration id.
3. Server creates or updates server progress using max/best-of semantics:
   - XP: max of existing server XP and local XP.
   - streak: keep safer value, using `last_active_date` and `streak_count`.
   - lesson best score: max.
   - lesson pass count: max.
   - lesson progress: merge best visible completion only where safe.
   - exams: passed stays passed, best pct max, pass count max.
4. Server records `progressServerAuthorityAt`.
5. Client restores server result into AsyncStorage for UI cache.

If migration fails, the app must block critical learning writes and show a retry state instead of silently falling back to client authority.

## Client Cutover

Replace direct `registerXP` authority with `submitProgressEvent`.

Client behavior:

- UI may optimistically show pending XP.
- Server response is final.
- Pending events are stored locally until acknowledged.
- Replayed events use the same `eventId`.
- If the server rejects an event, the client rolls back pending UI and shows a soft error.

`syncToCloud` must stop uploading server-owned keys. It remains for non-critical profile/settings fields until those are migrated too.

## Scenario Matrix

The cutover is not complete until each scenario has code coverage or an explicit exclusion:

- Correct lesson answer grants XP once.
- Replayed lesson answer with same `eventId` grants XP once.
- Completed lesson updates best score, pass count, and unlocks.
- Failed lesson completion does not downgrade best score.
- Quiz answer grants XP once.
- Exam pass writes pct, passed, medal, pass count, unlocks next level.
- Exam fail writes pct/best pct without unlocking.
- Daily task reward grants once.
- Daily login bonus grants once per day.
- Achievement reward grants once.
- Bonus chest grants once.
- Vocabulary/verb/preposition/review/diagnostic/personal-plan XP grants once.
- Wager win grants once.
- Streak extends once per day.
- Streak does not double-extend across two devices.
- Streak freeze/repair/revive rules remain valid or are explicitly moved in the same cutover.
- Offline queue replays without duplicate XP.
- Two devices submitting events concurrently produce monotonic XP and stable unlocks.
- Old users migrate without losing XP, streak, lessons, exams, premium, VIP.

## Firestore Rules

After `progressSubmitEvent` and `progressMigrateSnapshot` pass tests, update `progressHasNoPremiumWrites` or a new rule helper to block client writes for all server-owned progress keys.

Until that rule is deployed, server authority is incomplete.

## Rollback

Because this is direct cutover, rollback must be explicit:

- Keep old client progress code behind a local emergency fallback flag for development only.
- Production rollback is an OTA that restores client writes and removes strict client-side blocking.
- Firestore rules must not be tightened before the server callable and migration are live.

## Acceptance Criteria

- Functions tests cover idempotency, migration, concurrent events, and every event type in the scenario matrix.
- Root tests prove `syncToCloud` excludes server-owned keys after cutover.
- Client tests prove all `registerXP` call sites route through `submitProgressEvent`.
- Firestore rules tests prove clients cannot write server-owned keys.
- Manual smoke test covers: fresh install, existing account, two devices, offline replay, exam unlock, daily reward, premium account.

## Implementation Status 2026-06-13

Done:

- Added `progressSubmitEvent` and `progressMigrateSnapshot` Cloud Functions.
- Added a pure server progress engine for XP, weekly XP, week points, streak, basic lesson completion fields, and basic exam completion fields.
- Added idempotent `users/{stableUid}/progress_events/{eventId}` ledger.
- Added client `progress_events_client.ts` with one-time migration, event queue, retry flush, and server-result local mirroring.
- Routed positive `registerXP` sources through `progressSubmitEvent`.
- Blocked direct client writes for core server-owned fields: `user_total_xp`, `user_prev_xp`, `user_level`, `weekly_xp`, `weekly_xp_period_start`, `week_points`, `week_points_v2`, `streak_count`, `last_active_date`, `streak_last_date`.
- Kept lesson/exam progress out of the client/server-owned blocklist for now, because not every lesson/exam screen submits full completion payloads yet. This avoids breaking existing lesson progress sync during the cutover work.

Still required before claiming full Duolingo-style server-authoritative progress:

- Wire lesson answer/completion screens to submit deterministic lesson event IDs and full lesson progress payloads.
- Wire exam completion screens to submit level, percent, pass/fail, and unlock payloads.
- Convert daily tasks, achievements, bonus chest, review, vocabulary, verbs, preposition drill, diagnostic, plan tasks, and wager win to deterministic event IDs instead of generated IDs from `registerXP`.
- After those screens are wired, move their exact progress keys into the client/server-owned blocklist and Firestore rules.
- Add replay/race tests for callable transaction behavior, not only the pure engine.
