# Lesson Intro Final Check and Spin Reward Design

**Date:** 2026-08-08
**Status:** Awaiting written-spec review
**Scope:** Ordinary core lessons only; personal-plan theory is explicitly excluded

## Summary

Every ordinary lesson intro ends with a three-question binary comprehension check before the lesson begins. The learner must answer all three questions correctly on the first attempt to earn one spin. A wrong answer never blocks or penalizes the lesson: the UI shows only `Неправильно`, the correct answer, and a short explanation. It does not display copy such as “спина не будет”.

For a perfect `3/3`, the server creates one idempotent intro-spin award and delivers it through a dedicated Spin-owned integration seam after the current Spin work is stabilized. The client plays a short reward sound, shows an animated `+1 спин` plaque, sends the spin icon upward, and starts the lesson automatically about 1.5 seconds later. The reward is available once per ordinary lesson per study target.

## Goals

- Verify that the learner paid attention to the lesson intro.
- Keep the check lightweight: exactly three yes/no questions with no typing and no complex interaction.
- Reward only `3/3` first answers with one valuable spin.
- Preserve access to the lesson regardless of the result.
- Prevent replay, reinstall, retries, duplicate taps, or concurrent devices from granting a second spin.
- Reuse the current spin balance and spin experience through an isolated seam without modifying unstable level-up Spin internals in the intro task.
- Keep the check usable offline and never block lesson entry on an unbounded network wait.

## Non-goals

- No check in personal-plan theory, even though it reuses `LessonIntroScreens`.
- No XP, energy, shards, penalties, lives, streak changes, or lesson-score effects.
- No runtime AI generation of questions or explanations.
- No more than two answer choices and no free-text answers in v1.
- No reward reset when question wording or content versions change.
- No redesign of the lesson intro cards outside the final-check integration.

## Owner Decisions

- Every eligible intro has exactly three questions.
- A spin requires all three first answers to be correct.
- One wrong first answer permanently removes reward eligibility for that lesson, but does not affect lesson access.
- The learner still completes the remaining questions after an error.
- The UI never announces that the learner lost a spin.
- The reward is exactly one spin, not a randomized pre-spin reward.
- The successful path ends with sound, an animated `+1 спин` plaque, upward icon flight, and automatic lesson start.
- Reward eligibility is once per lesson per study target.

## User Experience

### Entry

`LessonIntroScreens` keeps its current progressive intro-card flow. When the final intro card is revealed, the existing `Начать тренировку` CTA is replaced by the final-check card for ordinary lessons that supply a valid check definition.

The check uses three fixed progress segments and a label such as `Проверим главное · 1 из 3`. It presents one yes/no statement at a time. The check remains within the current intro screen; there is no extra route or loading transition.

### Correct answer

The selected answer becomes locked immediately. A correct answer receives a short success highlight and haptic response, then advances automatically to the next question after 450 ms. Correct answers do not play the final reward sound.

### Incorrect answer

The selected answer becomes locked immediately. The card shows only:

- `Неправильно`;
- the correct answer or corrected statement;
- a concise explanation tied to the intro material;
- `Дальше`, or `Начать урок` after question three.

The screen must not mention a lost, unavailable, missed, or forfeited spin. The learner continues through all three questions. After the third question, the ordinary lesson-start CTA appears if any first answer was wrong.

### Perfect result

After the third correct first answer, the client finalizes the server-backed attempt. Once the grant is confirmed:

1. play one dedicated short spin-earned sound;
2. bring in the plaque with a 220 ms scale/fade and show a spin icon with `+1 спин`;
3. hold the plaque for 650 ms;
4. move the icon/plaque upward and fade it out over 450 ms;
5. call the existing intro completion callback 1.5 seconds after the reward reveal begins.

The credit is already durable before the celebration is shown. The animation is a confirmation, not the authority that creates the reward.

### Replay

The learner may replay the intro and its three questions for learning value. Existing first answers and the reward decision remain immutable. Replay never creates a new spin and does not show negative reward copy.

## Content Contract

