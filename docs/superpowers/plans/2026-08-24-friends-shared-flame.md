# Friends Shared Flame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Friends weekly chest presentation with a three-stage, nine-theme “Shared Flame” using 27 individually generated DALL·E assets and a low-cost runtime animation.

**Architecture:** Keep all existing `WeeklyChestModel`, claim, reward, storage, and analytics contracts unchanged. Add a pure visual resolver, a literal static asset map, and a themed `expo-image` presentation inside the existing card; generate and process every bitmap sequentially on neutral `RGB(128,128,128)` using the existing alpha pipeline.

**Tech Stack:** React Native, TypeScript, Expo Image, Reanimated, Jest/ts-jest, Sharp, built-in Codex `image_gen`.

---

## Constraints and file structure

No branch, worktree, or delegated coding session may be created unless the owner explicitly requests it. The checkout is heavily dirty, so every commit command in this plan must use `git commit --only <owned paths>` and must never stage unrelated files.

Files and responsibilities:

- Create `components/friends_together/friends_flame_model.ts`: pure stage, scale, and animation-state selection from `WeeklyChestModel`.
- Create `components/friends_together/friends_flame_assets.ts`: exactly 27 literal `require()` calls and one resolver.
- Modify `components/friends_together/FriendsChestCard.tsx`: render themed flame, localized copy, cross-fade, and light transform/opacity animation.
- Modify `components/friends_together/FriendsChestModal.tsx`: remove user-visible chest/opening language from the result ritual.
- Modify `tests/friends_chest_human_ui_contract.test.ts`: preserve its DEV/claim safety checks while updating the approved copy contract.
- Create `tests/friends_shared_flame_model.test.ts`: pure stage/scale/animation tests.
- Create `tests/friends_shared_flame_assets.test.ts`: exact theme×stage inventory, file existence, WebP dimensions, and alpha checks.
- Modify `tests/runtime_lifecycle_ratchet.test.ts`: require the Shared Flame animation to retain runtime ownership and cancellation.
- Create `assets/images/friends_together/shared_flame/<theme>/stage-{1,2,3}.webp`: 27 bundled outputs.
- Store raw generated RGB PNGs only under `.codex-tmp/friends-shared-flame/`; never add those files to Git.

Do not preload all 27 images in `app/image_preload.ts`. The card loads only the current `themeMode` and stage, avoiding an unnecessary primary-tab startup cost.

## Canonical generation brief

Every `image_gen` call is a separate call for exactly one asset. Never issue parallel calls, never ask for an atlas, and never crop a grid.

Shared prompt prefix:

```text
Use case: stylized-concept
Asset type: React Native weekly shared-reward flame UI asset
Primary request: one isolated magical flame representing friends contributing together during a week
Scene/backdrop: perfectly uniform solid neutral gray RGB(128,128,128), edge to edge; no gradient, texture, vignette, floor, horizon, or background shadow
Style/medium: polished soft-3D painted mobile game reward icon; simple clay-like volumes; crisp readable silhouette at 56–86 px
Composition/framing: front view, exactly centered on a square canvas, upright, symmetric visual weight, at least 12% empty safe margin on every side
Constraints: one flame only; no text; no numbers; no chest; no box; no container; no logs; no campfire; no pedestal; no hands; no people; no smoke; no thin particles; no logos; no watermark; matte must remain visible in all four corners
```

Stage suffixes:

```text
STAGE 1 — SPARK: small calm flame, one clean outer tongue and a bright inner core, no more than one large spark, object occupies about 50% of canvas height.
STAGE 2 — FLAME: preserve the reference flame's identity and palette; broaden it to two or three clear outer tongues, brighter core, soft compact halo, two or three large sparks, object occupies about 62% of canvas height.
STAGE 3 — SHARED FLAME: preserve the reference flame's identity and palette; make it about 25% larger and more ceremonial, broad beautiful crown, luminous inner flame, restrained compact halo, three or four large sparks, object occupies about 74% of canvas height; premium ready-to-claim state.
```

Theme palette suffixes:

| Theme | Exact palette instruction |
|---|---|
| `dark` | `deep forest green outer flame #47C870, near-black green depth #030604, pale warm core, restrained emerald halo` |
| `gold` | `champagne #F6E3A1, metal gold #D6B35A, antique gold #B8903A, black-lacquer depth #030303` |
| `olive` | `matte olive #1C2217, champagne #C9A84C, light champagne #E3CC88, ivory core #F4ECD8` |
| `midnight` | `white core, electric blue #5B7CFF, lavender #8FA0FF, violet outer glow #A95BFF` |
| `ember` | `white-gold core, amber #FFB03D, orange #FFCC55, restrained crimson #FF3D6E at outer tips` |
| `aurora` | `white-mint core, mint #2EE6A0, emerald #3DE8A6, azure outer glow #2E9DFF` |
| `volt` | `pale core, electric lime #C6FF34, acid green #A8E81E, emerald outer glow #2EE08C` |
| `indigo` | `milky core, lavender #C8C3FF, soft royal indigo #7164DC, deep dusk #273468` |
| `sagePorcelain` | `porcelain ivory core #FCFDF9, dark sage #315F50, mid sage #86AA91, restrained warm-gold accent #8B6320; silhouette must remain dark enough on a light card` |

For stages 2 and 3, inspect the previous raw PNG with `view_image`, then pass that local raw PNG as the single reference image. Preserve identity but create a new asset; do not inpaint the RGB background.

Define these PowerShell helpers once before the first generation task:

```powershell
function Process-FlameAsset([string]$InputPath, [string]$OutputPath) {
  node scripts/process-home-theme-asset.mjs --input $InputPath --output $OutputPath --matte 128,128,128
  if ($LASTEXITCODE -ne 0) { throw "Flame processing failed: $OutputPath" }
}

function Assert-FlameAsset([string]$AssetPath) {
  node -e "require('sharp')(process.argv[1]).metadata().then(m=>{if(m.width!==1024||m.height!==1024||m.format!=='webp'||!m.hasAlpha)process.exit(1);console.log(JSON.stringify({width:m.width,height:m.height,format:m.format,hasAlpha:m.hasAlpha}))})" $AssetPath
  if ($LASTEXITCODE -ne 0) { throw "Flame metadata failed: $AssetPath" }
}
```

### Task 1: Pure visual-state resolver

**Files:**
- Create: `components/friends_together/friends_flame_model.ts`
- Create: `tests/friends_shared_flame_model.test.ts`

- [ ] **Step 1: Write the failing model test**

```ts
import { friendsFlameVisual } from '../components/friends_together/friends_flame_model';

describe('friends shared flame visual model', () => {
  test.each([
    [{ tier: 0, percent: 0, state: 'locked' as const }, 1, 0.78, false],
    [{ tier: 0, percent: 100, state: 'active' as const }, 1, 0.84, true],
    [{ tier: 1, percent: 0, state: 'active' as const }, 1, 0.84, true],
    [{ tier: 1, percent: 100, state: 'active' as const }, 1, 0.92, true],
    [{ tier: 2, percent: 0, state: 'active' as const }, 2, 0.92, true],
    [{ tier: 2, percent: 100, state: 'active' as const }, 2, 1, true],
    [{ tier: 3, percent: 100, state: 'active' as const }, 3, 1.02, true],
    [{ tier: 3, percent: 100, state: 'ready' as const }, 3, 1.08, true],
    [{ tier: 3, percent: 100, state: 'claimed' as const }, 3, 1.02, false],
  ])('maps %o to stage %s and scale %s', (model, stage, scale, animated) => {
    expect(friendsFlameVisual(model)).toEqual({ stage, scale, animated, ready: model.state === 'ready' });
  });

  it('clamps malformed percent values', () => {
    expect(friendsFlameVisual({ tier: 1, percent: -50, state: 'active' }).scale).toBe(0.84);
    expect(friendsFlameVisual({ tier: 2, percent: 999, state: 'active' }).scale).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' '.claude/semaphore/slot.sh' acquire 'jest friends shared flame model'
try { npx jest --runTestsByPath tests/friends_shared_flame_model.test.ts --no-cache --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' '.claude/semaphore/slot.sh' release }
```

Expected: FAIL because `friends_flame_model.ts` does not exist.

- [ ] **Step 3: Implement the pure resolver**

