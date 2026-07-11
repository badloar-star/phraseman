# Animation and Timer Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop repeating motion and presentation timers when their screen is hidden while preserving absolute deadlines and one-shot animations.

**Architecture:** Every repeating effect receives `runtimeActive`; entrance and completion effects remain independent. Deadline-driven UI subscribes to the shared visible wall clock. PromoBanner replaces minute polling with event refreshes and bounded absolute-expiry scheduling.

**Tech Stack:** React Native Animated, Reanimated 4, Expo Router, TypeScript, Jest.

---

### Task 0: Reconcile the complete repeating-motion inventory

- [ ] Run `git status --short`, `git diff --name-only`, and `git diff --` for every planned target. Record existing user changes, especially `app/streak_stats.tsx`; never auto-stage a path that is already dirty.
- [ ] Start from the exact 58-file manifest established by `tests/runtime_lifecycle_ratchet.test.ts`. For every `Animated.loop` and infinite `withRepeat` call site, confirm one owner: screen runtime, existing focus+AppState guard, explicit owner prop, bounded loop, unmounting modal, disabled feature, dev-only screen, or reviewed migration debt. This task is not complete while a discovered path is unclassified; every `migration_debt` entry must be replaced by its final guarded owner before this plan passes.
- [ ] Replace each migration-debt row with a narrow per-effect contract in the same commit as its production guard. Do not use a file-wide `source.includes('useRuntimeActive')` check: the test must identify the loop/effect and assert its guard, cleanup, and dependency/owner wiring.

### Task 1: Guard Home and Weekly Review motion

**Files:**
- Modify: `app/(tabs)/home.tsx:533,923-963,1231-1246,1361-1427`
- Modify: `app/WeeklyReviewCard.tsx:44-77,333-347`
- Modify: `app/trainer.tsx:895`
- Test: `tests/home_runtime_animation_contract.test.ts`

- [ ] **Step 1: Write failing contracts**

Require Home runtime activity to combine focus, AppState, and `activeIdx === 0`. Require `WeeklyReviewCard` to accept an explicit `active` prop and stop its loop when false.

```ts
expect(home).toContain('const homeRuntimeActive = useRuntimeActive(activeIdx === 0)');
expect(weekly).toContain('active: boolean');
expect(weekly).toContain('if (!active || reduceMotion)');
```

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/home_runtime_animation_contract.test.ts --no-cache --runInBand`

Expected: FAIL on the ungated feature-tip loop and missing prop.

- [ ] **Step 3: Apply minimal loop guards**

Add `homeRuntimeActive` to effect guards and dependencies. Stop and reset only repeating hint values; do not replay entrance animation on focus return. Pass the correct owner visibility to `WeeklyReviewCard` from every caller.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/home_runtime_animation_contract.test.ts tests/weekly_review_client_contract.test.ts --no-cache --runInBand`

Expected: PASS.

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 2: Guard lesson and pack-opening loops

**Files:**
- Modify: `app/lesson1.tsx:2184-2196,2349-2375`
- Modify: `app/lesson_intro_screens.tsx:464-545`
- Modify: `app/lesson_complete.tsx:762-787`
- Modify: `app/pack_opening.tsx:156-167`
- Test: `tests/lesson_runtime_animation_contract.test.ts`

- [ ] **Step 1: Write the failing contract**

Require each screen owner to call `useRuntimeActive()` and include the value in repeating-effect guards and dependencies.

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/lesson_runtime_animation_contract.test.ts --no-cache --runInBand`

Expected: FAIL listing all four unguarded files.

- [ ] **Step 3: Guard only repeating effects**

```ts
useEffect(() => {
  if (!runtimeActive || !shouldLoop) {
    loopValue.stopAnimation();
    loopValue.setValue(restingValue);
    return;
  }
  const loop = Animated.loop(sequence);
  loop.start();
  return () => loop.stop();
}, [runtimeActive, shouldLoop, loopValue]);
```

Do not add `runtimeActive` to one-shot answer, entrance, reward, or flip effects unless the test proves they repeat.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/lesson_runtime_animation_contract.test.ts tests/perf_freeze_contract.test.ts --no-cache --runInBand`

