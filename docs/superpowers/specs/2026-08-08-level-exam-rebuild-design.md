# Level Exam Rebuild Design

**Status:** approved product and UX design, pending written-spec review
**Date:** 2026-08-08
**Scope:** English-target level exams A1, A2, B1, and B2 in Phraseman
**Primary surface:** `app/level_exam.tsx`

## Decision Summary

Replace the current static level-exam screen and question list with a theme-aware, timed, offline-capable exam experience built from canonical lesson content. Every exam has 30 scored items across five task formats, covers every lesson in the completed level, restores an interrupted attempt from a persisted deadline, explains the result by skill and lesson, and grants one server-authoritative reward spin only for the first passing result at each level.

The owner approved these product decisions:

- use a local deterministic blueprint engine rather than a cosmetic reskin or server-generated exam;
- keep the current cost of 5 energy per attempt and show it honestly before start;
- use one timer for the whole attempt; when it expires, unanswered items are incorrect and the exam finishes automatically;
- do not require microphone, speech recognition, or listening for the passing score;
- use existing SFX only, with no spoken narrator and no new TTS;
- grant the reward spin once, on the first successful pass for a level;
- make every color follow the active Phraseman theme rather than the gold palette shown in the concept mockup.

## Why the Current Experience Must Be Rebuilt

The current surface does not prepare a learner for the exam or provide a trustworthy assessment.

### Source audit

`app/level_exam.tsx` contains 96 inline questions:

| Level | Lessons | Current items | Promised items | Default cloze | Other format |
| --- | --- | ---: | ---: | ---: | ---: |
| A1 | 1–8 | 24 | 30 | 23 | 1 `choice4` |
| A2 | 9–18 | 30 | 30 | 30 | 0 |
| B1 | 19–28 | 30 | 30 | 30 | 0 |
| B2 | 29–32 | 12 | 30 | 12 | 0 |

The correct-answer index distribution is 29 at index 0, 31 at index 1, 35 at index 2, and only 1 at index 3. Questions are not shuffled for English exams and appear lesson by lesson in the same order. There is no exam timer. The intro always claims 30 questions even when the actual array contains 24 or 12.

The screen also promises a penalty-free retry while `startExam()` spends 5 energy before entering the quiz. This is misleading even though the energy behavior itself is retained.

### Content audit

Every one of the 96 rows is a short multiple-choice grammar prompt. Most are mechanically answerable, but the pool does not test phrase production, meaning, word order, error recognition, or speed. It is maintained separately from the canonical lesson phrases and teaching notes, so it can drift from what the learner actually completed.

Verified ambiguous or misaligned examples include:

| Lesson | Current prompt | Problem | Required disposition |
| ---: | --- | --- | --- |
| 10 | `You ___ speak louder.` | `can`, `could`, `should`, and `must` can all work under different intent. | Add a localized situation that makes advice unambiguous, or remove. |
| 11 | `She ___ the letter yesterday.` → `sent` | An irregular verb is filed under the regular-verbs lesson. | Replace with a lesson-grounded regular verb. |
| 13 | `I ___ not be late.` | `will not` and traditional `shall not` are both possible. | Rewrite with one communicative intent. |
| 19 | `The cat is ___ the table.` | `on` and `under` are both valid without visual or textual context. | Add spatial evidence or replace. |
| 23 | `The letter ___ by her.` | `is written` and `was written` are both grammatical without time context. | Add an explicit tense anchor. |
| 25 | `They ___ TV at 8 pm.` | Simple and continuous past can both describe the situation. | Add an interrupting event or duration cue. |
| 26 | `If I ___ rich...` | Both `were` and informal `was` occur in valid contemporary English. | Avoid a single-answer item or accept alternatives. |
| 27 | `He said he ___ tired.` | Backshift is not compulsory if the condition remains true. | Add past-only context or replace. |
| 31 | `I heard her ___ a song.` | Both `sing` and `singing` are valid with different aspect. | Rewrite to test an unambiguous contrast. |
| 32 | `She ___ not have come so early.` | `should not have` and `would not have` are both valid under different meanings. | Add context or remove. |