```ts
import type { WeeklyChestModel, WeeklyChestState } from '../../app/friends_together/weekly_chest_model';

export type FriendsFlameStage = 1 | 2 | 3;

export type FriendsFlameVisual = Readonly<{
  stage: FriendsFlameStage;
  scale: number;
  animated: boolean;
  ready: boolean;
}>;

type FlameModelInput = Pick<WeeklyChestModel, 'tier' | 'percent'> & Readonly<{ state: WeeklyChestState }>;

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export function friendsFlameVisual(model: FlameModelInput): FriendsFlameVisual {
  const progress = clampPercent(model.percent) / 100;
  const stage: FriendsFlameStage = model.tier >= 3 ? 3 : model.tier >= 2 ? 2 : 1;
  const scale = model.tier <= 0
    ? 0.78 + progress * 0.06
    : model.tier === 1
      ? 0.84 + progress * 0.08
      : model.tier === 2
        ? 0.92 + progress * 0.08
        : model.state === 'ready'
          ? 1.08
          : 1.02;
  return {
    stage,
    scale: Number(scale.toFixed(2)),
    animated: model.state === 'active' || model.state === 'ready',
    ready: model.state === 'ready',
  };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command again. Expected: 10 passing cases, 0 failures.

- [ ] **Step 5: Commit only the resolver and test**

```powershell
git add -- components/friends_together/friends_flame_model.ts tests/friends_shared_flame_model.test.ts
git commit --only components/friends_together/friends_flame_model.ts tests/friends_shared_flame_model.test.ts -m "feat(friends): model shared flame growth"
```

### Task 2: Prepare sequential asset workspace

**Files:**
- Read only: `scripts/process-home-theme-asset.mjs`
- Create outside Git: `.codex-tmp/friends-shared-flame/<theme>/stage-*-rgb.png`

- [ ] **Step 1: Confirm the neutral-matte processor gate**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' '.claude/semaphore/slot.sh' acquire 'jest neutral matte processor'
try { npx jest --runTestsByPath tests/home_theme_asset_processing.test.ts --no-cache --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' '.claude/semaphore/slot.sh' release }
```

Expected: 6 tests pass, including rejection of wrong matte, retained background, lost foreground, and unsafe margins.

- [ ] **Step 2: Create only the ignored raw-output directories**

```powershell
$themes = 'dark','gold','olive','midnight','ember','aurora','volt','indigo','sagePorcelain'
$themes | ForEach-Object { New-Item -ItemType Directory -Force -Path ".codex-tmp/friends-shared-flame/$_" | Out-Null }
```

- [ ] **Step 3: Confirm raw outputs cannot be committed accidentally**

```powershell
git check-ignore .codex-tmp/friends-shared-flame/dark/stage-1-rgb.png
```

Expected: the exact `.codex-tmp/...` path is printed.

### Tasks 3–11: Generate each theme, one asset at a time

For every theme task below, perform each numbered step serially. A step is complete only after `view_image` confirms the raw image, processing succeeds, `view_image` confirms the transparent WebP, and metadata reports `1024×1024`, `webp`, `hasAlpha: true`. Never start the next `image_gen` call while the previous asset is unverified.

Use `Process-FlameAsset` followed by `Assert-FlameAsset` after every generated raw PNG.

#### Task 3: `dark` flame trio

