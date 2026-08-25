# Arena Final Score Counting and Opponent Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frozen final-question wait with a local Arena score count-up, and reveal scripted opponent answers at their own response time so they can visibly occur before or after the player.

**Architecture:** Keep exact opponent ticks in the local match machine from the start for deterministic star calculation, but add a separate persisted presentation latch that controls when each tick becomes visible and audible. Add a focused final-score model/component that counts only local `matchStars`; gate navigation for one short count-up beat while preserving the existing result handoff, outbox, retry, quick `ResultsSequence`, and authoritative rewards.

**Tech Stack:** React Native, Expo Router, React 19, TypeScript, React Native Reanimated, Jest/ts-jest, existing Arena sound director.

---

## File map

- Create `modules/arena/opponent_timing.ts`: pure delay calculation for exact opponent tick presentation.
- Create `modules/arena/final_score_count.ts`: score normalization, bounded sound beats, and minimum count-up duration.
- Create `components/arena/ArenaFinalScoreCount.tsx`: accessible final score scene using existing palette, `ArenaStarGlyph`, `useCountUp`, and existing Arena SFX callbacks.
- Create `tests/arena_opponent_timing.test.ts`: timing boundary tests.
- Create `tests/arena_final_score_count.test.ts`: count model tests.
- Create `tests/arena_final_score_ui_contract.test.ts`: source contract for the finished-state scene and navigation gate.
- Modify `modules/arena/match_machine.ts`: persist reveal latches and accept idempotent `opponent_revealed` events, including after `finished`.
- Modify `modules/arena/match_view.ts`: hide exact ticks and their displayed score until revealed.
- Modify `hooks/use_arena_local_match.ts`: schedule one exact reveal timer from monotonic state and never duplicate it.
- Modify `app/arena_match.tsx`: mount the count-up scene, queue fast terminal navigation until the short beat completes, and play visible-opponent sound only on reveal.
- Modify `modules/arena/copy.ts`: add two strings in all eight Arena locales.
- Modify `tests/arena_match_machine.test.ts`, `tests/arena_match_view.test.ts`, and `tests/arena_sound_wiring.test.ts`: reducer, HUD, and one-shot sound regressions.
- Modify `docs/arena/OWNER_DECISIONS.md`: record the owner-approved behavior.

### Task 1: Separate opponent truth from opponent presentation

**Files:**
- Create: `modules/arena/opponent_timing.ts`
- Modify: `modules/arena/match_machine.ts`
- Test: `tests/arena_opponent_timing.test.ts`
- Test: `tests/arena_match_machine.test.ts`

- [ ] **Step 1: Write failing pure timing tests**

Create `tests/arena_opponent_timing.test.ts` with fixtures for countdown, reading,
answer, reveal, finished, earlier tasks, and future tasks:

```ts
import {
  ARENA_OPPONENT_POST_ANSWER_MAX_MS,
  ARENA_OPPONENT_POST_ANSWER_MIN_MS,
  arenaOpponentRevealDelayMs,
} from '../modules/arena/opponent_timing';
import { arenaLocalMatchInit, arenaLocalMatchReduce } from '../modules/arena/match_machine';

const plan = {
  matchId: 'm1', seat: 'a' as const, mode: 'quick' as const, planHash: 'h1',
  tasks: [{ taskIndex: 0, mode: 'guess_phrase' as const }, { taskIndex: 1, mode: 'fill_gap' as const }],
};
const tick = { taskIndex: 0, correct: true, raceElapsedMs: 5_000, exact: true as const };

test('exact opponent waits for its own answer time', () => {
  let state = arenaLocalMatchInit(plan, { monoNowMs: 0, wallNowMs: 10_000, monoEpochId: 'e1', countdownRemainingMs: 0 });
  state = arenaLocalMatchReduce(plan, state, { type: 'tick', monoNowMs: 1_500 });
  expect(arenaOpponentRevealDelayMs(state, tick, 3_000)).toBe(3_500);
});

test('an opponent slower than the player lands perceptibly inside reveal', () => {
  let state = arenaLocalMatchInit(plan, { monoNowMs: 0, wallNowMs: 10_000, monoEpochId: 'e1', countdownRemainingMs: 0 });
  state = arenaLocalMatchReduce(plan, state, { type: 'tick', monoNowMs: 1_500 });
  state = arenaLocalMatchReduce(plan, state, { type: 'answer', monoNowMs: 4_000, wallNowMs: 14_000, correct: true, answer: 0 });
  expect(arenaOpponentRevealDelayMs(state, tick, 4_000)).toBe(ARENA_OPPONENT_POST_ANSWER_MAX_MS);
  expect(ARENA_OPPONENT_POST_ANSWER_MIN_MS).toBeGreaterThanOrEqual(200);
});

test('past tasks reveal immediately and future tasks stay hidden', () => {
  const state = { ...arenaLocalMatchInit(plan, { monoNowMs: 0, wallNowMs: 10_000, monoEpochId: 'e1', countdownRemainingMs: 0 }), taskIndex: 1 };
  expect(arenaOpponentRevealDelayMs(state, tick, 0)).toBe(0);
  expect(arenaOpponentRevealDelayMs(state, { ...tick, taskIndex: 2 }, 0)).toBeNull();
});
```

