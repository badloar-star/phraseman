# Arena Live Score And Fullscreen Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show both players’ exact known match-star totals during a duel and give `speed_match` / `translate_build` the full remaining play area with accessible instructions.

**Architecture:** Extend the optional opponent tick projection without making it authoritative: live v2 clients publish their already-displayed cumulative `matchStars`, while scripted/legacy ticks use a pure derived fallback when enough outcome data exists. Keep the match machine as the scoring source, expose the rival total through `arenaMatchHud`, and make immersive task layout a pure mode decision consumed by existing React Native components. Deploy the Firestore schema compatibly with v1 readers/writers.

**Tech Stack:** TypeScript, React Native/Expo, Firebase Firestore Rules, Jest, the project Arena jestlite harness.

**Workspace rule:** Work in the current checkout. Do not create a branch or worktree. Preserve all unrelated dirty files and never revert protected Arena paths.

---

### Task 1: Add the backward-compatible live-score tick contract

**Files:**
- Modify: `tests/arena_live_channel.test.ts`
- Modify: `modules/arena/live_channel.ts`
- Modify: `app/arena_client.ts`

- [ ] **Step 1: Write failing parser and publication tests**

Add focused cases proving:

```ts
expect(arenaParseLiveSeat({
  schemaVersion: 'arena-live.v2',
  ticks: [
    { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 },
    { taskIndex: 1, correct: true, raceElapsedMs: 800, matchStars: 2 },
  ],
  finished: false,
  updatedAtMs: 1,
}, 5)!.ticks).toEqual([
  { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 },
  { taskIndex: 1, correct: true, raceElapsedMs: 800 },
]);

expect(arenaParseLiveSeat({
  schemaVersion: 'arena-live.v1',
  ticks: [{ taskIndex: 0, correct: true, raceElapsedMs: 900 }],
  finished: false,
  updatedAtMs: 1,
}, 5)).not.toBeNull();
```

Extend the `arenaClosedTicks` fixtures with real `awards` and assert cumulative totals `3, 5`, not the final total copied onto every row. Assert the existing write-budget tests keep the same `taskCount + 1` ceiling.

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/arena_live_channel.test.ts --no-cache --runInBand --watchman=false
```

Expected: FAIL because `arena-live.v2` and `matchStars` are not implemented.

- [ ] **Step 3: Implement the minimal v2 contract**

In `modules/arena/live_channel.ts`:

```ts
export const ARENA_LIVE_SCHEMA_VERSION = 'arena-live.v2' as const;
export const ARENA_LIVE_LEGACY_SCHEMA_VERSION = 'arena-live.v1' as const;

export type ArenaLiveTick = Readonly<{
  taskIndex: number;
  correct: boolean;
  raceElapsedMs: number;
  matchStars?: number;
}>;
```

Accept v1 and v2 documents. For each v2 tick, retain `matchStars` only when it is an integer within `0..arenaMatchStarCeiling(taskCount)` and not below the last retained total. Keep the tick itself when the score field is invalid. For `arenaClosedTicks`, fold `state.awards[index]?.stars ?? 0` and clamp each prefix to the match ceiling.

Update `arenaPublishLiveTicks` to accept and serialize the optional number:

```ts
...(Number.isInteger(tick.matchStars) ? { matchStars: tick.matchStars } : {}),
```

Do not add another write, read, listener, collection or top-level document field.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2. Expected: all `arena_live_channel` tests pass.

- [ ] **Step 5: Commit only Task 1 files**

```powershell
git add -- tests/arena_live_channel.test.ts modules/arena/live_channel.ts app/arena_client.ts
git commit -m "feat(arena): publish live match stars"
```

Before committing, confirm `git diff --cached --name-only` contains exactly those paths.

---

### Task 2: Derive and render the opponent score without bot branching

**Files:**
- Modify: `tests/arena_match_view.test.ts`
- Modify: `tests/arena_v2_client_contract.test.ts`
- Modify: `modules/arena/match_machine.ts`
- Modify: `modules/arena/match_view.ts`
- Modify: `modules/arena/duel_plan.ts`
- Modify: `functions/src/arena_duel_v3.ts`
- Modify: `functions/src/arena_v2.ts`
- Modify: `functions/src/arena_duel_v3.test.ts`
- Modify: `components/arena/ArenaPlayers.tsx`
- Modify: `app/arena_match.tsx`

- [ ] **Step 1: Write failing pure-view and wire tests**

Define the desired public API in tests:

```ts
expect(arenaOpponentMatchStars(plan, stateWithLiveTick({ matchStars: 7 }))).toBe(7);
expect(arenaOpponentMatchStars(plan, stateWithDecreasingTotals([7, 5]))).toBe(7);
expect(arenaOpponentMatchStars(speedPlan, stateWithScriptedPairTick({ firstAttemptPairs: 4 }))).toBe(4);
expect(arenaOpponentMatchStars(speedPlan, stateWithScriptedPairTick({}))).toBeNull();
```

Assert `arenaMatchHud(...).opponentMatchStars` returns the same value. Extend plan parsing tests so an optional integer `firstAttemptPairs: 0..4` survives, while `5`, `-1` and fractions are discarded without rejecting the plan. Extend the server bot-tick test to require the real `matchedPairs` projection on speed tasks.

Add a source contract asserting `ArenaPlayers` receives live values and that unknown rival score is rendered as `—`, never coerced to zero.

- [ ] **Step 2: Run the client and server tests and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/arena_match_view.test.ts tests/arena_v2_client_contract.test.ts --no-cache --runInBand --watchman=false
```

