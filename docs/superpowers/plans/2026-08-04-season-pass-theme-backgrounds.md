# Fixed Season Pass Theme Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scrolling/repeating Season Pass tiles with one seamless, high-resolution, fixed portrait background per interface theme.

**Architecture:** A typed static registry returns one full-screen image source for the active `ThemeMode`. The screen mounts that image once as an absolute layer below `FlatList`; the existing long SVG keeps only the continuous gold spine and scrolls with the reward content.

**Tech Stack:** React Native, TypeScript, React Native SVG, built-in Codex image generation, Sharp, Jest.

---

### Task 1: Lock the new asset and rendering contract

**Files:**
- Modify: `tests/season_pass_theme_backgrounds_contract.test.ts`

- [ ] **Step 1: Change the registry assertions from 26 side tiles to 13 full-screen assets**

Require exactly one literal path per theme:

```ts
require('../assets/images/season/backgrounds/<theme>/background.webp')
```

Assert 13 unique files, WebP metadata `768 × 1152`, a 500,000-byte total ceiling, a 110,000-byte per-file ceiling, and 13 distinct SHA-256 hashes.

- [ ] **Step 2: Add the fixed-layer screen assertions**

Assert that `app/season_pass.tsx` renders the decorative image before `<FlatList`, uses `resizeMode="cover"`, sets `pointerEvents="none"` and `accessible={false}`, and no longer imports or renders `Pattern`, `SvgImage`, `ClipPath`, or `Rect`.

- [ ] **Step 3: Run the test and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/season_pass_theme_backgrounds_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the current registry exposes `{ free, plus }`, current assets are 512 × 768, and SVG image patterns still render inside the scrolling header.

### Task 2: Wire the fixed background architecture

**Files:**
- Modify: `app/season_pass_theme_backgrounds.ts`
- Modify: `app/season_pass.tsx`
- Test: `tests/season_pass_theme_backgrounds_contract.test.ts`

- [ ] **Step 1: Simplify the registry to one source per theme**

Use a `Record<ThemeMode, ImageSourcePropType>` with 13 literal `background.webp` requires. `getSeasonPassThemeBackground(themeMode)` returns the source directly.

- [ ] **Step 2: Mount one absolute decorative image below the list**

Inside the root screen view and before `FlatList`, render:

```tsx
<Image
  source={seasonBackground}
  resizeMode="cover"
  pointerEvents="none"
  accessible={false}
  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
/>
```

Add only a restrained theme-colored absolute scrim if required for readability. It must also ignore pointer and accessibility input.

- [ ] **Step 3: Remove only the scrolling raster pattern layer**

Reduce the SVG import to `Svg, { Path }`. Delete the `Defs`, `Pattern`, `SvgImage`, `ClipPath`, `Rect`, Free fill, and Plus fill markup. Preserve `backgroundRegions.divider`, `spineGoldPath`, reward rows, and every interactive behavior.

- [ ] **Step 4: Run the source contract**

Run the Task 1 Jest command. Expected: registry structure assertions pass; asset metadata assertions remain RED until the new files exist.

### Task 3: Generate full-resolution theme artwork

**Files:**
- Create: `.codex-tmp/season-pass-fixed-backgrounds/sources/<theme>.png`
- Replace: `assets/images/season/backgrounds/<theme>/background.webp`
- Remove after successful wiring: old `assets/images/season/backgrounds/<theme>/free.webp` and `plus.webp`

- [ ] **Step 1: Generate one portrait source per theme with built-in image generation**

Each prompt requests one unified vertical mobile-game background, no panels or hard seam, calm Free left, richer Plus right, soft central blend, quiet header area, no text/UI/baked line, and high micro-detail. Generate themes sequentially to minimize local resource pressure.

For `ember`, repeat this invariant verbatim in the prompt:

```text
No fire, flames, lava, sparks, embers, magma, glowing cracks, burnt landscape, or volcanic imagery. Use warm amber glass, dark plum, smoked bronze, and soft mineral light instead.
```

- [ ] **Step 2: Save sources outside the bundle and inspect each at original resolution**

Reject outputs containing bands, panel borders, atlas layouts, raster center lines, text, low-detail blur, or forbidden Ember imagery.

- [ ] **Step 3: Compress sequentially with Sharp**

Resize/crop each approved 1024 × 1536 PNG source to exactly `768 × 1152` using `fit: 'cover'`, then encode WebP at quality 40 with effort 6 and smart chroma subsampling. Only the final WebP enters `assets/images/**`; PNG sources stay in `.codex-tmp` and never enter the app bundle.

- [ ] **Step 4: Delete the now-unreferenced old side tiles**

Before deletion, prove their literal paths no longer appear under app source. Remove only the 26 superseded `free.webp` and `plus.webp` files named by this feature.

### Task 4: Verify behavior and asset quality

**Files:**
- Test: `tests/season_pass_theme_backgrounds_contract.test.ts`
- Test: `tests/season_pass_spine_continuity.test.ts`

- [ ] **Step 1: Run the focused contracts in one process**

```powershell
npx jest --runTestsByPath tests/season_pass_theme_backgrounds_contract.test.ts tests/season_pass_spine_continuity.test.ts --no-cache --runInBand
```

Expected: all tests pass, including exact asset dimensions, unique hashes, fixed-layer ordering, and continuous top-to-bottom divider geometry.

- [ ] **Step 2: Run targeted lint and whitespace checks**

```powershell
npx eslint app/season_pass.tsx app/season_pass_theme_backgrounds.ts tests/season_pass_theme_backgrounds_contract.test.ts
git diff --check -- app/season_pass.tsx app/season_pass_theme_backgrounds.ts tests/season_pass_theme_backgrounds_contract.test.ts assets/images/season/backgrounds
```

Expected: no lint errors and no whitespace errors. Existing unrelated warnings must be reported, not hidden.

- [ ] **Step 3: Build and inspect a QA contact sheet**

Create the sheet under `.codex-tmp/season-pass-fixed-backgrounds/qa/`, not in the bundled asset tree. Inspect all 13 at original source detail and confirm seamless full-height composition, Free/Plus hierarchy, readable calm center/top, and Ember's no-fire/no-lava rule.

- [ ] **Step 4: Do not start Metro or an emulator unless the owner requests it**

The owner explicitly requested low computer resource usage while other sessions run. Limit verification to sequential image processing and narrow single-thread gates.