- [ ] **Step 2: Run RED for the timing module**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_opponent_timing.test.ts --no-cache
```

Expected: FAIL because `modules/arena/opponent_timing.ts` does not exist.

- [ ] **Step 3: Implement the pure timing function**

Create `modules/arena/opponent_timing.ts`:

```ts
import {
  ARENA_LOCAL_READING_MS,
  type ArenaLocalMatchState,
  type ArenaOpponentTick,
} from './match_machine';

export const ARENA_OPPONENT_POST_ANSWER_MIN_MS = 240;
export const ARENA_OPPONENT_POST_ANSWER_MAX_MS = 650;

const remaining = (dueMs: number, nowMs: number) => Math.max(0, Math.round(dueMs - nowMs));

export function arenaOpponentRevealDelayMs(
  state: ArenaLocalMatchState,
  tick: ArenaOpponentTick,
  monoNowMs: number,
): number | null {
  if (!tick.exact) return 0;
  if (tick.taskIndex < state.taskIndex) return 0;
  if (tick.taskIndex > state.taskIndex) return null;
  if (state.phase === 'countdown') {
    const answerStartsAt = state.phaseStartedAtMonoMs + state.phaseBudgetMs + ARENA_LOCAL_READING_MS;
    return remaining(answerStartsAt + Math.max(0, tick.raceElapsedMs), monoNowMs);
  }
  if (state.phase === 'reading') {
    const answerStartsAt = state.phaseStartedAtMonoMs + state.phaseBudgetMs;
    return remaining(answerStartsAt + Math.max(0, tick.raceElapsedMs), monoNowMs);
  }
  if (state.phase === 'answer') {
    return remaining(state.phaseStartedAtMonoMs + Math.max(0, tick.raceElapsedMs), monoNowMs);
  }
  const own = [...state.outcomes].reverse().find((row) => row.taskIndex === tick.taskIndex);
  if (!own || tick.raceElapsedMs <= own.raceElapsedMs) return 0;
  const postAnswerMs = Math.max(
    ARENA_OPPONENT_POST_ANSWER_MIN_MS,
    Math.min(ARENA_OPPONENT_POST_ANSWER_MAX_MS, tick.raceElapsedMs - own.raceElapsedMs),
  );
  return remaining(state.phaseStartedAtMonoMs + postAnswerMs, monoNowMs);
}
```

- [ ] **Step 4: Add failing reducer tests for the presentation latch**

Append to `tests/arena_match_machine.test.ts`:

```ts
describe('видимость ответа соперника', () => {
  const exact = { taskIndex: 0, correct: true, raceElapsedMs: 5_000, exact: true as const };

  it('stores exact truth without revealing it, then reveals once', () => {
    let s = init(P5);
    s = step(P5, s, { type: 'opponent_answered', monoNowMs: MONO0, tick: exact });
    expect(s.opponentByTask[0]).toEqual(exact);
    expect(s.opponentRevealedByTask?.[0]).toBeUndefined();
    s = step(P5, s, { type: 'opponent_revealed', monoNowMs: MONO0 + 5_000, taskIndex: 0 });
    expect(s.opponentRevealedByTask?.[0]).toBe(true);
    expect(step(P5, s, { type: 'opponent_revealed', monoNowMs: MONO0 + 5_001, taskIndex: 0 })).toBe(s);
  });

  it('reveals a live tick immediately', () => {
    const live = { taskIndex: 0, correct: true, raceElapsedMs: 900 };
    const s = step(P5, init(P5), { type: 'opponent_answered', monoNowMs: MONO0, tick: live });
    expect(s.opponentRevealedByTask?.[0]).toBe(true);
  });

  it('accepts a late presentation reveal after the player finishes', () => {
    let s = { ...init(P5), phase: 'finished' as const, opponentByTask: { 0: exact } };
    s = step(P5, s, { type: 'opponent_revealed', monoNowMs: MONO0 + 5_000, taskIndex: 0 });
    expect(s.opponentRevealedByTask?.[0]).toBe(true);
  });
});
```

- [ ] **Step 5: Run RED for the reducer behavior**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_match_machine.test.ts --no-cache
```

