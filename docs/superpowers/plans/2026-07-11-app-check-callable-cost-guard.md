# App Check Callable Cost Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent clients without a valid App Check JWT from repeatedly invoking selected production hot-callables while retaining durable progress and shard work.

**Architecture:** Add a single-flight App Check readiness state with a five-minute failure cooldown. Guard only retryable/background call sites: progress outbox, shard replay, stable-link background repair, and league background synchronization. Purchases, destructive operations, server configuration, and Cloud Function APIs remain unchanged.

**Tech Stack:** TypeScript, React Native Firebase App Check/Functions, AsyncStorage durable queues, Jest.

---

## File map

- Modify `app/app_check_init.ts`; create `tests/app_check_init.test.ts`.
- Modify `app/progress_events_client.ts` and `tests/progress_events_client_queue.test.ts`.
- Modify `app/shards_system.ts`; extend `tests/shards_delta_queue_reconcile.test.ts`.
- Modify `app/cloud_sync.ts`; extend `tests/auth_provider_stable_link.test.ts` or add a focused runtime test.
- Modify `app/firestore_leagues.ts`; extend `tests/leaderboard_identity_and_league_membership_contract.test.ts`.
- Extend `tests/firebase_cost_controls_contract.test.ts` with scope guards.

All listed source files already have unrelated changes. Use narrow patches, inspect each affected hunk, and never stage unrelated work.

### Task 1: App Check readiness state and cooldown

**Files:**
- Create: `tests/app_check_init.test.ts`
- Modify: `app/app_check_init.ts`

- [ ] **Step 1: Write RED tests**

Mock `@react-native-firebase/app-check`, `app/config`, and `Date.now`. Require:

```ts
expect(await initFirebaseAppCheckIfAvailable()).toBe(false);
expect(await initFirebaseAppCheckIfAvailable()).toBe(false);
expect(getToken).toHaveBeenCalledTimes(2); // false + forced refresh in one attempt only

now += 5 * 60 * 1000;
getToken.mockResolvedValue({ token: VALID_JWT });
expect(await initFirebaseAppCheckIfAvailable()).toBe(true);
expect(await initFirebaseAppCheckIfAvailable()).toBe(true);
```

Add parallel-call single-flight, `forceRetry: true`, and non-store-without-debug cases. Use a synthetic three-segment token longer than 80 characters; never print it.

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/app_check_init.test.ts --runInBand
```

Expected: FAIL because options/cooldown/ready state do not exist.

- [ ] **Step 3: Implement minimal state**

Add:

```ts
const APP_CHECK_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
let appCheckReady = false;
let appCheckLastFailureAtMs = 0;

export async function initFirebaseAppCheckIfAvailable(
  options: { forceRetry?: boolean } = {},
): Promise<boolean> {
  if (appCheckReady) return true;
  if (appCheckInitPromise) return appCheckInitPromise;
  if (!options.forceRetry && appCheckLastFailureAtMs > 0 &&
      Date.now() - appCheckLastFailureAtMs < APP_CHECK_FAILURE_COOLDOWN_MS) return false;
  // existing build/provider gates and initialization
}
```

On failure set `appCheckLastFailureAtMs = Date.now()` and clear only the in-flight promise. On success set `appCheckReady = true`, clear failure time, enable SDK auto-refresh, and reuse ready state.

- [ ] **Step 4: Verify GREEN**

```powershell
npx jest tests/app_check_init.test.ts --runInBand
```

Expected: PASS.

### Task 2: Preserve progress outbox while unready

**Files:**
- Modify: `tests/progress_events_client_queue.test.ts`
- Modify: `app/progress_events_client.ts`

- [ ] **Step 1: Make readiness controllable in the test loader**

Change `loadClient` to accept `appCheckReady = true` and mock initialization with a shared Jest function. Existing success tests must default to ready.

- [ ] **Step 2: Add RED recovery test**

With readiness false, submit an event and assert `progress_event_pending`, zero migration/submit callable calls, queue retained, migrated marker absent, and baseline retained. Flip readiness true, call `flushPendingProgressEvents()`, then assert the same event ID is submitted once and removed.

- [ ] **Step 3: Verify RED**

```powershell
npx jest tests/progress_events_client_queue.test.ts --runInBand
```

Expected: FAIL because false readiness is ignored.

- [ ] **Step 4: Implement boolean migration/flush gates**

Make both migration helpers return `Promise<boolean>`. Return `false` before creating a callable when readiness is false; do not set the migrated marker or remove the baseline. In `doFlush`, return `0` when migration is not ready. In `submitQueuedEvent`, throw the existing transient pending path before creating `progressSubmitEvent` if readiness is false. Preserve durable enqueue-before-flush and dead-letter behavior.

- [ ] **Step 5: Verify GREEN**

```powershell
npx jest tests/progress_events_client_queue.test.ts --runInBand
```

Expected: PASS.

### Task 3: Guard shard replay only

**Files:**
- Modify: `tests/shards_delta_queue_reconcile.test.ts`
- Modify: `app/shards_system.ts`

- [ ] **Step 1: Add RED replay test**

Seed a pending earn/spend queue, mock App Check false, call `resumePendingShardDeltas()`, and require `{ resolved: 0, pending: 2 }`, zero `shardsApplyDelta` calls, unchanged queue, and original order.

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/shards_delta_queue_reconcile.test.ts --runInBand
```

