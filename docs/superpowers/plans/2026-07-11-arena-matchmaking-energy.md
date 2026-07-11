# Arena Matchmaking Energy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve authoritative matchmaking while stopping lobby-only work and provider-wide second ticks when Arena is not visible.

**Architecture:** A pure reconciliation decision module gives authoritative match state priority over overdue client deadlines. The provider uses one-shot control deadlines and a dedicated search-active guard; Arena owns the only visible elapsed clock through the runtime-visibility foundation.

**Tech Stack:** React Native, Expo Router, Firebase Firestore, TypeScript, Jest fake timers.

---

### Task 0: Confirm prerequisites and protect overlapping work

- [ ] Run the foundation plan through its green device gate first. Then run `git status --short`, `git diff --name-only`, and `git diff --` for every Arena target. Record all pre-existing target diffs. Never auto-stage a target that was dirty at this point; preserve those hunks and report them for manual staging.
- [ ] Keep this slice behind `ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK`. The old path remains available until focused tests and the device gate pass; do not delete compatibility fields or behavior.

### Task 1: Inventory and lock `elapsedMs` consumers

**Files:**
- Modify: `tests/owner_direction_runtime_contract.test.ts:297-330`
- Test: `tests/arena_matchmaking_clock_contract.test.ts`
- Read: `contexts/MatchmakingContext.tsx:30-80`
- Read: `app/arena_lobby.tsx:243,750-760,1354`

- [ ] **Step 1: Write a failing consumer contract**

Inventory the `MatchmakingContext` interface provider and every consumer separately. The current scan must explicitly classify `app/arena_lobby.tsx`, `contexts/MatchmakingContext.tsx`, `hooks/use-matchmaking.ts`, and `components/onboarding_aha/aha_karaoke.ts`; the latter two may contain a different same-named field and must not be mistaken for context consumers. Assert the imports/useContext binding, not a repository-wide word match. The visible Arena display prefers `Date.now() - searchStartedAt`.

Copy the complete `read` and `listSourceFiles` helpers from `tests/owner_direction_runtime_contract.test.ts:6-27`, then compute the inventory directly:

```ts
const consumers = listSourceFiles(['app', 'components', 'hooks'])
  .filter((file) => /import\s*\{[^}]*useMatchmakingContext[^}]*\}\s*from/.test(read(file)))
  .filter((file) => /useMatchmakingContext\s*\(\s*\)/.test(read(file)))
  .filter((file) => /\belapsedMs\b/.test(read(file)))
  .sort();
expect(consumers).toEqual([
  'app/arena_lobby.tsx',
]);
expect(read('contexts/MatchmakingContext.tsx')).toMatch(/elapsedMs\s*:/);
expect(lobby).toContain('Date.now() - searchStartedAt');
```

- [ ] **Step 2: Run it and record the exact current consumers**

Run: `npx jest --runTestsByPath tests/arena_matchmaking_clock_contract.test.ts --no-cache --runInBand`

Expected: PASS only if the context-consumer inventory is complete. Add a separate assertion documenting whether `hooks/use-matchmaking.ts` is dormant, still called, or owns an independent clock; do not remove it merely because the provider is migrated.

### Task 2: Add the match-wins reconciliation decision

**Files:**
- Create: `app/arena_matchmaking_reconcile.ts`
- Test: `tests/arena_matchmaking_reconcile.test.ts`

- [ ] **Step 1: Write race tests first**

```ts
expect(decideArenaReconcile({ ...base, authoritativeSessionId: 's1', timeoutDue: true })).toEqual({ kind: 'match', sessionId: 's1' });
expect(decideArenaReconcile({ ...base, authoritativeSessionId: 's1', rangeExpandDue: true })).toEqual({ kind: 'match', sessionId: 's1' });
expect(decideArenaReconcile({ ...base, authoritativeSessionId: 's1', botFallbackDue: true })).toEqual({ kind: 'match', sessionId: 's1' });
expect(decideArenaReconcile({ ...base, authoritativeSessionId: null, rangeExpandDue: true })).toEqual({ kind: 'expand_range' });
```

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/arena_matchmaking_reconcile.test.ts --no-cache --runInBand`

Expected: FAIL because the decision module is absent.

- [ ] **Step 3: Implement the pure priority function**

```ts
export type ReconcileInput = {
  authoritativeSessionId: string | null;
  searchStillAuthoritative: boolean;
  rangeExpandDue: boolean;
  rangeExpanded: boolean;
  botFallbackDue: boolean;
  timeoutDue: boolean;
};

export type ReconcileDecision =
  | { kind: 'match'; sessionId: string }
  | { kind: 'expand_range' | 'bot_fallback' | 'timeout' | 'stop' | 'none' };