and from `functions/`:

```powershell
npx jest --runTestsByPath src/arena_duel_v3.test.ts --runInBand --watchman=false
```

Expected: FAIL on missing score projection and `firstAttemptPairs`.

- [ ] **Step 3: Implement a pure opponent-score selector**

Extend `ArenaOpponentTick` with optional `matchStars` and `firstAttemptPairs`.
In `modules/arena/match_view.ts`, export:

```ts
export function arenaOpponentMatchStars(
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
): number | null;
```

Rules for the function:

1. Return the greatest valid transmitted `matchStars` from ticks.
2. Otherwise fold only the contiguous task prefix for which both the viewer outcome and opponent tick exist.
3. For normal tasks, construct the rival outcome from `correct` and `raceElapsedMs`.
4. For `speed_match`, stop and return the last known value when `firstAttemptPairs` is absent; never turn boolean `correct` into a guessed pair count.
5. Use `arenaAwardStars` with the opponent as `own`, the viewer outcome as `opponent`, and preserve combo state across the prefix.
6. Clamp to `arenaMatchStarCeiling(plan.tasks.length)`.

Expose the result as `opponentMatchStars` on `ArenaMatchHud`.

- [ ] **Step 4: Thread scripted pair data through the wire**

In `functions/src/arena_duel_v3.ts`, add `firstAttemptPairs?: number` to `ArenaOpponentTickWire`. In `arenaDuelOpponentTicks`, include the clamped `matchedPairs` only for `speed_match`. In `modules/arena/duel_plan.ts`, parse it with `finiteInt(value, 0, 4)` and omit invalid values without rejecting the whole match plan.

Do not add `isBot`, `opponentKind` or any conditional UI branch.

- [ ] **Step 5: Render both totals in the existing player strip**

Move the `players` memo in `app/arena_match.tsx` below the HUD memo and assign:

```ts
const ownScore = hud?.matchStars ?? 0;
const rivalScore = hud?.opponentMatchStars ?? null;
```

Update `ArenaPlayers`’ internal projection so `number | null` is accepted. Keep `null` as `—`; animate known changes with the existing `useCountUp` and disable that animation under reduced motion.

- [ ] **Step 6: Verify GREEN and commit Task 2**

Run both commands from Step 2. Expected: all selected tests pass.

```powershell
git add -- tests/arena_match_view.test.ts tests/arena_v2_client_contract.test.ts modules/arena/match_machine.ts modules/arena/match_view.ts modules/arena/duel_plan.ts functions/src/arena_duel_v3.ts functions/src/arena_v2.ts functions/src/arena_duel_v3.test.ts components/arena/ArenaPlayers.tsx app/arena_match.tsx
git commit -m "feat(arena): show opponent live stars"
```

Confirm the staged set exactly before committing.

---

### Task 3: Migrate Firestore Rules and the canonical privacy contract

**Files:**
- Modify: `firestore.rules`
- Modify: `functions/src/arena_v2_rules.emulator.test.ts`
- Modify: `tests/arena_callable_surface.test.ts`
- Modify: `tests/arena_v2_client_source_contract.test.ts`
- Modify: `docs/arena/STAGE2_SPEC.md`

- [ ] **Step 1: Write failing Rules/source contracts**

Require both schema versions during rollout:

```ts
expect(rules).toContain("request.resource.data.schemaVersion in ['arena-live.v1', 'arena-live.v2']");
```

The emulator test must accept a v2 seat document with tick-level
`matchStars`, accept the legacy v1 fixture, and continue rejecting missing
top-level fields, forged schema names and extra top-level `answer`/`uid`
fields.

