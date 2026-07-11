# Runtime Visibility Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one shared app-foreground store, one visibility hook, one shared visible wall clock, and a trustworthy lifecycle ratchet without changing product behavior.

**Architecture:** A module-level AppState store owns the only new native listener and exposes a `useSyncExternalStore` hook. Screen components combine that snapshot with navigation focus and explicit owner visibility. A shared wall clock emits only while at least one visible consumer is subscribed.

**Tech Stack:** React Native 0.81, React 19, Expo Router, TypeScript, Jest fake timers.

---

### Task 0: Make the existing performance baseline green

**Files:**
- Modify only after classification: `tests/owner_direction_runtime_contract.test.ts`
- Modify only when the contract exposes a real production defect: the exact source file named by that assertion
- Verify: `tests/perf_freeze_contract.test.ts`
- Verify: `tests/navigation_back_underlay_contract.test.ts`

- [ ] **Step 1: Preserve the dirty worktree before touching any target**

Run `git status --short`, `git diff --name-only`, and `git diff -- <every planned target>`. Record which target paths already contain user changes. A target that is already dirty may be edited only after its existing diff is understood and preserved; it must not be auto-staged later.

- [ ] **Step 2: Capture and classify every current owner-direction failure**

Run: `npx jest --runTestsByPath tests/owner_direction_runtime_contract.test.ts --no-cache --runInBand`

Expected initial state: the ten observed failures are copied into an evidence table under ignored `.codex-tmp/runtime-baseline/`, with one classification per assertion: stale reviewed inventory, real lifecycle defect, or intentionally removed/moved file. Known examples to verify rather than assume include the auth `forceNow` count, `setInterval` and `onSnapshot` inventories, streak boost countdown, weekly review server contract, and the missing `functions/src/compass.ts` expectation.

- [ ] **Step 3: Repair the baseline without weakening policy**

For a stale inventory, update the exact reviewed list and reason. For a real lifecycle defect, fix the production call site and add a focused behavior assertion. For a removed/moved feature, point the contract at the current implementation only after tracing the caller. Never delete an assertion, broaden a regex, or add an allowlist entry merely to make the suite pass.

- [ ] **Step 4: Prove the pre-change gate is green**

Run: `npx jest --runTestsByPath tests/owner_direction_runtime_contract.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts --no-cache --runInBand`

Expected: all suites PASS before the new runtime foundation is introduced. Do not proceed with an intentionally red ratchet.

### Task 1: Establish a reviewed motion inventory and lifecycle ratchet

**Files:**
- Create: `tests/runtime_lifecycle_ratchet.test.ts`
- Read: `tests/owner_direction_runtime_contract.test.ts:146-194`
- Read: `tests/perf_freeze_contract.test.ts:77-103`

- [ ] **Step 1: Inventory every repeating-motion owner**

Scan `app/`, `components/`, and `hooks/` for every `Animated.loop` and infinite `withRepeat`. The current production discovery returns 58 files; encode every discovered path in an exact manifest with one of these owners: `runtime_active`, `explicit_focus_appstate`, `owner_prop`, `bounded`, `unmounting_modal`, `disabled`, `dev_only`, or `migration_debt`. Every manifest row includes a concrete reason; an unknown or missing path fails the test. `migration_debt` is a temporary reviewed category that keeps the baseline green and must be replaced by a guarded owner in the animation plan.

Copy the complete `read`, `walk`, and `listSourceFiles` filesystem helpers from `tests/perf_freeze_contract.test.ts:13-29`; keep the new test read-only.

```ts
expect(discoveredMotionFiles).toEqual(Object.keys(REVIEWED_MOTION_OWNERS).sort());
for (const [file, review] of Object.entries(REVIEWED_MOTION_OWNERS)) {
  expect(review.reason).not.toHaveLength(0);
  if (review.owner === 'runtime_active') {
    expect(read(file)).toMatch(/useRuntimeActive\s*\(/);
  }
}
```

- [ ] **Step 2: Add narrow per-call-site assertions**

