# Season Pass Reward Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace reused Season Pass reward art with large theme-aware unique icons and new animated aura stages while preserving reward behavior.

**Architecture:** `app/season_pass_track_config.ts` owns static light/dark asset maps and typed resolver functions. `app/season_pass.tsx` and `components/SeasonGiftModal.tsx` consume those resolvers using the current `ThemeMode`. Every aura is composed from independent base, flow, and particle WebPs. Final assets are cropped from eight built-in DALL·E atlases and checked by a focused contract test.

**Tech Stack:** React Native, Expo Image assets, TypeScript, React Native Animated, Jest contract tests, Sharp for mechanical atlas processing.

---

### Task 1: Add failing reward-art contracts

**Files:**
- Create: `tests/season_pass_reward_art.test.ts`
- Read: `app/season_pass_track_config.ts`
- Read: `app/season_pass.tsx`
- Read: `components/SeasonGiftModal.tsx`
- Read: `components/SeasonAuraRing.tsx`

- [x] **Step 1: Write the failing asset-map test**

Create a source contract that requires exactly sixteen light and sixteen dark reward asset paths, three independent layer paths for each of five light and five dark auras, `isLightThemeMode`-based resolution, and static `require()` calls under `assets/images/season/rewards` and `assets/images/season/auras`.

- [x] **Step 2: Write the failing UI visibility and lifecycle test**

Require `SEASON_REWARD_ART_SIZE >= 56`, `SEASON_AURA_ART_SIZE >= 60`, a row height of at least 104, theme-aware resolvers in both consumers, and `AppState`, focus, Reduced Motion, and loop cleanup markers in `SeasonAuraRing`.

- [x] **Step 3: Run the focused test and confirm RED**

Run:

```powershell
npx jest --runTestsByPath tests/season_pass_reward_art.test.ts --no-cache --runInBand
```

Expected: FAIL because theme-aware maps, dimensions, and generated assets do not exist yet.

### Task 2: Wire typed light/dark asset maps

**Files:**
- Modify: `app/season_pass_track_config.ts`
- Modify: `app/season_pass.tsx`
- Modify: `components/SeasonGiftModal.tsx`
- Test: `tests/season_pass_reward_art.test.ts`

- [x] **Step 1: Replace the shared reward constant with typed maps**

Add `SEASON_REWARD_ART_KINDS`, `SEASON_REWARD_ICON_SOURCES`, and `getSeasonRewardIcon(kind, themeMode)`. Use one static `require()` for each light and dark reward file and return `undefined` for system rewards such as pearls and aura kinds.

- [x] **Step 2: Add typed aura variants**

Add light/dark arrays for stages I–IV plus a light/dark secret aura map. Every entry exposes `baseSource`, `flowSource`, and `particlesSource` plus independent motion timings/directions. Export `getSeasonAuraStageAsset(stage, themeMode)` and `getSeasonSecretAuraAsset(themeMode)`.

- [x] **Step 3: Update both UI consumers**

Resolve art with `themeMode` in the track, modal hero, and choice rows. Keep pearl handling on `pearlIconForTheme`.

- [x] **Step 4: Run the focused test**

Run the Task 1 Jest command. Expected: asset-path assertions pass once files exist; layout assertions may still fail until Task 4.

### Task 3: Generate and process the DALL·E art

**Files:**
- Create: `.codex-tmp/season-pass-art/reward-light-atlas.png`
- Create: `.codex-tmp/season-pass-art/reward-dark-atlas.png`
- Create: `.codex-tmp/season-pass-art/aura-light-{base,flow,particles}-atlas.png`
- Create: `.codex-tmp/season-pass-art/aura-dark-{base,flow,particles}-atlas.png`
- Create: `assets/images/season/rewards/light/*.webp`
- Create: `assets/images/season/rewards/dark/*.webp`
- Create: `assets/images/season/auras/light/*.webp`
- Create: `assets/images/season/auras/dark/*.webp`
- Delete after zero-reference check: old `assets/images/season/reward_*.webp` and old flat `assets/images/season/aura_*.webp`

- [x] **Step 1: Generate the two 4 × 4 reward atlases**