Because the systemic problem is the data source and task model, the inline pool will not be repaired row by row. It will be retired after the canonical blueprint reaches parity and passes the new content contracts.

## Goals

- Make the exam feel like a meaningful culmination of the lessons immediately before it.
- Test recall and use of familiar phrases, not only recognition of isolated grammar forms.
- Cover all completed lessons in the level with a reproducible, auditable selection.
- Create visible but achievable time pressure.
- Provide a useful diagnosis after both pass and retry results.
- Make start, answer feedback, finish, medal, and reward feel responsive and premium through finite motion and existing audio.
- Preserve offline exam play; only the one-time reward claim requires server authority.
- Preserve all active themes, source-interface locales, target gates, premium gates, progress, achievements, and mistake recording.

## Non-goals

- No microphone or speech-recognition requirement.
- No required listening task in this release.
- No rebuild of the separately gated French-target remote exam path; it must remain isolated and must not regress.
- No live AI generation, OpenAI API use, or network dependency for English exam construction.
- No change to the 5-energy attempt price.
- No change to the 70% passing threshold.
- No redesign of the lesson list outside the minimum exam-card state needed to surface the new result.
- No refactor of unrelated tournament, lesson, or reward systems.

## User Journey

### 1. Preparation

The intro is a full-screen themed surface, not a dark card floating in unused space. It answers four questions before the learner commits:

- what this exam confirms: the completed level and lesson range;
- what success means: 21 correct scored items out of 30;
- what it costs: 5 energy;
- what to expect: total time and five task formats.

Russian concept copy:

- title: `Финальная проверка A2`;
- lead: `Покажи, как уверенно ты используешь темы этого уровня в живых фразах.`;
- goal: `21 правильный ответ из 30`;
- format line: `Контекст · сборка фраз · смысл · поиск ошибки · быстрые пары`;
- CTA: `Начать проверку −5 ⚡`;
- support: `Лучший результат сохранится`.

The first-pass reward is previewed without implying that repeat passes grant another reward.

### 2. Start

After the energy transaction succeeds, a 1.8-second `3–2–1` focus sequence runs with `pm.exam.begin`. It is finite and can be skipped to an immediate crossfade when reduced motion is enabled. The timer deadline is created only after the energy transaction succeeds; double taps cannot spend twice.

### 3. Active exam

The top area contains close, progress, and remaining time. The active task format and scored-item position are visible. The learner can answer or skip. A skipped or unanswered item can be revisited before submission if time remains.

Answer feedback is inline, never modal. It uses semantic correct/error tone, haptic feedback on the user action, a short existing SFX, and a concise explanation. Motion completes within roughly 280 ms before the next action is available.

### 4. Automatic finish

The exam finishes when the learner submits all 30 scored items or when the deadline expires. Unanswered items count as incorrect. The finish operation is idempotent so a timeout, foreground transition, or repeated tap cannot create two attempts or two reward claims.

### 5. Result and next action

A passing result reveals medal, score, skill breakdown, XP, and—only when eligible—the first-pass reward. The primary action is `Забрать награду` when a reward is claimable and `Перейти к B1` after the reveal or when no new reward exists.

A retry result uses calm, specific language such as `Нужно ещё 2 правильных ответа`. It shows the two or three weakest lesson objectives and offers `Повторить слабые темы` and `Попробовать снова −5 ⚡`. There is no punitive animation, shame language, or false loss claim.

## Exam Blueprint

Every level produces exactly 30 scored items:

| Format | Count | What it tests |
| --- | ---: | --- |
| Contextual choice | 8 | Selecting one form or phrase when a localized situation makes the intent unambiguous. |
| Phrase builder | 8 | Reconstructing a canonical lesson phrase from a shuffled word bank. |
| Meaning choice | 6 | Selecting the accurate translation, intention, or response for a canonical phrase. |
| Spot the error | 4 | Identifying and correcting a single lesson-grounded error. |
| Speed match | 4 | Matching four canonical target/source pairs; each pair is one scored item. |

The match board is one interaction surface with four independently scored pairs. Progress advances within the board so the total remains visibly and mathematically 30.