For screen-owned loops, assert that the particular effect guard and dependency list use the runtime-active value. For existing focus/AppState guards, assert those exact guard tokens. For owner-prop components, assert the prop guard and verify every caller passes its owner visibility. For unmounting modals/dev/disabled motion, keep a small justified manifest entry rather than requiring an unrelated hook import.

- [ ] **Step 3: Run the ratchet green**

Run: `npx jest --runTestsByPath tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand`

Expected: PASS for the reviewed current tree. Files that need migration remain explicitly classified as reviewed debt and are tightened to `runtime_active` by the animation plan in the same green commit that changes them.

- [ ] **Step 4: Commit only a green contract**

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 2: Add the shared AppState store

**Files:**
- Create: `app/runtime_app_state_store.ts`
- Test: `tests/runtime_app_state_store.test.ts`

- [ ] **Step 1: Write factory tests before production wiring**

Cover one native subscription for multiple consumers, immediate snapshots, background/active transitions, and native unsubscribe when the final consumer leaves.

```ts
const store = createRuntimeAppStateStore(harness.deps);
const a = jest.fn();
const b = jest.fn();
const offA = store.subscribe(a);
const offB = store.subscribe(b);
expect(harness.nativeSubscriptions()).toBe(1);
harness.emit('background');
expect(store.getSnapshot()).toBe(false);
expect(a).toHaveBeenCalledTimes(1);
expect(b).toHaveBeenCalledTimes(1);
offA(); offB();
expect(harness.nativeSubscriptions()).toBe(0);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx jest --runTestsByPath tests/runtime_app_state_store.test.ts --no-cache --runInBand`

Expected: FAIL because `createRuntimeAppStateStore` does not exist.

- [ ] **Step 3: Implement the factory and production singleton**

```ts
import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

type Deps = {
  current(): AppStateStatus;
  subscribe(listener: (state: AppStateStatus) => void): () => void;
};

export function createRuntimeAppStateStore(deps: Deps) {
  const listeners = new Set<() => void>();
  let active = deps.current() === 'active';
  let removeNative: (() => void) | null = null;
  const ensureNative = () => {
    if (removeNative) return;
    removeNative = deps.subscribe((state) => {
      const next = state === 'active';
      if (next === active) return;
      active = next;
      listeners.forEach((listener) => listener());
    });
  };
  return {
    getSnapshot: () => active,
    subscribe(listener: () => void) {
      active = deps.current() === 'active';
      listeners.add(listener);
      ensureNative();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) { removeNative?.(); removeNative = null; }
      };
    },
  };
}

export const runtimeAppStateStore = createRuntimeAppStateStore({
  current: () => AppState.currentState,
  subscribe: (listener) => {
    const sub = AppState.addEventListener('change', listener);
    return () => sub.remove();
  },
});

export function useAppRuntimeActive(): boolean {
  return useSyncExternalStore(
    runtimeAppStateStore.subscribe,
    runtimeAppStateStore.getSnapshot,
    runtimeAppStateStore.getSnapshot,
  );
}
```

- [ ] **Step 4: Run the test and commit**

Run: `npx jest --runTestsByPath tests/runtime_app_state_store.test.ts --no-cache --runInBand`

Expected: PASS.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 3: Add explicit owner visibility

**Files:**
- Create: `hooks/use_runtime_active.ts`
- Test: `tests/runtime_active_contract.test.ts`

- [ ] **Step 1: Write the source contract**

```ts
expect(source).toContain('const screenFocused = useIsScreenFocused()');
expect(source).toContain('const appActive = useAppRuntimeActive()');
expect(source).toContain('return screenFocused && appActive && ownerVisible');
```

- [ ] **Step 2: Run it red**

Run: `npx jest --runTestsByPath tests/runtime_active_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the hook file is absent.

- [ ] **Step 3: Implement the hook**

```ts
import { useAppRuntimeActive } from '../app/runtime_app_state_store';
import { useIsScreenFocused } from './use_is_screen_focused';

export function useRuntimeActive(ownerVisible = true): boolean {
  const screenFocused = useIsScreenFocused();
  const appActive = useAppRuntimeActive();
  return screenFocused && appActive && ownerVisible;
}
```

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/runtime_active_contract.test.ts --no-cache --runInBand`

