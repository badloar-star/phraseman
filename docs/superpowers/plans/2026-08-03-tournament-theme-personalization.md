# Tournament Theme Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every selectable Phraseman theme a separately authored Tournament environment across every Tournament screen without changing gameplay.

> **Owner override (2026-08-03):** the final implementation contains exactly two
> theme slots per selectable theme: `backdrop` and `podium` (18 WebP files total).
> All older plan steps mentioning `header` or `ornament` are superseded.

**Architecture:** A static typed resolver owns four raster slots for each selectable theme and maps removed themes to existing kits. One `TournamentBackdrop` component renders the correct kit and composition variant behind existing screen content, with decorative motion gated by focus, AppState, and Reduced Motion.

**Tech Stack:** React Native, Expo Router, Expo Linear Gradient, Reanimated, static Metro assets, Sharp, Jest contract tests.

---

## File Map

- Create `components/tournament/tournament_theme_assets.ts`: static `require()` map and typed resolver.
- Create `components/tournament/TournamentBackdrop.tsx`: shared themed visual layers and guarded motion.
- Create `tests/tournament_theme_personalization_contract.test.ts`: asset, mapping, wiring, budget, and runtime guard contracts.
- Create `assets/images/tournament/themes/<theme>/{backdrop,header,podium,ornament}.webp`: 36 final files.
- Modify the eight Tournament screen files to render the shared backdrop with their role-specific variant.
- Modify `components/tournament/TournamentEdgeState.tsx` so isolated error states receive the `edge` composition.

### Task 1: Lock the theme asset contract

**Files:**
- Create: `tests/tournament_theme_personalization_contract.test.ts`
- Create: `components/tournament/tournament_theme_assets.ts`

- [ ] **Step 1: Write the failing resolver contract**

The test must assert four distinct literal paths for each of `indigo`, `sagePorcelain`, `midnight`, `ember`, `aurora`, `volt`, `dark`, `coral`, and `gold`; legacy mappings must be `minimalDark/candyBlue -> indigo`, `business -> gold`, and `businessLight -> sagePorcelain`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx jest --runTestsByPath tests/tournament_theme_personalization_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the resolver and final asset files do not exist.

- [ ] **Step 3: Add the typed static resolver**

Define:

```ts
export type TournamentThemeAssetKit = Readonly<{
  backdrop: ImageSourcePropType;
  header: ImageSourcePropType;
  podium: ImageSourcePropType;
  ornament: ImageSourcePropType;
}>;

export function getTournamentThemeAssets(themeMode: ThemeMode): TournamentThemeAssetKit;
```

Every selectable theme owns four literal `require()` calls. Legacy entries reference existing constants and add no asset files.

### Task 2: Build the shared rendering primitive

**Files:**
- Create: `components/tournament/TournamentBackdrop.tsx`
- Modify: `tests/tournament_theme_personalization_contract.test.ts`

- [ ] **Step 1: Add failing source contracts**

Assert the component exposes these exact variants:

```ts
export type TournamentBackdropVariant =
  | 'hub' | 'lobby' | 'play' | 'table' | 'results'
  | 'review' | 'season' | 'tickets' | 'edge';
```

The test also requires `useIsScreenFocused`, `AppState`, `AccessibilityInfo.isReduceMotionEnabled`, cleanup, static `Image` sources, and `importantForAccessibility="no-hide-descendants"` on decoration.

- [ ] **Step 2: Verify RED, then implement**

`TournamentBackdrop` must render:

- an absolute full-screen `backdrop` image;
- a theme-derived readability gradient;
- `header` for hub/lobby/season/tickets;
- `podium` for table/results;
- `ornament` for edge and low-density peripheral decoration;
- only the backdrop and scrim for play/review;
- opacity/translate motion only for hub/lobby/results, disabled on blur, inactive AppState, or Reduced Motion.

- [ ] **Step 3: Run the focused test and verify GREEN for component contracts**

### Task 3: Wire every Tournament surface

