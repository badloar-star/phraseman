# Lesson Intro Final Check Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Add a three-question yes/no comprehension check to every ordinary English lesson intro (lessons 1–32), record exactly one first attempt per account and lesson, and create an idempotent pending `+1 spin` award only when all three answers are correct on that first attempt.

**Architecture:** Keep the check catalog and validation contract in a pure shared TypeScript module used by both the app and Cloud Functions. The app owns progressive question UI, immediate local feedback, offline outbox, and the reusable reward plaque. A dedicated callable owns canonical grading and the immutable first-attempt ledger. A perfect first attempt creates an intro-owned pending award document, but this plan deliberately does not touch the Spin engine; the feature flag remains off until the Spin owner exposes and verifies a durable delivery seam.

**Tech Stack:** Expo / React Native, TypeScript, React Native Animated, AsyncStorage, React Native Firebase callable functions, Firebase Admin / Firestore transactions, Jest, React Native Testing Library.

---

## Non-negotiable ownership boundary

- Work only in `C:\appsprojects\phraseman` on `feature/referral-roulette`.
- Preserve the existing dirty worktree. Stage and commit only files listed in the current task.
- Do not edit or import from:
  - `functions/src/level_reward_spins.ts`
  - `functions/src/level_reward_spins.test.ts`
  - `app/level_reward_spins_client.ts`
  - progress/auth/friend Spin contracts
  - `rewardForSpin`, Spin claim, acknowledge, result, or delivery logic
- The common visual component is `components/SpinRewardPlaque.tsx`. Level-up and intro flows must reuse it rather than create similar plaques.
- `lesson_intro_final_check_enabled` defaults to `false` on both client and server. Do not enable it in Firestore, admin, EAS, or a release until the separate Spin delivery handoff is complete.
- Never show `+1 спин`, play `pm.reward.small`, or run the reward animation for a merely pending award. Presentation requires a durable delivery receipt.

## User-visible contract

- Ordinary lesson intro only; `app/personal_plan_theory.tsx` stays unchanged and receives no final check.
- Three yes/no questions, one at a time.
- Correct answer: lock the choice and advance after about 450 ms.
- Wrong answer: show only localized `Неправильно`, the correct answer, a concise explanation, and a continue action. Do not mention losing or not receiving a spin.
- All three correct on the first recorded attempt: create one pending award for that lesson.
- Any wrong first answer permanently makes that lesson attempt non-rewarding, including after app restart or reinstall.
- After confirmed delivery: play one short appearance sound, show `+1 спин`, fly the plaque upward, then start the lesson at about 1.5 seconds.
- If server confirmation is not available within 1.2 seconds, start the lesson without blocking. A later delivery may be presented only on a separately approved safe surface.

## Task 1: Establish the shared catalog contract and coverage gate

**Files:**

- Create: `shared/lesson_intro_final_check_contract.ts`
- Create: `shared/lesson_intro_final_checks_01_08.ts`
- Create: `shared/lesson_intro_final_checks_09_16.ts`
- Create: `shared/lesson_intro_final_checks_17_24.ts`
- Create: `shared/lesson_intro_final_checks_25_32.ts`
- Create: `shared/lesson_intro_final_checks.ts`
- Create: `tests/lesson_intro_final_check_catalog.test.ts`

- [ ] **Step 1: Write the failing catalog contract test**

The test must assert:

1. `getLessonIntroFinalCheck(lessonId, 'en')` exists for every lesson 1–32.
2. Each check has exactly three questions.
3. Every `checkId`, question `id`, and `(studyTarget, lessonId)` key is unique.
4. `contentVersion` is a positive integer.
5. Every question has `kind: 'yes_no'`, a boolean answer, non-empty prompt, statement, and explanation in all eight UI locales.
6. Each lesson has at least one `true` and one `false` answer so position guessing is not rewarded.
7. Text contains none of `TODO`, `TBD`, `undefined`, `null`, or spin-loss language.
8. Unsupported target/lesson combinations return `null`.

Use this exact public shape:

```ts
export const INTRO_CHECK_LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type IntroCheckLocale = typeof INTRO_CHECK_LOCALES[number];
export type LessonIntroCheckStudyTarget = 'en';
export type IntroCheckText = Readonly<Record<IntroCheckLocale, string>>;

export type LessonIntroFinalCheckQuestion = Readonly<{
  id: string;
  kind: 'yes_no';
  prompt: IntroCheckText;
  statement: string;
  correct: boolean;
  explanation: IntroCheckText;
}>;

export type LessonIntroFinalCheck = Readonly<{
  checkId: string;
  contentVersion: number;
  studyTarget: LessonIntroCheckStudyTarget;
  lessonId: number;
  questions: readonly [
    LessonIntroFinalCheckQuestion,
    LessonIntroFinalCheckQuestion,
    LessonIntroFinalCheckQuestion,
  ];
}>;
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_catalog.test.ts --no-cache --runInBand
```

Expected: FAIL because the shared catalog does not exist.

- [ ] **Step 3: Implement the pure contract and catalog getter**

Use stable keys:

```ts
export function lessonIntroCheckKey(studyTarget: LessonIntroCheckStudyTarget, lessonId: number): string {
  return `${studyTarget}:${lessonId}`;
}

export function getLessonIntroFinalCheck(
  lessonId: number,
  studyTarget: string,
): LessonIntroFinalCheck | null {
  if (studyTarget !== 'en' || !Number.isInteger(lessonId)) return null;
  return CHECKS_BY_KEY[lessonIntroCheckKey('en', lessonId)] ?? null;
}
```

For lesson 1, use concrete facts already visible in its intro, for example:

```ts
{
  id: 'en_l01_q1_am_with_i',
  kind: 'yes_no',
  prompt: {
    ru: 'С I используется am?',
    uk: 'З I використовується am?',
    es: '¿Se usa am con I?',
    'pt-BR': 'Usamos am com I?',
    vi: 'I đi với am phải không?',
    id: 'Apakah I memakai am?',
    tr: 'I ile am kullanılır mı?',
    pl: 'Czy z I używamy am?',
  },
  statement: 'I am ready.',
  correct: true,
  explanation: {
    ru: 'С местоимением I используем форму am: I am ready.',
    uk: 'Із займенником I використовуємо форму am: I am ready.',
    es: 'Con el pronombre I usamos am: I am ready.',
    'pt-BR': 'Com o pronome I usamos am: I am ready.',
    vi: 'Với đại từ I, dùng am: I am ready.',
    id: 'Dengan kata ganti I, gunakan am: I am ready.',
    tr: 'I zamiriyle am kullanılır: I am ready.',
    pl: 'Z zaimkiem I używamy am: I am ready.',
  },
}
```

- [ ] **Step 4: Author all 96 concrete questions**

For each lesson, select three facts that are explicitly present in that lesson's existing intro screens. Keep the question answerable without inference beyond the intro. Explanations are one or two sentences. Do not introduce later-lesson grammar.

Batch ownership is fixed:

- `01_08`: lessons 1–8
- `09_16`: lessons 9–16
- `17_24`: lessons 17–24
- `25_32`: lessons 25–32

Every batch exports a readonly array; the aggregator builds one map and throws in development/tests on duplicate keys.

- [ ] **Step 5: Run catalog and existing intro content tests**

Run:

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_catalog.test.ts tests/lesson_intro_screens_locale.test.ts tests/lesson_1_intro_screen_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit only the catalog slice**

```powershell
git add shared/lesson_intro_final_check_contract.ts shared/lesson_intro_final_checks_01_08.ts shared/lesson_intro_final_checks_09_16.ts shared/lesson_intro_final_checks_17_24.ts shared/lesson_intro_final_checks_25_32.ts shared/lesson_intro_final_checks.ts tests/lesson_intro_final_check_catalog.test.ts
git diff --cached --name-only
git commit -m "feat: add lesson intro final check catalog"
```

## Task 2: Add an immutable server-side first-attempt ledger

**Files:**