export function decideArenaReconcile(input: ReconcileInput): ReconcileDecision {
  if (input.authoritativeSessionId) return { kind: 'match', sessionId: input.authoritativeSessionId };
  if (!input.searchStillAuthoritative) return { kind: 'stop' };
  if (input.rangeExpandDue && !input.rangeExpanded) return { kind: 'expand_range' };
  if (input.botFallbackDue) return { kind: 'bot_fallback' };
  if (input.timeoutDue) return { kind: 'timeout' };
  return { kind: 'none' };
}
```

- [ ] **Step 4: Run and commit**

Run: `npx jest --runTestsByPath tests/arena_matchmaking_reconcile.test.ts --no-cache --runInBand`

Expected: PASS.

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 3: Replace the provider second interval with control deadlines

**Files:**
- Modify: `contexts/MatchmakingContext.tsx:168-437,471-637`
- Modify: `app/config.ts`
- Test: `tests/matchmaking_context_lifecycle_contract.test.ts`

- [ ] **Step 1: Add a temporary static feature flag and failing source contract**

```ts
export const ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK = false;
```

The test requires `searchActiveRef`, separate `rangeDeadlineRef` and `timeoutDeadlineRef`, and forbids `setInterval` in the new branch.

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/matchmaking_context_lifecycle_contract.test.ts --no-cache --runInBand`

Expected: FAIL on missing control-clock fields.

- [ ] **Step 3: Implement one-shot scheduling behind the flag**

Select the random bot fallback delay exactly once at search start and persist an absolute `botFallbackDeadlineAt` alongside the range and timeout deadlines. Preserve that original wall-clock start in `originalSearchStartedAtRef`; never recompute control deadlines from the queue document's mutable `joinedAt`, because range expansion may update it. Use `searchActiveRef.current` for duplicate-start protection, a monotonically increasing `searchGenerationRef` to reject results from an earlier search, and one reconciliation runner shared by foreground, listener, and deadline callbacks. Schedule all control deadlines with `Math.max(0, deadlineAt - Date.now())` only while the app is active.

The authoritative reader returns a typed union, never only a nullable session id:

```ts
type AuthoritativeSearchState =
  | { kind: 'matched'; sessionId: string }
  | { kind: 'queued'; queueId: string }
  | { kind: 'absent' };
```

Every callback captures the current generation. It first reads this state, discards stale generations, then applies `decideArenaReconcile`. Match always wins. Queue absence stops local search without bot fallback. Keep separate idempotency refs for range expansion, bot fallback, timeout, and terminal match acceptance so no action suppresses another incorrectly.

The mutex must not drop events. `requestReconcile()` sets `reconcilePendingRef.current = true`; if a runner already exists it returns that promise, and the runner loops until no pending request remains. A listener carrying an explicit match session stores it in `pendingMatchedSessionRef` and that authoritative match is consumed before any timeout/bot decision. Immediately before range expansion, bot fallback, timeout, or queue-removal mutation, perform a final authoritative revalidation; if a match appeared or the generation changed, abort the transition and accept/discard accordingly.

```ts
const searchActiveRef = useRef(false);
const searchGenerationRef = useRef(0);
const reconcilePromiseRef = useRef<Promise<void> | null>(null);
const reconcilePendingRef = useRef(false);
const pendingMatchedSessionRef = useRef<string | null>(null);
const originalSearchStartedAtRef = useRef<number | null>(null);
const rangeDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const botFallbackDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const timeoutDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const scheduleControlDeadlines = useCallback((startedAt: number) => {
  rangeDeadlineRef.current = setTimeout(
    () => { void reconcileAuthoritativeSearch('range_deadline'); },
    Math.max(0, startedAt + RANGE_EXPAND_MS - Date.now()),
  );
  timeoutDeadlineRef.current = setTimeout(
    () => { void reconcileAuthoritativeSearch('timeout_deadline'); },
    Math.max(0, startedAt + SEARCH_TIMEOUT_MS - Date.now()),
  );
}, [reconcileAuthoritativeSearch]);
```

- [ ] **Step 4: Preserve snapshot compatibility**

Update `elapsedMs` only at start, foreground reconciliation, and terminal transition. Add a deprecation comment to the context interface. Do not remove the field.

- [ ] **Step 5: Run focused tests and commit with the flag off**

Before this step, add fake-timer race tests for: overlapping foreground/timer/listener reconciliation with a required pending rerun; an explicit match event during an in-flight read; a stale result from a previous search generation; authoritative queue absence; a match appearing between the first read and the final pre-transition revalidation; range expansion changing `joinedAt` without moving the original deadlines; one-time bot delay selection; and each idempotency guard. When the flag is enabled, assert the legacy provider interval is absent or dormant and cannot run in parallel with the new scheduler.

