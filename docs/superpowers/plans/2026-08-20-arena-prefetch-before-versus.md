# Arena Prefetch Before Versus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Arena search animation visible while match acceptance and sealed-plan loading complete, then run VS/countdown continuously and enter the first task with its full time budget.

**Architecture:** Add one bounded, process-local entry coordinator shared by matchmaking and the match screen. Matchmaking starts and awaits that coordinator after receiving `matchId`; the match screen synchronously consumes the prepared result, with the same coordinator serving as the idempotent fallback for direct navigation and remounts.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest, the Arena jestlite harness, existing `arenaV2MatchAccept`/`arenaV2MatchPlan` callables, and the existing local match machine.

**Workspace note:** Execute in the current checkout. Project rules forbid creating a branch or worktree without an explicit owner request. Arena files are protected: edit current contents in place, never restore/revert them, and update `docs/arena/OWNER_DECISIONS.md` in the same change.

---

## File map

- Create `modules/arena/entry_prefetch.ts`: framework-independent, dependency-injected coordinator and typed no-opponent result.
- Create `app/arena_entry_prefetch.ts`: the single production coordinator wired to existing Arena client calls.
- Create `tests/arena_entry_prefetch.test.ts`: coordinator behavior and source-level transition contracts.
- Modify `app/arena_matchmaking.tsx`: start prefetch after `matchId`, remain on the search surface, stop queue actions, and navigate only after readiness.
- Modify `app/arena_match.tsx`: consume the prepared entry synchronously and remove duplicate accept/plan ownership.
- Modify `components/arena/ArenaScreen.tsx`: expose an accessible disabled state for the existing back button while a match is assigned.
- Modify `components/arena/ArenaVersusIntro.tsx`: preserve readiness gating for direct-entry fallback; normal matchmaking reaches it already prepared.
- Modify `modules/arena/duel_plan.ts`: remove the temporary countdown-subtraction helper after all callers/tests move to prefetch-before-VS.
- Modify `tests/arena_match_view.test.ts`, `tests/arena_v2_client_source_contract.test.ts`, and `tests/arena_chrome_layout.test.ts`: replace temporary-flow assertions with the approved readiness flow.
- Modify `docs/arena/OWNER_DECISIONS.md`: record the final owner-approved behavior and supersede the temporary implementation note.

### Task 1: Build the shared entry coordinator with TDD

**Files:**
- Create: `modules/arena/entry_prefetch.ts`
- Create: `tests/arena_entry_prefetch.test.ts`
- Read: `modules/arena/duel_plan.ts`

- [ ] **Step 1: Write failing coordinator tests**

Create `tests/arena_entry_prefetch.test.ts` with a real dependency-injected coordinator. Use a minimal valid `ArenaPreparedEntry` fixture and cover promise sharing, accept retry, plan validation failure, failure eviction, and the accept-window terminal result:

```ts
import {
  ArenaNoOpponentError,
  createArenaEntryPrefetch,
  type ArenaPreparedEntry,
} from '../modules/arena/entry_prefetch';

const READY = {
  ok: true,
  startedAtMs: 10,
  deadlineAtMs: 20,
  plan: { matchId: 'm1', viewerSeat: 'a' } as ArenaPreparedEntry['plan'],
} satisfies ArenaPreparedEntry;

describe('Arena entry prefetch', () => {
  test('shares one accept/plan promise per match and retries accepting', async () => {
    let nowMs = 0;
    let acceptCalls = 0;
    let planCalls = 0;
    const remembered: string[] = [];
    const coordinator = createArenaEntryPrefetch({
      accept: async () => ({
        state: ++acceptCalls === 1 ? 'accepting' : 'active',
        viewerSeat: 'a',
      }),
      loadPlan: async () => { planCalls += 1; return READY; },
      rememberViewerSeat: (_matchId, seat) => remembered.push(seat),
      nowMs: () => nowMs,
      wait: async (ms) => { nowMs += ms; },
    });

    const first = coordinator.start('m1');
    const second = coordinator.start('m1');
    expect(second).toBe(first);
    await expect(first).resolves.toBe(READY);
    expect(acceptCalls).toBe(2);
    expect(planCalls).toBe(1);
    expect(coordinator.peek('m1')).toBe(READY);
    expect(remembered).toEqual(['a', 'a', 'a']);
  });

  test('evicts a failed request so an explicit retry can succeed', async () => {
    let fail = true;
    const coordinator = createArenaEntryPrefetch({
      accept: async () => {
        if (fail) throw new Error('network unavailable');
        return { state: 'active', viewerSeat: 'a' };
      },
      loadPlan: async () => READY,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });
    await expect(coordinator.start('m1')).rejects.toThrow('network unavailable');
    expect(coordinator.peek('m1')).toBeNull();
    fail = false;
    await expect(coordinator.start('m1')).resolves.toBe(READY);
  });

  test('rejects a missing closed plan and never caches it', async () => {
    const coordinator = createArenaEntryPrefetch({
      accept: async () => ({ state: 'active', viewerSeat: 'a' }),
      loadPlan: async () => null,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });
    await expect(coordinator.start('m1')).rejects.toThrow('arena_match_plan_invalid');
    expect(coordinator.peek('m1')).toBeNull();
  });

  test('returns the typed no-opponent failure after the accept window', async () => {
    let nowMs = 0;
    const coordinator = createArenaEntryPrefetch({
      accept: async () => ({ state: 'accepting', viewerSeat: 'a' }),
      loadPlan: async () => READY,
      rememberViewerSeat: () => {},
      nowMs: () => nowMs,
      wait: async (ms) => { nowMs += ms; },
    });
    await expect(coordinator.start('m1')).rejects.toBeInstanceOf(ArenaNoOpponentError);
    expect(coordinator.peek('m1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
npx jest tests/arena_entry_prefetch.test.ts --runInBand --forceExit
```

Expected: FAIL because `modules/arena/entry_prefetch.ts` does not exist.

- [ ] **Step 3: Implement the minimal coordinator**

Create `modules/arena/entry_prefetch.ts`. Keep callable details injected so the module remains testable by Jest and jestlite without module mocks:

```ts
import type { ArenaMatchPlanWire } from './duel_plan';
import {
  ARENA_ACCEPT_RETRY_MS,
  arenaEntryStep,
} from './duel_plan';

export type ArenaPreparedEntry = Readonly<{
  ok: true;
  startedAtMs: number;
  deadlineAtMs: number;
  plan: ArenaMatchPlanWire;
}>;

type AcceptResponse = Readonly<{
  state?: unknown;
  viewerSeat?: 'a' | 'b';
}>;

export type ArenaEntryPrefetchDependencies = Readonly<{
  accept(matchId: string): Promise<AcceptResponse>;
  loadPlan(matchId: string): Promise<ArenaPreparedEntry | null>;
  rememberViewerSeat(matchId: string, seat: 'a' | 'b'): void;
  nowMs(): number;
  wait(ms: number): Promise<void>;
}>;

export class ArenaNoOpponentError extends Error {
  readonly failure = 'no_opponent' as const;

  constructor() {
    super('arena_match_no_opponent');
    this.name = 'ArenaNoOpponentError';
  }
}

export function createArenaEntryPrefetch(deps: ArenaEntryPrefetchDependencies) {
  const requests = new Map<string, Promise<ArenaPreparedEntry>>();
  const ready = new Map<string, ArenaPreparedEntry>();

  const pruneReady = () => {
    while (ready.size > 8) {
      const oldest = ready.keys().next().value as string | undefined;
      if (!oldest) return;
      requests.delete(oldest);
      ready.delete(oldest);
    }
  };

  const run = async (matchId: string): Promise<ArenaPreparedEntry> => {
    const enteredAtMs = deps.nowMs();
    for (;;) {
      const response = await deps.accept(matchId);
      if (response.viewerSeat) deps.rememberViewerSeat(matchId, response.viewerSeat);
      const step = arenaEntryStep({
        state: String(response.state ?? ''),
        elapsedSinceEntryMs: deps.nowMs() - enteredAtMs,
      });
      if (step === 'give_up') throw new ArenaNoOpponentError();
      if (step === 'accept') {
        await deps.wait(ARENA_ACCEPT_RETRY_MS);
        continue;
      }
      const planned = await deps.loadPlan(matchId);
      if (!planned) throw new Error('arena_match_plan_invalid');
      deps.rememberViewerSeat(matchId, planned.plan.viewerSeat);
      ready.set(matchId, planned);
      pruneReady();
      return planned;
    }
  };

  return {
    start(matchId: string): Promise<ArenaPreparedEntry> {
      const current = requests.get(matchId);
      if (current) return current;
      const request = run(matchId).catch((error) => {
        requests.delete(matchId);
        ready.delete(matchId);
        throw error;
      });
      requests.set(matchId, request);
      return request;
    },
    peek(matchId: string): ArenaPreparedEntry | null {
      return ready.get(matchId) ?? null;
    },
  } as const;
}
```

