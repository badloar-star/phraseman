# Legacy Free Lesson Access and Dev Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Use `test-driven-development` before each behavior change and `verification-before-completion` before reporting success.

**Goal:** Make the non-store `tester_no_limits` admin switch behave as full Premium throughout `PremiumContext`, and permanently grandfather lessons 1 through the highest lesson an existing account had opened before this release, capped at lesson 8, without any migration UI.

**Architecture:** Add a target-scoped, cloud-synced immutable legacy cap (`3..8`) plus a completion marker. Derive it once from restored lesson evidence, defer an empty `3` result when cloud restore failed, and never recompute after finalization. Keep the ordinary remote free-lesson policy unchanged; pass the stored legacy cap explicitly into lesson access decisions and runtime entry guards. Treat `tester_no_premium` as the highest-priority QA kill switch and ignore `tester_no_limits` in store releases.

**Tech Stack:** React Native / Expo, TypeScript, AsyncStorage, Firebase cloud sync, Jest.

**Approved design:** `docs/superpowers/specs/2026-07-15-legacy-free-lesson-access-and-dev-premium-design.md`

---

## Working-tree safety

The current branch is `codex/release-integrated-20260715`. Several implementation targets already contain unrelated uncommitted edits, including `PremiumContext.tsx`, lesson screens, `cloud_sync.ts`, and related tests. Before every edit:

1. Inspect the exact current hunk with `git diff -- <file>` and `Get-Content`/`rg`.
2. Apply only narrow patches; never replace a whole dirty file.
3. Never stage an entire pre-dirty file. A commit is allowed only when the staged diff contains exclusively this plan's hunks. Otherwise leave the implementation uncommitted and report it.
4. Preserve all existing UI, purchase continuation, remote-config exceptions, account switching, and progress-lock behavior outside the explicit legacy-cap bypass.

## File map

**Create**

- `app/legacy_free_lesson_access.ts` — cap normalization, evidence derivation, one-time migration, storage reads.
- `tests/legacy_free_lesson_access.test.ts` — migration and immutability behavior.
- `tests/legacy_free_lesson_cloud_sync.test.ts` — sync-key and max-merge contracts.
- `tests/legacy_free_lesson_wiring_contract.test.ts` — all lesson entry paths pass/read the cap.
- `tests/legacy_free_lesson_no_ui_contract.test.ts` — migration has no toast/modal/banner dependency.

**Modify**

- `components/PremiumContext.tsx` — apply non-store no-limits to `isPremium` and `hasPremiumAccess` while preserving the no-premium kill switch.
- `tests/premium_context_vip_events_contract.test.ts` — update the context contract for no-limits.
- `app/target_storage_keys.ts` — add target-scoped cap and marker keys.
- `app/cloud_sync.ts` — sync/wipe both keys, max-merge caps, and run migration after every restore outcome.
- `tests/cloud_sync_monotonic_counter_merge.test.ts` — cover cap merge through the real restore merge router.
- `tests/cloud_sync_sync_keys_validity.test.ts` — cover English/French scoped keys.
- `tests/auth_provider_stable_link.test.ts` — update restore-wrapper source contract if its exact return expression changes.
- `app/monetization_policy.ts` — add legacy-cap-aware access helpers without changing remote free policy.
- `tests/monetization_policy.test.ts` — cover cap access, paywall context, sequential unlocks, and non-expansion.
- `app/lessons_tab_state.ts` — hydrate cap in the first-frame snapshot.
- `app/(tabs)/lessons.tsx` — use the hydrated cap for lesson cards and A1 exam access.
- `app/lesson_premium_gate.ts` — allow direct routes for lessons within the cap.
- `tests/lesson_premium_gate_routing.test.ts` — cover legacy direct-entry behavior.
- `app/lesson_menu.tsx` — apply the same cap in the menu's independent lock refresh.
- `app/lesson_complete.tsx` — apply the cap when continuing to the next lesson.
- `app/level_exam.tsx` — pass cap only if a direct paywall context decision there requires it after wiring inspection.

