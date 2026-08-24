# Level Spin Premium Reward Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 35 Level Spin v2 reward placeholders with universal, no-text, premium artifact illustrations organized into eight restrained visual families.

**Architecture:** A typed manifest owns artifact family, subject, accent, and production path. A closed static asset map provides literal React Native `require()` calls, while a small renderer displays art independently from the existing localized reward title. Asset QA remains outside the bundle and checks alpha, bounds, cross-background readability, family consistency, and absence of baked text.

**Tech Stack:** React Native, TypeScript, Expo Image, Jest, Node.js, Sharp, built-in image generation.

**Workspace note:** Execute in the current checkout. Project rules prohibit creating a branch or worktree without an explicit owner request.

---

### Task 1: Replace the colorful manifest contract

**Files:**
- Modify: `tests/level_spin_reward_asset_manifest.test.ts`
- Modify: `app/level_spin_reward_asset_manifest.ts`

- [ ] **Step 1: Write the failing no-text family test**

Use this contract in `tests/level_spin_reward_asset_manifest.test.ts`:

```ts
import { LEVEL_SPIN_REWARD_CATALOG } from '../app/level_spin_reward_catalog';
import {
  LEVEL_SPIN_REWARD_ASSET_MANIFEST,
  LEVEL_SPIN_REWARD_FAMILY_PALETTES,
} from '../app/level_spin_reward_asset_manifest';

describe('level spin reward asset manifest', () => {
  test('matches the v2 reward catalogue exactly', () => {
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST.map(({ id }) => id).sort()).toEqual(
      LEVEL_SPIN_REWARD_CATALOG.map(({ id }) => id).sort(),
    );
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST).toHaveLength(35);
  });

  test('uses eight restrained families and contains no baked-label field', () => {
    expect(Object.keys(LEVEL_SPIN_REWARD_FAMILY_PALETTES).sort()).toEqual([
      'energy', 'hints', 'pearls', 'plus', 'protection', 'stars', 'time', 'xp',
    ]);
    for (const entry of LEVEL_SPIN_REWARD_ASSET_MANIFEST) {
      expect(entry).not.toHaveProperty('bakedLabel');
      expect(entry.productionFile).toBe(`assets/images/level-spin-rewards/${entry.id}.webp`);
      expect(entry.productionFile).not.toMatch(/dark|ember|gold|indigo|olive|sage|theme|volt/i);
      expect(entry.accent).toBe(LEVEL_SPIN_REWARD_FAMILY_PALETTES[entry.family]);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_spin_reward_asset_manifest.test.ts --runInBand --watchman=false
```

Expected: FAIL because the old manifest exposes `bakedLabel` and value-specific colors.

- [ ] **Step 3: Implement the family manifest**

Define these public types and palettes in `app/level_spin_reward_asset_manifest.ts`:

```ts
export type LevelSpinRewardArtFamily =
  | 'xp' | 'pearls' | 'stars' | 'energy'
  | 'hints' | 'protection' | 'time' | 'plus';

export const LEVEL_SPIN_REWARD_FAMILY_PALETTES = Object.freeze({
  xp: '#59607A',
  pearls: '#75877A',
  stars: '#8E7858',
  energy: '#3F6653',
  hints: '#987746',
  protection: '#74464A',
  time: '#3C6868',
  plus: '#847968',
} satisfies Record<LevelSpinRewardArtFamily, string>);

export type LevelSpinRewardAssetSpec = Readonly<{
  id: string;
  family: LevelSpinRewardArtFamily;
  subject: string;
  accent: string;
  productionFile: `assets/images/level-spin-rewards/${string}.webp`;
}>;
```

Populate all 35 IDs from the approved spec. Map XP rewards and XP banks to `xp`, pearls to `pearls`, unified stars to `stars`, energy rewards to `energy`, hints to `hints`, shield to `protection`, timed multipliers to `time`, and Plus days to `plus`.

- [ ] **Step 4: Run the manifest test and verify GREEN**

Run the command from Step 2.

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit only the manifest contract**

```powershell
git add app/level_spin_reward_asset_manifest.ts tests/level_spin_reward_asset_manifest.test.ts
git commit -m "feat: define premium reward art families"
```

### Task 2: Preserve deterministic alpha and QA validation

**Files:**
- Modify: `tests/level_spin_reward_asset_validator.test.ts`
- Modify: `scripts/validate-level-spin-reward-asset.mjs`

- [ ] **Step 1: Add tests for accepted high-resolution square sources and rejected invalid alpha**

Keep five cases: valid 1024 RGBA, valid 1254 RGBA, RGB rejection, opaque-corner rejection, and edge-touching rejection. Assert that a valid source creates exactly these eight files:

