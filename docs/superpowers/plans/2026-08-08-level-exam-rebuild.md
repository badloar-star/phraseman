# Level Exam Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` in the current canonical checkout. Repository policy forbids worktrees and delegated coding unless the owner explicitly requests them, so keep one writer and do not create a feature worktree.

**Goal:** Replace the English-target A1-B2 level exams with deterministic, lesson-grounded, timed, resumable, theme-aware exams that use five interaction formats and grant exactly one server-authoritative reward spin on the first passing result for each level.

**Architecture:** Keep `app/level_exam.tsx` as the route orchestrator, but move content generation, scoring, persistence, motion policy, and UI formats into small testable modules. Generate each attempt locally from canonical lesson data and a persisted seed; represent 26 single-score tasks plus one four-pair match board as exactly 30 score units. Submit the existing idempotent `exam_complete` progress event for XP/unlock and extend the existing reward-spin ledger so the same server transaction can mint a distinct exam-origin credit only on the first pass. The separately gated French remote exam branch stays unchanged.

**Tech Stack:** Expo Router, React Native, TypeScript, Reanimated 4, React Native Testing Library 14, Jest 29, AsyncStorage, Firebase callable functions/Firestore transactions, existing Phraseman theme and sound-director APIs.

---

## Execution constraints

- Work in `C:\appsprojects\phraseman` on the canonical checkout; do not create a worktree.
- Preserve all unrelated dirty-tree edits. Before each commit, inspect `git diff --cached --name-only` and stage only files owned by the task.
- Do not use the project OpenAI API. The exam is deterministic and local; existing bundled audio events are sufficient.
- Do not deploy functions, migrate production data, or change remote flags in this implementation session.
- Preserve the user's existing `decelerationRate="normal"` edits in `app/level_exam.tsx`.
- Every visible color comes from `useTheme()` tokens or an existing theme-aware component. No literal gold palette, decorative border, or color-only correctness state.
- Do not introduce roulette/turn wording. The approved Russian noun is `спин`; actions use `Забрать награду`, `Запустить`, or `Ещё спин` only where already established.

## Task 1: Freeze the exam content contract before replacing the pool

**Files:**

- Create: `app/level_exam_types.ts`
- Create: `tests/level_exam_blueprint.test.ts`
- Modify: `tests/level_exam_ambiguous_prompt_contract.test.ts`
- Reference only: `app/course_levels.ts`, `app/lesson_data_all.ts`, `app/lesson_data_types.ts`

### Step 1: Define the scored-unit model

Create discriminated types for:

```ts
export type LevelExamLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type LevelExamFormat =
  | 'context_choice'
  | 'phrase_builder'
  | 'meaning_choice'
  | 'spot_error'
  | 'speed_match';

export type ExamChoiceTask = {
  id: string;
  format: 'context_choice' | 'meaning_choice';
  lessonId: number;
  phraseId: string;
  prompt: string;
  options: readonly string[];
  correctOptionId: string;
  explanation: string;
};

export type ExamPhraseBuilderTask = {
  id: string;
  format: 'phrase_builder';
  lessonId: number;
  phraseId: string;
  prompt: string;
  tokens: readonly { id: string; text: string }[];
  correctTokenIds: readonly string[];
  explanation: string;
};

export type ExamSpotErrorTask = {
  id: string;
  format: 'spot_error';
  lessonId: number;
  phraseId: string;
  prompt: string;
  tokens: readonly { id: string; text: string }[];
  errorTokenId: string;
  correction: string;
  explanation: string;
};

export type ExamSpeedMatchTask = {
  id: string;
  format: 'speed_match';
  pairs: readonly {
    scoreUnitId: string;
    lessonId: number;
    phraseId: string;
    source: string;
    target: string;
  }[];
};

export type LevelExamTask =
  | ExamChoiceTask
  | ExamPhraseBuilderTask
  | ExamSpotErrorTask
  | ExamSpeedMatchTask;

export type LevelExamBlueprint = {
  version: 2;
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: string;
  seed: string;
  tasks: readonly LevelExamTask[];
  scoredUnitIds: readonly string[];
  durationMs: number;
  passScore: 21;
};
```

Keep answers selection-based. Do not store or transmit free-form learner text.

### Step 2: Write failing blueprint invariants

In `tests/level_exam_blueprint.test.ts`, import the future `buildLevelExamBlueprint` and assert for every A1-B2 level and each supported source locale:

```ts
expect(blueprint.scoredUnitIds).toHaveLength(30);
expect(countByFormat(blueprint)).toEqual({
  context_choice: 8,
  phrase_builder: 8,
  meaning_choice: 6,
  spot_error: 4,
  speed_match: 4,
});
```