Update the privacy source contract so it permits only the approved display
field `matchStars` while still rejecting `answer`, `stableUid`, `authUid`,
balances, seasonal rewards and `isBot`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/arena_callable_surface.test.ts tests/arena_v2_client_source_contract.test.ts --no-cache --runInBand --watchman=false
```

Expected: FAIL because Rules and the canonical source guard still require v1 and prohibit all star totals.

- [ ] **Step 3: Implement the compatible Rules/document update**

Change only the schema predicate in the live seat rule:

```rules
&& request.resource.data.schemaVersion in ['arena-live.v1', 'arena-live.v2']
```

Keep the existing top-level `hasOnly`, participant check, seat ownership,
tick-count ceiling, `finished` and `updatedAtMs` validation unchanged.

In `STAGE2_SPEC.md`, replace the obsolete absolute ban with the owner-approved
exception: cumulative `matchStars` is display-only, non-authoritative, carries
no entitlement, and may be absent during mixed-version rollout. Preserve the
ban on answers, ids, balances and reward projections. Replace “opponent star
count is not rendered” with the v2/fallback behavior.

Jarvis needs no change because no Jarvis fetcher reads this existing ephemeral
collection; record that fact in the owner journal later.

- [ ] **Step 4: Verify source contracts and Firestore emulator**

Run the source tests from Step 2. Then, from `functions/`, run:

```powershell
npm run test:emulator:arena-v2-rules
```

Expected: all live-seat emulator cases pass.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- firestore.rules functions/src/arena_v2_rules.emulator.test.ts tests/arena_callable_surface.test.ts tests/arena_v2_client_source_contract.test.ts docs/arena/STAGE2_SPEC.md
git commit -m "feat(arena): allow display-only live stars"
```

Confirm the staged set exactly before committing.

---

### Task 4: Add the immersive layout contract and localized instructions

**Files:**
- Create: `modules/arena/question_layout.ts`
- Create: `tests/arena_question_layout.test.ts`
- Modify: `tests/arena_match_view.test.ts`
- Modify: `modules/arena/copy.ts`
- Modify: `components/arena/ArenaQuestion.tsx`
- Modify: `components/arena/ArenaPlayers.tsx`
- Modify: `app/arena_match.tsx`

- [ ] **Step 1: Write failing layout/localization tests**

Create a pure contract:

```ts
expect(arenaQuestionLayout('speed_match')).toEqual({ immersive: true, instructionKey: 'matchInstruction' });
expect(arenaQuestionLayout('translate_build')).toEqual({ immersive: true, instructionKey: 'builderInstruction' });
expect(arenaQuestionLayout('guess_phrase')).toEqual({ immersive: false, instructionKey: null });
```

For each of the eight Arena locales, require non-empty `matchInstruction` and
`builderInstruction`. In the source test require:

- the immersive branch does not wrap the play field in `V2Card`;
- `speed_match` and `translate_build` receive `flex: 1`;
- the builder CTA remains after/outside its `ScrollView`;
- pair/token controls keep a minimum 44 pt touch height;
- compact mode is passed to `ArenaPlayers` only for immersive tasks.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/arena_question_layout.test.ts tests/arena_match_view.test.ts --no-cache --runInBand --watchman=false
```

Expected: FAIL because the layout helper, keys and immersive component branch do not exist.

- [ ] **Step 3: Implement the pure layout selector and copy**

Create `modules/arena/question_layout.ts`:

```ts
import type { ArenaTaskMode } from './contract';

export type ArenaQuestionInstructionKey = 'matchInstruction' | 'builderInstruction';