- [ ] **Step 4: Run the coordinator tests and verify GREEN**

Run the same Jest command. Expected: 4 tests PASS, 0 failures.

- [ ] **Step 5: Commit only the coordinator task files**

```powershell
git add -- modules/arena/entry_prefetch.ts tests/arena_entry_prefetch.test.ts
git commit --only -m "feat(arena): coordinate match entry prefetch" -- modules/arena/entry_prefetch.ts tests/arena_entry_prefetch.test.ts
```

### Task 2: Wire the production singleton and accessible back lock

**Files:**
- Create: `app/arena_entry_prefetch.ts`
- Modify: `components/arena/ArenaScreen.tsx`
- Modify: `tests/arena_chrome_layout.test.ts`
- Modify: `tests/arena_entry_prefetch.test.ts`

- [ ] **Step 1: Add failing source contracts**

Append tests that require one production singleton and an accessible disabled back control:

```ts
import * as fs from 'fs';
import * as path from 'path';

const read = (relative: string) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

test('production entry prefetch owns the only accept/plan wiring', () => {
  const source = read('app/arena_entry_prefetch.ts');
  expect(source).toContain('createArenaEntryPrefetch({');
  expect(source).toContain('accept: arenaV2MatchAccept');
  expect(source).toContain('loadPlan: arenaV2MatchPlan');
  expect(source).toContain('arenaEntryPrefetchStart');
  expect(source).toContain('arenaEntryPrefetchPeek');
});
```

In `tests/arena_chrome_layout.test.ts`, add:

```ts
test('ArenaScreen can disable back accessibly while an assigned match warms', () => {
  const source = read('components/arena/ArenaScreen.tsx');
  expect(source).toContain('backDisabled = false');
  expect(source).toContain('disabled={backDisabled}');
  expect(source).toContain('accessibilityState={{ disabled: backDisabled }}');
});
```

- [ ] **Step 2: Run the two test files and verify RED**

```powershell
npx jest tests/arena_entry_prefetch.test.ts tests/arena_chrome_layout.test.ts --runInBand --forceExit
```

Expected: FAIL on the missing singleton and missing `backDisabled` prop.

- [ ] **Step 3: Create the production singleton**

Create `app/arena_entry_prefetch.ts`:

```ts
import { createArenaEntryPrefetch } from '../modules/arena/entry_prefetch';
import {
  arenaV2MatchAccept,
  arenaV2MatchPlan,
  rememberArenaViewerSeat,
} from './arena_client';

const coordinator = createArenaEntryPrefetch({
  accept: arenaV2MatchAccept,
  loadPlan: arenaV2MatchPlan,
  rememberViewerSeat: rememberArenaViewerSeat,
  nowMs: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

export const arenaEntryPrefetchStart = coordinator.start;
export const arenaEntryPrefetchPeek = coordinator.peek;
```

- [ ] **Step 4: Add `backDisabled` without changing default behavior**

In `components/arena/ArenaScreen.tsx`, add `backDisabled = false` to props, add `backDisabled?: boolean` to the type, and update only the existing back `Pressable`:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={arenaText(lang, 'back')}
  accessibilityState={{ disabled: backDisabled }}
  disabled={backDisabled}
  hitSlop={8}
  onPress={onBack ?? (() => safeRouterBack(router, navigationFallbackForPath(pathname) as never))}
  style={[styles.back, backDisabled ? styles.backDisabled : null, { backgroundColor: P.elev }]}