Also assert:

- every lesson in `COURSE_LEVELS[level]` occurs in at least two score units;
- no lesson outside the range occurs;
- all phrase IDs resolve through canonical lesson data;
- every option set is non-empty, unique after normalization, and contains exactly one accepted answer;
- phrase-builder banks contain the exact canonical token multiset and are not already in answer order for a representative seed set;
- each spot-error item changes exactly one token and has one correction;
- the match board has four unique source and four unique target strings;
- same inputs plus same seed deep-equal; at least 8 of 30 positions differ for two representative seeds;
- answer indices cover all option positions across a seed sample and no position exceeds 45% of correct answers;
- normalized prompt/answer pairs are unique inside one attempt;
- A1/A2/B1/B2 durations equal 12/13/14/15 minutes;
- the generated text does not contain the ten retired ambiguous prompts from the audit.

### Step 3: Make the legacy ambiguity test a retirement guard

Change `tests/level_exam_ambiguous_prompt_contract.test.ts` so it no longer blesses inline replacements. It must fail while `LEVEL_QUESTIONS` or the audited prompts remain in `app/level_exam.tsx`, and pass only when the new builder is the English exam source.

### Step 4: Run the red tests

Run:

```powershell
npx jest --runTestsByPath tests/level_exam_blueprint.test.ts tests/level_exam_ambiguous_prompt_contract.test.ts --no-cache --runInBand
```

Expected: fail because `buildLevelExamBlueprint` does not exist and the legacy pool remains.

### Step 5: Commit the test contract

```powershell
git add app/level_exam_types.ts tests/level_exam_blueprint.test.ts tests/level_exam_ambiguous_prompt_contract.test.ts
git commit -m "test: define level exam blueprint contract"
```

## Task 2: Build deterministic lesson-grounded blueprints

**Files:**

- Create: `app/level_exam_rng.ts`
- Create: `app/level_exam_error_mutations.ts`
- Create: `app/level_exam_blueprint.ts`
- Modify: `tests/level_exam_blueprint.test.ts`
- Reference only: `app/lesson_data_all.ts`, `app/exam_locale.ts`, `app/course_levels.ts`

### Step 1: Implement a stable seeded RNG

Add a small pure hash plus PRNG API:

```ts
export function stableSeed32(value: string): number;
export function createLevelExamRng(seed: string): () => number;
export function shuffled<T>(values: readonly T[], rng: () => number): T[];
```

The hash and shuffle must not depend on JavaScript object iteration order. Add fixed-vector tests so a future refactor cannot silently change active-attempt reconstruction.

### Step 2: Add the only authored content metadata

In `app/level_exam_error_mutations.ts`, define curated spot-error mutations by canonical phrase ID:

```ts
export type SpotErrorMutation = {
  phraseId: string;
  expectedToken: string;
  incorrectToken: string;
  explanationKey: string;
};
```

Rules:

- store only the one-token mutation and explanation key, never a duplicate full phrase;
- provide at least six valid candidates per course level so four can vary by seed;
- validate at module/test time that the phrase exists and contains `expectedToken` exactly once;
- avoid disputed style variants (`was/were`, optional backshift, aspectual `hear sing/singing`, and similar audited cases).

### Step 3: Build format candidate factories from canonical phrases

Implement pure factories:

```ts
function contextChoiceCandidates(...): ExamChoiceTask[];
function phraseBuilderCandidates(...): ExamPhraseBuilderTask[];
function meaningChoiceCandidates(...): ExamChoiceTask[];
function spotErrorCandidates(...): ExamSpotErrorTask[];
function speedMatchCandidates(...): ExamSpeedMatchTask['pairs'];
```

Factory behavior:

- `context_choice`: show the canonical source-locale meaning/situation and choose the complete canonical English phrase from four lesson-range phrases;
- `phrase_builder`: reconstruct the canonical English phrase with punctuation attached consistently; preserve duplicate words through token IDs;
- `meaning_choice`: show the English phrase and choose its canonical localized meaning from four lesson-range translations;
- `spot_error`: apply one validated mutation and ask the learner to tap the incorrect token;
- `speed_match`: use four canonical English/source-locale pairs on one board.

Reject candidates with blank translations, duplicate normalized options, too few tokens, unresolved phrase IDs, or identical source/target strings.

### Step 4: Allocate coverage and quotas deterministically

Implement `buildLevelExamBlueprint({ level, studyTarget: 'en', sourceLocale, seed })`:

1. Read the level range from `course_levels.ts`.
2. Build all valid candidates for each lesson and format.
3. Reserve two score units per lesson using a rotating format schedule.
4. Fill remaining deficits until the exact `8/8/6/4/4` distribution is reached, always choosing the least represented eligible lesson first.
5. Group the four speed-match units into one board after allocation.
6. Shuffle task order, option order, word banks, and match columns with derived seed namespaces (`${seed}:tasks`, `${seed}:${taskId}:options`, etc.).
7. Throw a typed `LevelExamContentError` if any invariant cannot be satisfied; never show a partial exam.

Use canonical lesson IDs and phrase IDs in task IDs, plus blueprint version and transformation name, so QA can reconstruct every item.

### Step 5: Turn the content contract green

Run:

```powershell
npx jest --runTestsByPath tests/level_exam_blueprint.test.ts --no-cache --runInBand
```

Expected: pass for A1-B2 and all supported source locales.

### Step 6: Commit the engine

```powershell
git add app/level_exam_rng.ts app/level_exam_error_mutations.ts app/level_exam_blueprint.ts tests/level_exam_blueprint.test.ts
git commit -m "feat: build deterministic level exam blueprints"
```

## Task 3: Make attempts resumable and finish idempotently

**Files:**

- Create: `app/level_exam_attempt_state.ts`
- Create: `tests/level_exam_attempt_state.test.ts`
- Modify: `app/level_exam_attempts.ts`
- Modify: `tests/level_exam_attempts.test.ts`

### Step 1: Write red tests for lifecycle and persistence

Cover:

- start creates a versioned snapshot only after a supplied `energySpent: true` result;
- failed energy spend creates no deadline and no snapshot;
- double start with the same start token returns the same attempt and does not request a second spend;
- deadline is `startedAtMs + durationMs` and remaining time is always derived from `deadlineAtMs - nowMs`;
- an unexpired snapshot restores exact seed, ordered task IDs, answers, and current screen;
- an expired snapshot produces one `finishReason: 'timeout'` result with unanswered score units incorrect;
- manual submit racing timeout returns the same `finishToken` and one attempt count increment;
- corrupt, wrong-account, wrong-target, or wrong-blueprint snapshots are quarantined and never resumed;
- a completed snapshot cannot reopen as active.

### Step 2: Implement pure attempt transitions

Use a discriminated state:

```ts
type LevelExamAttemptSnapshot = {
  schemaVersion: 2;
  ownerStableUid: string;
  attemptId: string;
  finishToken: string;
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: string;
  blueprintVersion: 2;
  seed: string;
  orderedTaskIds: string[];
  answers: Record<string, PersistedExamAnswer>;
  currentTaskIndex: number;
  startedAtMs: number;
  deadlineAtMs: number;
  status: 'active' | 'finishing' | 'completed';
};
```

Export pure functions `createAttemptSnapshot`, `applyAnswer`, `markFinishing`, `remainingExamMs`, `restoreAttemptDecision`, and `completeAttemptSnapshot`. Validate every integer, enum, owner, task ID, and timestamp before accepting persisted data.

### Step 3: Add an account-scoped AsyncStorage adapter

Keep storage I/O in `level_exam_attempts.ts`. Key it by canonical user ID, target, and level. Serialize writes behind a small per-attempt promise chain so rapid answers cannot reorder snapshots. Store no free-form learner content.

Expose:

```ts
loadActiveLevelExamAttempt(...)
persistActiveLevelExamAttempt(...)
clearActiveLevelExamAttempt(...)
recordCompletedLevelExamAttemptOnce(finishToken)
```

Retain the current attempt-count API and make its increment part of the same idempotent completion method.

### Step 4: Run focused tests

```powershell
npx jest --runTestsByPath tests/level_exam_attempt_state.test.ts tests/level_exam_attempts.test.ts --no-cache --runInBand
```

Expected: pass, including fake-clock background/foreground cases.

### Step 5: Commit attempt state

```powershell
git add app/level_exam_attempt_state.ts app/level_exam_attempts.ts tests/level_exam_attempt_state.test.ts tests/level_exam_attempts.test.ts
git commit -m "feat: persist and restore timed level exam attempts"
```

## Task 4: Score all five formats and produce useful diagnostics

**Files:**

- Create: `app/level_exam_scoring.ts`
- Create: `tests/level_exam_scoring.test.ts`

### Step 1: Write failing scoring tests

Verify:

- choice, phrase builder, spot-error, and every speed-match pair each contribute exactly one score unit;
- skipped and timeout-unanswered units are incorrect;
- score is an integer from 0-30; pass is `score >= 21`; percentage is `Math.round(score / 30 * 100)`;
- score 21 passes and 20 fails;
- format breakdown totals 30;
- lesson breakdown uses the score-unit lesson ID, including each match pair;
- weakest lessons sort by accuracy ascending, then attempted count descending, then lesson ID;
- at most three weak lessons are returned with canonical localized titles and a route to that completed lesson;
- `neededForPass` is `Math.max(0, 21 - score)`;
- medal/XP mapping remains compatible with the current level-exam thresholds.

### Step 2: Implement one pure evaluator

Add `scoreLevelExam(blueprint, answers, finishReason)` returning:

```ts
type LevelExamResult = {
  score: number;
  total: 30;
  pct: number;
  passed: boolean;
  neededForPass: number;
  finishReason: 'submitted' | 'timeout';
  byFormat: Record<LevelExamFormat, { correct: number; total: number }>;
  byLesson: Array<{ lessonId: number; correct: number; total: number }>;
  weakLessons: Array<{ lessonId: number; title: string; correct: number; total: number }>;
  medal: 'none' | 'bronze' | 'silver' | 'gold';
  baseXp: number;
};
```

Do not infer correctness in UI components; components emit answer payloads and this evaluator owns truth.

### Step 3: Run and commit

```powershell
npx jest --runTestsByPath tests/level_exam_scoring.test.ts --no-cache --runInBand
git add app/level_exam_scoring.ts tests/level_exam_scoring.test.ts
git commit -m "feat: score level exams with lesson diagnostics"
```

## Task 5: Extend the server spin ledger with an exam origin

**Risk:** economy/reward mutation. Before editing, use the required critical-domain execution/review path and keep one writer.

**Files:**

- Modify: `functions/src/level_reward_spins.ts`
- Modify: `functions/src/progress_events.ts`
- Modify: `functions/src/level_reward_spins.test.ts`
- Modify: `functions/src/progress_events.test.ts`
- Modify: `functions/src/level_reward_spins_deploy_contract.test.ts`
- Modify: `tests/level_reward_spins_security_contract.test.ts`

### Step 1: Add failing first-pass mint tests

Test the authoritative transaction behavior:

- passing `exam_complete` for English A1-A2-B1-B2 mints one standard exam credit only when the stored `passed` field was previously false;
- 20/30 or `pct < 70` mints none;
- replay after a prior pass mints none, even with a new event ID;
- duplicate event ID/fingerprint returns the original result and cannot double mint;
- concurrent first-pass transactions converge on deterministic credit ID `level_exam_spin_v1_en_a1` (and corresponding levels);
- French target, `final`, C1/C2, malformed level, missing authenticated identity, or unsupported spin protocol mint none;
- the exam credit is included in authoritative balance and can be claimed through the existing spin claim path;
- XP-level credits and exam credits remain independently claimable and never collide;
- old v1 level receipts remain readable.

### Step 2: Introduce an origin union without faking an XP level

Use:

```ts
type LevelSpinOrigin =
  | { type: 'xp_level'; level: number }
  | { type: 'level_exam'; studyTarget: 'en'; examLevel: 'a1' | 'a2' | 'b1' | 'b2' };
```

Keep existing XP-level credit IDs and documents intact. Store exam credits in the same `level_spin_credits` collection with:

```ts
{
  origin: { type: 'level_exam', studyTarget: 'en', examLevel: 'a2' },
  kind: 'standard',
  status: 'available',
  earnedAtMs,
  sortKey: earnedAtMs,
  schemaVersion: 2,
  catalogVersion: 1
}
```

For legacy documents, normalize missing `origin` to `{ type: 'xp_level', level: data.level }`. Do not overload `level` with a course exam or sentinel value.

### Step 3: Prepare both credit kinds in the existing progress transaction

Add a pure `examSpinCreditToMint(progressBefore, event)` guard and a prepared write function. In `progressSubmitEvent`, prepare XP-level minting and exam minting, then commit both inside the same Firestore transaction before writing the event ledger.

First-pass eligibility is derived from server-side pre-event progress:

```ts
const passedBefore = boolish(progressBefore[levelExamFieldKey(level, 'passed', 'en')]);
const passedNow = score >= 21 && pct >= 70;
const eligible = event.type === 'exam_complete'
  && studyTarget === 'en'
  && !passedBefore
  && passedNow;
```

The server remains the only writer of spendable spin balance. The event is bounded to four lifetime exam credits per user. Return `examSpinMintedCredit` in the ledger result so duplicate requests reproduce the same acknowledgement.

### Step 4: Make claim/status origin-aware