Expected: FAIL because `opponentRevealedByTask` and `opponent_revealed` do not exist.

- [ ] **Step 6: Implement the minimal reducer state/event**

In `modules/arena/match_machine.ts`:

```ts
// ArenaLocalMatchState; optional keeps arena-local-match.v2 disk snapshots readable.
opponentRevealedByTask?: Readonly<Record<number, true>>;

// ArenaLocalEvent
| { type: 'opponent_revealed'; monoNowMs: number; taskIndex: number }

// emptyState
opponentRevealedByTask: {},

// finished guard
if (state.phase === 'finished'
  && event.type !== 'opponent_finished'
  && event.type !== 'opponent_revealed') return state;

// opponent_answered branch
const alreadyKnown = Boolean(base.opponentByTask[event.tick.taskIndex]);
const alreadyRevealed = base.opponentRevealedByTask?.[event.tick.taskIndex] === true;
if (alreadyKnown && (event.tick.exact || alreadyRevealed)) return base;
return {
  ...base,
  opponentByTask: alreadyKnown ? base.opponentByTask : { ...base.opponentByTask, [event.tick.taskIndex]: event.tick },
  opponentRevealedByTask: event.tick.exact
    ? base.opponentRevealedByTask
    : { ...base.opponentRevealedByTask, [event.tick.taskIndex]: true },
};

// new branch
case 'opponent_revealed':
  if (!base.opponentByTask[event.taskIndex] || base.opponentRevealedByTask?.[event.taskIndex]) return state;
  return { ...base, opponentRevealedByTask: { ...base.opponentRevealedByTask, [event.taskIndex]: true } };
```

- [ ] **Step 7: Run GREEN for timing and reducer tests**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_opponent_timing.test.ts tests/arena_match_machine.test.ts --no-cache
```

Expected: PASS, 0 failed tests.

- [ ] **Step 8: Commit Task 1 only**

```powershell
git add -- modules/arena/opponent_timing.ts modules/arena/match_machine.ts tests/arena_opponent_timing.test.ts tests/arena_match_machine.test.ts
git commit -m "feat(arena): separate opponent timing from match truth"
```

### Task 2: Schedule exact reveals and hide unrevealed rival UI

**Files:**
- Modify: `hooks/use_arena_local_match.ts`
- Modify: `modules/arena/match_view.ts`
- Test: `tests/arena_match_view.test.ts`
- Test: `tests/arena_owner_requested_ui_contract.test.ts`

- [ ] **Step 1: Write failing HUD tests**

Add to `tests/arena_match_view.test.ts`:

```ts
it('does not expose an exact tick or its score before presentation reveal', () => {
  const exact = { taskIndex: 0, correct: true, raceElapsedMs: 900, exact: true as const };
  const hidden = stateWith({ 0: exact }, [viewerOutcome('guess_phrase')]);
  expect(arenaOpponentSignal(hidden, hidden.phaseStartedAtMonoMs + 1_000).kind).toBe('silent');
  expect(arenaOpponentMatchStars(PLAN, hidden)).toBeNull();
  const shown = { ...hidden, opponentRevealedByTask: { 0: true as const } };
  expect(arenaOpponentSignal(shown, shown.phaseStartedAtMonoMs + 1_000).kind).toBe('answered');
  expect(arenaOpponentMatchStars(PLAN, shown)).toBe(3);
});
```

- [ ] **Step 2: Run RED for HUD visibility**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_match_view.test.ts --no-cache
```

Expected: FAIL because exact ticks are still visible immediately.

- [ ] **Step 3: Filter signal and displayed rival score by reveal latch**

In `modules/arena/match_view.ts`, add and use:

```ts
function visibleOpponentTick(state: ArenaLocalMatchState, taskIndex: number): ArenaOpponentTick | undefined {
  const tick = state.opponentByTask[taskIndex];
  if (!tick) return undefined;
  if (!tick.exact || state.opponentRevealedByTask?.[taskIndex]) return tick;
  return undefined;
}
```