**Files:** `assets/images/friends_together/shared_flame/dark/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with the shared prefix + `STAGE 1 — SPARK` + the exact `dark` palette suffix. Save the returned file as `.codex-tmp/friends-shared-flame/dark/stage-1-rgb.png`, inspect it, then run `Process-FlameAsset '.codex-tmp/friends-shared-flame/dark/stage-1-rgb.png' 'assets/images/friends_together/shared_flame/dark/stage-1.webp'; Assert-FlameAsset 'assets/images/friends_together/shared_flame/dark/stage-1.webp'` and inspect the WebP.
- [ ] Generate stage 2 with stage 1 raw PNG as the sole reference and the shared prefix + `STAGE 2 — FLAME` + the exact `dark` palette suffix. Save it as `.codex-tmp/friends-shared-flame/dark/stage-2-rgb.png`, then process and validate the exact `dark/stage-2` paths with the helpers.
- [ ] Generate stage 3 with stage 2 raw PNG as the sole reference and the shared prefix + `STAGE 3 — SHARED FLAME` + the exact `dark` palette suffix. Save it as `.codex-tmp/friends-shared-flame/dark/stage-3-rgb.png`, then process and validate the exact `dark/stage-3` paths with the helpers.
- [ ] Commit only the three `dark` WebP files: `git add -- assets/images/friends_together/shared_flame/dark; git commit --only assets/images/friends_together/shared_flame/dark -m "feat(friends): add dark shared flame art"`.

#### Task 4: `gold` flame trio

**Files:** `assets/images/friends_together/shared_flame/gold/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with the shared prefix + `STAGE 1 — SPARK` + the exact `gold` palette suffix; save `.codex-tmp/friends-shared-flame/gold/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/gold/stage-1.webp`.
- [ ] Generate stage 2 using the raw stage 1 as sole reference with `STAGE 2 — FLAME` and the exact `gold` palette suffix; save/process/inspect/validate the exact `gold/stage-2` paths.
- [ ] Generate stage 3 using the raw stage 2 as sole reference with `STAGE 3 — SHARED FLAME` and the exact `gold` palette suffix; save/process/inspect/validate the exact `gold/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/gold; git commit --only assets/images/friends_together/shared_flame/gold -m "feat(friends): add gold shared flame art"`.

#### Task 5: `olive` flame trio

**Files:** `assets/images/friends_together/shared_flame/olive/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `olive` palette suffix; save `.codex-tmp/friends-shared-flame/olive/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/olive/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `olive` palette suffix; save/process/inspect/validate the exact `olive/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `olive` palette suffix; save/process/inspect/validate the exact `olive/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/olive; git commit --only assets/images/friends_together/shared_flame/olive -m "feat(friends): add olive shared flame art"`.

#### Task 6: `midnight` flame trio

**Files:** `assets/images/friends_together/shared_flame/midnight/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `midnight` palette suffix; save `.codex-tmp/friends-shared-flame/midnight/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/midnight/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `midnight` palette suffix; save/process/inspect/validate the exact `midnight/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `midnight` palette suffix; save/process/inspect/validate the exact `midnight/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/midnight; git commit --only assets/images/friends_together/shared_flame/midnight -m "feat(friends): add midnight shared flame art"`.

#### Task 7: `ember` flame trio

**Files:** `assets/images/friends_together/shared_flame/ember/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `ember` palette suffix; save `.codex-tmp/friends-shared-flame/ember/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/ember/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `ember` palette suffix; save/process/inspect/validate the exact `ember/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `ember` palette suffix; save/process/inspect/validate the exact `ember/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/ember; git commit --only assets/images/friends_together/shared_flame/ember -m "feat(friends): add ember shared flame art"`.

#### Task 8: `aurora` flame trio

**Files:** `assets/images/friends_together/shared_flame/aurora/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `aurora` palette suffix; save `.codex-tmp/friends-shared-flame/aurora/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/aurora/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `aurora` palette suffix; save/process/inspect/validate the exact `aurora/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `aurora` palette suffix; save/process/inspect/validate the exact `aurora/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/aurora; git commit --only assets/images/friends_together/shared_flame/aurora -m "feat(friends): add aurora shared flame art"`.

#### Task 9: `volt` flame trio

**Files:** `assets/images/friends_together/shared_flame/volt/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `volt` palette suffix; save `.codex-tmp/friends-shared-flame/volt/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/volt/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `volt` palette suffix; save/process/inspect/validate the exact `volt/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `volt` palette suffix; save/process/inspect/validate the exact `volt/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/volt; git commit --only assets/images/friends_together/shared_flame/volt -m "feat(friends): add volt shared flame art"`.

#### Task 10: `indigo` flame trio

**Files:** `assets/images/friends_together/shared_flame/indigo/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `indigo` palette suffix; save `.codex-tmp/friends-shared-flame/indigo/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/indigo/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `indigo` palette suffix; save/process/inspect/validate the exact `indigo/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `indigo` palette suffix; save/process/inspect/validate the exact `indigo/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/indigo; git commit --only assets/images/friends_together/shared_flame/indigo -m "feat(friends): add indigo shared flame art"`.