Query available credits by `earnedAtMs` (with deterministic document-ID tie break in memory), normalize legacy origins, and pass a standard reward tier to `rewardForSpin` for exam credits. Public receipts include `origin`; XP-level receipts retain `level` for compatibility.

### Step 5: Run backend/security tests

```powershell
npm --prefix functions test -- --runTestsByPath src/level_reward_spins.test.ts src/progress_events.test.ts src/level_reward_spins_deploy_contract.test.ts --no-cache --runInBand
npx jest --runTestsByPath tests/level_reward_spins_security_contract.test.ts --no-cache --runInBand
```

Expected: pass with exactly-once and backward-compatibility cases.

### Step 6: Commit only reviewed reward changes

Because the spin files are currently part of an unrelated dirty-tree feature, inspect the staged diff line by line before committing. If staging would absorb unrelated untracked work, leave the source changes uncommitted and report that explicitly instead of claiming ownership.

## Task 6: Reconcile pending exam rewards on the client

**Files:**

- Modify: `app/progress_events_client.ts`
- Modify: `app/level_reward_spins_client.ts`
- Modify: `app/level_gift_inventory.ts`
- Create: `app/level_exam_reward_status.ts`
- Modify: `tests/progress_events_client_queue.test.ts`
- Modify: `tests/level_reward_spins_client.test.ts`
- Create: `tests/level_exam_reward_status.test.ts`

### Step 1: Write red client tests

Cover:

- online first pass resolves to `granted` only after the server result contains the expected exam-origin credit;
- offline or transient failure persists `pending_confirmation`, not a spendable local balance;
- queued progress-event replay updates the reward state once when the server acknowledgement arrives;
- a duplicate acknowledgement resolves to `already_granted` without incrementing the visible balance twice;
- receipt parsing accepts legacy XP-level origin and new exam origin, rejects mismatched credit ID/origin/schema;
- exam-origin gifts remain claimable in inventory and display `Экзамен A2` rather than a fabricated numeric XP level;
- account switching cannot leak pending status or a receipt to another stable UID.

### Step 2: Extend progress result parsing

Add the exam credit field to `ProgressEventResult` and validate its deterministic ID/origin before persisting any local acknowledgement. Emit a focused app event such as `level_exam_reward_changed` after a valid server result is mirrored.

### Step 3: Add account-scoped reward status

`level_exam_reward_status.ts` owns:

```ts
type ExamRewardStatus =
  | 'ineligible'
  | 'pending_confirmation'
  | 'granted'
  | 'already_granted';
```

Store only the pending event identity and last authoritative acknowledgement. A local pass may set `pending_confirmation`; only the validated server result may set `granted` and update the spendable spin cache.

### Step 4: Make receipt/inventory materialization origin-aware

Replace the assumption that every receipt has a numeric `level` with the origin union. Add `rewardOriginLabel` to spin journal/inventory items and preserve old journal entries by normalizing their numeric level into an XP-level origin.

### Step 5: Run focused tests

```powershell
npx jest --runTestsByPath tests/progress_events_client_queue.test.ts tests/level_reward_spins_client.test.ts tests/level_exam_reward_status.test.ts tests/level_gift_inventory.test.ts --no-cache --runInBand
```

Expected: pass for online, offline queue, duplicate, account switch, and legacy receipt cases.

## Task 7: Build the theme-aware preparation and countdown surfaces

**Files:**

- Create: `components/level-exam/LevelExamIntro.tsx`
- Create: `components/level-exam/LevelExamCountdown.tsx`
- Create: `components/level-exam/levelExamCopy.ts`
- Create: `components/level-exam/levelExamMotion.ts`
- Create: `tests/level_exam_ui_contract.test.ts`
- Create: `tests/rntl/level_exam_intro.rntl.test.tsx`

### Step 1: Write UI contract and RNTL tests first

Assert:

- title, lesson range, `21 из 30`, duration, five formats, best result, one-time reward, and `−5 ⚡` are visible;
- retry copy never says `без штрафа`;
- CTA is disabled while energy spend is pending and a double press invokes `onStart` once;
- insufficient energy state retains layout and exposes the existing energy recovery action;
- all color props are passed from theme tokens or theme-aware components; the exam files contain no hex/rgb literals;
- no decorative `borderWidth` is introduced;
- countdown announces 3, 2, 1, then starts exactly once;
- reduced motion uses a crossfade/immediate progression and never creates a scale/translate sequence;
- every Pressable has a localized accessibility role and label.

### Step 2: Implement localized product copy

Keep copy in `levelExamCopy.ts`, keyed by the existing `Lang` type. Russian approved strings include:

- `Финальная проверка A2`
- `Покажи, как уверенно ты используешь темы этого уровня в живых фразах.`
- `21 правильный ответ из 30`
- `Контекст · сборка фраз · смысл · поиск ошибки · быстрые пары`
- `Начать проверку −5 ⚡`
- `Лучший результат сохранится`

Supply equivalent authored copy for every currently supported source-interface locale; do not silently fall back to malformed or empty strings.

### Step 3: Implement themed geometry

Use `ScreenGradient`, `TonalSurface`, `TapScale`, `useTheme()`, existing typography metrics, and stable safe-area helpers. The full screen should have:

- compact back action and level eyebrow;
- large preparation title/lead;
- three factual stat tiles for goal, time, and cost;
- format strip and first-pass reward preview;
- bottom-safe CTA and support text.

Use `t.bgSurface`, `t.bgSurface2`, `t.bgCard`, `t.textPrimary`, `t.textSecond`, `t.textMuted`, `t.accent`, `t.accentBg`, `t.gold`, and semantic tokens only where their meaning applies.

### Step 4: Implement finite countdown motion/audio handoff

The countdown owns visual timing only. It emits `onComplete` once after 1.8 seconds and requests `pm.exam.begin` through the existing sound director once when it begins. Use UI-thread Reanimated transitions and `scheduleOnRN`. Cancel work on blur/unmount. Reduced motion uses a short opacity transition and the same one-shot completion guard.

### Step 5: Run UI tests and commit

```powershell
npx jest --runTestsByPath tests/level_exam_ui_contract.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/rntl/level_exam_intro.rntl.test.tsx --no-cache --runInBand
```

## Task 8: Build the five active-exam interactions

**Files:**

- Create: `components/level-exam/LevelExamQuestionFrame.tsx`
- Create: `components/level-exam/ContextChoiceTask.tsx`
- Create: `components/level-exam/PhraseBuilderTask.tsx`
- Create: `components/level-exam/MeaningChoiceTask.tsx`
- Create: `components/level-exam/SpotErrorTask.tsx`
- Create: `components/level-exam/SpeedMatchTask.tsx`
- Create: `components/level-exam/LevelExamTimer.tsx`
- Create: `tests/rntl/level_exam_tasks.rntl.test.tsx`

### Step 1: Write interaction tests first

For each format, assert its exact answer payload and lock behavior. Additional cases:

- skip leaves the unit unanswered and it can be revisited;
- an answered unit cannot be scored twice;
- duplicate phrase-builder words remain independently selectable by token ID;
- spot-error taps only tokens, shows correction with icon/text, and never relies on red alone;
- speed match records each first pair attempt once, lets the learner finish the board, and contributes four unit results;
- match selections and answer buttons meet 44 pt iOS/48 dp Android targets;
- correct/error feedback triggers the existing semantic SFX once and polite live-region copy once;
- timer warning announces only at 60 and 10 seconds, not every tick;
- rapid navigation cannot overlap two task-change animations.

### Step 2: Implement a shared frame

`LevelExamQuestionFrame` owns close, progress (`n / 30`), remaining time, format label, skip/revisit controls, and stable content geometry. It receives `nowMs`/`deadlineAtMs`; it does not persist a decrementing counter.

### Step 3: Implement answer components as controlled views

Each task component receives immutable task data, existing answer state, and `onAnswer`. Keep scoring out of the view. Use `TapScale` for direct presses and Reanimated for a single 180-220 ms task transition plus 280 ms semantic feedback. Disable input during feedback and cancel delayed navigation on unmount.

### Step 4: Run RNTL tests

```powershell
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/rntl/level_exam_tasks.rntl.test.tsx --no-cache --runInBand
```

Expected: all five formats, skip/revisit, timing warnings, and accessibility pass.

## Task 9: Build pass/retry result screens and reward states

**Files:**

- Create: `components/level-exam/LevelExamResult.tsx`
- Create: `components/level-exam/LevelExamSkillBreakdown.tsx`
- Create: `tests/rntl/level_exam_result.rntl.test.tsx`
- Modify: `tests/reward_sound_surfaces_contract.test.ts`

### Step 1: Write result tests first

Cover:

- pass shows medal, integer score, percentage, format breakdown, XP, next level, and first-pass reward status;
- online acknowledged reward CTA is `Забрать награду` and routes to the existing level reward surface;
- offline pass says confirmation is pending and does not claim a spendable spin;
- replay pass omits the reward promise;
- retry says `Нужно ещё N правильных ответа`, shows two or three weakest lesson objectives, and routes each review action only to already completed lessons;
- retry CTA says `Попробовать снова −5 ⚡`;
- timeout is named calmly and uses the same diagnostic result;
- pass requests `pm.complete.exam_pass`; retry requests `pm.complete.exam_retry`; each fires once;
- reduced motion removes medal scale/reward stagger but preserves information order.

