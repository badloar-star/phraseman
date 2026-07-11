# Lessons V2 Experimental Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-only `V2` tab inside the existing lessons surface with a dense learning-path map and explicit controls for testing each lesson stage, while preserving Legacy lessons, Route, and Dialogs.

**Architecture:** Keep the existing `app/(tabs)/lessons.tsx` as the page shell and add a focused `LessonsV2TabContent` component for the experimental surface. The V2 tab is gated by `ENABLE_DEV_TOOLS`; V2 controls use local experimental state and route only to existing safe destinations until dedicated V2 mode screens are approved. Legacy lesson progress and navigation remain untouched.

**Tech Stack:** React Native, Expo Router, TypeScript, `react-native-svg`, existing Theme/Lang contexts, Jest source-contract tests.

---

### Task 1: Lock the V2 entry contract

**Files:**
- Create: `tests/lessons_v2_surface_contract.test.ts`
- Modify: `app/(tabs)/lessons.tsx`

- [ ] **Step 1: Write the failing contract test**

Assert that the lessons source contains a `v2` page state, an `ENABLE_DEV_TOOLS` gate, a visible `V2` tab label, and a dedicated `LessonsV2TabContent` import/render path.

- [ ] **Step 2: Run the focused test and verify RED**

Run `npx jest --runTestsByPath tests/lessons_v2_surface_contract.test.ts --no-cache --runInBand`.

Expected: fail because the V2 state, gate, label, and component do not yet exist.

### Task 2: Build the V2 experimental content component

**Files:**
- Create: `components/LessonsV2TabContent.tsx`
- Create: `components/lessons_v2_map.tsx` if map extraction is needed to keep the main component focused

- [ ] **Step 1: Add theme-aware V2 screen geometry**

Use a `ScrollView` with a dense winding route, fixed-size hex stage nodes, a progress header, and no container borders. Use background/material contrast, shadows, and existing theme tokens. Keep all targets at least 44 px.

- [ ] **Step 2: Add stage data and explicit stage states**

Define a small typed list for `Words`, `Theory`, `Build`, `Listen`, `Speak`, `Recall`, `Mini-game`, and `Exam`, with `completed`, `current`, `recommended`, and `locked` states. Do not change canonical lesson progress.

- [ ] **Step 3: Add dev-only stage controls**

Render controls only when `ENABLE_DEV_TOOLS` is true. Each control must have an explicit label and a stable testID. For the first scaffold, controls may open an approved existing route or show an in-surface preview state; they must not silently replace Legacy lesson behavior.

- [ ] **Step 4: Add minimal animation with focus-safe cleanup**

Use press feedback and finite entrance/current-node motion. Avoid unguarded infinite loops in the tab screen; respect reduced motion where the existing app pattern supports it.

### Task 3: Wire the V2 tab into the existing lessons shell

**Files:**
- Modify: `app/(tabs)/lessons.tsx`

- [ ] **Step 1: Extend page state**

Change the local page union to include `v2` without changing the existing `lessons` or `dialogs` semantics.

- [ ] **Step 2: Add the dev-gated tab**

Import `ENABLE_DEV_TOOLS`, render a `TabUnderlineButton` labeled `V2` only when enabled, and preserve the existing tab order and behavior for all non-V2 users.

- [ ] **Step 3: Render V2 content without unmounting Legacy unnecessarily**

Use the same page switching pattern as Dialogs, with V2 content isolated from canonical lesson list hydration and progress storage.

- [ ] **Step 4: Run the focused contract test and verify GREEN**

Run `npx jest --runTestsByPath tests/lessons_v2_surface_contract.test.ts --no-cache --runInBand`.

Expected: PASS.

### Task 4: Verification

**Files:**
- Test: `tests/lessons_v2_surface_contract.test.ts`
- Verify: `app/(tabs)/lessons.tsx`, `components/LessonsV2TabContent.tsx`

- [ ] **Step 1: Run the focused contract and relevant lessons guards**

Run `npx jest --runTestsByPath tests/lessons_v2_surface_contract.test.ts tests/lessons_tab_locale_runtime.test.ts tests/lessons_locked_tile_themed_color.test.ts --no-cache --runInBand`.

- [ ] **Step 2: Run TypeScript validation**

Run `npx tsc --noEmit --pretty false` and record any pre-existing failures separately.

- [ ] **Step 3: Inspect the final diff**

Confirm no Legacy route, progress key, storage contract, or existing tab was removed or bypassed, and that V2 remains dev-gated.