```ts
[
  'xp_250-app-118.png', 'xp_250-app-300.png',
  'xp_250-black-118.png', 'xp_250-black-300.png',
  'xp_250-blue-118.png', 'xp_250-blue-300.png',
  'xp_250-white-118.png', 'xp_250-white-300.png',
]
```

- [ ] **Step 2: Run validator tests**

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_spin_reward_asset_validator.test.ts --runInBand --watchman=false
```

Expected: PASS, 5 tests.

- [ ] **Step 3: Confirm validator constraints**

`scripts/validate-level-spin-reward-asset.mjs` must require a square 1024–1400 px source, four channels, alpha, transparent corners, nonempty alpha bounds, and no content touching the canvas. It must create QA without modifying the source.

- [ ] **Step 4: Commit the validator**

```powershell
git add scripts/validate-level-spin-reward-asset.mjs tests/level_spin_reward_asset_validator.test.ts
git commit -m "test: validate transparent reward art sources"
```

### Task 3: Replace the XP pilot with the new no-text art direction

**Files:**
- Replace: `assets/images/level-spin-rewards/xp_250.webp`
- Create outside bundle: `.codex-tmp/level-spin-rewards/sources/xp_250.png`
- Create outside bundle: `.codex-tmp/level-spin-rewards/qa/xp_250/*.png`

- [ ] **Step 1: Generate one new `xp_250` source**

Use the approved Home images and this exact direction:

```text
One compact museum-grade knowledge crystal in a small architectural mount.
Matte obsidian #14171A, graphite #262A2E, porcelain #E6E0D3, restrained
champagne metal #A68B60, and only smoky indigo #59607A as the family accent.
No text, digits, XP letters, symbol, plaque, logo, particles, exterior glow,
cartoon clay, toy styling, saturated color, floor, shadow, frame, or background.
Centered three-quarter product view, quiet premium materials, readable at 118px.
```

- [ ] **Step 2: Reject any textual or colorful result before processing**

The source fails if any glyph, digit, category label, second saturated accent, candy color, neon edge, toy expression, or unrelated object is visible.

- [ ] **Step 3: Validate and inspect the source**

```powershell
node scripts/validate-level-spin-reward-asset.mjs --id xp_250 --source .codex-tmp/level-spin-rewards/sources/xp_250.png --qa-dir .codex-tmp/level-spin-rewards/qa/xp_250
```

Expected: `qaCount: 8`, `channels: 4`, `hasAlpha: true`.

- [ ] **Step 4: Inspect all 300 px and 118 px QA views**

Confirm no matte, halo, clipped geometry, hidden text, oversaturation, or loss of the knowledge-crystal silhouette.

- [ ] **Step 5: Create the production WebP**

```powershell
node -e "const sharp=require('sharp'); sharp('.codex-tmp/level-spin-rewards/sources/xp_250.png').resize(512,512).webp({quality:76,alphaQuality:100,smartSubsample:true}).toFile('assets/images/level-spin-rewards/xp_250.webp')"
```

Expected: 512×512 WebP with four channels and alpha.

### Task 4: Generate the remaining collection family-by-family

**Files:**
- Replace/Create: `assets/images/level-spin-rewards/*.webp`
- Create outside bundle: `.codex-tmp/level-spin-rewards/sources/*.png`
- Create outside bundle: `.codex-tmp/level-spin-rewards/qa/<id>/*.png`

- [ ] **Step 1: Complete XP and stored-XP artifacts**

Generate in this order, always reusing smoky indigo `#59607A` and the common neutrals: `xp_500`, `xp_1000`, `xp_3000`, `xp_5000`, `xp_10000`, `xp_25000`, `xp_50000`, `xp_bank_150`, `xp_bank_300`, `xp_bank_600`.

Each source must match the subject in the approved spec. Value increases construction complexity and champagne-metal detail, never saturation.

- [ ] **Step 2: Complete pearl artifacts**

Generate `pearls_5`, `pearls_10`, `pearls_20`, `pearls_50`, `pearls_100`, `pearls_250`, `pearls_500` using only sage celadon `#75877A` plus the common neutrals.

- [ ] **Step 3: Complete unified-star artifacts**

Generate `stars_10`, `stars_20`, `stars_50`, `stars_100`, `stars_250`, `stars_500`, `stars_1000` using only antique bronze `#8E7858` plus the common neutrals.

- [ ] **Step 4: Complete the smaller families**

Generate:

```text
energy_full, energy_plus2, energy_plus3 -> deep forest #3F6653
hint_1, hint_3                         -> muted amber #987746
chain_shield_1                         -> sealing-wax oxblood #74464A
xp_2x_24h, xp_2x_48h                  -> deep teal #3C6868
plus_days_3, plus_days_7               -> stone taupe #847968
```

- [ ] **Step 5: Validate every source and create production files**

For every ID, run the validator, inspect 300/118 px QA, then create a 512×512 quality-76 WebP. Do not retain any text-baked experimental production file.

- [ ] **Step 6: Create a collection contact sheet outside the bundle**

Create `.codex-tmp/level-spin-rewards/qa/collection-contact-sheet.png` with all 35 icons on the same neutral dark card. Confirm family cohesion and value progression without using captions inside the artwork.

### Task 5: Add the closed static asset map

**Files:**
- Create: `app/level_spin_reward_assets.ts`
- Create: `tests/level_spin_reward_assets.test.ts`

- [ ] **Step 1: Write the failing map test**

The test must compare sorted map keys with the 35 catalog IDs, read the source file, count exactly 35 literal `require('../assets/images/level-spin-rewards/` occurrences, reject theme words in paths, and verify every referenced file exists.

- [ ] **Step 2: Run the map test and verify RED**

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_spin_reward_assets.test.ts --runInBand --watchman=false
```

Expected: FAIL because the map does not exist.

- [ ] **Step 3: Implement the map**

Use a closed object with one literal require per ID:

```ts
import type { ImageSource } from 'expo-image';

export const LEVEL_SPIN_REWARD_ASSETS = Object.freeze({
  xp_250: require('../assets/images/level-spin-rewards/xp_250.webp'),
  xp_500: require('../assets/images/level-spin-rewards/xp_500.webp'),
  xp_1000: require('../assets/images/level-spin-rewards/xp_1000.webp'),
  xp_3000: require('../assets/images/level-spin-rewards/xp_3000.webp'),
  xp_5000: require('../assets/images/level-spin-rewards/xp_5000.webp'),
  xp_10000: require('../assets/images/level-spin-rewards/xp_10000.webp'),
  xp_25000: require('../assets/images/level-spin-rewards/xp_25000.webp'),
  xp_50000: require('../assets/images/level-spin-rewards/xp_50000.webp'),
  pearls_5: require('../assets/images/level-spin-rewards/pearls_5.webp'),
  pearls_10: require('../assets/images/level-spin-rewards/pearls_10.webp'),
  pearls_20: require('../assets/images/level-spin-rewards/pearls_20.webp'),
  pearls_50: require('../assets/images/level-spin-rewards/pearls_50.webp'),
  pearls_100: require('../assets/images/level-spin-rewards/pearls_100.webp'),
  pearls_250: require('../assets/images/level-spin-rewards/pearls_250.webp'),
  pearls_500: require('../assets/images/level-spin-rewards/pearls_500.webp'),
  stars_10: require('../assets/images/level-spin-rewards/stars_10.webp'),
  stars_20: require('../assets/images/level-spin-rewards/stars_20.webp'),
  stars_50: require('../assets/images/level-spin-rewards/stars_50.webp'),
  stars_100: require('../assets/images/level-spin-rewards/stars_100.webp'),
  stars_250: require('../assets/images/level-spin-rewards/stars_250.webp'),
  stars_500: require('../assets/images/level-spin-rewards/stars_500.webp'),
  stars_1000: require('../assets/images/level-spin-rewards/stars_1000.webp'),
  energy_full: require('../assets/images/level-spin-rewards/energy_full.webp'),
  energy_plus2: require('../assets/images/level-spin-rewards/energy_plus2.webp'),
  energy_plus3: require('../assets/images/level-spin-rewards/energy_plus3.webp'),
  hint_1: require('../assets/images/level-spin-rewards/hint_1.webp'),
  hint_3: require('../assets/images/level-spin-rewards/hint_3.webp'),
  chain_shield_1: require('../assets/images/level-spin-rewards/chain_shield_1.webp'),
  xp_bank_150: require('../assets/images/level-spin-rewards/xp_bank_150.webp'),
  xp_bank_300: require('../assets/images/level-spin-rewards/xp_bank_300.webp'),
  xp_bank_600: require('../assets/images/level-spin-rewards/xp_bank_600.webp'),
  xp_2x_24h: require('../assets/images/level-spin-rewards/xp_2x_24h.webp'),
  xp_2x_48h: require('../assets/images/level-spin-rewards/xp_2x_48h.webp'),
  plus_days_3: require('../assets/images/level-spin-rewards/plus_days_3.webp'),
  plus_days_7: require('../assets/images/level-spin-rewards/plus_days_7.webp'),
} satisfies Record<string, ImageSource>);
```

- [ ] **Step 4: Run the map test and verify GREEN**

Run the command from Step 2.

Expected: PASS.

### Task 6: Add a reusable no-text renderer

**Files:**
- Create: `components/LevelSpinRewardArt.tsx`
- Create: `tests/level_spin_reward_art.test.ts`

- [ ] **Step 1: Write the failing component contract test**

Assert that the component imports `Image` from `expo-image`, resolves only through `LEVEL_SPIN_REWARD_ASSETS`, uses `contentFit="contain"`, accepts an explicit `accessibilityLabel`, and contains no amount/title rendering.

- [ ] **Step 2: Implement the renderer**

```tsx
import { Image } from 'expo-image';
import { memo } from 'react';
import { LEVEL_SPIN_REWARD_ASSETS } from '../app/level_spin_reward_assets';

type Props = Readonly<{
  giftId: string;
  size: number;
  accessibilityLabel: string;
}>;

function LevelSpinRewardArt({ giftId, size, accessibilityLabel }: Props) {
  const source = LEVEL_SPIN_REWARD_ASSETS[giftId as keyof typeof LEVEL_SPIN_REWARD_ASSETS];
  if (!source) return null;
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export default memo(LevelSpinRewardArt);
```

- [ ] **Step 3: Run the renderer test**

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_spin_reward_art.test.ts --runInBand --watchman=false
```

Expected: PASS.

### Task 7: Wire art while keeping localized text separate

**Files:**
- Modify: `components/LevelSpinFinishLine.tsx`
- Modify: `components/LevelSpinRewardModal.tsx`
- Modify: `app/level_gifts_inventory.tsx`
- Modify: `tests/level_gift_reward_icons.test.ts`
- Modify: `tests/level_reward_spin_finish_line_contract.test.ts`

- [ ] **Step 1: Update focused tests to require the new renderer**

For Level Spin v2 surfaces, assert imports and uses of `LevelSpinRewardArt`. Keep assertions that unrelated boon, league, historical, and pre-open gift surfaces retain `RetiredRasterFallback` where appropriate.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_gift_reward_icons.test.ts tests/level_reward_spin_finish_line_contract.test.ts --runInBand --watchman=false
```

Expected: FAIL because Level Spin still uses the generic placeholder.

- [ ] **Step 3: Replace only v2 post-reveal placeholder uses**

Use `LevelSpinRewardArt` with the existing `resultGift.id`/gift ID and the existing localized title as `accessibilityLabel`. Keep the visible localized title and amount in their current text components; do not render any text inside `LevelSpinRewardArt`.

- [ ] **Step 4: Preserve historical fallback behavior**

Do not remove pre-open chest animation, historical v1 gift fallback, boon imagery, league imagery, friend/referral imagery, or unrelated inventory behavior.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the command from Step 2.

Expected: PASS.

### Task 8: Final asset and integration verification

**Files:**
- Verify: `assets/images/level-spin-rewards/*.webp`
- Verify: all files modified by Tasks 1–7

- [ ] **Step 1: Verify exact asset count and metadata**

Run a Sharp-based inventory that requires exactly 35 WebP files, each 512×512, four channels, and alpha. Fail on theme suffixes or any extra bundled file.

- [ ] **Step 2: Run all focused reward-art tests**

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_spin_reward_asset_manifest.test.ts tests/level_spin_reward_asset_validator.test.ts tests/level_spin_reward_assets.test.ts tests/level_spin_reward_art.test.ts tests/level_gift_reward_icons.test.ts tests/level_reward_spin_finish_line_contract.test.ts --runInBand --watchman=false
```

Expected: all suites PASS.

- [ ] **Step 3: Run the existing reward catalog/economy contract tests**

```powershell
.\node_modules\.bin\jest.cmd --runTestsByPath tests/level_spin_reward_catalog.test.ts tests/level_spin_currency_rewards.test.ts tests/level_spin_reward_definitions.test.ts --runInBand --watchman=false
```

Expected: all suites PASS; art work must not change economy behavior.

- [ ] **Step 4: Review the final contact sheet**

Confirm: no baked text, no cartoon styling, no value-by-color changes, one accent per family, clear family relationships, credible rarity progression, and readability on both light and dark cards.

- [ ] **Step 5: Commit the finished collection without unrelated changes**

```powershell
git add app/level_spin_reward_asset_manifest.ts app/level_spin_reward_assets.ts components/LevelSpinRewardArt.tsx components/LevelSpinFinishLine.tsx components/LevelSpinRewardModal.tsx app/level_gifts_inventory.tsx assets/images/level-spin-rewards tests/level_spin_reward_asset_manifest.test.ts tests/level_spin_reward_asset_validator.test.ts tests/level_spin_reward_assets.test.ts tests/level_spin_reward_art.test.ts tests/level_gift_reward_icons.test.ts tests/level_reward_spin_finish_line_contract.test.ts scripts/validate-level-spin-reward-asset.mjs docs/superpowers/specs/2026-08-21-level-spin-reward-icons-design.md docs/superpowers/plans/2026-08-21-level-spin-reward-icons.md
git commit -m "feat: add premium Level Spin reward collection"
```
