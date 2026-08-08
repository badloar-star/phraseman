# Controlled Phrase Error Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep a checked phrase visible until the learner explicitly proceeds, with an immediate local retry that does not alter progress accounting.

**Architecture:** `WordBankMode` and `FillGapMode` will report the first graded answer once, then hold their local result state. A separate explicit completion action advances the parent session. A local retry clears only exercise state; it never calls persistence or reward functions again.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest.

---

### Task 1: Lock the learner-controlled result contract

**Files:**
- Modify: `tests/trainer_phrases_speaking_autofill_contract.test.ts`
- Modify: `tests/reported_user_ui_regressions.test.ts`

- [ ] **Step 1: Write failing source-contract tests**

Add assertions that the phrase screen declares explicit `onAdvance` and `onRetry` callbacks, renders localized `Готово →` and `Повторить ещё раз` result actions, and no longer contains `waitForPhraseAnswerFeedback(...).then(() => onResult(true))` or delayed wrong-answer `onResult(false)` calls.

- [ ] **Step 2: Run the two tests to verify RED**

Run: `npx jest --runTestsByPath tests/trainer_phrases_speaking_autofill_contract.test.ts tests/reported_user_ui_regressions.test.ts --no-cache --runInBand`

Expected: FAIL because the callbacks and explicit result actions are absent and the automatic result transitions remain.

### Task 2: Separate grading, retry, and navigation

**Files:**
- Modify: `app/trainer_phrases_session.tsx`
- Test: `tests/trainer_phrases_speaking_autofill_contract.test.ts`
- Test: `tests/reported_user_ui_regressions.test.ts`

- [ ] **Step 1: Add the card-result action surface**

Change each mode prop from `onResult(correct)` to `onResult(correct)` and `onAdvance()`. Make a first answer call `onResult` once immediately, while the visible card remains in `correct` or `wrong` feedback state.

- [ ] **Step 2: Add retry without regrading**

Render `Повторить ещё раз` for either result. Its handler resets `selected`/`chosen`, feedback, and local motion state; it must not call `onResult`.

- [ ] **Step 3: Add explicit completion**

Render `Готово →` as the primary full-width result action. It calls `onAdvance`; the parent performs the existing index increment or completion there. Keep dark text on the green action surface and 44px-or-larger touch geometry.

- [ ] **Step 4: Keep voice autofill compatible**

When a speech answer passes, fill the canonical tokens, grade once, show the same result actions, and wait for the learner to press `Готово →`.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run: `npx jest --runTestsByPath tests/trainer_phrases_speaking_autofill_contract.test.ts tests/reported_user_ui_regressions.test.ts --no-cache --runInBand`

Expected: PASS with 0 failures.

### Task 3: Verify adjacent learning contracts

**Files:**
- Verify: `app/trainer_phrases_session.tsx`
- Verify: `tests/trainer_modes.test.ts`
- Verify: `tests/trainer_fill_gap_options.test.ts`
- Verify: `tests/practice_speak_answer_contract.test.ts`
- Verify: `tests/personal_plan_trainer_weak_spot_completion_contract.test.ts`

- [ ] **Step 1: Run focused regression suite**

Run: `npx jest --runTestsByPath tests/trainer_phrases_speaking_autofill_contract.test.ts tests/reported_user_ui_regressions.test.ts tests/trainer_fill_gap_options.test.ts tests/practice_speak_answer_contract.test.ts tests/personal_plan_trainer_weak_spot_completion_contract.test.ts tests/trainer_modes.test.ts --no-cache --runInBand`

Expected: PASS with 0 failures.

- [ ] **Step 2: Inspect final diff and commit**

Run: `git diff --check` and inspect only the files above, then commit the implementation and plan with `git add` restricted to those paths.