### Step 2: Implement finite reveal sequences

Pass sequence: medal, score, then reward/status, capped at 2.4 seconds. Retry sequence: score then weak lessons with restrained opacity/position changes. Use existing semantic theme tokens, not a fixed celebration palette.

### Step 3: Run tests

```powershell
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/rntl/level_exam_result.rntl.test.tsx --no-cache --runInBand
npx jest --runTestsByPath tests/reward_sound_surfaces_contract.test.ts --no-cache --runInBand
```

## Task 10: Replace the English route while preserving product contracts

**Files:**

- Rewrite: `app/level_exam.tsx`
- Modify: `tests/level_exam_locale_runtime.test.ts`
- Modify: `tests/gustav_french_exam_target_gate.test.ts`
- Modify: `tests/exam_best_pct_sync_contract.test.ts`
- Create: `tests/level_exam_runtime_contract.test.ts`
- Create: `tests/rntl/level_exam_route.rntl.test.tsx`

### Step 1: Write route orchestration tests

Assert the state machine:

`preparing -> ready -> countdown -> active -> finishing -> result -> rewardPending/rewardGranted`.

Test:

- English A1-B2 uses blueprint v2; gated French still delegates to `french_exam_remote_runtime` unchanged;
- route focus restores an active unexpired attempt;
- returning after deadline takes the idempotent timeout finish path;
- start awaits one successful 5-energy transaction before snapshot/countdown;
- manual submit and timeout cannot both record progress;
- completion calls the existing best-pct overlay, medal, achievement, mistake, pass-count, next-level unlock, and `registerXP('exam_complete')` seams exactly once;
- progress event ID is the persisted `finishToken`, and payload includes `score`, `total: 30`, `pct`, `passed`, `level`, `studyTarget`, `blueprintVersion`, and seed/task IDs needed for audit;
- closing during countdown/active exam uses a confirmation action and never leaves an in-memory-only attempt;
- result reload reconstructs from completed local result without replaying sounds/rewards.

### Step 2: Implement the route reducer/effects

Keep the route thin:

- access/target/readiness checks;
- load or construct blueprint;
- spend energy and create attempt;
- drive countdown and active task index;
- persist every answer;
- derive remaining time from wall-clock deadline with an `AppState`/focus refresh;
- funnel every finish trigger through one `finishOnce(finishToken, reason)` guard;
- call `scoreLevelExam` and existing progress side effects;
- render the result and reward status.

Do not copy task rendering or scoring logic back into the route.

### Step 3: Remove the legacy pool only after parity is green

Delete `LEVEL_QUESTIONS`, legacy single-cloze renderer, and obsolete inline styles/imports. Preserve the user's three `BouncyScrollView` `decelerationRate="normal"` settings wherever those scroll surfaces remain, or carry the same value into their replacement scroll views.

### Step 4: Run focused route/regression tests

```powershell
npx jest --runTestsByPath tests/level_exam_runtime_contract.test.ts tests/level_exam_locale_runtime.test.ts tests/gustav_french_exam_target_gate.test.ts tests/exam_best_pct_sync_contract.test.ts tests/level_exam_ambiguous_prompt_contract.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/rntl/level_exam_route.rntl.test.tsx --no-cache --runInBand
```

## Task 11: Audit themes, motion, audio, and accessibility as contracts

**Files:**

- Create: `tests/level_exam_theme_contract.test.ts`
- Modify: `tests/sound_event_call_sites_contract.test.ts`
- Modify: `tests/sound_motion_contract.test.ts`
- Modify: `tests/accordion_motion_accessibility_contract.test.ts` only if the shared accessibility scanner is reused
- Modify: exam component files only for failures found here

### Step 1: Add static and runtime theme checks

For every exam component:

- reject hex/rgb/hsl literals and decorative borders;
- require theme-token use for background, text, accent, correct, wrong, warning, and reward states;
- render representative light/dark/shipped themes and compute contrast for body text, secondary labels, CTA text, answers, timer warnings, correct and wrong feedback;
- snapshot stable geometry at the supported font-scale cap.

### Step 2: Add motion/audio guards

Assert:

- only `pm.exam.begin`, existing correct/error events, `pm.complete.exam_pass`, and `pm.complete.exam_retry` are requested;
- begin/pass/retry have one call site and dedupe key per attempt/result;
- every animation is finite, lifecycle-gated, and has a reduced-motion branch;
- no `runOnJS` is added; Worklet-to-RN uses `scheduleOnRN`;
- no infinite loop, unbounded timer, or per-frame React state update exists.