### Coverage rule

For level range `[from, to]`:

1. include at least two scored items from every lesson in the range;
2. distribute the remaining slots across the level's key objectives and underrepresented formats;
3. do not include content from later lessons;
4. generate from the same target-language phrase and source-locale translation the learner saw;
5. persist the blueprint version and attempt seed with the attempt.

This yields full coverage for A1, A2, B1, and B2 even though the number of lessons differs.

### Canonical sources

The engine reads lesson titles, phrases, token banks, alternatives, translations, and teaching notes through the existing lesson-data accessors. It does not duplicate lesson phrases in the exam module. Any task that cannot be produced unambiguously from the canonical fields is omitted and replaced by another valid task from the same lesson or objective.

### Determinism

Each attempt has a seed. The seed controls task selection, task order, word-bank order, and option order. Given blueprint version, study target, source locale, level, and seed, the exact exam can be reconstructed for QA and mistake reports without storing private free-form user text.

## Time and Scoring

| Level | Limit | Average budget per scored item |
| --- | ---: | ---: |
| A1 | 12:00 | 24 seconds |
| A2 | 13:00 | 26 seconds |
| B1 | 14:00 | 28 seconds |
| B2 | 15:00 | 30 seconds |

The limit is a monotonic deadline, not a decrementing persisted counter. UI updates pause when the runtime is inactive, but elapsed wall-clock time continues. Returning after the deadline immediately triggers the same idempotent finish path.

Pass is 21/30 or better. The displayed percentage is derived from the integer score. Medal thresholds remain compatible with existing progress behavior; the best result and pass count continue to be stored and synchronized.

Initial limits are product defaults, not telemetry-controlled remote values. After release, anonymous aggregate completion-time percentiles may justify a separately approved calibration.

## Energy, XP, Medal, and Reward

- The attempt costs exactly 5 energy and the cost is displayed before the CTA.
- Energy is spent once before the start sequence. A failed spend never creates a deadline or attempt.
- Existing XP, achievement, medal, best-score, pass-count, unlock, and mistake-recording behavior remains compatible unless a focused contract proves a bug.
- The reward spin is separate from the local result write and cannot be granted solely by AsyncStorage.
- Reward identity is `{uid, studyTarget, level, rewardVersion}`. The server accepts an authenticated, idempotent first-pass claim and returns `granted` or `alreadyGranted`.
- Offline passing results create a durable pending claim. The UI says that the reward is awaiting confirmation; it must not show a spendable spin before server acknowledgement.
- Replays can improve best score and medal but can never grant a second first-pass spin for the same reward identity.
- Visible reward terminology follows the existing level-reward surface and the product language rules; banned roulette/turn wording is not introduced.

## Theme and Visual System

The gold concept is not a hard-coded production palette. Production code uses:

- `ScreenGradient` and its exam backdrop for the screen;
- `t.bgSurface`, `t.bgSurface2`, and `t.bgCard` for hierarchy;
- `t.textPrimary`, `t.textSecond`, and `t.textMuted` for type;
- `t.accent`, `t.accentBg`, `t.gold`, `t.correct`, `t.correctText`, and `t.wrong` for semantic states;
- existing theme typography and spacing tokens;
- `TonalSurface`, `TapScale`, and other established components where they match the interaction.

No exam container receives a decorative border. Color contrast must pass in every shipped theme, not only midnight and gold. The layout reserves final geometry on the first frame and does not clip at the supported font-scale cap.

## Motion and Audio

| Moment | Motion | Audio |
| --- | --- | --- |
| Start | 1.8-second finite countdown; crossfade for reduced motion | `pm.exam.begin` |
| Task change | 180–220 ms directional content transition | none |
| Correct answer | 280 ms semantic tone and mark | existing correct-answer event |
| Wrong answer | 280 ms semantic tone and correction | existing error-answer event |
| Pass finish | medal → score → reward sequence, maximum 2.4 seconds | `pm.complete.exam_pass` |
| Retry finish | restrained score and study-plan reveal | `pm.complete.exam_retry` |