**Files:**
- Modify: `app/(tabs)/tournaments.tsx`
- Modify: `app/tournament_lobby.tsx`
- Modify: `app/tournament_round.tsx`
- Modify: `app/tournament_table.tsx`
- Modify: `app/tournament_results.tsx`
- Modify: `app/tournament_review.tsx`
- Modify: `app/tournament_season.tsx`
- Modify: `app/tournament_tickets.tsx`
- Modify: `components/tournament/TournamentEdgeState.tsx`
- Modify: `tests/tournament_theme_personalization_contract.test.ts`

- [ ] **Step 1: Add a failing screen-wiring table**

Require these literal pairings:

```txt
tournaments.tsx -> hub
tournament_lobby.tsx -> lobby
tournament_round.tsx -> play
tournament_table.tsx -> table
tournament_results.tsx -> results
tournament_review.tsx -> review
tournament_season.tsx -> season
tournament_tickets.tsx -> tickets
TournamentEdgeState.tsx -> edge
```

- [ ] **Step 2: Insert `TournamentBackdrop` as the first child of each root**

Decoration remains behind existing content with `pointerEvents="none"`; no event handler, navigation call, timer, Firestore operation, or Tournament state expression changes.

- [ ] **Step 3: Run the focused contract and existing Tournament screen contracts**

Run:

```powershell
npx jest --runTestsByPath tests/tournament_theme_personalization_contract.test.ts tests/tournament_screens_contract.test.ts tests/tournament_round_visual_fidelity.test.ts --no-cache --runInBand
```

Expected: all tests pass apart from the still-missing final raster file gate.

### Task 4: Generate and compress nine independent art kits

**Files:**
- Create: `assets/images/tournament/themes/<theme>/{backdrop,header,podium,ornament}.webp`
- Temporary only: `.codex-tmp/tournament-theme-art/**`

- [ ] **Step 1: Generate one four-cell atlas per selectable theme**

Use Codex built-in image generation with that theme's existing home assets as references. Each 2 × 2 atlas contains, in fixed order: backdrop, header, podium, ornament. Composition, material, light, and silhouette must differ between themes; prompts must explicitly reject recoloring a shared template, text, logos, fantasy clutter, and UI controls.

- [ ] **Step 2: Process each atlas locally**

Use Sharp to crop the fixed cells, remove chroma only from transparent slots, resize to `512×768` backdrop, `512×320` header, `512×320` podium, and `384×384` ornament, then encode WebP at visually selected quality 58–76 with alpha preservation.

- [ ] **Step 3: Inspect contact sheets**

Create ignored contact sheets showing all nine kits on both light-neutral and dark-neutral surfaces. Reject any kit that is a palette copy, has unreadable tiny objects, contains text, or conflicts with its home references.

- [ ] **Step 4: Run the final asset gate**

Require 36 files, correct dimensions, alpha for transparent slots, no unreferenced final file, and total size at or below 1.2 MB.

### Task 5: Verify runtime and preserve performance

**Files:**
- Modify only if a focused gate identifies a defect.

- [ ] **Step 1: Run focused Jest contracts**

```powershell
npx jest --runTestsByPath tests/tournament_theme_personalization_contract.test.ts tests/tournament_screens_contract.test.ts tests/tournament_round_visual_fidelity.test.ts tests/perf_freeze_contract.test.ts tests/owner_direction_runtime_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 2: Run targeted lint/type checks**

Lint only modified Tournament TypeScript files. Run the repository's focused TypeScript command if available; do not run broad unrelated suites.

- [ ] **Step 3: Verify Metro registration**

Request a fresh Android development bundle and HTTP-fetch each of the 36 assets. Require HTTP 200 and matching SHA-256 hashes.

- [ ] **Step 4: Capture representative screenshots**

Capture hub, play, and results for all nine selectable themes. Confirm content contrast, no empty upper fields, no asset intrusion into question/answer/CTA zones, and correct theme identity.

- [ ] **Step 5: Final diff audit**

Confirm no Tournament behavior, data schema, economy, navigation, or server files changed; confirm no raw generation sources entered `assets/images/**`.