Expected: PASS and no new animation allowlist entries.

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 3: Extend the infinite-animation ratchet

**Files:**
- Modify: `tests/perf_freeze_contract.test.ts:77-103`
- Modify: `tests/runtime_lifecycle_ratchet.test.ts`

- [ ] **Step 1: Make discovery recognize both APIs without accepting token presence**

```ts
const hasInfiniteMotion = /Animated\.loop\s*\(|withRepeat\([\s\S]{0,220}?,\s*-1/.test(source);
if (hasInfiniteMotion) discoveredMotionFiles.push(file);
```

Compare discovery to the exact reviewed manifest. For `runtime_active`, `explicit_focus_appstate`, and `owner_prop` entries, use a narrow call-site/effect regex or extracted-block assertion that proves the controlling boolean guards that loop and that cleanup stops/cancels it. Modal/dev/disabled/bounded entries require a written reason and a testable ownership fact. Existing valid `useIsScreenFocused` + AppState guards remain valid and do not need gratuitous migration.

- [ ] **Step 2: Run both ratchets**

Run: `npx jest --runTestsByPath tests/perf_freeze_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand`

Expected: PASS after Tasks 1–2; all 58 discovered files remain accounted for, no `migration_debt` entries remain, and no generic hook-token check can hide an unguarded second loop in the same file.

- [ ] **Step 3: Commit**

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 4: Move screen countdowns to visible wall time

**Files:**
- Modify: `app/streak_stats.tsx:3028-3048`
- Modify: `app/diagnostic_test.tsx:1170-1198,1182`
- Modify: `app/arena_leaderboard.tsx:313-328`
- Test: `tests/screen_wall_clock_contract.test.ts`

- [ ] **Step 1: Write red contracts for absolute time and diagnostic progress animation**

Require `useRuntimeActive`, `useVisibleWallClock`, and a stored absolute deadline/start. Diagnostics currently also starts a three-minute `Animated.timing` with `useNativeDriver: false`; assert that background/blur stops that animation, foreground derives progress and remaining duration from the same deadline, and timeout handling remains exactly-once through `timeUpFired`.

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/screen_wall_clock_contract.test.ts --no-cache --runInBand`

Expected: FAIL on direct screen `setInterval` calls.

- [ ] **Step 3: Migrate displays**

Use the shared `now` snapshot only when runtime-active. Derive remaining values from existing `expiresAt` fields. For the diagnostic question, create `questionDeadlineAtRef = Date.now() + TIMER_SEC * 1000`; on inactive transition call `timerProgress.stopAnimation()`. On resume compute `remainingMs = deadline - Date.now()`, set progress from elapsed wall time, and start a new `Animated.timing` for exactly `remainingMs`. If expired, do not restart animation and call the existing guarded timeout handler once.

Add a fake-timer/Animated mock test for background halfway through, foreground before expiry, foreground after expiry, repeated foreground events, and question replacement. It must prove correct progress, remaining duration, and exactly one timeout callback.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/screen_wall_clock_contract.test.ts tests/owner_direction_runtime_contract.test.ts --no-cache --runInBand`

Expected: the migrated interval call sites disappear from the reviewed list; focused behavior assertions PASS.

Commit only through the clean-at-preflight staging procedure in Task 6; specifically, `app/streak_stats.tsx` must not be auto-staged because it was dirty at preflight.

### Task 5: Replace PromoBanner polling with bounded expiry

**Files:**
- Create: `app/campaign_expiry_scheduler.ts`
- Modify: `components/PromoBanner.tsx:48-107`
- Test: `tests/campaign_expiry_scheduler.test.ts`
- Test: `tests/promo_banner_runtime_contract.test.ts`

- [ ] **Step 1: Write scheduler tests**

