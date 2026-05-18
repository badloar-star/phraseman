# Themed Reward Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give level-up and level-gift modals unique generated backdrops per app theme while preserving reward behavior.

**Architecture:** Add a small modal backdrop registry keyed by `ThemeMode`. Use generated project-local WebP assets behind existing modal content, with per-theme scrims and glass/chrome panels for readability.

**Tech Stack:** React Native, Expo, `expo-linear-gradient`, generated WebP assets, Jest/TypeScript checks.

---

### Task 1: Generate Project Assets

**Files:**
- Create: `assets/images/reward_modals/reward-modal-forest.webp`
- Create: `assets/images/reward_modals/reward-modal-neon.webp`
- Create: `assets/images/reward_modals/reward-modal-gold.webp`
- Create: `assets/images/reward_modals/reward-modal-coral.webp`
- Create: `assets/images/reward_modals/reward-modal-sketch.webp`
- Create: `assets/images/reward_modals/reward-modal-graphite.webp`

- [ ] Generate six DALL-E/imagegen backdrops with no text, logos, faces, or UI.
- [ ] Copy generated files into `assets/images/reward_modals/`.
- [ ] Convert to WebP if needed.

### Task 2: Add Registry And Shared Chrome Helpers

**Files:**
- Create: `components/rewardModalArt.ts`

- [ ] Define a `REWARD_MODAL_BACKDROPS: Record<ThemeMode, ImageSourcePropType>`.
- [ ] Add helpers for scrim colors, card colors, accent colors, and CTA gradients.
- [ ] Keep the public API small: source lookup plus style tokens.

### Task 3: Update Level-Up Modal

**Files:**
- Modify: `app/_layout.tsx`

- [ ] Import the reward modal art helpers.
- [ ] Render the theme backdrop behind the current level-up content.
- [ ] Keep existing copy, `LevelBadge`, dismiss behavior, and `testID` values.
- [ ] Add accessibility role/name to the dismiss button.

### Task 4: Update Gift Modals

**Files:**
- Modify: `components/LevelGiftModal.tsx`
- Modify: `components/LevelGiftDualModal.tsx`

- [ ] Import the reward modal art helpers.
- [ ] Render the same theme backdrop family behind single and dual gift flows.
- [ ] Keep current gift rolling, saving, claiming, and avatar navigation behavior.
- [ ] Preserve current `testID` values.

### Task 5: Verify

**Files:**
- Test: `tests/level_gift_milestones.test.ts`
- Test: `tests/level_gift_inventory.test.ts`

- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Run level gift tests with Jest.
- [ ] If verification fails because of unrelated dirty worktree issues, report that separately.
