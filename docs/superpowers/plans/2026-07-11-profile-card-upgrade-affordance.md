# Profile Card Upgrade Affordance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous diamond-only profile-card upgrade control with a compact upward-arrow circle placed below the close button.

**Architecture:** Keep all upgrade state and handlers in `PlayerProfileModal.tsx`. Change only the owner-card affordance; the preview panel, purchase action, eligibility conditions, and backend flow remain untouched.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, Ionicons, Jest source-contract tests.

---

### Task 1: Guard the circular affordance contract

**Files:**
- Create: `tests/player_profile_upgrade_affordance.test.ts`
- Modify: `components/PlayerProfileModal.tsx`

- [x] **Step 1: Write a failing source-contract test**

Assert that the owner-only control keeps its current eligibility condition and handler, uses `Pressable`, displays only `arrow-up`, uses the existing circular action size, sits below the close button, and no longer uses a diamond as its main icon.

- [x] **Step 2: Verify the test fails for the previous misplaced pill control**

Run: `npx jest --runTestsByPath tests/player_profile_upgrade_affordance.test.ts --no-cache --runInBand`

Expected: FAIL because the control still sits at the upper-left and includes the old visible upgrade label instead of the arrow-only circular control.

- [x] **Step 3: Implement the approved circular control**

Replace only `player-profile-upgrade-card` with a same-size circular `Pressable` below the close button. Preserve `isMe && ENABLE_PROFILE_CARD && nextRealLevel !== null`, `handleUpgradeButtonTap`, gradient styling, haptics, accessibility, and preview behavior.

- [x] **Step 4: Run focused verification**

Run the new Jest test, the existing profile-card redesign and runtime contracts, and targeted ESLint for the modified component.

Expected: all focused checks pass without warnings introduced by this change.