## Task 1: Make `PremiumContext` honor `tester_no_limits`

**Files:**

- Modify: `tests/premium_context_vip_events_contract.test.ts`
- Modify: `components/PremiumContext.tsx`

### Step 1: Write the failing contract

Extend the reload contract to require:

```ts
expect(source).toContain("AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])");
expect(source).toContain("noLimitsRaw === 'true' && !IS_STORE_RELEASE");
expect(source).toContain('const effectivePremium = !noPremiumTester && (realPremium || testerNoLimits);');
expect(source).toContain('setIsPremium(effectivePremium)');
expect(source).toContain('setHasPremiumAccess(effectivePremium || effectiveVip || introState.active || loyaltyState.active)');
```

Keep the existing event assertions, and replace the old final-expression assertion rather than duplicating it.

### Step 2: Confirm RED

Run:

```powershell
npx jest --runTestsByPath tests/premium_context_vip_events_contract.test.ts tests/premium_guard.test.ts tests/force_premium_prod_guard.test.ts --no-cache --runInBand
```

Expected: the new `PremiumContext` assertions fail; existing premium-guard tests still pass.

### Step 3: Implement the smallest context change

In `runReload`, batch-read both tester flags once after the real/VIP verification:

```ts
const testerEntries = await AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits']);
const testerValues = Object.fromEntries(testerEntries);
const noPremiumTester = testerValues.tester_no_premium === 'true';
const noLimitsRaw = testerValues.tester_no_limits;
const testerNoLimits = !noPremiumTester && noLimitsRaw === 'true' && !IS_STORE_RELEASE;

const effectivePremium = !noPremiumTester && (realPremium || testerNoLimits);
const effectiveVip = !noPremiumTester && vip;
```

Use `effectivePremium` for `setIsPremium`, `effectiveVip` for `setIsVip`, and include both in `setHasPremiumAccess`. Continue suppressing intro and loyalty while `tester_no_premium` is active. Do not write any real entitlement, RevenueCat, VIP, admin-grant, or cloud field for no-limits.

### Step 4: Confirm GREEN

Re-run the Step 2 command. Expected: all selected tests pass.

### Step 5: Inspect the behavioral diff

Run:

```powershell
git diff -- components/PremiumContext.tsx tests/premium_context_vip_events_contract.test.ts
```

Verify the store-release guard remains present and `tester_no_premium` wins.

## Task 2: Add the immutable target-scoped legacy cap

**Files:**

- Modify: `app/target_storage_keys.ts`
- Create: `app/legacy_free_lesson_access.ts`
- Create: `tests/legacy_free_lesson_access.test.ts`

### Step 1: Write migration tests first

Cover these cases with the AsyncStorage Jest mock:

```ts
test.each([
  { unlocked: [1, 2, 3], expected: 3 },
  { unlocked: [1, 2, 3, 4, 5, 6], expected: 6 },
  { unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9], expected: 8 },
])('derives a clamped cap from unlocked lessons', async ({ unlocked, expected }) => {});

test('uses score, progress, and pass-count evidence when unlocked_lessons is incomplete', async () => {});
test('finalizes cap 3 after a successful not_found restore', async () => {});
test('keeps migration pending when restore failed and no evidence exists', async () => {});
test('finalizes from meaningful local evidence even when restore failed', async () => {});
test('never expands a completed cap after later Plus progress', async () => {});
test('keeps English and French caps isolated', async () => {});
```

### Step 2: Confirm RED

Run:

```powershell
npx jest --runTestsByPath tests/legacy_free_lesson_access.test.ts --no-cache --runInBand
```

Expected: fail because the module and keys do not exist.

### Step 3: Add storage keys

Add beside `unlockedLessonsKey`:

```ts
export function legacyFreeLessonCapKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('legacy_free_lesson_cap_v1', 'lesson_progress', studyTarget);
}

export function legacyFreeLessonMigrationKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('legacy_free_lesson_migration_v1', 'lesson_progress', studyTarget);
}
```

English keeps the legacy unsuffixed key; other study targets use the existing target namespace.