### Step 3: Run gates

```powershell
npx jest --runTestsByPath tests/level_exam_theme_contract.test.ts tests/sound_event_call_sites_contract.test.ts tests/sound_motion_contract.test.ts --no-cache --runInBand
npx eslint app/level_exam.tsx app/level_exam_*.ts components/level-exam/*.tsx components/level-exam/*.ts
npx tsc --noEmit
```

Fix only exam-related failures. Record unrelated pre-existing failures separately.

## Task 12: Verify content, runtime, and Android journeys before completion

**Files:**

- Create: `.maestro/level-exam/pass.yaml`
- Create: `.maestro/level-exam/retry.yaml`
- Create: `.maestro/level-exam/timeout-resume.yaml`
- Create: `.maestro/level-exam/theme-switch.yaml`
- Create/update: `docs/reports/level_exam_rebuild_verification_2026-08-08.md`

### Step 1: Run the complete focused test set

```powershell
npx jest --runTestsByPath tests/level_exam_blueprint.test.ts tests/level_exam_attempt_state.test.ts tests/level_exam_scoring.test.ts tests/level_exam_runtime_contract.test.ts tests/level_exam_theme_contract.test.ts tests/level_exam_locale_runtime.test.ts tests/level_exam_ambiguous_prompt_contract.test.ts tests/exam_best_pct_sync_contract.test.ts tests/level_reward_spins_client.test.ts tests/level_exam_reward_status.test.ts tests/progress_events_client_queue.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/rntl/level_exam_intro.rntl.test.tsx tests/rntl/level_exam_tasks.rntl.test.tsx tests/rntl/level_exam_result.rntl.test.tsx tests/rntl/level_exam_route.rntl.test.tsx --no-cache --runInBand
npm --prefix functions test -- --runTestsByPath src/level_reward_spins.test.ts src/progress_events.test.ts src/level_reward_spins_deploy_contract.test.ts --no-cache --runInBand
```

### Step 2: Run repository-level safety gates

```powershell
npx tsc --noEmit
npm run boundary
npm test
```

Do not declare completion if a required focused gate fails. If the full suite has unrelated failures, rerun the exact failing tests against the pre-change baseline or document decisive evidence that they are pre-existing.

### Step 3: Install and run Android journeys

```powershell
npm run android:install-debug-all
maestro test .maestro/level-exam/pass.yaml
maestro test .maestro/level-exam/retry.yaml
maestro test .maestro/level-exam/timeout-resume.yaml
maestro test .maestro/level-exam/theme-switch.yaml
```

Capture screenshots for:

- intro in at least one light and one dark active theme;
- countdown;
- each of five formats;
- timer warning;
- pass with granted reward;
- offline pending reward;
- retry with weak lessons;
- resumed timeout result.

### Step 4: Review implementation against the approved design

Run the required code-review and verification skills. For reward/security diffs, obtain a fresh critical-domain review. Resolve all P0/P1 and any acceptance-criterion violation; do not self-approve an economy mutation.

### Step 5: Write the verification report

Record:

- exact commands and exit codes;
- content counts per level/locale and format;
- lesson coverage min/max;
- deterministic seed samples;
- theme/contrast results;
- Android journey outcomes and screenshot paths;
- reward idempotency evidence;
- any explicitly out-of-scope or pre-existing failures.

### Step 6: Final commit decision

Only after all gates pass, inspect staged scope. Commit task-owned tracked files in logical increments. Do not stage unrelated dirty files; if related reward files cannot be separated from pre-existing untracked work, leave them uncommitted and list them in the handoff.

## Definition of done

- A1-B2 each contain exactly 30 lesson-grounded score units in the approved 8/8/6/4/4 mix.
- Every lesson in the immediately preceding range appears at least twice; no future lesson appears.
- Start spends exactly 5 energy once, runs the finite begin sequence, and starts a persisted wall-clock deadline.
- Active attempts survive backgrounding/relaunch and finish once on timeout.
- Pass/retry screens are useful, animated, sounded, accessible, and fully driven by the active theme.
- Results preserve best score, medal, XP, achievements, mistakes, pass count, and next-level unlock.
- First pass per English level mints one server-authoritative spin credit; replays and concurrent devices cannot farm another; offline confirmation is honest.
- French remote exams and unrelated product surfaces remain unchanged.
- Focused unit, RNTL, functions, type, boundary, full-suite, and Android journey gates have recorded passing evidence.