- [ ] **Step 3: Add the narrow guard**

Import `initFirebaseAppCheckIfAvailable`. Inside `resumePendingShardDeltas()`, read the queue first; when non-empty and readiness is false return `{ resolved: 0, pending: queue.length }` before the replay loop. Do not add the guard to `applyShardDeltaToCloud`, `addShards`, or `spendShards`.

- [ ] **Step 4: Verify GREEN and shard regressions**

```powershell
npx jest tests/shards_delta_queue_reconcile.test.ts tests/shards_delta_queue.test.ts tests/shards_stale_cloud_earn.test.ts tests/shards_spend_cloud_timeout.test.ts --runInBand
```

Expected: PASS.

### Task 4: Guard cached stable-link repair

**Files:**
- Modify: `app/cloud_sync.ts`
- Test: `tests/auth_provider_stable_link.test.ts`

- [ ] **Step 1: Add RED contract/runtime coverage**

Require the fresh stable-link cache fast path to remain before App Check, then require:

```ts
const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
if (!appCheckReady) return unavailableResult;
```

and verify `authEnsureStableLink` is not constructed when readiness is false.

- [ ] **Step 2: Implement inside the deduplicated promise**

After disabled/missing-identity/cache returns and before `callable('authEnsureStableLink')`, return `{ ok: false, requestedStableId, stableUid: null, authUid, source: 'unavailable' }` when unready. Do not change provider sign-in, merge, account deletion, cache writes, or health reporting.

- [ ] **Step 3: Verify focused auth guards**

```powershell
npx jest tests/auth_provider_stable_link.test.ts tests/auth_identity_anon_relink.test.ts tests/account_delete_flow_contract.test.ts --runInBand
```

Expected: PASS.

### Task 5: Guard league background callables

**Files:**
- Modify: `app/firestore_leagues.ts`
- Modify: `tests/leaderboard_identity_and_league_membership_contract.test.ts`

- [ ] **Step 1: Add RED scope contracts**

Require boolean readiness immediately before `leagueJoinOrUpdateGroup`, `leagueUpdateMyMember`, and `leagueSyncMyBoost`. Require `buyLeagueGroupBoost`/`leagueActivateGroupBoost` bodies not to contain the new guard.

- [ ] **Step 2: Implement existing fallback semantics**

In `getOrCreateLeagueGroup`, store readiness and skip only the callable block when false, continuing into the existing Firestore/cache fallback. In `_doUpdateGroupPoints` and `syncMyLeagueMemberBoostToCloud`, return early when false without updating sync caches. Do not treat a cached stable link as App Check readiness.

- [ ] **Step 3: Verify league tests**

```powershell
npx jest tests/leaderboard_identity_and_league_membership_contract.test.ts tests/league_chat_cache_first.test.ts --runInBand
```

Expected: PASS.

### Task 6: Scope contract and final verification

**Files:**
- Modify: `tests/firebase_cost_controls_contract.test.ts`

- [ ] **Step 1: Add cost-scope assertions**

Assert the four guarded directions exist, `functions/src/callable_options.ts` still defaults `ENFORCE_APP_CHECK` to false, and purchase/destructive callable bodies were not guarded or removed.

- [ ] **Step 2: Run focused verification**

```powershell
npx jest tests/app_check_init.test.ts tests/progress_events_client_queue.test.ts tests/shards_delta_queue_reconcile.test.ts tests/shards_delta_queue.test.ts tests/shards_stale_cloud_earn.test.ts tests/shards_spend_cloud_timeout.test.ts tests/auth_provider_stable_link.test.ts tests/auth_identity_anon_relink.test.ts tests/account_delete_flow_contract.test.ts tests/leaderboard_identity_and_league_membership_contract.test.ts tests/league_chat_cache_first.test.ts tests/firebase_cost_controls_contract.test.ts --runInBand
npx tsc --noEmit
git diff --check -- app/app_check_init.ts app/progress_events_client.ts app/shards_system.ts app/cloud_sync.ts app/firestore_leagues.ts tests/app_check_init.test.ts tests/progress_events_client_queue.test.ts tests/shards_delta_queue_reconcile.test.ts tests/auth_provider_stable_link.test.ts tests/leaderboard_identity_and_league_membership_contract.test.ts tests/firebase_cost_controls_contract.test.ts
```

Expected: all selected tests and typecheck pass; no whitespace errors.

- [ ] **Step 3: Advisor final review**

Submit the actual diff and verification evidence. Apply any required behavior correction test-first and resubmit until `DECISION: APPROVED`.

### Task 7: Client rollout and measurement

- [ ] **Step 1: Do not deploy Cloud Functions**

This is a client-only change. Keep global server enforcement off.

- [ ] **Step 2: Preserve the dirty branch**

Do not stage overlapping source files or merge unrelated work. The user chooses the later client release channel/build workflow separately.

- [ ] **Step 3: Measure after an updated client is installed**

Compare invalid-App-Check warnings, callable invocation count, and billed duration. Old app versions can continue producing traffic until users update.

## Rollback

Remove only the client readiness guards and cooldown state. Durable queue formats, idempotency keys, server functions, Firestore schemas, purchases, and account deletion require no rollback.
