# Phraseman 100k Users Readiness Audit

Date: 2026-05-13

## Verdict

Not ready for 100k users yet.

The app has a solid Firebase-oriented base: Cloud Functions build successfully, Firestore rules have owner/admin boundaries, App Check initialization exists on the client, and the most important leaderboard writes are moving to callable server functions. But several production-scale blockers remain. The biggest issues are unbounded Firestore reads/listeners in matchmaking, high-volume client activity logging, unclear App Check enforcement on most callable functions, and lack of explicit Cloud Functions capacity settings/backpressure.

This does not mean the product cannot reach 100k users. It means we should not intentionally drive 100k users into the current backend without hardening the hot paths first.

## Verification Run

- `npx tsc --noEmit --pretty false` passed.
- `cd functions && npm run build` passed.
- `cd functions && npm test -- --runInBand --no-cache` passed: 3 suites, 26 tests.
- Root Jest run currently has 1 unrelated failing product test: `tests/arena_i18n.test.ts` expects Spanish `loadingQuestions`, receives `Arena`.

## Dev Build Smoke Test

- Tested on a separate Android emulator: `emulator-5556`. The already-running `emulator-5554` was not used.
- Installed current debug APK: `app.phraseman` `versionName=1.5.30`, `versionCode=67`.
- Clean launch reached the Russian welcome screen, onboarding screens, auth-choice screen, and home screen.
- No native `FATAL EXCEPTION` or JS fatal crash was found during this smoke path.
- Blocking finding: Firebase App Check is not ready in the current Firebase project. Device logs show `Firebase App Check API has not been used in project 1047658658799 before or it is disabled` and then `Too many attempts`.
- Follow-up after reloading the Metro bundle: `npx tsc --noEmit --pretty false` now passes, `adb reverse tcp:8081 tcp:8081` was restored on `emulator-5556`, and the dev build reaches the welcome screen again.
- With `EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG` unset, the dev launch no longer emits the previous Firebase App Check `403` / `Too many attempts` token errors. Only native RNFB App Check startup metadata appears in logs.
- A separate clean Metro instance on port `8082` was used for `emulator-5556` so the already-running dev session on `8081` was not disrupted.
- Arena tab smoke passed: the tab opens and the matchmaking-searching aggregate count renders without a full queue listener.
- Leaderboard smoke found a Firestore rules blocker: clients read `leaderboard_stats/global`, but rules had no `leaderboard_stats` match block. A read-only client rule was added locally; deploy `firestore.rules` before relying on this screen in production.

User impact:

- The matchmaking/listener and activity-log changes should be invisible to normal users and reduce backend cost/load.
- Enabling `enforceAppCheck: true` on callable functions will affect users if Firebase App Check is not enabled and configured before deployment. In the tested dev state, protected server calls can fail because App Check token retrieval fails.

Release requirement:

- Enable Firebase App Check API for project `1047658658799`.
- Configure the Android app provider/debug token for dev builds.
- Re-test protected callables from the dev build before deploying App Check enforcement broadly.
- Deploy strict callable enforcement only with `ENFORCE_APP_CHECK=true`. Without that env flag, hot callables keep the same capacity limits but do not reject missing App Check tokens.

## First Hardening Pass Applied

- `app/app_activity.ts`: routine analytics no longer writes every event to Firestore; only explicit debug writes and 1% sampled error traces are retained.
- `app/services/arena_db.ts`: matchmaking UI counts now listen to the aggregate `app_meta/matchmaking_searching` document instead of the whole queue.
- `functions/src/matchmaking.ts`: queue reads are bounded by ordered windows instead of unbounded full collection reads.
- `functions/src/index.ts`: matchmaking searching count is updated incrementally on queue writes instead of recounting the whole queue.
- `functions/src/leaderboard.ts` and `functions/src/league_groups.ts`: hot callables have explicit timeout, memory, max instance, and App Check settings.
- `functions/src/callable_options.ts`: App Check callable enforcement is now controlled by the deploy-time `ENFORCE_APP_CHECK=true` flag.
- `app/app_check_init.ts`: dev builds skip App Check initialization unless `EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG=1`, avoiding broken debug sessions before Firebase App Check is configured.

## Critical Blockers

### 1. Matchmaking scans the whole queue

Evidence:

- `functions/src/matchmaking.ts:69`, `:107`, `:121`, `:159` read `matchmaking_queue` with `.get()` and no query limit.
- `app/services/arena_db.ts:301` and `:369` subscribe to the full queue from the client as fallback/UI count.

Impact at 100k:

- If even 1-5% of users enter arena around the same time, queue size can be hundreds/thousands.
- Every queue write triggers `onMatchmakingWrite`, which can re-read the queue and update a shared meta doc.
- Full-collection listeners multiply Firestore reads by connected clients.

Required fix:

- Shard matchmaking queues by `size + rank bucket + region/locale`.
- Query only bounded candidate windows, for example `where(size).where(rankBucket in nearby).orderBy(joinedAt).limit(50)`.
- Remove client full-queue subscriptions. Use only aggregate docs or Cloud Function-maintained counters.

### 2. Activity logging can explode Firestore writes

Evidence:

- `app/firebase.ts:22` calls `trackActivity` for every analytics event.
- `app/app_activity.ts:87` writes each activity as `app_activity.add(record)`.
- Firestore rules allow authenticated clients to create `app_activity` records at `firestore.rules:144`.

Impact at 100k:

- If 100k users generate only 20 tracked events/day, that is ~2M extra Firestore writes/day before product data.
- There is no server-side sampling, per-user quota, TTL policy in repo, or aggregation path.

Required fix:

- Default `writeToFirestore` to false for routine analytics.
- Keep Firebase Analytics/Crashlytics for event telemetry.
- For debug audit, sample 1-5% or gate by remote config/admin/tester.
- Add TTL to diagnostic collections if retained.

### 3. App Check is initialized but not consistently enforced

Evidence:

- Client App Check init exists in `app/app_check_init.ts`.
- Some callables explicitly use `enforceAppCheck: false`: `functions/src/referral.ts:104`, `functions/src/friend_gifts.ts:126`.
- Most callables use `onCall({ region })` without explicit `enforceAppCheck: true`.
- `questionTimeout` manually verifies App Check in `functions/src/index.ts:920`.

Impact at 100k:

- Authenticated abuse, scripted calls, gift/referral farming, and cost spikes remain possible unless Firebase console enforcement is separately enabled and verified.

Required fix:

- Decide policy per endpoint and make it explicit in code.
- Enforce App Check for write-heavy/product endpoints.
- Keep carefully documented exceptions only where truly required.

### 4. Cloud Functions have no explicit capacity/backpressure settings

Evidence:

- Most functions are defined with `{ region }` only.
- `website_contact` is one of the few with `memory` and `timeoutSeconds`.
- No repo-level evidence of `maxInstances`, `concurrency`, `timeoutSeconds`, alerting, or budgets for hot functions.

Impact at 100k:

- Traffic spikes can fan out into Firestore reads/writes and cost spikes.
- Some scheduled jobs scan large collections and can overlap with live traffic.

Required fix:

- Set explicit `maxInstances`, `timeoutSeconds`, `memory`, and for gen2 `concurrency` on hot functions.
- Add retry/idempotency guards where functions are triggered by Firestore writes.
- Add budget alerts and function error/latency alerts before launch.

## High Risks

### 5. Full-user cron jobs will become expensive

Evidence:

- `functions/src/sync_leaderboard.ts` paginates every `users` doc every 2 hours.
- `functions/src/reset_weekly_xp.ts` paginates every `users` doc weekly.
- `functions/src/compute_leaderboard_stats.ts` scans leaderboard and arena profiles hourly.

Impact:

- 100k users is still technically manageable for scheduled pagination, but this becomes recurring cost and operational load.

Required fix:

- Move to incremental updates where possible.
- Store daily/weekly rollups separately.
- Make long scans resumable and observable.

### 6. League grouping uses broad scans up to 500 docs

Evidence:

- `app/firestore_leagues.ts:55` and `functions/src/league_groups.ts:6` set `BROAD_GROUP_QUERY_LIMIT = 500`.
- Multiple paths query broad league groups to reconcile membership.

Impact:

- Better than full scans, but still too broad for a frequent startup/open-screen workflow at 100k users.

Required fix:

- Prefer server-only group assignment with deterministic bucket docs.
- Avoid client fallbacks that scan group collections.

### 7. Some callable endpoints have business limits, but not a unified abuse model

Good signs:

- Leaderboard score jumps are clamped in `functions/src/leaderboard.ts`.
- League chat has rate-limit docs.
- Friend gifts have daily limits.

Remaining gap:

- No central per-user/IP/function quota pattern across all write-heavy callables.
- No visible load-shedding strategy.

## What Looks Good

- Cloud Functions TypeScript build passes.
- Firestore rules test suite passes.
- Root TypeScript build passes.
- Server callables increasingly own sensitive writes: leaderboard, league groups, gifts, purchases.
- Firestore indexes cover several important compound queries.
- App Check client initialization is present.
- RevenueCat webhook uses a secret in `functions/src/revenuecat_shards.ts`.
- Leaderboard reads are paginated/cached on client instead of reading the whole collection.

## Readiness Estimate

Current safe target without hardening: small beta to low thousands of active users, assuming normal usage.

Reasonable next target after fixing critical blockers: 10k-25k registered users with monitored active usage.

100k readiness requires:

- bounded matchmaking and no full queue listeners,
- analytics write reduction,
- explicit App Check enforcement and rate limiting,
- load tests against emulator/staging,
- production dashboards, alerts, and budget caps.

## Priority Plan

1. Remove full `matchmaking_queue` scans/listeners.
2. Disable or sample Firestore `app_activity` writes.
3. Make App Check enforcement explicit for all callables.
4. Add Cloud Functions capacity limits and alerting.
5. Replace broad league scans with deterministic/server-assigned group membership.
6. Add load-test scripts for arena, leaderboard, league group join, chat, gifts, and startup sync.
7. Define operational SLOs: p95 callable latency, Firestore read/write budget, function error rate, crash-free sessions.

## Go / No-Go

For a 100k user launch today: No-Go.

For controlled beta: Go only with monitoring, Firebase budget alerts, and arena/matchmaking traffic kept limited.