- Create: `functions/src/lesson_intro_final_check.ts`
- Create: `functions/src/lesson_intro_final_check.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Write failing callable tests**

Cover all of these cases:

- unauthenticated request → `unauthenticated`;
- server flag false/missing → `failed-precondition` with stable code `lesson_intro_check_disabled`;
- malformed target, lesson, version, question IDs, or answer count → `invalid-argument`;
- canonical identity comes from `request.auth.uid` via `resolveStableUidForAuth(..., { requireKnownIdentity: true, repairLinks: false })`;
- all three canonical answers correct → one immutable attempt and one pending award;
- any wrong answer → one immutable non-perfect attempt and no award;
- replaying a wrong attempt with correct answers returns the original result and still creates no award;
- replaying a perfect attempt returns the same `awardId` and creates no duplicate;
- two concurrent perfect submissions converge to one attempt and one award;
- a content-version bump does not reset an already recorded lesson attempt;
- the source never reads or writes `level_spin_credits`, `level_spin_results`, reward balance fields, `rewardForSpin`, or any Spin claim/delivery callable.

- [ ] **Step 2: Run the function test and confirm RED**

```powershell
npm --prefix functions test -- --runTestsByPath src/lesson_intro_final_check.test.ts --no-cache --runInBand
```

Expected: FAIL because the callable does not exist.

- [ ] **Step 3: Implement strict request normalization**

Use this request/response contract:

```ts
type SubmitLessonIntroFinalCheckRequest = {
  stableId?: string;
  checkId: string;
  contentVersion: number;
  studyTarget: 'en';
  lessonId: number;
  answers: readonly [
    { questionId: string; answer: boolean },
    { questionId: string; answer: boolean },
    { questionId: string; answer: boolean },
  ];
};

type SubmitLessonIntroFinalCheckResponse = {
  status: 'recorded' | 'already_recorded';
  attemptId: string;
  allCorrect: boolean;
  results: readonly { questionId: string; correct: boolean; correctAnswer: boolean }[];
  award: null | {
    awardId: string;
    status: 'pending' | 'delivered';
    spinCreditId: string | null;
  };
};
```

Canonical IDs:

```ts
const attemptId = `${studyTarget}__lesson_${lessonId}`;
const awardId = `intro_spin_v1_${studyTarget}_${lessonId}`;
```

- [ ] **Step 4: Implement the Firestore transaction**

Paths:

```text
users/{stableUid}/lesson_intro_check_attempts/{studyTarget}__lesson_{lessonId}
users/{stableUid}/lesson_intro_spin_awards/intro_spin_v1_{studyTarget}_{lessonId}
```

Attempt fields:

```ts
{
  schemaVersion: 1,
  attemptId,
  stableUid,
  checkId,
  contentVersion,
  studyTarget,
  lessonId,
  answers,
  results,
  allCorrect,
  awardId: allCorrect ? awardId : null,
  firstAttemptAt: FieldValue.serverTimestamp(),
}
```

Pending award fields:

```ts
{
  schemaVersion: 1,
  awardId,
  stableUid,
  source: 'lesson_intro_final_check',
  studyTarget,
  lessonId,
  checkId,
  contentVersion,
  amount: 1,
  status: 'pending',
  spinCreditId: null,
  deliveryAttempts: 0,
  createdAt: FieldValue.serverTimestamp(),
  deliveredAt: null,
}
```

Transaction order:

1. Resolve the canonical check from the shared catalog.
2. Read the attempt document.
3. If it exists, return its stored result without changing anything; for a perfect attempt, also read the referenced award document and return its current `pending`/`delivered` status.
4. Grade the supplied answers against canonical order and booleans.
5. Create the attempt.
6. Only if perfect, create the pending award with `tx.create` semantics.
7. Return `pending`; do not mutate Spin state.

- [ ] **Step 5: Export the callable**

Add `submitLessonIntroFinalCheck` to `functions/src/index.ts`, using `HOT_CALLABLE_OPTIONS` and `resolveRemoteBool(db, 'lesson_intro_final_check_enabled', false)`.

- [ ] **Step 6: Record Jarvis non-consumption explicitly**

Add a guard parallel to the existing level-reward Spin guard: the writer must contain the two new subcollection names, while production files under `functions/src/jarvis/` must not read them until a metric is approved. Do not add a new Jarvis metric in this feature.

- [ ] **Step 7: Run focused server tests and build**

```powershell
npm --prefix functions test -- --runTestsByPath src/lesson_intro_final_check.test.ts src/jarvis/jarvis_data_contract_guard.test.ts --no-cache --runInBand
npm --prefix functions run build
```

Expected: both commands PASS.

- [ ] **Step 8: Commit only the server slice**

```powershell
git add functions/src/lesson_intro_final_check.ts functions/src/lesson_intro_final_check.test.ts functions/src/index.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
git diff --cached --name-only
git commit -m "feat: record lesson intro first attempts"
```

## Task 3: Deny direct client access to the new ledgers

**Files:**

- Modify: `firestore.rules`
- Create: `tests/lesson_intro_final_check_security_contract.test.ts`
- Modify: `tests/firestore_rules_security.test.ts`

- [ ] **Step 1: Write the failing rules contract**

Assert explicit deny-all rules for both subcollections and include emulator coverage for owner and non-owner reads/writes.

```text
match /lesson_intro_check_attempts/{attemptId} {
  allow read, write: if false;
}
match /lesson_intro_spin_awards/{awardId} {
  allow read, write: if false;
}
```

The callable uses Admin SDK and remains the only writer.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_security_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 3: Add the two explicit rules inside `match /users/{uid}`**

Keep them next to the existing server-owned reward subcollections. Do not loosen any surrounding rule.

- [ ] **Step 4: Verify recursive account deletion**

`functions/src/account_delete.ts` already calls `db.recursiveDelete` for the user document tree. Add an assertion to the security contract that both new collections live under `users/{stableUid}`; do not modify account deletion code.

- [ ] **Step 5: Run focused rules tests**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_security_contract.test.ts tests/firestore_rules_security.test.ts --no-cache --runInBand
```