#### Task 11: `sagePorcelain` flame trio

**Files:** `assets/images/friends_together/shared_flame/sagePorcelain/stage-{1,2,3}.webp`

- [ ] Generate stage 1 with `STAGE 1 — SPARK` and the exact `sagePorcelain` palette suffix; save `.codex-tmp/friends-shared-flame/sagePorcelain/stage-1-rgb.png`, then process, inspect, and validate `assets/images/friends_together/shared_flame/sagePorcelain/stage-1.webp`.
- [ ] Generate stage 2 from the raw stage 1 reference with `STAGE 2 — FLAME` and the exact `sagePorcelain` palette suffix; save/process/inspect/validate the exact `sagePorcelain/stage-2` paths.
- [ ] Generate stage 3 from the raw stage 2 reference with `STAGE 3 — SHARED FLAME` and the exact `sagePorcelain` palette suffix; save/process/inspect/validate the exact `sagePorcelain/stage-3` paths.
- [ ] Run `git add -- assets/images/friends_together/shared_flame/sagePorcelain; git commit --only assets/images/friends_together/shared_flame/sagePorcelain -m "feat(friends): add porcelain shared flame art"`.

### Task 12: Literal static asset map and asset contract

**Files:**
- Create: `components/friends_together/friends_flame_assets.ts`
- Create: `tests/friends_shared_flame_assets.test.ts`

- [ ] **Step 1: Write the failing inventory test**

```ts
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const themes = ['dark', 'gold', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'indigo', 'sagePorcelain'] as const;
const stages = [1, 2, 3] as const;

describe('friends shared flame assets', () => {
  const mapPath = path.join(process.cwd(), 'components/friends_together/friends_flame_assets.ts');

  it('declares one literal require for every active theme and stage', () => {
    const source = fs.readFileSync(mapPath, 'utf8');
    for (const theme of themes) {
      for (const stage of stages) {
        expect(source).toContain(`../../assets/images/friends_together/shared_flame/${theme}/stage-${stage}.webp`);
      }
    }
    expect((source.match(/require\(/g) ?? []).length).toBe(27);
  });

  it.each(themes)('%s has three optimized alpha WebPs', async (theme) => {
    for (const stage of stages) {
      const file = path.join(process.cwd(), 'assets/images/friends_together/shared_flame', theme, `stage-${stage}.webp`);
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata).toMatchObject({ width: 1024, height: 1024, format: 'webp', hasAlpha: true });
      expect(fs.statSync(file).size).toBeLessThan(350_000);
    }
  });
});
```

- [ ] **Step 2: Run the inventory test and verify RED**

Use the semaphore wrapper from Task 1 with command `npx jest --runTestsByPath tests/friends_shared_flame_assets.test.ts --no-cache --runInBand`.

Expected: FAIL because the map file does not exist.

- [ ] **Step 3: Create the exact static map**

```ts
import type { ThemeMode } from '../../constants/theme';
import type { FriendsFlameStage } from './friends_flame_model';

type FlameStages = Readonly<Record<FriendsFlameStage, number>>;

export const FRIENDS_FLAME_ASSETS: Readonly<Record<ThemeMode, FlameStages>> = {
  dark: { 1: require('../../assets/images/friends_together/shared_flame/dark/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/dark/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/dark/stage-3.webp') },
  gold: { 1: require('../../assets/images/friends_together/shared_flame/gold/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/gold/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/gold/stage-3.webp') },
  olive: { 1: require('../../assets/images/friends_together/shared_flame/olive/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/olive/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/olive/stage-3.webp') },
  midnight: { 1: require('../../assets/images/friends_together/shared_flame/midnight/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/midnight/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/midnight/stage-3.webp') },
  ember: { 1: require('../../assets/images/friends_together/shared_flame/ember/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/ember/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/ember/stage-3.webp') },
  aurora: { 1: require('../../assets/images/friends_together/shared_flame/aurora/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/aurora/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/aurora/stage-3.webp') },
  volt: { 1: require('../../assets/images/friends_together/shared_flame/volt/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/volt/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/volt/stage-3.webp') },
  indigo: { 1: require('../../assets/images/friends_together/shared_flame/indigo/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/indigo/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/indigo/stage-3.webp') },
  sagePorcelain: { 1: require('../../assets/images/friends_together/shared_flame/sagePorcelain/stage-1.webp'), 2: require('../../assets/images/friends_together/shared_flame/sagePorcelain/stage-2.webp'), 3: require('../../assets/images/friends_together/shared_flame/sagePorcelain/stage-3.webp') },
};

export function friendsFlameAsset(themeMode: ThemeMode, stage: FriendsFlameStage): number {
  return (FRIENDS_FLAME_ASSETS[themeMode] ?? FRIENDS_FLAME_ASSETS.indigo)[stage];
}
```