Cover a 30-day campaign using 24-hour chunks, background cancellation, foreground recomputation, config replacement, and exact expiry.

```ts
const scheduler = createCampaignExpiryScheduler(harness.deps);
scheduler.setUntil(now + 30 * DAY_MS, expire);
expect(harness.lastDelay()).toBe(DAY_MS);
harness.background();
expect(harness.pending()).toBe(0);
harness.advanceTo(now + 30 * DAY_MS + 1);
harness.foreground();
expect(expire).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/campaign_expiry_scheduler.test.ts tests/promo_banner_runtime_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the scheduler is absent and PromoBanner still uses `setInterval`.

- [ ] **Step 3: Implement bounded scheduling**

```ts
type SchedulerDeps = {
  now(): number;
  setTimeout(listener: () => void, delayMs: number): unknown;
  clearTimeout(id: unknown): void;
};

export function createCampaignExpiryScheduler(deps: SchedulerDeps) {
  let active = true;
  let untilMs = 0;
  let timer: unknown | null = null;
  let onExpire: (() => void) | null = null;
  let expired = false;
  const clear = () => {
    if (timer !== null) deps.clearTimeout(timer);
    timer = null;
  };
const MAX_DELAY_MS = 24 * 60 * 60 * 1000;
const schedule = () => {
  clear();
  if (!active || untilMs <= 0 || expired) return;
  const remaining = untilMs - deps.now();
  if (remaining <= 0) { expired = true; onExpire?.(); return; }
  timer = deps.setTimeout(schedule, Math.min(remaining, MAX_DELAY_MS));
};
  return {
    setUntil(nextUntilMs: number, listener: () => void) { untilMs = nextUntilMs; onExpire = listener; expired = false; schedule(); },
    setActive(nextActive: boolean) { active = nextActive; schedule(); },
    dispose() { clear(); onExpire = null; },
  };
}
```

Refresh PromoBanner on mount, foreground, remote-config event, language, and premium changes. Use a generation counter so an older `readState` result cannot overwrite a newer refresh.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/campaign_expiry_scheduler.test.ts tests/promo_banner_runtime_contract.test.ts --no-cache --runInBand`

Expected: PASS; `PromoBanner.tsx` contains no `setInterval`.

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 6: Run the animation/timer release gate

**Files:**
- Verify only.

- [ ] **Step 1: Run focused tests**

Run: `npx jest --runTestsByPath tests/home_runtime_animation_contract.test.ts tests/lesson_runtime_animation_contract.test.ts tests/screen_wall_clock_contract.test.ts tests/campaign_expiry_scheduler.test.ts tests/promo_banner_runtime_contract.test.ts tests/perf_freeze_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand`

Expected: all suites PASS.

- [ ] **Step 2: Run exact-diff checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only planned files are modified.

- [ ] **Step 3: Run the release-device motion gate**

On one Android Go/old-Android profile and one mid-range Android profile, keep each migrated screen visible, covered by a root overlay, on a hidden tab, and in background. Test the diagnostic timer both before and after its deadline and PromoBanner across foreground/config/expiry transitions. Capture CPU, memory, JS/UI FPS, timer/animation counts, network requests, battery/thermal trend, and screenshots under `.codex-tmp/runtime-profiling/motion-timers/`.

Pass condition: repeating work stops while hidden, wall-clock outcomes remain correct, entrance/reward effects do not replay incorrectly, diagnostic timeout fires once, PromoBanner expiry is correct, and CPU/thermal behavior is not worse than baseline. Roll back the affected call site if behavior changes; roll back shared motion helpers only after dependent call sites.

- [ ] **Step 4: Stage safely**

Inspect `git diff -- <planned paths>`. Stage only paths that were clean at Task 0; for a dirty target such as `app/streak_stats.tsx`, leave changes unstaged or select only owned hunks manually. Before every commit run `git diff --cached --name-only`, `git diff --cached --check`, and `git diff --cached`; abort if any unrelated user hunk is cached.
