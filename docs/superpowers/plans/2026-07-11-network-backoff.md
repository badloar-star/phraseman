# Network Backoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve immediate offline feedback and manual retry while eliminating frequent long-offline probes and all background network checks.

**Architecture:** Refactor net status into an injected coordinator with one shared in-flight promise, persistent backoff state across unsubscribe/resubscribe, and explicit active-app/manual exceptions. Production wiring uses the shared AppState store from the foundation plan.

**Tech Stack:** TypeScript, React Native fetch/AbortController, Jest fake timers.

---

### Task 0: Protect the current tree and lock public behavior

- [ ] Complete the green foundation, Arena, and animation/timer slices first. Run `git status --short`, `git diff --name-only`, and `git diff -- app/net_status.ts tests/net_status.test.ts components/OfflineBanner.tsx`; preserve any pre-existing hunks and never auto-stage a dirty target.
- [ ] Record the current public export signatures and OfflineBanner behavior. The refactor may reduce background work but must preserve immediate offline feedback, manual retry, and caller compatibility.

### Task 1: Make net status deterministic under test

**Files:**
- Modify: `app/net_status.ts`
- Rewrite: `tests/net_status.test.ts`

- [ ] **Step 1: Add failing factory tests**

Create `createNetStatusCoordinator(deps)` tests for status notifications, fetch success/failure, abort timeout, and reset. Keep public production exports unchanged.

```ts
const net = createNetStatusCoordinator(harness.deps);
const events: boolean[] = [];
const off = net.subscribe((online) => events.push(online));
await harness.resolveFetch();
expect(net.getStatus()).toBe('online');
expect(events).toEqual([true]);
off();
```

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: FAIL because the coordinator factory does not exist.

- [ ] **Step 3: Extract the current behavior behind dependencies**

Dependencies include `fetch`, `now`, `setTimeout`, `clearTimeout`, `isAppActive`, and `subscribeAppActive`. The production singleton delegates existing exports (`getNetStatus`, `subscribeNetStatus`, `checkOnlineNow`, `reportNetworkSuccess`, `reportNetworkFailure`) without changing callers. The coordinator owns the probe timer, fetch-timeout timer, abort controller, cooldown, in-flight promise, and subscriber count so passive reports and active checks cannot form separate scheduling loops.

- [ ] **Step 4: Run compatibility tests and commit**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: PASS with the old timing policy still represented.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 2: Add capped exponential offline backoff

**Files:**
- Modify: `app/net_status.ts`
- Modify: `tests/net_status.test.ts`

- [ ] **Step 1: Write the backoff sequence test**

```ts
expect(net.debug().nextDelayMs).toBe(10_000);
await harness.failScheduledProbe();
expect(net.debug().nextDelayMs).toBe(30_000);
await harness.failScheduledProbe();
expect(net.debug().nextDelayMs).toBe(60_000);
await harness.failScheduledProbe();
expect(net.debug().nextDelayMs).toBe(120_000);
await harness.failScheduledProbe();
expect(net.debug().nextDelayMs).toBe(300_000);
```

Also prove success resets the index and online safety polling uses `300_000` ms.

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: FAIL because current offline polling remains fixed at 10 seconds.

- [ ] **Step 3: Implement the sequence**

```ts
const OFFLINE_BACKOFF_MS = [10_000, 30_000, 60_000, 120_000, 300_000] as const;
const ONLINE_SAFETY_MS = 300_000;
let offlineAttempt = 0;

function delayForNextProbe(): number {
  if (status !== 'offline') return ONLINE_SAFETY_MS;
  return OFFLINE_BACKOFF_MS[Math.min(offlineAttempt, OFFLINE_BACKOFF_MS.length - 1)]!;
}
```

Increment only after a failed scheduled probe. Reset on success; do not reset on unsubscribe/resubscribe.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: PASS.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 3: Prevent subscriber, manual, and passive-report probe storms

**Files:**
- Modify: `app/net_status.ts`
- Modify: `tests/net_status.test.ts`

- [ ] **Step 1: Write concurrency, subscription, and passive-report tests**

Prove that only transition `0 → 1` may trigger an automatic immediate probe; a second subscriber does not. Prove unsubscribe/resubscribe retains cooldown. Prove two simultaneous `checkOnlineNow()` calls share one fetch. Prove manual retry works with zero subscribers only while app-active.

```ts
const first = net.checkOnlineNow();
const second = net.checkOnlineNow();
expect(harness.fetchCalls()).toBe(1);
await harness.resolveFetch();
await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
```

