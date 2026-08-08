# Gift Inventory Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove repeated chest opening when applying stored gifts while preserving the result modal and fixing repeated entrance initialization.

**Architecture:** Add an explicit presentation mode to both gift modals. Reuse their existing guarded application and persistence paths, with inventory selecting the direct-apply presentation.

**Tech Stack:** React Native, TypeScript, Jest source contracts.

---

### Task 1: Regression contracts

**Files:**
- Create: `tests/gift_inventory_apply_presentation_contract.test.ts`

- [ ] Assert inventory passes explicit direct-apply presentation to single and dual modals.
- [ ] Assert single initialization is edge-triggered and direct apply reaches the result phase.
- [ ] Assert dual direct apply starts with both rewards revealed.
- [ ] Run the focused test and confirm it fails before implementation.

### Task 2: Single gift direct apply

**Files:**
- Modify: `components/LevelGiftModal.tsx`

- [ ] Add the explicit presentation prop with chest opening as the default.
- [ ] Make initialization run only for a new visible opening.
- [ ] Reuse the guarded claim/apply path for direct inventory application.
- [ ] Keep the result modal visible after application.

### Task 3: Dual gift direct apply

**Files:**
- Modify: `components/LevelGiftDualModal.tsx`

- [ ] Add the same explicit presentation prop.
- [ ] In direct-apply mode, reveal both stored rewards immediately.
- [ ] Apply both rewards through the existing guarded outcome path while retaining the combined result modal.

### Task 4: Inventory wiring and verification

**Files:**
- Modify: `app/level_gifts_inventory.tsx`
- Test: `tests/gift_inventory_apply_presentation_contract.test.ts`
- Test: `tests/level_gift_claim_success_contract.test.ts`
- Test: `tests/level_gift_inventory.test.ts`

- [ ] Pass direct-apply presentation from both inventory modal call sites.
- [ ] Run the focused gift tests and inspect the final diff.