- [ ] **Step 6: Commit only rules and tests**

```powershell
git add firestore.rules tests/lesson_intro_final_check_security_contract.test.ts tests/firestore_rules_security.test.ts
git diff --cached --name-only
git commit -m "security: protect lesson intro reward ledgers"
```

## Task 4: Build the account-scoped client outbox

**Files:**

- Create: `app/lesson_intro_final_check_client.ts`
- Create: `tests/lesson_intro_final_check_client.test.ts`

- [ ] **Step 1: Write failing pure client tests**

Cover:

- exactly one outbox item per stable account + study target + lesson;
- immutable first submitted answers;
- stable storage key includes the value from `getStableId()`;
- account change cannot read or flush the previous account's queue;
- JSON corruption resets only this queue;
- duplicate enqueue is idempotent;
- callable timeout returns `deferred`, never an infinite spinner;
- `pending` award is never converted into a presentation event;
- only `award.status === 'delivered'` with non-empty `spinCreditId` creates a presentation receipt;
- successful flush removes the outbox item but preserves an unconsumed delivery receipt.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_client.test.ts --no-cache --runInBand
```

- [ ] **Step 3: Implement dependency-injected storage and callable adapters**

Use this storage namespace:

```ts
const storageKey = (stableId: string) =>
  `@phraseman/lesson-intro-final-check/v1/${stableId}`;
```

The production adapter uses `getStableId()`, `ensureAnonUser()`, `getFunctions(getApp(), 'us-central1')`, and `httpsCallable('submitLessonIntroFinalCheck')`.

Expose:

```ts
export async function enqueueLessonIntroFirstAttempt(input: FirstAttemptInput): Promise<OutboxItem>;
export async function submitLessonIntroFirstAttemptNow(input: FirstAttemptInput): Promise<SubmitOutcome>;
export async function flushLessonIntroFinalCheckOutbox(): Promise<FlushOutcome>;
export async function consumeLessonIntroSpinPresentationReceipt(): Promise<DeliveredReceipt | null>;
```

`submitLessonIntroFirstAttemptNow` races the callable against a 1200 ms UI deadline. The network request may continue and update storage, but the lesson starts when the UI deadline wins.

- [ ] **Step 4: Run GREEN**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_client.test.ts --no-cache --runInBand
```

- [ ] **Step 5: Commit**

```powershell
git add app/lesson_intro_final_check_client.ts tests/lesson_intro_final_check_client.test.ts
git diff --cached --name-only
git commit -m "feat: queue lesson intro first attempts"
```

## Task 5: Build the reusable reward plaque and final-check state machine

**Files:**

- Create: `components/SpinRewardPlaque.tsx`
- Create: `components/LessonIntroFinalCheck.tsx`
- Create: `app/lesson_intro_final_check_state.ts`
- Create: `tests/lesson_intro_final_check_state.test.ts`
- Create: `tests/lesson_intro_final_check_ui.test.tsx`
- Modify: `tests/sound_event_call_sites_contract.test.ts`

- [ ] **Step 1: Write failing reducer tests**

Model these phases:

```ts
type Phase =
  | { kind: 'question'; index: 0 | 1 | 2; answers: AnswerRecord[]; firstAttemptPerfect: boolean }
  | { kind: 'wrong_feedback'; index: 0 | 1 | 2; answers: AnswerRecord[]; firstAttemptPerfect: false }
  | { kind: 'submitting'; answers: readonly [AnswerRecord, AnswerRecord, AnswerRecord] }
  | { kind: 'ready_without_reward' }
  | { kind: 'reward_delivered'; receiptId: string }
  | { kind: 'complete' };
```

Assert that a wrong answer can never transition back to perfect, reopening feedback does not alter the recorded answer, and only a delivered receipt reaches `reward_delivered`.

- [ ] **Step 2: Write failing RNTL UI tests**

Verify:

- one question and two 44×44-minimum yes/no controls are visible at a time;
- choices expose accessible roles, localized labels, and selected/disabled state;
- wrong feedback contains the localized incorrect label, correct answer, explanation, and no spin-loss copy;
- every completed three-answer tuple calls submit once, including a tuple containing a wrong answer;
- any wrong answer permanently keeps `firstAttemptPerfect: false` and ends at the ordinary Start CTA after the immutable attempt has been queued;
- pending/deferred submission starts the lesson without rendering `+1 спин`;
- delivered receipt renders the plaque exactly once and completes after the injected timer;
- reduced motion skips movement but preserves the 1.5-second semantic completion and sound policy.

- [ ] **Step 3: Implement `SpinRewardPlaque` as the single visual standard**

Public export:

```ts
export type SpinRewardPlaqueProps = {
  amount: 1;
  receiptId: string;
  visible: boolean;
  onComplete: () => void;
  autoCompleteMs?: number;
  testID?: string;
};

export function SpinRewardPlaque(props: SpinRewardPlaqueProps): React.ReactElement | null;
```

Choreography:

- enter: 220 ms scale `0.92 → 1` and opacity `0 → 1`;
- hold: 650 ms;
- exit: 450 ms opacity `1 → 0`, translateY `0 → -72`;
- complete at 1500 ms total, leaving a small buffer after exit;
- use `useReduceMotion()`; reduced motion uses opacity only;
- when `visible` becomes true for a new `receiptId`, request `pm.reward.small` once with scope `spin-reward-plaque` and `dedupeKey: receiptId`;
- use a real Ionicons/vector icon, not emoji;
- use dark foreground on bright lime/green fills.

The component must not know about intro lessons, LevelUp, Firestore, or Spin balances.

- [ ] **Step 4: Implement `LessonIntroFinalCheckPanel`**

The component receives localized content and callbacks; it does not call Firebase directly.

```ts
type LessonIntroFinalCheckPanelProps = {
  check: LessonIntroFinalCheck;
  locale: IntroCheckLocale;
  onSubmit: (answers: FirstAttemptAnswers) => Promise<SubmitOutcome>;
  onStartLesson: () => void;
};

export function LessonIntroFinalCheckPanel(
  props: LessonIntroFinalCheckPanelProps,
): React.ReactElement;
```

Use `DuoPressable`/`TapScale`, theme tokens, `triLang`-equivalent localized copy, visible focus/pressed/disabled states, and no modal overlay. The check replaces the existing final footer CTA; it does not cover intro content.

- [ ] **Step 5: Run state/UI/sound tests**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_state.test.ts tests/lesson_intro_final_check_ui.test.tsx tests/sound_event_call_sites_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 6: Commit**

```powershell
git add components/SpinRewardPlaque.tsx components/LessonIntroFinalCheck.tsx app/lesson_intro_final_check_state.ts tests/lesson_intro_final_check_state.test.ts tests/lesson_intro_final_check_ui.test.tsx tests/sound_event_call_sites_contract.test.ts
git diff --cached --name-only
git commit -m "feat: add intro check and shared spin plaque"
```

## Task 6: Wire the check only into ordinary lesson intros

**Files:**