All production motion runs on the UI thread through Reanimated. Worklet-to-RN calls use `scheduleOnRN`, never `runOnJS`. Repeating loops are unnecessary; every exam animation is finite. Audio requests respect the existing sound director, user sound settings, dedupe keys, and lifecycle arbitration.

## State, Persistence, and Recovery

The state machine is:

`preparing → ready → countdown → active → finishing → result → rewardPending/rewardGranted`.

Blocking states include access denied, content invalid, insufficient energy, and unrecoverable attempt data. Loading never replaces the full screen with a spinner; final geometry is reserved.

An active-attempt snapshot contains only the minimum deterministic state: level, study target, source locale, blueprint version, seed, ordered task IDs, answers, current position, start time, deadline, and finish token. It is updated after each answer. On reopen:

- a valid unexpired attempt resumes;
- an expired attempt finishes once with unanswered items incorrect;
- an invalid or incompatible blueprint snapshot is closed safely with a clear message and no duplicate reward;
- a completed attempt never reopens as active.

## Accessibility

- All interactive controls meet 44 pt on iOS and 48 dp on Android.
- Close, answer, skip, timer, progress, reward, and retry controls have localized roles, labels, hints, and states.
- Answer feedback and timeout use polite live-region announcements without reading decorative art.
- Dynamic Type uses the existing capped scaling contract; no `adjustsFontSizeToFit`.
- Reduced motion substitutes crossfades and immediate state updates for countdown scale, directional movement, medal scale, and reward stagger.
- Correct and wrong states never rely on color alone; they include icon, text, and accessible state.
- Time warnings are announced at useful thresholds without repeating every second.

## Quality Gates

### Content contracts

For every English-target level and supported source locale:

- exactly 30 scored items;
- every lesson in the level represented at least twice;
- exact distribution 8/8/6/4/4 by format;
- no lesson outside the level range;
- one canonical answer or explicitly accepted alternatives;
- no duplicate normalized prompt/answer pair inside an attempt;
- no empty prompt, answer, translation, word bank, or topic label;
- all distractors unique and distinct from the accepted answer;
- option order and answer index vary across seeds;
- the same seed reconstructs the same attempt;
- every task references an existing canonical lesson item and content version.

### Runtime and economy contracts

- double start cannot spend more than 5 energy;
- no deadline is created when energy spending fails;
- background/foreground recovery uses the same deadline;
- timeout and manual completion cannot record two attempts;
- first passing claim grants one reward spin;
- replay, retry, offline replay, and concurrent devices cannot grant another;
- pending offline claims reconcile exactly once;
- pass still unlocks the next course level and preserves current best-score overlay behavior.

### UI contracts

- active theme tokens drive every color;
- all shipped themes pass contrast checks for body, labels, answers, timer, correct, wrong, and CTA states;
- A1–B2 intro, countdown, all five task formats, timeout, pass, retry, pending reward, granted reward, and error states render without clipping;
- reduced-motion branches exist for every animation;
- runtime lifecycle and layout-stability guards do not regress;
- focused Android emulator journeys cover pass, timeout, retry, and offline reward recovery.

## Rollout

Implementation is split behind an exam-blueprint version boundary so an active legacy attempt can finish without being interpreted as a new attempt. Existing best score, pass, medal, achievement, and course unlock storage remains readable. The old inline question pool is deleted only after all four new blueprints pass deterministic content gates and the new runtime is the sole English level-exam path.

No deployment, migration, reward backfill, or remote flag change is part of implementation without a separate release decision.

## Acceptance Criteria

The rebuild is complete when:

1. all four English-target exams deliver exactly 30 valid, lesson-grounded scored items in the approved format mix;
2. the preparation, countdown, active task, pass, retry, and reward states match the approved hierarchy and active theme;
3. the timer and recovery behavior are deterministic and verified;
4. the existing begin, pass, and retry SFX are synchronized with finite reduced-motion-aware animations;
5. results identify weak objectives and route to the relevant completed lessons;
6. the first pass grants exactly one server-authoritative reward spin and replays cannot farm it;
7. focused content, runtime, accessibility, theme, and Android journey gates pass;
8. existing unrelated working-tree changes remain untouched.