>
```

Add the non-layout-shifting style:

```ts
backDisabled: { opacity: 0.45 },
```

- [ ] **Step 5: Run the two tests and focused TypeScript**

Expected: both suites PASS and TypeScript exits 0.

```powershell
npx jest tests/arena_entry_prefetch.test.ts tests/arena_chrome_layout.test.ts --runInBand --forceExit
```

Create an ignored `.codex-tmp/arena-prefetch/tsconfig.focused.json` extending
the root `tsconfig.json`, with `noEmit: true` and an `include` containing only
`app/arena_entry_prefetch.ts`, `components/arena/ArenaScreen.tsx`,
`modules/arena/entry_prefetch.ts`, and `tests/arena_entry_prefetch.test.ts`.
Then run:

```powershell
npx tsc -p .codex-tmp/arena-prefetch/tsconfig.focused.json --pretty false
```

Expected: exit 0. Do not run or repair a broad project typecheck for this
isolated task.

- [ ] **Step 6: Commit only this task**

```powershell
git add -- app/arena_entry_prefetch.ts components/arena/ArenaScreen.tsx tests/arena_entry_prefetch.test.ts tests/arena_chrome_layout.test.ts
git commit --only -m "feat(arena): share prepared match entry" -- app/arena_entry_prefetch.ts components/arena/ArenaScreen.tsx tests/arena_entry_prefetch.test.ts tests/arena_chrome_layout.test.ts
```

### Task 3: Keep matchmaking visible until the plan is ready

**Files:**
- Modify: `app/arena_matchmaking.tsx`
- Modify: `tests/arena_entry_prefetch.test.ts`
- Modify: `tests/arena_v2_client_source_contract.test.ts`

- [ ] **Step 1: Add failing matchmaking contracts**

Add source assertions proving that discovery no longer navigates immediately, all queue work stops on `matchId`, prefetch controls navigation, and cancellation is disabled:

```ts
test('matchmaking warms the assigned match before navigating to VS', () => {
  const source = read('app/arena_matchmaking.tsx');
  const prefetch = source.indexOf('arenaEntryPrefetchStart(matchId)');
  const navigate = source.indexOf("pathname: '/arena_match'");
  expect(prefetch).toBeGreaterThan(-1);
  expect(prefetch).toBeLessThan(navigate);
  expect(source).toContain("params: { matchId, prepared: '1' }");
  expect(source).toContain('backDisabled={Boolean(matchId)}');
  expect(source).toContain('disabled={Boolean(matchId)}');
  expect(source).not.toContain("params: { matchId, intro: '1' }");
});

test('assigned matches cannot restart or cancel matchmaking while warming', () => {
  const source = read('app/arena_matchmaking.tsx');
  expect(source).toContain('if (!active || matchId) return;');
  expect(source).toContain('active && !matchId');
  expect(source).toContain('if (matchId || cancellingRef.current) return;');
});
```

Update the existing remount/source contract in `tests/arena_v2_client_source_contract.test.ts` to expect the shared coordinator rather than `arenaMatchPlanRequests` inside the match screen.

- [ ] **Step 2: Run the matchmaking contracts and verify RED**

```powershell
npx jest tests/arena_entry_prefetch.test.ts tests/arena_v2_client_source_contract.test.ts --runInBand --forceExit
```

Expected: FAIL because matchmaking still routes immediately with `intro: '1'`.

- [ ] **Step 3: Add assigned-entry state and prefetch effect**

In `app/arena_matchmaking.tsx`, import `arenaEntryFailureCopy`, `ArenaNoOpponentError`, and `arenaEntryPrefetchStart`. Add:

```ts
const [entryFailure, setEntryFailure] = useState<ArenaEntryFailure | null>(null);
const [entryRetryTick, setEntryRetryTick] = useState(0);