- [ ] **Step 4: Run the asset test and verify GREEN**

Run the Step 2 command again. Expected: 10 tests pass, 0 failures.

- [ ] **Step 5: Commit only the map and test**

```powershell
git add -- components/friends_together/friends_flame_assets.ts tests/friends_shared_flame_assets.test.ts
git commit --only components/friends_together/friends_flame_assets.ts tests/friends_shared_flame_assets.test.ts -m "feat(friends): map shared flame theme assets"
```

### Task 13: Render the themed flame and lightweight motion

**Files:**
- Modify: `components/friends_together/FriendsChestCard.tsx`
- Modify: `tests/runtime_lifecycle_ratchet.test.ts`

- [ ] **Step 1: Update the runtime contract first**

Change the Friends entry to require these exact source fragments:

```ts
'components/friends_together/FriendsChestCard.tsx': runtime(
  'Weekly friends shared flame breathes only while the Friends tab owns the runtime.',
  ['useRuntimeActive(ownerVisible)', 'cancelAnimation(flamePhase)', "model.state === 'claimed'"],
),
```

- [ ] **Step 2: Run the lifecycle test and verify RED**

Use the semaphore wrapper with `npx jest --runTestsByPath tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand`.

Expected: FAIL because `FriendsChestCard.tsx` still uses `rock` and does not gate `claimed`.

- [ ] **Step 3: Replace the SVG chest imports and add flame dependencies**

```ts
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { friendsFlameAsset } from './friends_flame_assets';
import { friendsFlameVisual } from './friends_flame_model';
```

Delete `react-native-svg`, `CHEST_GOLD_TOP`, `CHEST_GOLD_BOTTOM`, and `ChestGlyph`.

- [ ] **Step 4: Add the flame asset and animation inside `FriendsChestCard`**

Use `const { theme: t, themeMode, f } = useTheme();`, then add:

```ts
const flameVisual = useMemo(
  () => friendsFlameVisual(model),
  [model.percent, model.state, model.tier],
);
const flameSource = friendsFlameAsset(themeMode, flameVisual.stage);
const flameKey = `${themeMode}-${flameVisual.stage}`;
const [flameFailed, setFlameFailed] = useState(false);
useEffect(() => setFlameFailed(false), [flameKey]);

const flamePhase = useSharedValue(0);
useEffect(() => {
  if (!flameVisual.animated || model.state === 'claimed' || reduceMotion || !runtimeActive) {
    cancelAnimation(flamePhase);
    flamePhase.value = 0;
    return;
  }
  flamePhase.value = withRepeat(
    withSequence(
      withTiming(1, { duration: flameVisual.ready ? 1400 : 1800, easing: Easing.inOut(Easing.ease) }),
      withTiming(-1, { duration: flameVisual.ready ? 1400 : 1800, easing: Easing.inOut(Easing.ease) }),
    ),
    -1,
    true,
  );
  return () => cancelAnimation(flamePhase);
}, [flamePhase, flameVisual.animated, flameVisual.ready, model.state, reduceMotion, runtimeActive]);

const flameStyle = useAnimatedStyle(() => {
  const amplitude = flameVisual.ready ? 0.03 : 0.018;
  return {
    opacity: 0.985 + Math.abs(flamePhase.value) * 0.015,
    transform: [
      { translateY: -flamePhase.value },
      { rotate: `${flamePhase.value * 0.6}deg` },
      { scale: flameVisual.scale * (1 + Math.abs(flamePhase.value) * amplitude) },
    ],
  };
}, [flameVisual.ready, flameVisual.scale]);
```