### Step 4: Implement the pure derivation and storage API

Create the module with this public shape:

```ts
export const LEGACY_FREE_LESSON_MIN = 3;
export const LEGACY_FREE_LESSON_MAX = 8;
export const LEGACY_FREE_LESSON_MIGRATION_COMPLETE = 'complete';

export type LegacyLessonRestoreStatus = 'restored' | 'not_found' | 'failed';
export type LegacyFreeLessonMigrationResult =
  | { status: 'already_final'; cap: number }
  | { status: 'finalized'; cap: number }
  | { status: 'pending'; cap: null };

export function normalizeLegacyFreeLessonCap(value: unknown): number | null;
export function deriveLegacyFreeLessonCap(evidence: {
  persistedUnlocked: readonly number[];
  scores: readonly number[];
  progressCounts: readonly number[];
  passCounts: readonly number[];
}): number;
export async function readLegacyFreeLessonCap(studyTarget?: RuntimeStudyTarget): Promise<number>;
export async function migrateLegacyFreeLessonAccess(
  restoreStatus: LegacyLessonRestoreStatus,
  studyTarget?: RuntimeStudyTarget,
): Promise<LegacyFreeLessonMigrationResult>;
export async function migrateLegacyFreeLessonAccessForAllTargets(
  restoreStatus: LegacyLessonRestoreStatus,
): Promise<void>;
```

Derivation rules:

```ts
let highest = LEGACY_FREE_LESSON_MIN;
for (let lessonId = 1; lessonId <= LEGACY_FREE_LESSON_MAX; lessonId += 1) {
  const hasEvidence =
    evidence.persistedUnlocked.includes(lessonId) ||
    (evidence.scores[lessonId - 1] ?? 0) > 0 ||
    (evidence.progressCounts[lessonId - 1] ?? 0) > 0 ||
    (evidence.passCounts[lessonId - 1] ?? 0) > 0;
  if (hasEvidence) highest = lessonId;
}
return highest;
```

Migration rules:

1. Read cap and marker together.
2. If marker is `complete` and cap is valid, return it without reading or recomputing evidence.
3. Read `unlocked_lessons`, lesson best scores, progress, and pass counts for lessons 1..8 in one `multiGet`.
4. If restore status is `failed` and derived cap is only `3`, return `pending` and write nothing.
5. Otherwise write cap and marker in one `multiSet` and return `finalized`.
6. `readLegacyFreeLessonCap` returns the normalized stored cap or the ordinary fallback `3`; it never mutates storage.

This short-circuit is what prevents a later Plus subscription or expired Plus progress from enlarging the grandfathered cap.

### Step 5: Confirm GREEN

Run the Step 2 command. Expected: all migration tests pass.

## Task 3: Sync, restore, max-merge, and wipe the cap safely

**Files:**

- Modify: `app/cloud_sync.ts`
- Modify: `tests/cloud_sync_monotonic_counter_merge.test.ts`
- Modify: `tests/cloud_sync_sync_keys_validity.test.ts`
- Modify: `tests/cloud_sync_customization_account_isolation.test.ts` only if its exact key-set assertion needs the new account keys
- Create: `tests/legacy_free_lesson_cloud_sync.test.ts`
- Modify: `tests/auth_provider_stable_link.test.ts` only for changed source-contract text

### Step 1: Write failing cloud contracts

Assert:

```ts
expect(SYNC_KEYS).toEqual(expect.arrayContaining([
  legacyFreeLessonCapKey('en'),
  legacyFreeLessonMigrationKey('en'),
]));
expect(FRENCH_TARGET_SYNC_KEYS).toEqual(expect.arrayContaining([
  legacyFreeLessonCapKey('fr'),
  legacyFreeLessonMigrationKey('fr'),
]));
expect(accountLocalDataKeysForToday()).toEqual(expect.arrayContaining([
  legacyFreeLessonCapKey('en'),
  legacyFreeLessonMigrationKey('en'),
]));
```

Through `__cloudSyncTestHooks.mergeLessonRestoreValue`, cover:

```ts
expect(mergeLessonRestoreValue(legacyFreeLessonCapKey('en'), '5', '7')).toBe('7');
expect(mergeLessonRestoreValue(legacyFreeLessonCapKey('en'), '8', '4')).toBe('8');
expect(mergeLessonRestoreValue(legacyFreeLessonCapKey('en'), '99', '2')).toBe('8');
expect(mergeLessonRestoreValue(legacyFreeLessonMigrationKey('en'), 'complete', null)).toBe('complete');
```

Add a source/behavior contract that both public restore APIs invoke the migration for `restored`, `not_found`, and `failed` results.

### Step 2: Confirm RED

Run:

```powershell
npx jest --runTestsByPath tests/legacy_free_lesson_cloud_sync.test.ts tests/cloud_sync_monotonic_counter_merge.test.ts tests/cloud_sync_sync_keys_validity.test.ts tests/cloud_sync_customization_account_isolation.test.ts tests/auth_provider_stable_link.test.ts --no-cache --runInBand
```

Expected: new sync/merge assertions fail.

### Step 3: Wire keys into sync and account wipe

Import both key helpers in `cloud_sync.ts` and add:

- English keys to `SYNC_KEYS`.
- French keys to `FRENCH_TARGET_SYNC_KEYS`.
- Both target variants to `LESSON_RESTORE_MERGE_KEYS` if that list is used as the restore router allowlist.

Because `accountLocalDataKeysForToday()` is built from runtime sync keys, verify the new values are account-scoped and automatically removed by `wipeLocalAccountData()` during account switching.

### Step 4: Add monotonic restore merge

Before generic lesson restore behavior, route cap and marker keys explicitly:

```ts
if (isLegacyFreeLessonCapKey(key)) {
  const cloudCap = normalizeLegacyFreeLessonCap(cloudValue);
  const localCap = normalizeLegacyFreeLessonCap(localValue);
  if (cloudCap === null) return localCap === null ? null : String(localCap);
  if (localCap === null) return String(cloudCap);
  return String(Math.max(cloudCap, localCap));
}
if (isLegacyFreeLessonMigrationKey(key)) {
  return cloudValue === LEGACY_FREE_LESSON_MIGRATION_COMPLETE ||
    localValue === LEGACY_FREE_LESSON_MIGRATION_COMPLETE
    ? LEGACY_FREE_LESSON_MIGRATION_COMPLETE
    : null;
}
```

Use explicit helper predicates that compare against the English and French key helpers; do not use a broad substring that could catch unrelated future keys.

### Step 5: Run migration after every cloud-restore outcome

Keep `restoreAndMigrateFromCloudResult` authoritative for Firestore access, but ensure both exported paths call:

```ts
await migrateLegacyFreeLessonAccessForAllTargets(attempt.status).catch(() => {});
```

The call must happen:

- after restored progress has been applied;
- after a confirmed `not_found`, so a genuinely new/empty account can finalize at 3;
- after `failed`, so meaningful local evidence may finalize but empty storage remains pending.

Do not emit a toast, modal, event, or analytics event for this migration. Do not let a migration failure change the existing cloud-restore result.

### Step 6: Confirm GREEN

Re-run the Step 2 command. Expected: all selected tests pass.

## Task 4: Make policy and first-frame state cap-aware

**Files:**

- Modify: `tests/monetization_policy.test.ts`
- Modify: `app/monetization_policy.ts`
- Modify: `app/lessons_tab_state.ts`
- Modify: `tests/gustav_lessons_tab_state_target_isolation.test.ts` if its snapshot shape is exact

### Step 1: Add failing policy tests

Keep all existing no-cap behavior and add:

```ts
expect(hasLegacyFreeLessonAccess(6, 6)).toBe(true);
expect(hasLegacyFreeLessonAccess(7, 6)).toBe(false);
expect(isLegacyLessonGrandfatheredOpen(6, 6)).toBe(true);
expect(isLegacyLessonGrandfatheredOpen(2, 3)).toBe(false);
expect(requiresPremiumForLesson(6, 6)).toBe(false);
expect(requiresPremiumForLesson(7, 6)).toBe(true);
expect(lessonPaywallContext(6, 6)).toBeNull();
expect(lessonPaywallContext(7, 6)).toBe('course_after_lesson3');
expect(resolveLessonAccess({
  lessonId: 6,
  unlocked: false,
  isPremium: false,
  legacyFreeLessonCap: 6,
})).toBe('available');
expect(resolveLessonAccess({
  lessonId: 2,
  unlocked: false,
  isPremium: false,
  legacyFreeLessonCap: 3,
})).toBe('progress_required');
expect(buildSequentialFreeLessonUnlocks({
  scores: new Array(32).fill(0),
  freeLessonLimit: 3,
  legacyFreeLessonCap: 6,
}).slice(0, 7)).toEqual([true, true, true, true, true, true, false]);
```

Retain the existing test proving a raw `persistedUnlocked` array alone does not bypass policy when no finalized legacy cap is supplied.

### Step 2: Confirm RED

Run:

```powershell
npx jest --runTestsByPath tests/monetization_policy.test.ts tests/gustav_lessons_tab_state_target_isolation.test.ts --no-cache --runInBand
```

Expected: new cap-aware API assertions fail.

### Step 3: Add explicit policy API

Implement:

```ts
export function hasLegacyFreeLessonAccess(lessonId: number, legacyFreeLessonCap?: number): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  return lessonId <= (legacyFreeLessonCap ?? 0);
}

export function isLegacyLessonGrandfatheredOpen(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  return (legacyFreeLessonCap ?? 0) > FREE_LESSON_LIMIT &&
    hasLegacyFreeLessonAccess(lessonId, legacyFreeLessonCap);
}

export function requiresPremiumForLesson(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  if (hasLegacyFreeLessonAccess(lessonId, legacyFreeLessonCap)) return false;
  return !isFreeLesson(lessonId);
}
```

Add the optional cap to `lessonPaywallContext`, `resolveLessonAccess`, and `buildSequentialFreeLessonUnlocks`. In `resolveLessonAccess`, return `available` when `isLegacyLessonGrandfatheredOpen(...)` is true before evaluating ordinary progress. A cap above the build-time free floor (`3`) identifies the old cohort whose later lessons were already open, so indices `0..cap-1` become true after the ordinary sequential calculation. A cap of exactly `3` only suppresses monetization within the already-free range and must **not** unlock lessons 2–3 ahead of the existing bronze progression. Preserve the existing whole-feature-free and `free_lessons_extra` behavior.

### Step 4: Hydrate the cap with the lessons snapshot

Extend `LessonsTabSnapshot`:

```ts
legacyFreeLessonCap: number;
```

Add `legacyFreeLessonCapKey(studyTarget)` to the existing metadata `multiGet`, normalize it with the shared helper, and default to `3`. This keeps the first lessons-tab frame correct without a post-render jump.

### Step 5: Confirm GREEN

Re-run Step 2. Expected: all selected tests pass.

## Task 5: Wire every lesson entry and continuation path

**Files:**