Use `visibleOpponentTick` in `arenaOpponentSignal`, in the transmitted-score
scan, and in the fallback loop. Keep `finalizeTask` in `match_machine.ts` reading
the unfiltered `opponentByTask`, so local star awards remain deterministic.

- [ ] **Step 4: Add the exact reveal timer to the hook**

In `hooks/use_arena_local_match.ts`, import `arenaOpponentRevealDelayMs`, add a
separate `opponentTimerRef`, and schedule only the current unrevealed exact tick:

```ts
useEffect(() => {
  if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
  if (!plan || !state || state.matchId !== plan.matchId) return undefined;
  const tick = state.opponentByTask[state.taskIndex];
  if (!tick?.exact || state.opponentRevealedByTask?.[tick.taskIndex]) return undefined;
  const delayMs = arenaOpponentRevealDelayMs(state, tick, arenaMonotonicNowMs());
  if (delayMs === null) return undefined;
  opponentTimerRef.current = setTimeout(() => {
    opponentTimerRef.current = null;
    dispatch({ type: 'opponent_revealed', monoNowMs: arenaMonotonicNowMs(), taskIndex: tick.taskIndex });
  }, delayMs);
  return () => {
    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    opponentTimerRef.current = null;
  };
}, [plan, state]);
```

The existing ingestion effect still dispatches every truth tick once. Live
ticks become visible in that event; exact ticks wait for this timer.

- [ ] **Step 5: Extend the source contract for one reveal timer**

Add to `tests/arena_owner_requested_ui_contract.test.ts`:

```ts
it('schedules exact opponent presentation instead of showing all scripted ticks immediately', () => {
  const hook = read('hooks/use_arena_local_match.ts');
  expect(hook).toContain('arenaOpponentRevealDelayMs');
  expect(hook).toContain("type: 'opponent_revealed'");
  expect(hook).toContain('opponentTimerRef');
});
```

- [ ] **Step 6: Run GREEN for timing/HUD/hook contracts**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_opponent_timing.test.ts tests/arena_match_machine.test.ts tests/arena_match_view.test.ts tests/arena_owner_requested_ui_contract.test.ts --no-cache
```

Expected: PASS, 0 failed tests.

- [ ] **Step 7: Commit Task 2 only**

```powershell
git add -- hooks/use_arena_local_match.ts modules/arena/match_view.ts tests/arena_match_view.test.ts tests/arena_owner_requested_ui_contract.test.ts
git commit -m "feat(arena): reveal rival answers on their own clock"
```

### Task 3: Build the bounded final-score scene

**Files:**
- Create: `modules/arena/final_score_count.ts`
- Create: `components/arena/ArenaFinalScoreCount.tsx`
- Create: `tests/arena_final_score_count.test.ts`

- [ ] **Step 1: Write failing score-model tests**

Create `tests/arena_final_score_count.test.ts`:

```ts
import {
  ARENA_FINAL_SCORE_COUNT_MS,
  arenaFinalScoreBeatValues,
  arenaFinalScoreValue,
} from '../modules/arena/final_score_count';

test('normalizes score and reaches the exact final integer', () => {
  expect(arenaFinalScoreValue(Number.NaN, 0.5)).toBe(0);
  expect(arenaFinalScoreValue(-5, 1)).toBe(0);
  expect(arenaFinalScoreValue(19, 0)).toBe(0);
  expect(arenaFinalScoreValue(19, 1)).toBe(19);
});

test('sound beats are positive, unique, terminal, and bounded', () => {
  for (const score of [0, 1, 3, 19, 999]) {
    const beats = arenaFinalScoreBeatValues(score);
    expect(new Set(beats).size).toBe(beats.length);
    expect(beats.length).toBeLessThanOrEqual(6);
    if (score > 0) expect(beats.at(-1)).toBe(Math.trunc(score));
  }
  expect(ARENA_FINAL_SCORE_COUNT_MS).toBeGreaterThanOrEqual(620);
});
```

- [ ] **Step 2: Run RED for the score model**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_final_score_count.test.ts --no-cache
```

Expected: FAIL because `final_score_count.ts` does not exist.

- [ ] **Step 3: Implement score normalization and bounded beats**

Create `modules/arena/final_score_count.ts`:

```ts
export const ARENA_FINAL_SCORE_COUNT_MS = 680;
export const ARENA_FINAL_SCORE_MAX_BEATS = 6;

export function arenaFinalScore(score: number): number {
  return Number.isFinite(score) ? Math.max(0, Math.trunc(score)) : 0;
}

export function arenaFinalScoreValue(score: number, progress: number): number {
  const target = arenaFinalScore(score);
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return Math.round(target * (1 - Math.pow(1 - p, 3)));
}

export function arenaFinalScoreBeatValues(score: number): readonly number[] {
  const target = arenaFinalScore(score);
  if (target === 0) return [];
  const count = Math.min(target, ARENA_FINAL_SCORE_MAX_BEATS);
  return [...new Set(Array.from({ length: count }, (_, index) =>
    Math.max(1, Math.round(((index + 1) * target) / count))))];
}
```

- [ ] **Step 4: Implement the focused React Native component**

Create `components/arena/ArenaFinalScoreCount.tsx` using only one animated focus
element. `useCountUp` supplies the 620 ms eased number; a ref advances through
the bounded thresholds and invokes `onBeat` at most six times:

```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useCountUp } from '../league/leagueStatusShared';
import { useTournamentPalette } from '../ui/v2_theme';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';
import { arenaFinalScoreBeatValues } from '../../modules/arena/final_score_count';
import { ArenaStarGlyph } from './ArenaStarGlyph';

export function ArenaFinalScoreCount({ score, reduceMotion, onBeat }: Readonly<{
  score: number; reduceMotion: boolean; onBeat(): void;
}>) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const shown = useCountUp(score, reduceMotion);
  const beats = useMemo(() => arenaFinalScoreBeatValues(score), [score]);
  const beatIndex = useRef(0);
  useEffect(() => {
    while (beatIndex.current < beats.length && shown >= (beats[beatIndex.current] ?? Infinity)) {
      beatIndex.current += 1;
      onBeat();
    }
  }, [beats, onBeat, shown]);
  return (
    <Animated.View
      entering={FadeIn.duration(reduceMotion ? 120 : 220)}
      style={[styles.root, { backgroundColor: P.elev }]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${arenaText(lang, 'matchScoreCounting')}: ${shown}`}>
      <Text style={[styles.label, { color: P.muted }]}>{arenaText(lang, 'matchScoreCounting')}</Text>
      <Animated.View entering={reduceMotion ? FadeIn.duration(120) : ZoomIn.springify().damping(16)} style={styles.scoreRow}>
        <ArenaStarGlyph lit size={36} />
        <Text style={[styles.score, { color: P.text }]}>{shown}</Text>
      </Animated.View>
      <Text style={[styles.status, { color: P.accent }]}>{arenaText(lang, 'matchResultChecking')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 300, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  scoreRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  score: { minWidth: 72, fontSize: 68, lineHeight: 74, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'center' },
  status: { fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center' },
});
```

- [ ] **Step 5: Run GREEN for the model**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_final_score_count.test.ts --no-cache
```

Expected: PASS, 0 failed tests.

- [ ] **Step 6: Commit Task 3 only**

```powershell
git add -- modules/arena/final_score_count.ts components/arena/ArenaFinalScoreCount.tsx tests/arena_final_score_count.test.ts
git commit -m "feat(arena): add final score count scene"
```

### Task 4: Integrate the scene without bypassing result readiness

**Files:**
- Modify: `app/arena_match.tsx`
- Modify: `modules/arena/copy.ts`
- Modify: `tests/arena_sound_wiring.test.ts`
- Create: `tests/arena_final_score_ui_contract.test.ts`
- Modify: `docs/arena/OWNER_DECISIONS.md`

- [ ] **Step 1: Write the failing integration contract**

Create `tests/arena_final_score_ui_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('Arena final score wait', () => {
  const match = read('app/arena_match.tsx');
  const component = read('components/arena/ArenaFinalScoreCount.tsx');

  it('replaces the finished question with local score counting', () => {
    expect(match).toContain('<ArenaFinalScoreCount');
    expect(match).toContain("match.state.phase === 'finished'");
    expect(match).toContain("playSound('starLand')");
    expect(component).toContain('arenaFinalScoreBeatValues');
  });

  it('gates only navigation, not handoff persistence or reward capture', () => {
    expect(match).toContain('pendingCoherentResultRef');
    expect(match).toContain('finalScoreReadyRef');
    expect(match.indexOf('arenaRememberResultHandoff')).toBeLessThan(match.indexOf('if (!finalScoreReadyRef.current)'));
    expect(match).toContain('arenaResultHandoffReady');
    expect(match).toContain('openPreviewResult');
  });

  it('does not claim wallet currency or replace quick ResultsSequence', () => {
    expect(component).not.toMatch(/wallet|balance|starsEarned|xpEarned|reward/i);
    expect(read('app/arena_results.tsx')).toContain('<ResultsSequence');
  });
});
```

