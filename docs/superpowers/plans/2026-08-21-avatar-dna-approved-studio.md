# Avatar DNA Approved Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved warm premium Avatar Studio: a coherent static 3D character, exact five-tab mobile composition, instant offline choices, and a saved portrait used by the application.

**Architecture:** `human_v2` is a single canonical GLB with bounded face morphs and compatible wearable meshes. The visible Studio uses the approved layout and drives a pure resolver; all selectable assets are local and prewarmed before input. A static snapshot is the only avatar representation outside Studio.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Expo GL, Three.js, React Three Fiber native, React Native Reanimated for UI-only micro-interactions, static GLB/texture assets, Jest/RNTL.

---

## File map

- `assets/avatar-dna/human_v2/` — final bundled canonical GLB, texture atlas, wearable meshes and immutable manifest.
- `modules/avatar-dna-3d/catalog.ts` — validates local 3D IDs, compatibility and asset budgets.
- `modules/avatar-dna-3d/resolver.ts` — pure DNA-to-morph/mesh/material output; no asset I/O.
- `modules/avatar-dna-3d/prewarm.ts` — one-shot local asset and shader readiness gate.
- `components/avatar-dna-3d/Avatar3DStage.tsx` — demand-rendered native preview with a known-good first frame.
- `components/avatar-dna-3d/AvatarStudioScreen.tsx` — exact approved mobile composition, undo/redo, tabs and fixed save action.
- `components/avatar-dna-3d/AvatarStudioCatalog.tsx` — virtualized section grids and selected/locked a11y state.
- `modules/avatar-dna-3d/storage.ts` — account-scoped durable DNA and portrait snapshot metadata.
- `components/AvatarView.tsx` — resolves the saved static portrait on ordinary app surfaces.

### Task 1: Canonical asset contract and validator

**Files:**
- Create: `assets/avatar-dna/human_v2/manifest.json`
- Create: `modules/avatar-dna-3d/catalog.ts`
- Create: `tests/avatar_dna_3d_catalog.test.ts`

- [ ] **Step 1: Write failing catalog tests** for one base GLB, three face presets, two hairstyles, one outfit, one hood, explicit coverage zones, SHA-256 values and a 60k visible-triangle ceiling.
- [ ] **Step 2: Run** `npx jest --runTestsByPath tests/avatar_dna_3d_catalog.test.ts --runInBand` and observe the missing-catalog failure.
- [ ] **Step 3: Implement** `parseAvatar3DCatalog(input)` that rejects unknown keys, absent local paths, duplicate IDs, mesh items without `human_v2`, missing hood coverage and budgets above the ceiling.
- [ ] **Step 4: Run the focused test** and require PASS.

### Task 2: Replace primitives with the approved coherent model

**Files:**
- Modify: `components/avatar-dna-3d/Avatar3DScene.tsx`
- Modify: `components/avatar-dna-3d/Avatar3DStage.tsx`
- Create: `tests/avatar_dna_3d_scene_contract.test.ts`

- [ ] **Step 1: Write a failing test** requiring the scene to load one local `human_v2` asset, apply only manifest mesh IDs and retain `frameloop="demand"` without `useFrame`.
- [ ] **Step 2: Run** the focused test and observe RED.
- [ ] **Step 3: Implement** a single local GLB scene graph; apply morph weights to the shared head mesh and toggle only preloaded compatible hair/outfit/hood nodes. Use portrait and studio cameras only. The model never rotates, blinks or animates.
- [ ] **Step 4: Run focused contracts** and manually verify one visible first frame, natural eye/nose/mouth proportions and all face/hair/hood combinations.

### Task 3: Approved Studio layout

**Files:**
- Create: `components/avatar-dna-3d/AvatarStudioScreen.tsx`
- Create: `components/avatar-dna-3d/AvatarStudioTabs.tsx`
- Create: `components/avatar-dna-3d/AvatarStudioCatalog.tsx`
- Create: `tests/avatar_dna_3d_approved_layout.test.tsx`

- [ ] **Step 1: Write a failing RNTL test** requiring the title, back/undo/redo controls, a large portrait, exactly five tabs (`Основа`, `Лицо`, `Волосы`, `Образ`, `Сцена`), selected-state a11y, and fixed `Сохранить персонажа` action.
- [ ] **Step 2: Run** the focused test and observe RED.
- [ ] **Step 3: Implement** the approved cream/cocoa/terracotta layout. Use 44px minimum controls, cards with soft shadows, UI-only 150–300ms transform/opacity transitions and dark text on green success surfaces.
- [ ] **Step 4: Run the focused test** and compare a device screenshot to the approved concept before continuing.

### Task 4: Offline instant catalog interaction

**Files:**
- Modify: `modules/avatar-dna-3d/prewarm.ts`
- Modify: `components/avatar-dna-3d/AvatarStudioCatalog.tsx`
- Create: `tests/avatar_dna_3d_offline_interaction.test.ts`

- [ ] **Step 1: Write failing tests** for disabled catalog input before prewarm, no `fetch`, immediate selected state after a tap, and deterministic hood/hair conflict behavior.
- [ ] **Step 2: Run focused tests** and observe RED.
- [ ] **Step 3: Implement** a one-promise prewarm of all locally selectable meshes, atlas textures and material instances before enabling the grids. Item selection updates pure DNA, resolver state and one demand frame only.
- [ ] **Step 4: Run tests on iPhone and Android**; record p95 interaction as `instant` and reject any spinner, network request or continuous render loop.

### Task 5: Local save, portrait snapshot and consumers

**Files:**
- Create: `modules/avatar-dna-3d/storage.ts`
- Modify: `components/avatar-dna-3d/AvatarStudioScreen.tsx`
- Modify: `components/AvatarView.tsx`
- Create: `tests/avatar_dna_3d_snapshot_flow.test.ts`

- [ ] **Step 1: Write failing tests** requiring local validation, local portrait snapshot, atomic DNA/snapshot confirmation and legacy-avatar fallback when GL fails.
- [ ] **Step 2: Run focused tests** and observe RED.
- [ ] **Step 3: Implement** save order: validate DNA → resolve plan → render portrait → snapshot locally → atomically confirm metadata → notify `AvatarView`; start no network operation before local confirmation.
- [ ] **Step 4: Run focused tests** and verify saved portrait on home, profile and table surfaces.

### Task 6: Device gate and rollout decision

**Files:**
- Create: `docs/superpowers/reports/avatar-dna-approved-studio-device-gate.md`
- Modify: `app/(tabs)/home.tsx`

- [ ] **Step 1: Keep the entry developer-only** until iPhone and Android evidence both PASS.
- [ ] **Step 2: Test ten open/close cycles** on each device; require no crash, no memory growth, no missing model and no degraded selection speed.
- [ ] **Step 3: Compare screenshots** against the approved concept; reject Memoji-like proportions, broken face anatomy, flat substitute UI or technical copy.
- [ ] **Step 4: Record evidence** and only then expose the Studio behind a deliberate remote rollout.

## Self-review

- The plan implements the exact visual hierarchy and static coherent-character requirement in Task 3 and Task 2.
- It excludes independent generated facial PNG parts entirely.
- It retains offline, instant interaction and no-character-animation invariants in Task 4.
- It withholds production entry until device evidence exists in Task 6.
