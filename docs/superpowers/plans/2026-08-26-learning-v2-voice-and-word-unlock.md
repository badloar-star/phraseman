# Learning V2 Voice And Word Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Learning V2 hold-to-talk reliable and make every first-seen word immediately and durably available without showing its card again on retries.

**Architecture:** Keep the existing local speech-recognition and lesson dictionary systems, but stabilize their lifecycle boundaries. Add a separate DEV-preview unlock namespace, expose hydration state to the player, unlock on presentation, and reuse the approved ringed audio-control composition for Repeat & Compare.

**Tech Stack:** React Native, Expo Router, AsyncStorage, Reanimated, TypeScript, focused Node/Jest gates.

---

### Task 1: First-seen word persistence contract

**Files:**
- Modify: `app/learning_v2_unlocked_lesson_words_v1.ts`
- Modify: `hooks/use_learning_v2_unlocked_lesson_words_v1.ts`
- Test: `tests/learning_v2_unlocked_lesson_words_v1_gate.ts`

- [ ] Add failing assertions for a distinct authoring-preview storage key and deterministic learner/preview merging.
- [ ] Run only the focused gate and confirm RED because the preview APIs do not exist.
- [ ] Add the preview key/load/mark helpers and return `hydrated` from the hook without clearing a newly selected scope late.
- [ ] Re-run the focused gate and confirm GREEN.

### Task 2: Unlock at presentation and suppress repeat cards

**Files:**
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Test: `tests/learning_v2_new_word_immediate_unlock_2026_08_26_gate.ts`

- [ ] Add a failing player contract requiring hydration before `practice_reached`, immediate idempotent unlock on `presenting`, and no unlock dependency on Continue.
- [ ] Run the focused gate and confirm RED on the missing lifecycle.
- [ ] Gate encounter presentation on hydration, skip encounter IDs already in the merged registry, and persist the current encounter from a presentation effect.
- [ ] Keep Continue responsible only for closing/flight animation, then re-run the focused gate GREEN.

### Task 3: Stable hold-to-talk lifecycle

**Files:**
- Modify: `hooks/use_learning_v2_local_hold_to_talk_v1.ts`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Test: `tests/learning_v2_local_hold_to_talk_lifecycle_2026_08_26.test.ts`

- [ ] Write a failing hook test that resolves microphone permission while the press remains held and proves capture is stopped only by release.
- [ ] Run the single test and confirm RED for the reproduced cancellation path.
- [ ] Stabilize the start/stop callback path and keep the mounted footer press target unchanged through requesting/listening states.
- [ ] Re-run the single lifecycle test GREEN.

### Task 4: Premium Repeat & Compare composition

**Files:**
- Modify: `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `tests/learning_v2_report_dock_2026_08_26_gate.ts`
- Test: `tests/learning_v2_repeat_compare_premium_ui_2026_08_26_gate.ts`

- [ ] Add failing source contracts for a large ringed Play control, separate target typography, stable capture geometry, and a right-anchored report dock.
- [ ] Run both focused gates and confirm RED.
- [ ] Reuse the approved audio-mode interaction pattern, preserve accessibility/reduced motion, and change the report dock from left to right.
- [ ] Re-run both gates GREEN.

### Task 5: Focused verification and handover

**Files:**
- Modify: `docs/v2/HANDOVER.md`

- [ ] Run the four focused gates/tests only; acquire the shared semaphore before Jest.
- [ ] Run `npm run learning-v2:lesson1-authoring-preflight -- --session 2` and confirm the registry remains `LOCKED 1 / CURRENT 2 DRAFT / FORBIDDEN 3-56`.
- [ ] Record exact files, commands, and results in the handover without declaring session 2 approved or locked.
- [ ] Inspect the final diff to ensure unrelated dirty-worktree edits are untouched.