Expected: PASS.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 4: Add the shared visible wall clock

**Files:**
- Create: `app/visible_wall_clock.ts`
- Create: `hooks/use_visible_wall_clock.ts`
- Test: `tests/visible_wall_clock.test.ts`

- [ ] **Step 1: Write tests for one shared interval and immediate resync**

```ts
const clock = createVisibleWallClock(harness.deps);
const a = jest.fn();
const b = jest.fn();
const offA = clock.subscribe(a);
const offB = clock.subscribe(b);
expect(clock.debug()).toEqual({ subscribers: 2, intervals: 1 });
expect(a).toHaveBeenLastCalledWith(10_000);
harness.advanceTo(47_000);
harness.tick();
expect(b).toHaveBeenLastCalledWith(47_000);
offA(); offB();
expect(clock.debug()).toEqual({ subscribers: 0, intervals: 0 });
```

- [ ] **Step 2: Run the test red**

Run: `npx jest --runTestsByPath tests/visible_wall_clock.test.ts --no-cache --runInBand`

Expected: FAIL because the factory is absent.

- [ ] **Step 3: Implement the shared clock and hook**

```ts
export type ClockDeps = {
  now(): number;
  setInterval(listener: () => void, delayMs: number): unknown;
  clearInterval(id: unknown): void;
};

export function createVisibleWallClock(deps: ClockDeps) {
  const listeners = new Set<(now: number) => void>();
  let interval: unknown | null = null;
  const emit = () => listeners.forEach((listener) => listener(deps.now()));
  return {
    subscribe(listener: (now: number) => void) {
      listeners.add(listener);
      listener(deps.now());
      if (interval === null) interval = deps.setInterval(emit, 1000);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && interval !== null) {
          deps.clearInterval(interval); interval = null;
        }
      };
    },
    debug: () => ({ subscribers: listeners.size, intervals: interval === null ? 0 : 1 }),
  };
}
```

The React hook subscribes only while `runtimeActive`; otherwise it returns one fresh `Date.now()` snapshot on the transition to inactive and creates no interval.

- [ ] **Step 4: Run foundation tests and commit**

Run: `npx jest --runTestsByPath tests/runtime_app_state_store.test.ts tests/runtime_active_contract.test.ts tests/visible_wall_clock.test.ts --no-cache --runInBand`

Expected: 3 suites PASS.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 5: Verify the foundation without migrating product screens

**Files:**
- Verify only; no new source changes.

- [ ] **Step 1: Run focused and existing clock guards**

Run: `npx jest --runTestsByPath tests/runtime_app_state_store.test.ts tests/runtime_active_contract.test.ts tests/visible_wall_clock.test.ts tests/energy_countdown_clock.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts --no-cache --runInBand`

Expected: every suite PASS. The motion manifest may identify reviewed migration debt, but the ratchet itself is never red.

- [ ] **Step 2: Perform the release-device foundation smoke gate**

On one Android Go/old-Android profile and one mid-range Android profile, cold-start the app, background/foreground it ten times, switch across all root tabs, and cover/uncover a screen with a root-stack overlay. Capture CPU, memory, network requests, dropped frames, battery/thermal trend, and crashes/ANRs in `.codex-tmp/runtime-profiling/foundation/`. Pass condition: no duplicate AppState subscription growth, no hidden visible-clock interval, no navigation regression, and no worse thermal/network trend than the green Task 0 baseline. Roll back this slice if navigation breaks, subscriptions grow, or CPU/network is worse by more than 10% in two comparable runs.

- [ ] **Step 3: Inspect and stage the exact diff safely**

Run `git diff --check`, `git status --short`, and `git diff -- <planned paths>`. If any planned path was dirty at Task 0, do not auto-stage or commit it; leave it for manual hunk selection and report the overlap. Otherwise stage only the named clean paths, then run `git diff --cached --name-only`, `git diff --cached --check`, and `git diff --cached` before every commit. Abort the commit if the cached diff contains an unrelated path or user hunk.

Expected: no whitespace errors and no unrelated files staged.

Rollback order: product migrations first, then the visible wall clock, then `useRuntimeActive`; remove the shared AppState store last because later slices depend on it.