- [ ] **Step 5: Replace `<ChestGlyph>` with the fixed-size flame wrapper**

```tsx
<Reanimated.View style={[styles.flameFrame, flameStyle]}>
  {flameFailed ? (
    <Ionicons name="flame" size={58} color={flameVisual.stage >= 2 ? t.gold : t.accent} />
  ) : (
    <Image
      key={flameKey}
      recyclingKey={flameKey}
      source={flameSource}
      accessible={false}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={180}
      onError={() => setFlameFailed(true)}
      style={styles.flameImage}
    />
  )}
</Reanimated.View>
```

Add styles:

```ts
flameFrame: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
flameImage: { width: 92, height: 92 },
```

- [ ] **Step 6: Run the lifecycle test and model test**

Use one semaphore slot and run:

```powershell
npx jest --runTestsByPath tests/runtime_lifecycle_ratchet.test.ts tests/friends_shared_flame_model.test.ts --no-cache --runInBand
```

Expected: both suites pass.

- [ ] **Step 7: Commit only card and lifecycle test**

```powershell
git add -- components/friends_together/FriendsChestCard.tsx tests/runtime_lifecycle_ratchet.test.ts
git commit --only components/friends_together/FriendsChestCard.tsx tests/runtime_lifecycle_ratchet.test.ts -m "feat(friends): animate shared flame efficiently"
```

### Task 14: Replace user-visible chest language in all eight locales

**Files:**
- Modify: `components/friends_together/FriendsChestCard.tsx`
- Modify: `components/friends_together/FriendsChestModal.tsx`
- Modify: `tests/friends_chest_human_ui_contract.test.ts`

- [ ] **Step 1: Update the human UI test first**

```ts
it('uses the shared celebratory bottom sheet and the approved Shared Flame copy', () => {
  expect(modal).toContain('HybridSheetShell');
  expect(modal).toContain("'Общее пламя зажжено'");
  expect(modal).toContain("'Забрать'");
  expect(card).toContain("'Общее пламя'");
  expect(card).toContain("'Собрать искры'");
  expect(card).not.toContain("'Сундук недели'");
  expect(modal).not.toContain("'Сундук открыт'");
  expect(modal).not.toContain('<Modal');
  expect(modal).not.toContain('×2 опыта');
  expect(modal).not.toContain('щит цепи');
});
```

Keep the existing DEV scenario/real callable test unchanged.

- [ ] **Step 2: Run the human UI test and verify RED**

Use the semaphore wrapper with `npx jest --runTestsByPath tests/friends_chest_human_ui_contract.test.ts --no-cache --runInBand`.

Expected: FAIL on old chest strings.

- [ ] **Step 3: Replace card title, status, and CTA strings**

```ts
const titleLabel = L('Общее пламя', 'Спільне полум’я', 'Llama común', 'Chama comum', 'Ngọn lửa chung', 'Api bersama', 'Ortak alev', 'Wspólny płomień');
const collectLabel = L('Собрать искры', 'Зібрати іскри', 'Recoger chispas', 'Coletar faíscas', 'Thu thập tia lửa', 'Kumpulkan percikan', 'Kıvılcımları topla', 'Zbierz iskry');
```

Replace `statusLabel` with:

```ts
function statusLabel(model: WeeklyChestModel, devMode: boolean, L: LocalePicker): string {
  if (devMode && model.state === 'claimed') return 'Собрано · DEV';
  if (model.state === 'claimed') return L('собрано', 'зібрано', 'recogido', 'coletado', 'đã nhận', 'terkumpul', 'toplandı', 'zebrano');
  if (model.canClaim) return L('готово', 'готово', 'lista', 'pronta', 'sẵn sàng', 'siap', 'hazır', 'gotowe');
  if (model.tier >= 3) return L('общее пламя', 'спільне полум’я', 'llama común', 'chama comum', 'ngọn lửa chung', 'api bersama', 'ortak alev', 'wspólny płomień');
  if (model.tier >= 2) return L('пламя', 'полум’я', 'llama', 'chama', 'ngọn lửa', 'nyala', 'alev', 'płomień');
  if (model.tier >= 1) return L('искра', 'іскра', 'chispa', 'faísca', 'tia lửa', 'percikan', 'kıvılcım', 'iskra');
  return L('до искры', 'до іскри', 'hasta la chispa', 'até a faísca', 'đến tia lửa', 'menuju percikan', 'kıvılcıma kadar', 'do iskry');
}
```