- Modify: `app/lesson_intro_screens.tsx`
- Modify: `app/lesson1.tsx`
- Modify: `tests/lesson_intro_single_gate_contract.test.ts`
- Create: `tests/lesson_intro_final_check_integration.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Assert:

- `LessonIntroScreens` accepts an optional `finalCheck` and `onFinalCheckSubmit`;
- after the final intro card reveals, a supplied check replaces `startCta`;
- without a supplied check, existing intro behavior is byte-for-behavior unchanged;
- `app/lesson1.tsx` supplies the check only when the remote flag is enabled and the ordinary lesson has intro screens;
- `app/personal_plan_theory.tsx` does not pass a check and remains unmodified;
- Back works during the check;
- `onComplete` fires once across timer, retry, and unmount races.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_integration.test.tsx tests/lesson_intro_single_gate_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 3: Extend `LessonIntroScreensProps` without changing existing callers**

```ts
interface LessonIntroScreensProps {
  introScreens: LessonIntroScreen[];
  lessonId: number;
  onComplete: () => void;
  onBack?: () => void;
  finalCheck?: LessonIntroFinalCheck | null;
  onFinalCheckSubmit?: (answers: FirstAttemptAnswers) => Promise<SubmitOutcome>;
}
```

Preserve the user's existing `decelerationRate="normal"` change.

- [ ] **Step 4: Wire `app/lesson1.tsx`**

Resolve:

```ts
const finalCheck = isLessonIntroFinalCheckEnabled()
  ? getLessonIntroFinalCheck(lessonId, studyTarget)
  : null;
```

Pass it only to the ordinary `LessonIntroScreens` branch. Use the client outbox adapter for `onFinalCheckSubmit`. Keep the personal-plan theory branch untouched.

- [ ] **Step 5: Run integration and regression tests**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_integration.test.tsx tests/lesson_intro_single_gate_contract.test.ts tests/lesson_intro_screens_locale.test.ts tests/lesson_1_intro_screen_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 6: Commit**

```powershell
git add app/lesson_intro_screens.tsx app/lesson1.tsx tests/lesson_intro_single_gate_contract.test.ts tests/lesson_intro_final_check_integration.test.tsx
git diff --cached --name-only
git commit -m "feat: gate ordinary lessons with intro check"
```

## Task 7: Add the disabled-by-default remote flag and live-admin control

**Files:**

- Modify: `app/remote_flags.ts`
- Modify: `tests/remote_flags.test.ts`
- Modify: `admin/v2/legacy.html`
- Create: `tests/admin_lesson_intro_final_check_contract.test.ts`

- [ ] **Step 1: Write failing client flag tests**

Assert `lesson_intro_final_check_enabled` is a `RemoteBoolKey`, defaults false, accepts a Firestore bool override, and is exposed through:

```ts
export const isLessonIntroFinalCheckEnabled = () =>
  getRemoteBool('lesson_intro_final_check_enabled');