useEffect(() => {
  if (!matchId) return;
  let alive = true;
  quickFallbackRequests.delete(requestId);
  releaseImplicitQueueRequestId(mode, requestId);
  setEntryFailure(null);
  void arenaEntryPrefetchStart(matchId)
    .then(() => {
      if (!alive) return;
      router.replace({
        pathname: '/arena_match',
        params: { matchId, prepared: '1' },
      } as never);
    })
    .catch((reason) => {
      if (!alive) return;
      setEntryFailure(reason instanceof ArenaNoOpponentError
        ? 'no_opponent'
        : arenaEntryFailure(reason));
    });
  return () => { alive = false; };
}, [entryRetryTick, matchId, mode, requestId, router]);
```

Delete the old effect that immediately calls `router.replace` with `intro: '1'`.

- [ ] **Step 4: Lock queue actions and render reason-specific recovery**

Change `cancel` to begin with:

```ts
if (matchId || cancellingRef.current) return;
```

Pass `backDisabled={Boolean(matchId)}` to `ArenaScreen` and set the bottom cancel CTA to `disabled={Boolean(matchId)}`.

Derive the entry failure separately from search failure:

```ts
const assignedFailure = entryFailure ? arenaEntryFailureCopy(entryFailure) : null;
```

Inside the existing card, render the assigned failure without removing the
search animation. Retry increments `entryRetryTick` without clearing
`matchId`; the other actions leave the assigned flow without calling
`arenaV2QueueCancel`:

```tsx
{assignedFailure ? (
  <View style={styles.failure}>
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.failureTitle, { color: P.text }]}
    >
      {arenaText(lang, assignedFailure.title)}
    </Text>
    <Text style={[styles.failureHint, failureHintLine, { color: P.muted }]}>
      {arenaText(lang, assignedFailure.hint)}
    </Text>
    {assignedFailure.canRetry ? (
      <V2Cta onPress={() => setEntryRetryTick((tick) => tick + 1)}>
        {arenaText(lang, 'retry')}
      </V2Cta>
    ) : null}
    {entryFailure === 'no_opponent' ? (
      <V2Cta onPress={() => router.replace({
        pathname: '/arena_matchmaking',
        params: { mode: 'quick', requestId: createArenaRequestId('queue') },
      } as never)}>
        {arenaText(lang, 'quick')}
      </V2Cta>
    ) : null}
    <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>
      {arenaText(lang, 'home')}
    </V2Cta>
  </View>
) : null}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

```powershell
npx jest tests/arena_entry_prefetch.test.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts tests/arena_warm_cache.test.ts --runInBand --forceExit
```

Expected: all suites PASS; no source contains an immediate `intro: '1'` route or preparation/loading copy.

- [ ] **Step 6: Commit only matchmaking and its tests**

```powershell
git add -- app/arena_matchmaking.tsx tests/arena_entry_prefetch.test.ts tests/arena_v2_client_source_contract.test.ts
git commit --only -m "feat(arena): prefetch match behind search" -- app/arena_matchmaking.tsx tests/arena_entry_prefetch.test.ts tests/arena_v2_client_source_contract.test.ts
```

### Task 4: Consume the prepared entry before VS and restore the full countdown

**Files:**
- Modify: `app/arena_match.tsx`
- Modify: `components/arena/ArenaVersusIntro.tsx`
- Modify: `modules/arena/duel_plan.ts`
- Modify: `tests/arena_match_view.test.ts`
- Modify: `tests/arena_v2_client_source_contract.test.ts`

- [ ] **Step 1: Replace temporary-flow tests with failing prepared-entry tests**

In `tests/arena_match_view.test.ts`, require:

```ts
it('prepared matchmaking enters VS with real data and the full countdown', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
  expect(source).toContain("const preparedEntry = matchId ? arenaEntryPrefetchPeek(matchId) : null;");
  expect(source).toContain("const preparedRoute = params.prepared === '1' && Boolean(preparedEntry);");
  expect(source).toContain('useState<ArenaMatchPlanWire | null>(() => preparedEntry?.plan ?? null)');
  expect(source).toContain('useState(preparedRoute)');
  expect(source).toContain('arenaEntryPrefetchStart(matchId)');
  expect(source).not.toContain('arenaMatchPlanRequests');
  expect(source).not.toContain('arenaEntryCountdownRemainingMs');
  expect(source).not.toContain('countdownRemainingMs: immediateIntro');
  expect(source).not.toContain("params.intro === '1'");
});
```