Use built-in image generation with the fixed row-major order from `SEASON_REWARD_ART_KINDS`, a uniform `#00FF00` background, one centered object per cell, no labels, no shadows on the background, and no object crossing a cell boundary. Generate a high-contrast porcelain version and a luminous dark-theme version.

- [x] **Step 2: Generate the six layered aura atlases**

Use five isolated cells in order: stage I, stage II, stage III, stage IV, secret. Generate base, flow, and particles separately for both theme families. Keep the central avatar opening transparent after key removal, make each stage structurally different, and keep Stage II to a clean circular base plus one separate C-shaped flow ribbon.

- [x] **Step 3: Crop, remove the key, and compress**

Use the bundled Sharp runtime to crop deterministic grid cells, remove chroma-key pixels with a soft edge, trim only safe outer padding, resize reward outputs to 256 × 256 and aura outputs to 320 × 320, and write alpha WebP at quality 72.

- [x] **Step 4: Validate generated files**

For every final asset assert WebP format, four channels, alpha present, non-empty subject coverage, expected dimensions, and a reasonable compressed byte size. Build local contact sheets for inspection under `.codex-tmp/season-pass-art/`.

- [x] **Step 5: Remove replaced flat assets safely**

Copy old files to `.codex-tmp/season-pass-art/old-assets-backup/`, confirm no source references remain with literal `rg`, then delete only the explicitly replaced old Season Pass reward and aura files.

### Task 4: Enlarge cards and harden aura motion

**Files:**
- Modify: `app/season_pass.tsx`
- Modify: `components/SeasonAuraRing.tsx`
- Test: `tests/season_pass_reward_art.test.ts`

- [x] **Step 1: Enlarge the track art**

Set exported constants `SEASON_REWARD_ART_SIZE` and `SEASON_AURA_ART_SIZE` to at least 56 and 60. Increase `ROW_HEIGHT` to at least 104 and switch reward cards to an art-first vertical layout with labels below the art.

- [x] **Step 2: Move status indicators out of the content row**

Position lock and claim indicators in the card corner so they no longer reduce label width. Preserve the existing claim handler, disabled state, opacity, test IDs, and 44 × 44 minimum touch target.

- [x] **Step 3: Add foreground lifecycle gating**

In `SeasonAuraRing`, stack the base, flow, and particle images. Give each layer its own rotation duration/direction and pulse/twinkle transform. Start loops only when focused, active, and motion is allowed. Stop loops on background/inactive transitions and during cleanup. Animate only scale, rotation, and opacity; return a static frame for Reduced Motion.

- [x] **Step 4: Run focused tests**

Run the Task 1 Jest command. Expected: PASS.

### Task 5: Final verification

**Files:**
- Verify: `tests/season_pass_reward_art.test.ts`
- Verify: `tests/runtime_lifecycle_ratchet.test.ts`
- Verify: `tests/perf_freeze_contract.test.ts`
- Verify: `app/season_pass.tsx`
- Verify: `components/SeasonGiftModal.tsx`

- [ ] **Step 1: Run narrow contracts**

The Season Pass and performance contracts pass. The full lifecycle ratchet still detects the unrelated untracked `components/tournament/TournamentBackdrop.tsx`; its reviewed-owner assertion passes for both Season Pass animation files.

```powershell
npx jest --runTestsByPath tests/season_pass_reward_art.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/perf_freeze_contract.test.ts --no-cache --runInBand
```

Expected: all tests pass.

- [x] **Step 2: Run targeted TypeScript diagnostics**

Run the repository TypeScript command only if it can be scoped; otherwise run the existing compiler and filter decisive diagnostics to the modified files without dumping the complete log into the conversation.

- [x] **Step 3: Verify asset references and repository hygiene**

Confirm every new bundled file appears in a static `require()`, no removed filename remains referenced, `git diff --check` passes, and unrelated pre-existing worktree changes remain untouched.

- [x] **Step 4: Inspect final contact sheets**

Open both reward and aura contact sheets and verify silhouettes, theme contrast, cell identity, alpha edges, and absence of text/watermarks before reporting completion.