Also fire repeated `reportNetworkFailure()` calls during an in-flight probe and during cooldown and assert one fetch and one scheduled probe at most. Fire `reportNetworkSuccess()` and assert it cancels the offline schedule, resets backoff, and schedules the online safety probe only when the app is active and at least one subscriber exists. Passive reports must use the same coordinator and cooldown as scheduled/manual probes.

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: FAIL because `checkOnlineNow` currently bypasses the `probeInFlight` return value.

- [ ] **Step 3: Share one in-flight promise**

```ts
let probePromise: Promise<boolean> | null = null;
function runProbe(): Promise<boolean> {
  if (probePromise) return probePromise;
  probePromise = probeOnce().finally(() => { probePromise = null; });
  return probePromise;
}
```

Automatic first-subscriber probing checks cache staleness and cooldown. Passive failure reports update status and request the shared coordinator schedule; they never bypass cooldown or start an immediate fetch storm. Manual retry returns the shared promise when active and returns the last known status without fetching when backgrounded. Passive success cancels offline work, resets the backoff index/cooldown, and creates no timer with zero subscribers.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: PASS with one fetch for concurrent callers.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 4: Stop all background and zero-subscriber automatic probes

**Files:**
- Modify: `app/net_status.ts`
- Modify: `tests/net_status.test.ts`
- Verify: `components/OfflineBanner.tsx`

- [ ] **Step 1: Write lifecycle tests**

Prove background clears scheduled work and aborts an in-flight fetch, foreground with a subscriber performs one authoritative probe, foreground without subscribers does nothing, and the last unsubscribe removes scheduled automatic probes. Also prove the fetch-timeout handle is cleared after success, failure, background abort, and dispose, so a late timeout cannot mutate a newer probe.

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/net_status.test.ts --no-cache --runInBand`

Expected: FAIL until production wiring uses the shared runtime AppState store.

- [ ] **Step 3: Wire production app state**

Use `runtimeAppStateStore.subscribe` and `runtimeAppStateStore.getSnapshot`. Do not attach another direct `AppState.addEventListener` in `net_status.ts`. Keep `OfflineBanner` API unchanged.

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/net_status.test.ts tests/runtime_app_state_store.test.ts --no-cache --runInBand`

Expected: PASS; debug state reports zero probe timer, zero timeout timer, zero fetch, and no retained abort controller in background or after dispose.

Commit only through the clean-at-preflight staging procedure in Task 5; do not run an unconditional `git add` here.

### Task 5: Run the final network gate

**Files:**
- Verify only.

- [ ] **Step 1: Run focused integration tests**

Run: `npx jest --runTestsByPath tests/net_status.test.ts tests/runtime_app_state_store.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand`

Expected: all suites PASS.

- [ ] **Step 2: Verify runtime invariants by inspection**

Run: `rg -n "PROBE_INTERVAL_OFFLINE_MS|AppState.addEventListener|probeInFlight" app/net_status.ts`

Expected: no fixed 10-second interval constant, no direct AppState listener, and one shared in-flight coordinator.

- [ ] **Step 3: Inspect the exact diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no unrelated files staged.

- [ ] **Step 4: Run the final release-device profiling gate**

On one Android Go/old-Android profile and one mid-range Android profile, measure online idle for ten minutes, prolonged offline for at least the full `10s → 30s → 60s → 120s → 300s` sequence, rapid passive failure reports, manual retry, background during a fetch, foreground with/without OfflineBanner, and recovery to online. Capture request timestamps/counts, aborts, CPU, memory, dropped frames, battery/thermal trend, and UI latency under `.codex-tmp/runtime-profiling/network/`.

Pass condition: one in-flight probe maximum, exact capped backoff, zero automatic background/zero-subscriber requests, immediate manual retry while active, prompt banner recovery, and no worse CPU/thermal trend than baseline. Any missed recovery, request storm, stale offline banner, crash/ANR, or repeated regression over 10% disables or reverts this network slice.

- [ ] **Step 5: Stage safely and complete the dependency-aware release review**

Inspect `git diff -- <planned paths>`. Stage only paths that were clean at Task 0, then inspect `git diff --cached --name-only`, `git diff --cached --check`, and the full `git diff --cached` before committing. Run the focused suites from all four plans plus `tests/navigation_back_underlay_contract.test.ts`. Roll back network first, then motion/timers, then Arena, and the shared foundation last.