- Create: `tests/legacy_free_lesson_wiring_contract.test.ts`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/lesson_premium_gate.ts`
- Modify: `tests/lesson_premium_gate_routing.test.ts`
- Modify: `app/lesson_menu.tsx`
- Modify: `app/lesson_complete.tsx`
- Inspect/modify: `app/level_exam.tsx`

### Step 1: Write failing wiring contracts

The contract must assert:

1. The lessons tab initializes/hydrates `legacyFreeLessonCap` from `LessonsTabSnapshot` and passes it to all `resolveLessonAccess`, `buildSequentialFreeLessonUnlocks`, `requiresPremiumForLesson`, and A1 exam checks.
2. `resolveLessonRuntimeGate` reads the target cap and immediately returns `available` only for grandfathered-open lesson IDs (`cap > 3` and `lessonId <= cap`). A normal cap of 3 retains progress locks.
3. `lesson_menu` reads the cap before its independent premium/progress lock logic.
4. `lesson_complete` reads the cap before showing the next-lesson paywall/banner.
5. No call site can paywall lesson `N` when `N <= legacyFreeLessonCap`.

Add behavioral cases to `lesson_premium_gate_routing.test.ts`:

```ts
test('allows direct entry inside the finalized legacy cap after Plus expires', async () => {});
test('still routes the next lesson above the cap to premium', async () => {});
test('tester_no_limits still bypasses all lesson gates', async () => {});
```

### Step 2: Confirm RED

Run:

```powershell
npx jest --runTestsByPath tests/legacy_free_lesson_wiring_contract.test.ts tests/lesson_premium_gate_routing.test.ts tests/lesson_complete_soft_upsell_behavior.test.ts tests/paywall_lesson_continuation.test.ts --no-cache --runInBand
```

Expected: legacy-cap wiring assertions fail; existing continuation tests remain a regression guard.

### Step 3: Wire the lessons tab

Use the snapshot value in initial state and quiet storage revalidation. Pass it explicitly:

```ts
resolveLessonAccess({ ..., legacyFreeLessonCap })
buildSequentialFreeLessonUnlocks({ ..., legacyFreeLessonCap })
requiresPremiumForLesson(lessonId, legacyFreeLessonCap)
lessonPaywallContext(lessonId, legacyFreeLessonCap)
```

For exam cards, the existing `to` boundary is 8 for A1. Therefore:

```ts
const examPremiumRequired =
  !isPremium &&
  !DEV_CONTENT_UNLOCK &&
  !noLimits &&
  requiresPremiumForLesson(to, legacyFreeLessonCap);