export function arenaQuestionLayout(mode: ArenaTaskMode): Readonly<{
  immersive: boolean;
  instructionKey: ArenaQuestionInstructionKey | null;
}> {
  if (mode === 'speed_match') return { immersive: true, instructionKey: 'matchInstruction' };
  if (mode === 'translate_build') return { immersive: true, instructionKey: 'builderInstruction' };
  return { immersive: false, instructionKey: null };
}
```

Add the copy arrays in the project locale order `ru, uk, es, pt, vi, id, tr,
pl`:

```ts
matchInstruction: [
  'Сначала слово, потом перевод',
  'Спочатку слово, потім переклад',
  'Primero la palabra, luego la traducción',
  'Primeiro a palavra, depois a tradução',
  'Chọn từ trước, rồi chọn bản dịch',
  'Pilih kata dulu, lalu terjemahannya',
  'Önce kelimeyi, sonra çevirisini seç',
  'Najpierw słowo, potem tłumaczenie',
],
builderInstruction: [
  'Собери перевод по порядку',
  'Склади переклад у правильному порядку',
  'Ordena la traducción',
  'Monte a tradução na ordem correta',
  'Sắp xếp bản dịch theo đúng thứ tự',
  'Susun terjemahan dengan urutan yang benar',
  'Çeviriyi doğru sırayla oluştur',
  'Ułóż tłumaczenie we właściwej kolejności',
],
```

- [ ] **Step 4: Implement the fullscreen-safe React Native layout**

In `ArenaQuestion`, use the pure selector after `adaptArenaTask`:

- common prompt and optional instruction are outside the scroll region;
- matching uses an uncarded `View` with `flex: 1` and two equal-height columns;
- matching chips have `minHeight: 44` and retain their row position after matching;
- builder uses an uncarded `View` with `flex: 1`; answer tray remains above a
  `ScrollView` token bank; CTA remains outside the `ScrollView` at the bottom;
- choices keep the current `V2Card` implementation unchanged.

In `app/arena_match.tsx`, derive `immersive` from `hud.mode`, pass
`compact={immersive}` to `ArenaPlayers`, and use a compact single HUD row for
timer/combo/opponent status. Do not remove the Arena header, back action,
progress segments, safe-area handling, forfeit confirmation, result reveal or
star flight.

In `ArenaPlayers`, compact mode must retain both 44 pt minimum touch-independent
avatar/name/score groups, use existing palette tokens, and never replace lime
foreground with white.

Use existing Motion Hybrid constants for any new transition; frequent chip
taps receive no decorative entrance animation. Preserve reduced-motion paths.

- [ ] **Step 5: Verify GREEN and commit Task 4**

Run the command from Step 2. Expected: all selected tests pass.

```powershell
git add -- modules/arena/question_layout.ts tests/arena_question_layout.test.ts tests/arena_match_view.test.ts modules/arena/copy.ts components/arena/ArenaQuestion.tsx components/arena/ArenaPlayers.tsx app/arena_match.tsx
git commit -m "feat(arena): expand pair and builder tasks"
```

Confirm the staged set exactly before committing.

---

### Task 5: Update the owner journal and execute deterministic gates

**Files:**
- Modify: `docs/arena/OWNER_DECISIONS.md`

- [ ] **Step 1: Record the owner decisions and migration boundary**

Append a dated entry that records:

- owner approved cumulative live stars on 2026-08-20;
- field is display-only and never authoritative for rewards/outcome;
- v1/v2 compatibility and no increase in write budget;
- no Jarvis reader consumes the live collection;
- immersive layout applies only to `speed_match` and `translate_build`;
- exact verification commands and results.

- [ ] **Step 2: Run the complete focused client gate**

```powershell
npx jest --runTestsByPath tests/arena_live_channel.test.ts tests/arena_match_view.test.ts tests/arena_question_layout.test.ts tests/arena_v2_client_contract.test.ts tests/arena_v2_client_source_contract.test.ts tests/arena_callable_surface.test.ts --no-cache --runInBand --watchman=false
```

Expected: all selected suites pass with zero failed tests.

- [ ] **Step 3: Run the server gate and build**

From `functions/`:

```powershell
npx jest --runTestsByPath src/arena_duel_v3.test.ts src/arena_v2_core.test.ts --runInBand --watchman=false
npm run build
```

Expected: both commands exit 0 and runtime parity remains green.

- [ ] **Step 4: Run Firestore and Arena harness gates**

From `functions/`, run `npm run test:emulator:arena-v2-rules`.
Run `tools/arena_tests/run.sh`; on Windows, if the Bash wrapper again passes
`/c/...` to Node, use the established PowerShell-equivalent jestlite runner
against the freshly compiled `.arena-test-build` and report the wrapper issue
separately from test results.

Expected: zero failed emulator cases and zero failed Arena suites.

- [ ] **Step 5: Run diff hygiene and inspect the device**

```powershell
git diff --check
git status --short
```

On two live players verify score updates, unknown is `—`, pairs are not
pre-aligned, every bottom chip is tappable, and builder CTA remains visible at
320 pt / normal width and 1.5× font. If the existing JS-chunk/Metro blocker
persists, capture the exact screenshot/error and leave smoke explicitly
unverified; do not infer success from source.

- [ ] **Step 6: Commit the journal only after inserting actual gate results**

```powershell
git add -- docs/arena/OWNER_DECISIONS.md
git commit -m "docs(arena): record live score rollout"
```

Confirm no unrelated path is staged.