Define the picker explicitly and render `titleLabel` and `collectLabel` in the existing title and button positions:

```ts
type LocalePicker = (
  ru: string,
  uk: string,
  es: string,
  ptBr: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
) => string;
```

- [ ] **Step 4: Replace modal title only; keep the reward claim contract**

```ts
const title = L(
  'Общее пламя зажжено',
  'Спільне полум’я запалено',
  'Llama común encendida',
  'Chama comum acesa',
  'Ngọn lửa chung đã bùng sáng',
  'Api bersama menyala',
  'Ortak alev yandı',
  'Wspólny płomień zapłonął',
);
```

Keep `claimLabel`, reward values, test IDs, sound ID, callable flow, and internal `chest` identifiers unchanged.

- [ ] **Step 5: Run the human UI test and verify GREEN**

Run the Step 2 command again. Expected: 2 tests pass, 0 failures.

- [ ] **Step 6: Commit only the card, modal, and focused test**

```powershell
git add -- components/friends_together/FriendsChestCard.tsx components/friends_together/FriendsChestModal.tsx tests/friends_chest_human_ui_contract.test.ts
git commit --only components/friends_together/FriendsChestCard.tsx components/friends_together/FriendsChestModal.tsx tests/friends_chest_human_ui_contract.test.ts -m "feat(friends): rename weekly reward to shared flame"
```

### Task 15: Focused verification and manual theme QA

**Files:**
- Verify only; do not edit unrelated failures.

- [ ] **Step 1: Run the complete focused Jest gate with one traffic-light slot**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' '.claude/semaphore/slot.sh' acquire 'jest friends shared flame final'
try {
  npx jest --runTestsByPath tests/friends_shared_flame_model.test.ts tests/friends_shared_flame_assets.test.ts tests/friends_chest_human_ui_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/home_theme_asset_processing.test.ts --no-cache --runInBand
} finally {
  & 'C:\Program Files\Git\bin\bash.exe' '.claude/semaphore/slot.sh' release
}
```

Expected: all five suites pass with 0 failed tests.

- [ ] **Step 2: Run deterministic source and asset checks**

```powershell
git diff --check
rg -n "Сундук недели|Сундук открыт|ChestGlyph|react-native-svg" components/friends_together/FriendsChestCard.tsx components/friends_together/FriendsChestModal.tsx
```

Expected: `git diff --check` exits 0; `rg` returns no matches in those two user-visible components.

- [ ] **Step 3: Inspect all 27 final files without generating a contact sheet**

Open each WebP individually with `view_image`, in theme order and stage order. Confirm stage size is monotonic, the RGB matte is absent, no flame touches the safe margin, no theme is mislabeled, and `sagePorcelain` remains visible on a light card. Do not build a stitched sheet because the owner explicitly rejected cutting/atlas workflows.

- [ ] **Step 4: Run the app and manually check all nine themes**

For every theme, verify tier 0/1 uses stage 1, tier 2 uses stage 2, tier 3/ready uses stage 3, the ready state is largest, the local image switches without showing the previous theme, the card height stays fixed, and the green/lime CTA retains dark foreground.

Toggle reduced motion and leave/re-enter the Friends tab. Confirm the flame is static under reduced motion and `claimed`, and that animation stops while the tab is not the runtime owner.

- [ ] **Step 5: Confirm the final commit contains no raw generation files**

```powershell
git status --short -- assets/images/friends_together/shared_flame components/friends_together tests/friends_shared_flame_model.test.ts tests/friends_shared_flame_assets.test.ts
git ls-files '.codex-tmp/friends-shared-flame/**'
```

Expected: only intended source/test/bundled changes appear; `git ls-files` prints nothing.

- [ ] **Step 6: Run verification-before-completion and report evidence**

Report the exact focused Jest command, passing suite/test counts, 27/27 asset count, metadata gate result, and any manual QA limitation. Do not claim completion from generation output or code inspection alone.