Keep the existing assertions that no `waiting`, `preparingDuel`, `preparingDuelHint`, or `loading` copy is rendered.

- [ ] **Step 2: Run the match contracts and verify RED**

```powershell
npx jest tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts --runInBand --forceExit
```

Expected: FAIL on the temporary local request cache, `immediateIntro`, and countdown subtraction.

- [ ] **Step 3: Initialize the screen synchronously from the prepared cache**

In `app/arena_match.tsx`:

1. Remove direct imports of `arenaV2MatchAccept`, `arenaV2MatchPlan`, `ARENA_ACCEPT_RETRY_MS`, `arenaEntryStep`, and `arenaEntryCountdownRemainingMs`.
2. Import `arenaEntryPrefetchPeek`, `arenaEntryPrefetchStart`, and `ArenaNoOpponentError`.
3. Change route params to `{ matchId?: string; prepared?: string }`.
4. Before state initialization, read the prepared result:

```ts
const preparedEntry = matchId ? arenaEntryPrefetchPeek(matchId) : null;
const preparedRoute = params.prepared === '1' && Boolean(preparedEntry);
const [plan, setPlan] = useState<ArenaMatchPlanWire | null>(() => preparedEntry?.plan ?? null);
```

Initialize restore state so a newly prepared match does not wait on an unnecessary disk read:

```ts
const [restoreChecked, setRestoreChecked] = useState(preparedRoute);
```

Guard the snapshot effect with `if (preparedRoute) return;`; direct/resume routes retain the existing `arenaLoadMatch` behavior.

- [ ] **Step 4: Replace the screen-owned accept loop with coordinator consumption**

Use one effect:

```ts
useEffect(() => {
  if (!active || !matchId || plan || planError) return;
  let alive = true;
  void arenaEntryPrefetchStart(matchId)
    .then((prepared) => {
      if (alive) setPlan(prepared.plan);
    })
    .catch((reason) => {
      if (!alive) return;
      setEntryFailure(reason instanceof ArenaNoOpponentError
        ? 'no_opponent'
        : arenaEntryFailure(reason));
      setPlanError(true);
    });
  return () => { alive = false; };
}, [active, matchId, plan, planError]);
```

Delete `arenaMatchPlanRequests`, `arenaMatchPlanRequest`, the local accept retry timer, `immediateIntro`, `introStartedAtMonoMsRef`, and the `countdownRemainingMs` override. Pass only `plan`, `restored`, and `opponentTicks` to `useArenaLocalMatch`, restoring the full `plan.countdownMs` budget.

- [ ] **Step 5: Keep VS continuous without making it the normal loader**

For a prepared matchmaking route, `plan`, `match`, and `hud` exist on the first render and `ArenaVersusIntro` receives real `introYou` and `introOpponent` values. Preserve the existing `ready`/`sequenceDone` guard only for direct-entry fallback and remount safety; do not alter collision, sound, haptic, cosmetics, or Reduce Motion timing.

Keep the rendering invariant:

```ts
const introReady = Boolean(plan && match && hud && match.phase.kind !== 'countdown');
const shouldShowIntro = !introDone && (
  !plan || !match || !hud || match.phase.kind === 'countdown'
);
```

No visible text may appear in the defensive `!plan || !match || !hud` branch.

- [ ] **Step 6: Remove the superseded countdown helper**

Delete `arenaEntryCountdownRemainingMs` from `modules/arena/duel_plan.ts` and delete its three assertions from `tests/arena_match_view.test.ts`. The coordinator now completes before VS, so subtracting search/preparation time from the countdown would shorten the approved animation.

- [ ] **Step 7: Run match-focused tests and TypeScript**

```powershell
npx jest tests/arena_entry_prefetch.test.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts tests/arena_warm_cache.test.ts tests/arena_chrome_layout.test.ts --runInBand --forceExit
```

Expected: all suites PASS, the plan request is shared, and no forbidden transition copy is present.

