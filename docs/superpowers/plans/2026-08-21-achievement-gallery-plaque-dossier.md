# Achievement Gallery Plaque and Award Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oval shelf glow, thin summary typography, and weak achievement actions with a theme-native gallery wash, museum plaque, and premium award dossier.

**Architecture:** Keep the existing achievement carousel, state, reward claim, progress, sharing, localization, and route contracts. Change only the SVG light geometry in `AchievementShelfStageArt` and the presentation markup in `AchievementModal` and `renderShelfDetail`; verify the intended hierarchy with narrow source contracts before editing production code.

**Tech Stack:** React Native, Expo LinearGradient, `react-native-svg`, existing `TapScale`, Jest source-contract tests.

---

### Task 1: Tapered gallery wash

**Files:**
- Modify: `tests/achievement_shelf_contract.test.ts`
- Modify: `components/achievements/AchievementShelfStageArt.tsx`

- [ ] **Step 1: Write the failing light-shape contract**

Replace the radial-light assertion with checks for an SVG `LinearGradient`, a `gallery-wash` test ID, a tapered `Path`, and the absence of `RadialGradient`/full rectangular light fill.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the stage still imports/renders `RadialGradient` and uses the old test ID.

- [ ] **Step 3: Implement the minimal gallery wash**

Use a vertical SVG linear gradient with transparent top and bottom stops inside one wide, softly tapered path. Keep the existing Reanimated wrapper and theme-derived `lightCore`, `lightMid`, and `lightOuter` colors.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same Jest command. Expected: PASS.

### Task 2: Museum plaque and award dossier

**Files:**
- Create: `tests/achievement_premium_detail_contract.test.ts`
- Modify: `app/achievements_screen.tsx`

- [ ] **Step 1: Write failing presentation contracts**

Assert that the shelf plaque has a dedicated test ID, weight `600` description, compact unlock row, and accessible contained open affordance. Assert that the modal has a dossier test ID, weight `600` description, full-width primary share action with icon/accessibility label, and full-width secondary close action. Preserve source assertions for `buildAchievementShareMessage`, `Share.share`, `achievement_shared`, optimistic pearl claim ordering, and `claimAchievementShardReward`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx jest --runTestsByPath tests/achievement_premium_detail_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the new test IDs, semibold descriptions, status rows, and full-width actions are absent.

- [ ] **Step 3: Implement the museum plaque**

Restyle `renderShelfDetail` with theme-native surfaces, a small category marker, weight `900` title, weight `600` description, a contained 44-point open icon target, and an icon-backed unlock-date chip. Keep the complete carousel detail tap behavior unchanged.

- [ ] **Step 4: Implement the award dossier**

Restyle the existing modal container and hero area, strengthen title/description, contain date/progress/reward information, and replace the text share link with a minimum-48-point full-width accent button. Use a dark foreground on the accent CTA and retain the full-width quiet close button plus all existing callbacks.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run: `npx jest --runTestsByPath tests/achievement_premium_detail_contract.test.ts tests/achievement_shelf_contract.test.ts tests/achievements_modal_scroll_contract.test.ts tests/achievements.test.ts --no-cache --runInBand`

Expected: all focused suites PASS.

### Task 3: Focused verification

**Files:**
- Verify: `app/achievements_screen.tsx`
- Verify: `components/achievements/AchievementShelfStageArt.tsx`
- Verify: `tests/achievement_premium_detail_contract.test.ts`
- Verify: `tests/achievement_shelf_contract.test.ts`

- [ ] **Step 1: Check formatting and accidental edits**

Run: `git diff --check -- app/achievements_screen.tsx components/achievements/AchievementShelfStageArt.tsx tests/achievement_premium_detail_contract.test.ts tests/achievement_shelf_contract.test.ts`

Expected: exit 0.

- [ ] **Step 2: Run TypeScript on touched-file diagnostics**

Run the project TypeScript command, capture output outside the conversation, and filter diagnostics to the two touched production files. Expected: no diagnostics for either file; unrelated repository diagnostics may remain and must be reported honestly.

- [ ] **Step 3: Re-read the approved spec and inspect the final diff**

Confirm: no oval/radial light; no raster shelf; plaque body is semibold; Share and Close are full-width; bright accent uses dark foreground; reward/share/progress/navigation contracts are unchanged; no Achievements tab was added.
