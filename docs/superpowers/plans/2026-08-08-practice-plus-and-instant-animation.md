# Practice Plus And Instant Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore immediate phrase-tile animation and make the complete Practice experience a visibly gold-badged Plus-only section.

**Architecture:** Keep visual preview and committed answer as separate states, but remove their overlap at the render boundary. Centralize trainer entry authorization in `startReservedTrainerSession`, retain direct-screen entitlement checks, and make the dashboard route every action through that boundary while decorating all non-Plus surfaces with the shared `PlusBadge`.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest, React Native Reanimated.

---

### Task 1: Prevent preview/selected key overlap

**Files:**
- Modify: `tests/trainer_word_bank_instant_preview_contract.test.ts`
- Modify: `app/trainer_phrases_session.tsx`

- [ ] Add assertions requiring the press handler to call `setPreviewTile(null)` before `tapBank(tile)` and requiring `visibleSelected` to exclude a preview whose slot is already selected.
- [ ] Run `npx jest --runTestsByPath tests/trainer_word_bank_instant_preview_contract.test.ts --runInBand` and confirm the new assertions fail.
- [ ] Update the `visibleSelected` memo to append only a non-selected preview, then clear the preview before committing in `onPress`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Enforce the full paid trainer entry boundary

**Files:**
- Modify: `tests/trainer_entrypoint_reservation.test.ts`
- Modify: `tests/trainer_modes.test.ts`
- Modify: `app/trainer_session_navigation.ts`
- Modify: `app/trainer_session.ts`

- [ ] Change navigation expectations so a non-Plus user always reaches `trainer_limit`, even when `trainer_modes` is remotely free, and no free reservation is attempted.
- [ ] Change session tests so a non-Plus direct entry cannot be consumed without a verified entitlement.
- [ ] Run the two focused test files and confirm the paid-boundary assertions fail.
- [ ] Remove the free-for-all and free-session paths from trainer navigation; keep the lock and verified Plus path.
- [ ] Make direct session consumption return true only for verified Plus access while preserving the target/source gate.
- [ ] Re-run the two focused test files and confirm they pass.

### Task 3: Add gold Plus badges and gate every dashboard action

**Files:**
- Create: `tests/trainer_full_plus_dashboard_contract.test.ts`
- Modify: `app/trainer.tsx`

- [ ] Add a source contract requiring `PlusBadge` on the hero, both queue rows, every weak-spot card, and weekly rhythm for non-Plus users; require weak spots to open the paywall through a shared handler.
- [ ] Run `npx jest --runTestsByPath tests/trainer_full_plus_dashboard_contract.test.ts --runInBand` and confirm it fails.
- [ ] Import `PlusBadge`, extend weak-spot actions with the shared gated callback, and render badges only when `hasPremium` is false.
- [ ] Ensure empty/disabled trainer actions still open the paywall for non-Plus users, while Plus users retain existing data-dependent behavior.
- [ ] Re-run the focused dashboard contract and confirm it passes.

### Task 4: Verification

**Files:**
- Verify all modified source and test files.

- [ ] Run the animation, trainer navigation, trainer mode, dashboard, and reported-regression tests together.
- [ ] Run the repository TypeScript check command from `package.json`.
- [ ] Inspect `git diff --check` and the scoped diff; preserve unrelated dirty-worktree changes.
