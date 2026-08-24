# Energy Start Confirmation and Transfer Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make paid activity starts explicit and premium-feeling: training opens first for words and irregular verbs, every actual paid start asks for confirmation, and the confirmed energy unit visibly transfers into the start action.

**Architecture:** Keep `EnergyContext` as the only balance writer. Add a shared confirmation controller that returns a discriminated result and only invokes the existing atomic spend after confirmation; unlimited access bypasses the dialog and insufficient balance remains handled by existing no-energy surfaces. Replace the center-only subtraction overlay with a transform/opacity transfer sequence driven by the existing global spend event, and remove duplicate compact cost badges from lower tab bars.

**Tech Stack:** React Native, Expo Router, TypeScript, React Context, React Native `Animated`, Jest contract tests.

---

### Task 1: Training-first navigation and duplicate badge cleanup

**Files:**
- Modify: `app/lesson_menu.tsx`
- Modify: `app/lesson_words.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Test: `tests/energy_start_confirmation_contract.test.ts`

- [ ] Write a contract test asserting that the lesson menu opens words with `tab: 'train'`, irregular verbs default to `learn`, their tab order starts with `learn`, and neither lower tab bar renders its compact energy badge.
- [ ] Run the focused test and verify that it fails on the current `list`/`dict` defaults and compact badge markers.
- [ ] Change only the initial route/default/order and remove only the two lower-tab badge instances; preserve the primary start-button badges.
- [ ] Run the focused test and verify it passes.

### Task 2: Shared confirmation result model and modal

**Files:**
- Create: `components/energy_start_confirmation.ts`
- Create: `components/EnergyStartConfirmModal.tsx`
- Modify: `components/EnergyContext.tsx`
- Modify: `app/_layout.tsx`
- Test: `tests/energy_start_confirmation_contract.test.ts`

- [ ] Add failing tests for the result union `spent | unlimited | cancelled | insufficient`, one pending request at a time, and Russian confirmation copy that states the exact cost.
- [ ] Run the focused test and confirm the new API/modal markers are absent.
- [ ] Add `confirmSpendOne()` and `confirmSpendAmount(n)` to `EnergyContext`; wait for real energy state, bypass without a dialog for unlimited users, return `insufficient` without opening the confirmation for an empty balance, and resolve `cancelled` without writing energy.
- [ ] Render one themed accessible modal inside the provider, with a dark foreground on the lime confirm button, and block repeated taps while a request is pending.
- [ ] Keep `spendOne`/`spendAmount` as the only mutation functions and invoke them only after the user confirms.
- [ ] Run the focused test and verify it passes.

### Task 3: Migrate paid entry points to the confirmation gate

**Files:**
- Modify: paid activity screens returned by `rg -l "spendOne|spendAmount" app components`
- Test: `tests/energy_start_confirmation_contract.test.ts`
- Test: `tests/energy_start_cost_contract.test.ts`

- [ ] Add a failing inventory contract requiring direct paid-start callers to use `confirmSpendOne`/`confirmSpendAmount` and to distinguish `cancelled` from `insufficient`.
- [ ] Migrate explicit button-driven entry points first, preserving existing loading latches, refund paths, navigation, and no-energy modals.
- [ ] Migrate target-screen fallback gates so deep links also confirm exactly once; preserve existing per-session/per-round latches so a return or rerender cannot charge twice.
- [ ] Keep refunds only for a confirmed debit whose subsequent network/session admission fails.
- [ ] Run both focused energy contract files and verify they pass.

### Task 4: Premium “light transfer” motion

**Files:**
- Modify: `app/events.ts`
- Modify: `components/EnergySpendFlightHost.tsx`
- Modify: `constants/motionHybrid.ts`
- Test: `tests/energy_start_confirmation_contract.test.ts`
- Test: `tests/energy_start_cost_contract.test.ts`

- [ ] Add a failing contract test for a 720–850 ms transfer, staged glow/trail/impact values, the shared `energy-start-cost.webp` asset, and a reduced-motion fallback.
- [ ] Extend the spend event payload with optional source/target geometry while retaining a safe screen-relative fallback.
- [ ] Implement the approved option 1: `−1` stays clearly left of the bolt, the charge detaches from the upper energy area, follows a soft curved visual path toward the confirmed start action, then creates a brief rim impact before fading.
- [ ] Animate only transforms and opacity with the native driver; serialize overlapping events and clean up animations on unmount.
- [ ] Run the focused tests and verify they pass.

### Task 5: Focused verification

**Files:**
- Verify only the files above and existing energy contracts.

- [ ] Run the two focused Jest contract files under the shared heavy-process semaphore and save only decisive output.
- [ ] Run targeted TypeScript/ESLint checks if the repository exposes a narrow command for the edited files; do not run a whole-project typecheck without a semaphore slot.
- [ ] Inspect the lesson menu, words, irregular verbs, MAX start, confirmation dialog, cancel path, insufficient-energy path, unlimited path, and reduced-motion path in the local app.
- [ ] Confirm `git diff --check` passes for the edited files and no unrelated user changes were reverted.