```

- [ ] **Step 2: Write failing admin contract test**

The test must assert all three live-admin registrations:

1. the visible toggle row near other lesson behavior flags;
2. the control-panel bool registry near line 27021;
3. the feature-flag metadata registry near line 27819.

Human-facing copy:

- Name: `Проверка перед обычным уроком`
- Description: `3 коротких вопроса после интро. Включать только после готовности доставки +1 спина.`
- Tooltip: `Включить финальную проверку во всех обычных уроках; личный план не затрагивается`
- Default: off

Use the admin's existing icon system if available; do not add a new emoji icon. Keep a visible text label, keyboard-operable checkbox, tooltip, disabled/loading state, and existing save feedback.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runTestsByPath tests/remote_flags.test.ts tests/admin_lesson_intro_final_check_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 4: Implement client flag and the three admin registrations**

Do not add a new admin page or callable. Reuse `saveControlPanelBool` and the current `remote_config/app.bools` write path. Do not enable the checkbox value in production.

- [ ] **Step 5: Run focused admin safety gates**

```powershell
node scripts/admin-legacy-button-audit.mjs
node scripts/admin-v2-language-audit.mjs
npx jest --runTestsByPath tests/remote_flags.test.ts tests/admin_lesson_intro_final_check_contract.test.ts tests/admin_single_surface_contract.test.ts --no-cache --runInBand
```

Expected: PASS, with no write-path or frozen-surface violations.

- [ ] **Step 6: Commit**

```powershell
git add app/remote_flags.ts tests/remote_flags.test.ts admin/v2/legacy.html tests/admin_lesson_intro_final_check_contract.test.ts
git diff --cached --name-only
git commit -m "feat: add intro check release flag"
```

## Task 8: Add boundary and release-readiness gates

**Files:**

- Create: `tests/lesson_intro_final_check_boundary_contract.test.ts`
- Verify: `docs/superpowers/plans/2026-08-08-lesson-intro-final-check-spin-handoff-checklist.md`

- [ ] **Step 1: Add a source boundary test**

It must fail if the core implementation:

- imports `level_reward_spins` or `level_reward_spins_client`;
- contains `rewardForSpin`, `levelRewardSpinClaim`, `levelRewardSpinDelivery`, or writes a Spin balance;
- shows `+1 спин` from a `pending` response;
- passes a final check from `app/personal_plan_theory.tsx`;
- changes the remote flag default away from false.

- [ ] **Step 2: Verify the Spin handoff checklist remains accurate**

The checklist is not an implementation plan and contains no speculative adapter code. It requires the Spin owner to provide all of:

1. a committed callable/domain seam that accepts `{ stableUid, awardId, source, studyTarget, lessonId, amount }`;
2. idempotent result semantics for duplicate `awardId`;
3. a durable `spinCreditId` or equivalent receipt;
4. a no-double-credit concurrency test;
5. an explicit confirmation that intro may consume the seam;
6. exact deployment and rollback commands.

Only after these are concrete should a separate Spin integration implementation plan be written. Do not replace the checklist with speculative adapter code.

- [ ] **Step 3: Run the boundary test**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_boundary_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 4: Commit**

```powershell
git add tests/lesson_intro_final_check_boundary_contract.test.ts
git diff --cached --name-only
git commit -m "test: guard intro check spin boundary"
```

## Task 9: Full verification without enabling or deploying

- [ ] **Step 1: Verify canonical workspace and staged scope**

```powershell
Get-Location
git branch --show-current
git status --short
git diff --cached --name-only
```

Expected: canonical path/branch, no unintended staged files.

- [ ] **Step 2: Run all focused client tests**

```powershell
npx jest --runTestsByPath tests/lesson_intro_final_check_catalog.test.ts tests/lesson_intro_final_check_client.test.ts tests/lesson_intro_final_check_state.test.ts tests/lesson_intro_final_check_ui.test.tsx tests/lesson_intro_final_check_integration.test.tsx tests/lesson_intro_final_check_security_contract.test.ts tests/lesson_intro_final_check_boundary_contract.test.ts tests/lesson_intro_single_gate_contract.test.ts tests/lesson_intro_screens_locale.test.ts tests/lesson_1_intro_screen_contract.test.ts tests/remote_flags.test.ts tests/admin_lesson_intro_final_check_contract.test.ts --no-cache --runInBand
```

Expected: PASS, zero failed tests.

- [ ] **Step 3: Run focused server tests**

```powershell
npm --prefix functions test -- --runTestsByPath src/lesson_intro_final_check.test.ts src/jarvis/jarvis_data_contract_guard.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 4: Run type and build gates**

```powershell
npx tsc --noEmit --pretty false
npm --prefix functions run build
```

Expected: both exit 0.

- [ ] **Step 5: Run repository boundary gates**

```powershell
npm run boundary
node scripts/canonical_workspace_guard.mjs
```

Expected: PASS.

- [ ] **Step 6: Verify the release flag is still off**

Read-only checks must confirm:

- client default is false;
- server fallback is false;
- this implementation did not write `remote_config/app.bools`;
- no Firebase deploy or EAS update was run.

- [ ] **Step 7: Manual QA in dev only**

Using dependency injection or an existing dev-only preview surface, verify:

1. three correct answers with a fake delivered receipt show one sound/plaque and auto-start;
2. one wrong answer shows only correction/explanation and normal Start CTA;
3. pending/deferred response starts without plaque;
4. reopen does not reset the first local attempt;
5. personal-plan theory remains unchanged;
6. reduced-motion mode removes flight motion;
7. screen reader announces question progress and answer state;
8. light/dark themes and 375/768 widths have no overlap.

Do not point the preview at production Firestore and do not enable the production flag.

## Acceptance criteria

- Lessons 1–32 have three concrete, localized yes/no checks grounded in their own intro text.
- The first attempt is immutable and server authoritative per canonical account, target, and lesson.
- A perfect first attempt creates exactly one intro-owned pending award; a wrong attempt can never later earn it.
- No existing Spin engine, claim, delivery, progress, auth, or friend contract is changed.
- Pending rewards never produce sound, plaque, or `+1 спин` copy.
- The shared plaque is reusable by both intro and LevelUp without business-logic coupling.
- Personal-plan theory is unchanged.
- Feature flag defaults/fallbacks to false and remains disabled.
- Focused tests, TypeScript, Functions build, and repository boundary gates pass with fresh evidence.
- No deploy is performed by this plan.