Run a focused temporary tsconfig including:

```text
app/arena_entry_prefetch.ts
app/arena_matchmaking.tsx
app/arena_match.tsx
components/arena/ArenaScreen.tsx
components/arena/ArenaVersusIntro.tsx
modules/arena/entry_prefetch.ts
modules/arena/duel_plan.ts
```

Expected: exit 0.

- [ ] **Step 8: Commit only the match-consumption task**

```powershell
git add -- app/arena_match.tsx components/arena/ArenaVersusIntro.tsx modules/arena/duel_plan.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts
git commit --only -m "fix(arena): enter versus only when ready" -- app/arena_match.tsx components/arena/ArenaVersusIntro.tsx modules/arena/duel_plan.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts
```

### Task 5: Record the final decision and run the complete Arena gate

**Files:**
- Modify: `docs/arena/OWNER_DECISIONS.md`
- Verify: all files listed in the file map

- [ ] **Step 1: Update the owner journal**

Append a dated section stating:

```md
## Подготовка матча живёт под поиском, VS всегда готов (2026-08-20)

После получения `matchId` quick/ranked matchmaking прекращает очередь, но
оставляет на экране прежнюю поисковую анимацию. Общий process-local coordinator
в это время принимает матч обоими клиентами и получает закрытый план. Только
после полной валидации плана выполняется переход на VS; VS получает реальные
данные игроков, проигрывается непрерывно и отдаёт полный countdown перед первым
заданием. Текстовых экранов ожидания/подготовки/загрузки нет.

Один promise на `matchId` разделяют matchmaking и match screen. Queue polling,
bot fallback и cancel после назначения матча не работают. Direct entry и
resume сохраняют прежнее восстановление и reason-specific ошибки.
```

Also mark the earlier temporary “load inside collision” decision as superseded rather than deleting its historical record.

- [ ] **Step 2: Run focused Jest with no cache**

```powershell
npx jest --runTestsByPath tests/arena_entry_prefetch.test.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts tests/arena_warm_cache.test.ts tests/arena_chrome_layout.test.ts --no-cache --runInBand --watchman=false --forceExit
```

Expected: 5 suites PASS, 0 failed tests.

- [ ] **Step 3: Run a fresh complete Arena harness**

Use a new ignored outDir so no stale compiled test survives. On Windows, compile `tools/arena_tests/tsconfig.json` into a unique `.arena-test-build-*` directory and run every compiled `tests/arena_*.test.js` and `functions/src/arena_*.test.js` through `tools/arena_tests/jestlite.js` with `mockshim.js` and `rootshim.js`.

Expected final line:

```text
ARENA_TSC_UNEXPECTED=0 FAILED_SUITES=0
```

The suite/assertion totals may increase because of the new coordinator tests; record the exact fresh totals in `OWNER_DECISIONS.md`.

- [ ] **Step 4: Run final hygiene checks**

```powershell
git diff --check -- app/arena_entry_prefetch.ts app/arena_matchmaking.tsx app/arena_match.tsx components/arena/ArenaScreen.tsx components/arena/ArenaVersusIntro.tsx modules/arena/entry_prefetch.ts modules/arena/duel_plan.ts tests/arena_entry_prefetch.test.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts tests/arena_chrome_layout.test.ts docs/arena/OWNER_DECISIONS.md
rg -n "arenaText\(lang, '(preparingDuel|preparingDuelHint|waiting|loading)'\)" app/arena_matchmaking.tsx app/arena_match.tsx
```

Expected: `git diff --check` exit 0 and `rg` returns no matches.

- [ ] **Step 5: Commit the journal and any final test-only corrections**

```powershell
git add -- docs/arena/OWNER_DECISIONS.md
git commit --only -m "docs(arena): lock prefetch-before-versus flow" -- docs/arena/OWNER_DECISIONS.md
```

- [ ] **Step 6: Report verification honestly**

Report the exact focused Jest totals, complete harness suites/assertions, focused TypeScript exit code, and diff-check result. Do not claim device smoke unless a real quick/ranked match was completed on a device or emulator through search → VS → first task.
