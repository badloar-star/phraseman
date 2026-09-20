# Lesson Plus Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the restored Plus lesson policy, preserve pearl-purchased lesson rights, and expose pearl purchase directly on each Plus-locked lesson card.

**Architecture:** `app/monetization_policy.ts` becomes the canonical free-account policy, while the runtime gate and lesson list consume the same access matrix. Pearl purchases stay in the existing idempotent composite-operation flow; the UI only invokes that existing operation.

**Tech Stack:** Expo React Native, TypeScript, Jest, existing client economy ledger.

---

### Task 1: Lock the access policy in tests

**Files:**
- Modify: `tests/monetization_policy.test.ts`
- Modify: `tests/main_course_open_access.test.ts`
- Test: `tests/monetization_policy.test.ts`, `tests/main_course_open_access.test.ts`

- [ ] Write expectations that free access is limited to lessons 1–3, old scores/unlocked records/legacy caps do not open lessons 4–32, and exact pearl purchases remain available.
- [ ] Write expectations that Plus starts lessons 1, 9, 19, and 29 while other lessons retain progress locks.
- [ ] Run the two focused tests and verify they fail against the old policy.

### Task 2: Centralize restored access behaviour

**Files:**
- Modify: `app/monetization_policy.ts`
- Modify: `app/lesson_lock_system.ts`
- Modify: `app/lesson_premium_gate.ts`
- Modify: `app/lesson_menu.tsx`
- Modify: `app/(tabs)/home.tsx`

- [ ] Make `isFreeLesson` return true only for the first three main-course lessons; remove legacy-cap bypasses from free access.
- [ ] Keep purchased lesson ids as the only non-Plus entitlement above lesson 3.
- [ ] Make premium course access include section starters 1/9/19/29 and ordinary earned progress, not an entire reached level.
- [ ] Make every runtime and Home fast path use the same result.
- [ ] Run the focused policy/runtime test set and verify it passes.

### Task 3: Add the pearl action to Plus cards

**Files:**
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `tests/lesson_plus_pearl_action_contract.test.ts` (create)

- [ ] Add an accessible pearl action beside the existing `PlusBadge` only when `premiumRequired` is true; preserve the current 72 px lesson-card layout, gradients, radius, and Plus badge.
- [ ] Send the action to the existing `buyLessonWithPearls` operation and shared `ThemedChoiceModal` with `Открыть урок`, `Открыть урок · 100`, and `Закрыть`.
- [ ] Show only `Куплено` for an owned lesson.
- [ ] Run the new focused UI contract test.

### Task 4: Simplify the progress lock wording

**Files:**
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/lesson_lock_system.ts`
- Modify: `tests/lesson_plus_pearl_action_contract.test.ts`

- [ ] Change the Russian lesson-progress modal copy to `Ещё рано`; keep the underlying 2.5 score rule.
- [ ] Verify the focused UI and access tests pass using the shared verification slot.