Run: `npx jest --runTestsByPath tests/arena_matchmaking_reconcile.test.ts tests/arena_matchmaking_clock_contract.test.ts tests/matchmaking_context_lifecycle_contract.test.ts --no-cache --runInBand`

Expected: PASS for old and new branches.

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 4: Give Arena real runtime visibility

**Files:**
- Modify: `app/arena_lobby.tsx:189-242,425-432,614-758,1534-1546`
- Test: `tests/arena_lobby_runtime_visibility.test.ts`

- [ ] **Step 1: Write the failing visibility contract**

Require `useRuntimeActive(!isTab || activeIdx === 2)`, require lobby-only effects to use that value, and require the visible wall clock for elapsed display.

```ts
expect(source).toContain('const lobbyRuntimeActive = useRuntimeActive(!isTab || activeIdx === 2)');
expect(source).toContain('setLobbyActive(lobbyRuntimeActive)');
expect(source).toContain('useVisibleWallClock(lobbyRuntimeActive && searchVisible)');
```

- [ ] **Step 2: Run red**

Run: `npx jest --runTestsByPath tests/arena_lobby_runtime_visibility.test.ts --no-cache --runInBand`

Expected: FAIL on the old `arenaTabVisible`-only effects.

- [ ] **Step 3: Migrate lobby-only work**

Keep the minimum match-found queue listener while the app is active, even if Arena is covered. Gate throne, flags, invites, idle hints, searching-count polling, friends, and decorative loops with `lobbyRuntimeActive`. Replace `searchUiTick` with the shared visible wall clock.

- [ ] **Step 4: Add background detach and foreground authoritative reconcile**

The provider subscribes to the shared app-state store. On background it cancels every local control timeout and detaches the minimum queue listener but leaves server queue state intact. On foreground it performs the typed authoritative read through the single-flight mutex; only after that read may it recreate future deadlines or apply an overdue transition. Listener and timer callbacks use the same generation and mutex path.

- [ ] **Step 5: Run and commit**

Run: `npx jest --runTestsByPath tests/arena_lobby_runtime_visibility.test.ts tests/arena_matchmaking_reconcile.test.ts tests/matchmaking_context_lifecycle_contract.test.ts --no-cache --runInBand`

Expected: PASS.

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 5: Enable and verify the new Arena clock

**Files:**
- Modify: `app/config.ts`
- Test: `tests/owner_direction_runtime_contract.test.ts`

- [ ] **Step 1: Flip the static flag after focused tests pass**

```ts
export const ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK = true;
```

- [ ] **Step 2: Update reviewed runtime call-site counts with reasons**

Remove the provider `setInterval` entries only after they are absent. Do not add replacement intervals to the allowlist.

- [ ] **Step 3: Run the Arena gate**

Run: `npx jest --runTestsByPath tests/arena_matchmaking_reconcile.test.ts tests/arena_matchmaking_clock_contract.test.ts tests/matchmaking_context_lifecycle_contract.test.ts tests/arena_lobby_runtime_visibility.test.ts tests/owner_direction_runtime_contract.test.ts tests/perf_freeze_contract.test.ts --no-cache --runInBand`

Expected: all Arena/runtime assertions PASS. The foundation plan has already made owner-direction green, so any failure here is a regression and blocks enabling the flag.

- [ ] **Step 4: Commit**

Commit only through the clean-at-preflight staging procedure in Task 6; do not run an unconditional `git add` here.

### Task 6: Run the Arena release-device and rollback gate

- [ ] On one Android Go/old-Android profile and one mid-range Android profile, test: open search, cover Arena with another stack screen, switch tabs, background before each deadline, foreground after each deadline, receive a real match during background/foreground, cancel/restart rapidly, and simulate offline queue absence. Capture CPU, memory, listener/fetch counts, dropped frames, thermal/battery trend, duplicate actions, and final server/local state under `.codex-tmp/runtime-profiling/arena/`.
- [ ] Pass condition: no missed real match, no bot/timeout winning over an authoritative match, no duplicate transition, no hidden one-second tick, and no regression in navigation or thermal trend. Any authoritative-state mismatch, duplicate terminal action, or crash/ANR disables the feature flag immediately and blocks completion.
- [ ] After a passing device gate, inspect `git diff -- <planned paths>`. Stage only clean-at-preflight paths, then inspect `git diff --cached --name-only`, `git diff --cached --check`, and the full `git diff --cached` before committing. If a path had pre-existing changes, do not auto-commit it.

Rollback order: flip the Arena flag off first; revert lobby UI-clock wiring second; keep the shared foundation until all dependent slices are rolled back.