Each eligible ordinary lesson supplies one `LessonIntroFinalCheck`:

```ts
type LessonIntroFinalCheck = {
  checkId: string;
  contentVersion: number;
  studyTarget: StudyTarget;
  lessonId: number;
  questions: readonly [
    LessonIntroYesNoQuestion,
    LessonIntroYesNoQuestion,
    LessonIntroYesNoQuestion,
  ];
};

type LessonIntroYesNoQuestion = {
  id: string;
  kind: 'yes_no';
  prompt: IntroI18nText;
  statement: string;
  correct: boolean;
  explanation: IntroI18nText;
};
```

The renderer owns localized `Да` and `Нет` labels. Every prompt and explanation must cover the same app locales already required by lesson intros: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, and `pl`. The statement uses the active study language.

Every question must test a rule or distinction explicitly present in that lesson’s intro. Questions cannot introduce unseen vocabulary, exceptions, trick wording, or ambiguous truth conditions. Explanations must be short enough to fit in the existing scrollable card without hiding the CTA.

Checks are authored and reviewed ahead of release. Runtime generation is forbidden. A shared canonical content source produces client and Functions artifacts with a hash-parity contract so the server validates the same IDs and answer key shown by the app.

The feature flag cannot be enabled for a study target until every eligible ordinary lesson has exactly three valid questions. Runtime validation still falls back safely if shipped data is malformed.

## Client Architecture

### `LessonIntroFinalCheck`

Add an isolated component responsible for:

- rendering one of three questions;
- locking the first selection;
- displaying correct or incorrect feedback;
- retaining the local first-answer outbox;
- advancing between questions;
- requesting finalization;
- triggering the reward celebration only after confirmed grant state;
- invoking the existing lesson start callback exactly once.

Its state transitions are explicit:

```text
reading_intro
  -> question_1
  -> question_2
  -> question_3
  -> failed_explanation -> ready_to_start
  -> perfect_pending
       -> reward_confirmed -> celebrating -> lesson
       -> confirmation_deferred -> lesson
```

The component uses a pure reducer so the following invariants are testable without rendering:

- each question accepts only its first selection;
- all three questions are completed in order;
- reward eligibility is the conjunction of the three first answers;
- navigation and double taps cannot finalize twice;
- completion fires once.

### Integration boundary

`LessonIntroScreens` receives an optional `finalCheck` prop. `app/lesson1.tsx` passes the check resolved for the active `studyTarget` and `lessonId`. `app/personal_plan_theory.tsx` does not pass it, preserving the approved scope.

If `finalCheck` is missing or fails runtime validation, `LessonIntroScreens` renders the existing start CTA. Missing content can never block a lesson.

### Local persistence

First answers and pending server operations use account-scoped storage keyed by stable account generation, study target, lesson ID, and question ID. Account switches invalidate stale callbacks and prevent one user’s outbox or celebration from appearing for another user.

Each answer event has a deterministic idempotency key. A restart resumes pending delivery without allowing the selected answer to change.

## Server Authority and Data Model

### Coordination boundary

The intro-check task must not edit `functions/src/level_reward_spins.ts`, `rewardForSpin`, level-spin claim/delivery, or related progress/auth/friend Spin contracts while the primary Spin task is stabilizing them. It also must not duplicate or locally reimplement Spin reward selection.

The intro feature owns only its canonical check attempts, answer validation, deterministic award ledger, client outbox, and UI. Actual conversion of a confirmed intro award into the existing spin balance happens later through one narrow interface owned or approved by the primary Spin task. The feature flag remains off until that seam is available and its integration gates pass.

### Canonical attempt

Store one server-owned document per stable user, study target, and lesson:

```text
users/{stableUid}/lesson_intro_check_attempts/{studyTarget}__lesson_{lessonId}
```

The document contains:

```ts
type LessonIntroCheckAttempt = {
  studyTarget: StudyTarget;
  lessonId: number;
  checkId: string;
  firstAnswers: Record<string, boolean>;
  answeredAtMs: Record<string, number>;
  status: 'in_progress' | 'completed';
  perfect: boolean | null;
  rewardState: 'none' | 'pending_spin_delivery' | 'granted';
  spinCreditId: string | null;
  firstStartedAtMs: number;
  completedAtMs: number | null;
  contentVersionSeen: number;
  schemaVersion: 1;
};
```

The document ID intentionally excludes `contentVersion`. Updating or correcting questions does not reset reward eligibility.

Firestore Rules deny every client write to attempt and intro-award records. Writes occur only through authenticated Functions using the canonical stable identity policy.

### Answer recording

A callable accepts `studyTarget`, `lessonId`, `checkId`, `contentVersion`, `questionId`, the selected boolean, and an answer event ID. The server:

1. validates identity and bounded input;
2. loads the canonical server check;
3. verifies that the question belongs to the lesson and version is supported;
4. transactionally writes the selection only if that question has no first answer;
5. returns the authoritative stored first answer if the event is replayed or another device already answered;
6. finalizes the attempt after all three canonical question IDs have first answers.

The server computes `perfect`; it never accepts a client-provided `perfect` flag.

### Idempotent intro award

For a perfect completed attempt, the same transaction creates a deterministic intro award such as:

```text
users/{stableUid}/lesson_intro_spin_awards/intro_spin_v1_{studyTarget}_{lessonId}
```

The award starts as `pending_spin_delivery`. A repeated answer, finalize request, retry, reconnect, app restart, or concurrent device observes the same award and returns `alreadyProcessed`; it never creates another award.

### Spin-owned delivery seam

After the primary Spin task is stable, it exposes or approves one idempotent operation with a contract equivalent to:

```ts
type GrantLessonIntroSpin = (input: {
  stableUid: string;
  awardId: string;
  studyTarget: StudyTarget;
  lessonId: number;
  earnedAtMs: number;
}) => Promise<{
  status: 'granted' | 'already_granted';
  spinCreditId: string;
  balance: number;
}>;
```

The Spin system owns the underlying credit shape, ordering, balance update, claim compatibility, reward occurrence identity, premium behavior, and delivery recovery. The intro task treats those details as opaque and records only the returned `spinCreditId` and granted state.

The seam must guarantee that the same `awardId` can produce at most one durable spin credit and that multiple intro awards cannot overwrite one another when their spins are later consumed. These guarantees are integration acceptance criteria for the Spin owner; the intro task must not obtain them by patching `rewardForSpin`, claim, delivery, progress, auth, or friend-gift code in parallel.

Only after the seam returns `granted` or `already_granted` with a durable credit does the intro award transition to `granted`. The celebration is emitted once from that transition.

## Offline and Failure Behaviour

- Question rendering and feedback never depend on the network.
- Answer events enter the account-scoped outbox immediately and sync in order.
- The client prefetches attempt status while the learner reads the intro when connectivity is available.
- The perfect path waits at most 1,200 ms for confirmation; it never shows an indefinite spinner.
- If grant confirmation arrives within the window, the approved celebration plays before automatic lesson start.
- If confirmation is still pending, the lesson starts normally. No optimistic or false `+1 спин` is shown.
- A later confirmed delivery queues the same reward celebration for the next focused Home or lesson-menu surface. It must not interrupt an active lesson answer interaction.
- `alreadyProcessed` never creates a second celebration.
- Permanent validation errors preserve lesson access, record diagnostics, and do not fabricate a reward.
- Temporary transport failures remain in the bounded retry outbox with exponential backoff.

## Motion, Sound, and Accessibility

- Reward sound is a single short event with a dedupe key derived from the granted credit ID.
- System/app mute settings suppress sound.
- Normal motion: plaque enters with a small scale/fade, holds, then travels upward and fades.
- Reduced motion: plaque fades in, holds, and fades out without flight, bobbing, or repeating pulse.
- Answer buttons expose button roles, selected/disabled state, and localized accessibility labels.
- Feedback is announced once through the accessibility live-region pattern already used by the app.
- Focus moves to the explanation after an incorrect answer and to the next question after `Дальше`.
- Lime/green success surfaces use the existing dark success foreground, never white text.
- The final animation cannot trap focus or require dismissal.