- [ ] **Step 2: Run RED for the UI contract**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_final_score_ui_contract.test.ts --no-cache
```

Expected: FAIL because the component is not mounted and navigation is not gated.

- [ ] **Step 3: Add the eight-locale copy**

In `modules/arena/copy.ts`, add exactly eight values for each key:

```ts
matchScoreCounting: ['Очки матча', 'Очки матчу', 'Puntos de la partida', 'Pontos da partida', 'Điểm trận đấu', 'Skor laga', 'Maç puanı', 'Wynik meczu'],
matchResultChecking: ['Сверяем результат…', 'Звіряємо результат…', 'Comprobando el resultado…', 'Conferindo o resultado…', 'Đang kiểm tra kết quả…', 'Memeriksa hasil…', 'Sonuç kontrol ediliyor…', 'Sprawdzamy wynik…'],
```

- [ ] **Step 4: Gate fast result navigation behind the short score beat**

In `app/arena_match.tsx`:

1. Import `ArenaFinalScoreCount` and `ARENA_FINAL_SCORE_COUNT_MS`.
2. Add `finalScoreReady`, `finalScoreReadyRef`, and
   `pendingCoherentResultRef` scoped to the match generation.
3. On transition to `finished`, set readiness immediately for Reduced Motion;
   otherwise set it after `ARENA_FINAL_SCORE_COUNT_MS`. Clear the timer on
   unmount/account generation change.
4. In `openCoherentResult`, keep `grantLocalArenaRankedWinSpin` and
   `arenaRememberResultHandoff` before the readiness branch. If the result is
   ready but the count beat is not, store the response in
   `pendingCoherentResultRef` and return without routing.
5. When `finalScoreReady` becomes true, call `openCoherentResult` with the
   queued response; if none exists, let the existing `openPreviewResult` effect
   run. Do not set `resultOpenedRef` until navigation actually occurs.

Use this gate shape:

```ts
if (!finalScoreReadyRef.current) {
  pendingCoherentResultRef.current = response;
  return true;
}
pendingCoherentResultRef.current = null;
if (resultOpenedRef.current) return true;
```

- [ ] **Step 5: Render the final scene instead of the locked final question**

Inside the existing `ArenaScreen`, preserve `ArenaPlayers` and `V2Segments`,
then branch the content:

```tsx
{match.state.phase === 'finished' ? (
  <ArenaFinalScoreCount
    score={match.state.matchStars}
    reduceMotion={reduceMotion}
    onBeat={() => playSound('starLand')}
  />
) : visibleTask ? (
  // existing Animated.View + ArenaQuestion block unchanged
) : null}
```

Memoize the sound callback with `useCallback` so the component effect cannot
replay beats because of a new function identity.

- [ ] **Step 6: Make opponent sound follow presentation, not hidden truth**

Change the existing `rivalToldRef` effect in `app/arena_match.tsx` to test
`hud?.opponent.kind === 'answered'` for the current task. This keeps the exact
tick stored for scoring but plays `opponentAnswered` only when the reveal latch
changes. Extend `tests/arena_sound_wiring.test.ts`:

```ts
expect(match).toContain("hud?.opponent.kind === 'answered'");
expect(match).toContain("playSound('opponentAnswered')");
expect(match).toContain("playSound('starLand')");
```

- [ ] **Step 7: Record the owner decision**

Append to `docs/arena/OWNER_DECISIONS.md`:

```md
## D-80 — после последнего ответа сначала считаются локальные очки (2026-08-25)

Последний вопрос больше не остаётся на экране как будто приложение зависло.
Локальная фаза `finished` сразу показывает короткий подсчёт `matchStars` под
существующие Arena SFX; кошелёк, XP, рейтинг и награды заранее не выдумываются.
Готовый серверный handoff сохраняется немедленно, но навигация ждёт только
короткий визуальный такт, после чего открывается прежний authoritative result.