```

This leaves A1 exam available on the old terms only when the frozen cap reached lesson 8; later exams remain premium/progression controlled.

### Step 4: Wire direct lesson routing

In `resolveLessonRuntimeGate`:

```ts
const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
if (isLegacyLessonGrandfatheredOpen(lessonId, legacyFreeLessonCap)) return 'available';
```

Place this after the no-limits bypass and before premium/progress decisions. This guarantees a deep link or restored route behaves exactly like the list without making lessons 2–3 immediately open for a new account.

### Step 5: Wire the menu's independent lock refresh

In `loadLockState`, read the cap once. After no-limits and before `getVerifiedPremiumStatus`, return an unlocked state when the lesson is within the cap:

```ts
const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
if (isLegacyLessonGrandfatheredOpen(lessonId, legacyFreeLessonCap)) {
  setIsLessonLocked(false);
  setLockReason('progress');
  setLockInfoQuiet(null);
  return;
}
```

Do not remove the premium-course-level or earned-progress logic for lessons above the cap.

### Step 6: Wire lesson completion and paywall continuation

Before deciding whether `next` requires Premium:

```ts
const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
if (requiresPremiumForLesson(next, legacyFreeLessonCap) && !premium) {
  // existing banner/paywall behavior unchanged
}
```

Do not change the existing purchase-continuation params or soft-upsell copy. Inspect `level_exam.tsx`; pass the cap into a paywall context only if that screen independently decides lesson entitlement. Do not add redundant storage reads solely for analytics context.

### Step 7: Confirm GREEN

Re-run Step 2. Expected: all selected tests pass.

## Task 6: Enforce the no-message requirement

**Files:**

- Create: `tests/legacy_free_lesson_no_ui_contract.test.ts`
- Inspect: all files changed by Tasks 2–5

### Step 1: Add the contract

Read the migration module and its cloud-sync invocation as source. Assert they do not import or call UI notification paths:

```ts
for (const forbidden of [
  "emitAppEvent('action_toast'",
  'Alert.alert',
  'Modal',
  'openPremiumPaywall',
  'showBanner',
]) {
  expect(migrationSource).not.toContain(forbidden);
}
```

The contract applies to the new migration code only; do not remove the pre-existing generic cloud-restore failure toast in `_layout.tsx`.

### Step 2: Confirm test passes after implementation

Run:

```powershell
npx jest --runTestsByPath tests/legacy_free_lesson_no_ui_contract.test.ts --no-cache --runInBand
```

Expected: pass, with no migration notification code.

## Task 7: Focused regression verification

### Step 1: Run the complete focused suite

```powershell
npx jest --runTestsByPath tests/premium_context_vip_events_contract.test.ts tests/premium_guard.test.ts tests/force_premium_prod_guard.test.ts tests/legacy_free_lesson_access.test.ts tests/legacy_free_lesson_cloud_sync.test.ts tests/cloud_sync_monotonic_counter_merge.test.ts tests/cloud_sync_sync_keys_validity.test.ts tests/cloud_sync_customization_account_isolation.test.ts tests/cloud_restore_coordinator.test.ts tests/boot_cloud_restore_contract.test.ts tests/auth_provider_stable_link.test.ts tests/monetization_policy.test.ts tests/gustav_lessons_tab_state_target_isolation.test.ts tests/legacy_free_lesson_wiring_contract.test.ts tests/lesson_premium_gate_routing.test.ts tests/lesson_complete_soft_upsell_behavior.test.ts tests/paywall_lesson_continuation.test.ts tests/legacy_free_lesson_no_ui_contract.test.ts --no-cache --runInBand
```

Expected: all focused tests pass. Do not run the whole-project Jest suite automatically.

### Step 2: Run narrow static checks

```powershell
npx tsc --noEmit --pretty false 2>&1 | Select-String -Pattern 'PremiumContext|legacy_free_lesson|monetization_policy|lessons_tab_state|lesson_premium_gate|lesson_menu|lesson_complete|\(tabs\)/lessons|cloud_sync|target_storage_keys'
```

Expected: no new errors in touched files. If the repository has unrelated global type errors, report them separately rather than claiming a clean whole-project typecheck.

### Step 3: Inspect all access call sites

```powershell
rg -n "requiresPremiumForLesson|lessonPaywallContext|resolveLessonAccess|buildSequentialFreeLessonUnlocks|readLegacyFreeLessonCap" app components tests
```

Verify every user-facing lesson entitlement decision either supplies the cap or reads it within the runtime gate.

### Step 4: Inspect final diff and dirty-tree boundaries

```powershell
git diff -- components/PremiumContext.tsx app/target_storage_keys.ts app/legacy_free_lesson_access.ts app/cloud_sync.ts app/monetization_policy.ts app/lessons_tab_state.ts 'app/(tabs)/lessons.tsx' app/lesson_premium_gate.ts app/lesson_menu.tsx app/lesson_complete.tsx app/level_exam.tsx tests/premium_context_vip_events_contract.test.ts tests/legacy_free_lesson_access.test.ts tests/legacy_free_lesson_cloud_sync.test.ts tests/cloud_sync_monotonic_counter_merge.test.ts tests/cloud_sync_sync_keys_validity.test.ts tests/cloud_sync_customization_account_isolation.test.ts tests/auth_provider_stable_link.test.ts tests/monetization_policy.test.ts tests/gustav_lessons_tab_state_target_isolation.test.ts tests/legacy_free_lesson_wiring_contract.test.ts tests/lesson_premium_gate_routing.test.ts tests/lesson_complete_soft_upsell_behavior.test.ts tests/paywall_lesson_continuation.test.ts tests/legacy_free_lesson_no_ui_contract.test.ts
```

Confirm:

- no entitlement is written for `tester_no_limits`;
- no completed cap can increase;
- cap never exceeds 8;
- failed empty restore stays pending;
- account wipe includes cap/marker;
- lessons 1..cap open consistently from list, direct route, menu, and completion;
- lesson cap+1 still paywalls for a non-premium account;
- no new user-facing message exists.

### Step 5: Commit only if staging can exclude pre-existing changes

If and only if the staged diff contains exclusively this implementation:

```powershell
git diff --cached --check
git diff --cached
git commit -m "fix: preserve legacy lesson access"
```

Otherwise do not commit. Report which files remain mixed with pre-existing user edits.