## Analytics

Record bounded authored events:

- check shown;
- first answer recorded with question ID, position, and correctness;
- check completed with `perfect`;
- reward grant confirmed, deferred, or already processed;
- lesson started from perfect, non-perfect, or fallback flow.

Do not record statement text, explanation text, display-language answer labels, or free-form user data. Metrics are used to watch intro completion, `3/3` rate, lesson-start drop-off, grant failures, duplicate suppression, and deferred-grant frequency.

## Testing

### Content gates

- Every eligible ordinary lesson for every enabled study target has exactly three questions.
- IDs are unique and stable.
- Each question has a boolean key, non-empty statement, and every required locale for prompt and explanation.
- Client and Functions answer-key hashes match.
- Personal-plan theory has no final-check wiring.

### Client tests

- First selection is immutable for every question.
- `3/3` enters perfect pending; any wrong first answer enters the non-reward path.
- Remaining questions continue after an error.
- Incorrect UI contains the explanation and does not contain lost-spin copy.
- Perfect reward animation starts only from confirmed grant state.
- Completion fires once after celebration or the bounded deferred path.
- Missing/malformed content renders the existing start CTA.
- Account change, restart, offline outbox, reduced motion, mute, and accessibility focus are covered.

### Server tests

- The server validates canonical question IDs and ignores client claims of correctness.
- First answers cannot be overwritten.
- Exactly three canonical answers are required to finalize.
- Only perfect `3/3` creates an intro award; only the Spin-owned seam may convert that award into a spin credit.
- The deterministic attempt and intro-award ledger permit at most one pending award under retry and concurrent-device races.
- One English and one French lesson with the same numeric lesson ID remain independent.
- Content-version changes do not reset the reward key.
- Firestore Rules reject all direct client writes.

### Spin seam compatibility tests

- Intro unit tests use a seam fake and never import or patch `rewardForSpin`, claim, or delivery internals.
- The real seam maps one deterministic award ID to at most one spin credit.
- Intro credits appear in the same balance and spin route after the Spin-owner handoff.
- Multiple intro awards cannot overwrite later reward occurrences.
- Existing level-up selection, recovery, acknowledgement, delivery leases, premium lanes, and gift materialization pass unchanged integration gates.
- A guard rejects implementation changes to the coordinated Spin files until the primary Spin task explicitly hands off the seam.

## Rollout

Ship behind a remote feature flag disabled by default. Enable only after:

1. complete three-question content coverage passes for the target;
2. client/server hash parity passes;
3. focused client, Functions, Firestore Rules, and spin-compatibility suites pass;
4. emulator concurrency proves one intro award under simultaneous submissions;
5. the primary Spin task has stabilized and handed off the approved delivery seam;
6. seam integration proves one durable spin credit per award without changing existing Spin behavior;
7. manual verification covers normal, incorrect, offline, reduced-motion, muted, replay, and account-switch flows.

Roll out by study target and cohort while monitoring completion rate, lesson-start drop-off, grant latency, deferred confirmations, and duplicate suppression. The kill switch removes the final check and restores the existing start CTA without deleting attempts or earned credits.

## Acceptance Criteria

- Every enabled ordinary lesson ends with exactly three binary questions.
- The learner earns one spin only for three correct first answers.
- One wrong answer shows only concise corrective feedback and never mentions losing a spin.
- Any result allows the lesson to begin.
- A confirmed perfect attempt plays the approved sound and `+1 спин` upward animation, then starts the lesson automatically.
- The same study-target lesson can never create more than one intro award or receive more than one spin through the seam.
- Personal-plan theory is unchanged.
- Offline, retries, restarts, duplicate taps, and concurrent devices do not block lessons or duplicate rewards.
- Existing level-up Spin files are not modified by the intro task before the coordinated seam handoff, and their credits and rewards remain backward compatible after integration.