Сценарный exact-соперник хранится в машине заранее для честного расчёта, но его
видимость и звук раскрываются по собственному `raceElapsedMs`. Поэтому он может
ответить как до игрока, так и после него; live-соперник остаётся видимым сразу
после фактического прихода tick.
```

- [ ] **Step 8: Run GREEN for the integration contracts**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/arena_final_score_ui_contract.test.ts tests/arena_sound_wiring.test.ts tests/arena_copy_completeness.test.ts --no-cache
```

Expected: PASS, 0 failed tests.

- [ ] **Step 9: Commit Task 4 only**

```powershell
git add -- app/arena_match.tsx modules/arena/copy.ts tests/arena_sound_wiring.test.ts tests/arena_final_score_ui_contract.test.ts docs/arena/OWNER_DECISIONS.md
git commit -m "feat(arena): count score while terminal result loads"
```

### Task 5: Focused and protected Arena verification

**Files:**
- Verify only; do not edit production files during this task unless a failing
  test identifies a regression covered by Tasks 1–4.

- [ ] **Step 1: Run all directly changed root Arena tests under the shared heavy-process semaphore**

```powershell
$bash = 'C:\Program Files\Git\bin\bash.exe'
& $bash .claude/semaphore/slot.sh acquire 'jest arena final score focused'
try {
  npx jest --runInBand --runTestsByPath `
    tests/arena_opponent_timing.test.ts `
    tests/arena_final_score_count.test.ts `
    tests/arena_match_machine.test.ts `
    tests/arena_match_view.test.ts `
    tests/arena_owner_requested_ui_contract.test.ts `
    tests/arena_final_score_ui_contract.test.ts `
    tests/arena_sound_wiring.test.ts `
    tests/arena_copy_completeness.test.ts `
    --no-cache
} finally {
  & $bash .claude/semaphore/slot.sh release
}
```

Expected: all listed suites PASS, 0 failed tests, and the semaphore is released.

- [ ] **Step 2: Run the complete protected root Arena test set under one semaphore slot**

```powershell
$bash = 'C:\Program Files\Git\bin\bash.exe'
& $bash .claude/semaphore/slot.sh acquire 'jest all root arena suites'
try {
  $arenaTests = Get-ChildItem tests -Filter 'arena_*.test.ts' | ForEach-Object FullName
  npx jest --runInBand --runTestsByPath $arenaTests --no-cache
} finally {
  & $bash .claude/semaphore/slot.sh release
}
```

Expected: every current `tests/arena_*.test.ts` suite passes; report the fresh
suite/test totals rather than the historical count in the warning document.

- [ ] **Step 3: Run static diff checks**

```powershell
git diff --check -- modules/arena hooks/use_arena_local_match.ts components/arena app/arena_match.tsx tests/arena_*.test.ts docs/arena/OWNER_DECISIONS.md
git status --short
```

Expected: `git diff --check` exits 0. `git status` may contain unrelated owner
changes already present in the shared tree; none may be reverted or included.

- [ ] **Step 4: Inspect the exact Arena diff**

```powershell
git diff HEAD~3 -- modules/arena/opponent_timing.ts modules/arena/final_score_count.ts modules/arena/match_machine.ts modules/arena/match_view.ts hooks/use_arena_local_match.ts components/arena/ArenaFinalScoreCount.tsx app/arena_match.tsx modules/arena/copy.ts tests/arena_opponent_timing.test.ts tests/arena_final_score_count.test.ts tests/arena_final_score_ui_contract.test.ts tests/arena_match_machine.test.ts tests/arena_match_view.test.ts tests/arena_sound_wiring.test.ts docs/arena/OWNER_DECISIONS.md
```

Expected: only the approved final-score and opponent-timing behavior appears;
no Arena feature, result path, sound, or existing test is removed.

## Plan self-review

- Spec coverage: final score scene, local/server separation, existing sounds,
  Reduced Motion, exact/live timing, persistence compatibility, eight locales,
  owner decision, and protected verification each map to a task above.
- Placeholder scan: the plan contains no deferred implementation step; every
  code-changing action includes exact code or an exact edit contract.
- Type consistency: `opponentRevealedByTask`, `opponent_revealed`,
  `arenaOpponentRevealDelayMs`, `ARENA_FINAL_SCORE_COUNT_MS`,
  `ArenaFinalScoreCount`, `finalScoreReadyRef`, and
  `pendingCoherentResultRef` use the same names throughout all tasks.
