# Arena Floating Rank Shields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Arena hub statistics grid with an accessible floating rank hero backed by 24 unique, tier-consistent DALL·E shield assets.

**Architecture:** Keep `ArenaHubModel` and rank arithmetic unchanged. Add a static 24-entry asset map, generate one 8×3 transparent master sheet and derive optimized WebP files, then render the selected shield and existing three-star progress inside `ArenaHubSummary`. The screen passes its existing `active` and `reduceMotion` state so all looping motion stops off-screen or for reduced-motion users.

**Tech Stack:** React Native, Expo, TypeScript, React Native Reanimated, React Native `Image`, Sharp, Jest, built-in Codex `imagegen`.

---

## File map

- Create `components/arena/arena_rank_shield_assets.ts`: the only static `tierKey + division → require()` map.
- Create `scripts/build_arena_rank_shields.mjs`: deterministic 8×3 master-sheet slicer, alpha-preserving normalizer, and WebP compressor.
- Create `tests/arena_rank_shield_assets.test.ts`: exact 24-slot/static-file contract.
- Create `tests/arena_hub_rank_hero_contract.test.ts`: source-level UI and motion boundary contract.
- Modify `components/arena/ArenaHubSummary.tsx`: replace the four-cell stats grid with the rank hero and two transform-only motion groups.
- Modify `components/arena/ArenaHubSurface.tsx`: pass `active` and `reduceMotion` into the hero.
- Modify `docs/arena/OWNER_DECISIONS.md`: record the owner-approved 24-shield hero.
- Generate `assets/images/arena/ranks/*.webp`: exactly 24 wired runtime assets.
- Keep `.codex-tmp/arena-rank-shields/*`: ignored generation source, crops, prompt, manifest, and QA contact sheet.

### Task 1: Lock the 24-slot asset contract before generation

**Files:**
- Create: `tests/arena_rank_shield_assets.test.ts`
- Create: `components/arena/arena_rank_shield_assets.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const MAP_FILE = path.join(ROOT, 'components/arena/arena_rank_shield_assets.ts');
const ASSET_DIR = path.join(ROOT, 'assets/images/arena/ranks');
const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'] as const;
const divisions = ['iii', 'ii', 'i'] as const;

describe('Arena rank shield assets', () => {
  it('statically wires exactly one WebP for every one of the 24 ranks', () => {
    const source = fs.readFileSync(MAP_FILE, 'utf8');
    const required = [...source.matchAll(/require\(['"]\.\.\/\.\.\/assets\/images\/arena\/ranks\/([^'"]+\.webp)['"]\)/g)]
      .map((match) => match[1]);
    const expected = tiers.flatMap((tier) => divisions.map((division) => `${tier}-${division}.webp`));

    expect(required).toHaveLength(24);
    expect(new Set(required).size).toBe(24);
    expect([...required].sort()).toEqual([...expected].sort());
    for (const filename of expected) {
      expect(fs.existsSync(path.join(ASSET_DIR, filename))).toBe(true);
    }
  });

  it('keeps every bundled shield on the same alpha-preserving canvas', async () => {
    for (const tier of tiers) {
      for (const division of divisions) {
        const metadata = await sharp(path.join(ASSET_DIR, `${tier}-${division}.webp`)).metadata();
        expect(metadata.width).toBe(384);
        expect(metadata.height).toBe(384);
        expect(metadata.hasAlpha).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the map is absent**

Run:

```powershell
npx jest --runTestsByPath tests/arena_rank_shield_assets.test.ts --runInBand --no-cache
```

Expected: FAIL because `components/arena/arena_rank_shield_assets.ts` does not exist.

- [ ] **Step 3: Add the complete static map before generating files**

```ts
import type { ImageSourcePropType } from 'react-native';
import type { ArenaTierKey } from '../../modules/arena/rank_engine';

export type ArenaRankDivision = 1 | 2 | 3;

const ASSETS: Readonly<Record<ArenaTierKey, Readonly<Record<ArenaRankDivision, ImageSourcePropType>>>> = {
  bronze: { 3: require('../../assets/images/arena/ranks/bronze-iii.webp'), 2: require('../../assets/images/arena/ranks/bronze-ii.webp'), 1: require('../../assets/images/arena/ranks/bronze-i.webp') },
  silver: { 3: require('../../assets/images/arena/ranks/silver-iii.webp'), 2: require('../../assets/images/arena/ranks/silver-ii.webp'), 1: require('../../assets/images/arena/ranks/silver-i.webp') },
  gold: { 3: require('../../assets/images/arena/ranks/gold-iii.webp'), 2: require('../../assets/images/arena/ranks/gold-ii.webp'), 1: require('../../assets/images/arena/ranks/gold-i.webp') },
  platinum: { 3: require('../../assets/images/arena/ranks/platinum-iii.webp'), 2: require('../../assets/images/arena/ranks/platinum-ii.webp'), 1: require('../../assets/images/arena/ranks/platinum-i.webp') },
  diamond: { 3: require('../../assets/images/arena/ranks/diamond-iii.webp'), 2: require('../../assets/images/arena/ranks/diamond-ii.webp'), 1: require('../../assets/images/arena/ranks/diamond-i.webp') },
  master: { 3: require('../../assets/images/arena/ranks/master-iii.webp'), 2: require('../../assets/images/arena/ranks/master-ii.webp'), 1: require('../../assets/images/arena/ranks/master-i.webp') },
  grandmaster: { 3: require('../../assets/images/arena/ranks/grandmaster-iii.webp'), 2: require('../../assets/images/arena/ranks/grandmaster-ii.webp'), 1: require('../../assets/images/arena/ranks/grandmaster-i.webp') },
  legend: { 3: require('../../assets/images/arena/ranks/legend-iii.webp'), 2: require('../../assets/images/arena/ranks/legend-ii.webp'), 1: require('../../assets/images/arena/ranks/legend-i.webp') },
};

export function arenaRankShieldAsset(tierKey: ArenaTierKey, division: ArenaRankDivision): ImageSourcePropType {
  return ASSETS[tierKey][division];
}
```

- [ ] **Step 4: Run the test and verify it now fails only for missing files**

Run the same Jest command.

Expected: FAIL on `existsSync` for all 24 WebP files; the map count and expected-name assertions pass.

- [ ] **Step 5: Keep the red contract uncommitted until the assets make it green**

Expected: only `components/arena/arena_rank_shield_assets.ts` and `tests/arena_rank_shield_assets.test.ts` are new; do not commit a revision whose static requires point at absent bundled files.

### Task 2: Generate, slice, and validate the 24 DALL·E shields

**Files:**
- Create: `scripts/build_arena_rank_shields.mjs`
- Generate: `.codex-tmp/arena-rank-shields/master.png`
- Generate: `.codex-tmp/arena-rank-shields/prompt.txt`
- Generate: `.codex-tmp/arena-rank-shields/contact-sheet.webp`
- Generate: `assets/images/arena/ranks/*.webp`

- [ ] **Step 1: Add the deterministic master-sheet slicer**

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'];
const divisions = ['iii', 'ii', 'i'];
const inputIndex = process.argv.indexOf('--input');
const outputIndex = process.argv.indexOf('--output');
const contactIndex = process.argv.indexOf('--contact-sheet');
if (inputIndex < 0 || outputIndex < 0 || contactIndex < 0) {
  throw new Error('Usage: node scripts/build_arena_rank_shields.mjs --input <master.png> --output <asset-dir> --contact-sheet <qa.webp>');
}

const input = path.resolve(process.argv[inputIndex + 1]);
const output = path.resolve(process.argv[outputIndex + 1]);
const contactSheet = path.resolve(process.argv[contactIndex + 1]);
const meta = await sharp(input).metadata();
if (!meta.width || !meta.height) throw new Error('Master sheet has no dimensions');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.dirname(contactSheet), { recursive: true });

const cellWidth = Math.floor(meta.width / tiers.length);
const cellHeight = Math.floor(meta.height / divisions.length);
const generated = [];
for (let row = 0; row < divisions.length; row += 1) {
  for (let column = 0; column < tiers.length; column += 1) {
    const left = column * cellWidth;
    const top = row * cellHeight;
    const width = column === tiers.length - 1 ? meta.width - left : cellWidth;
    const height = row === divisions.length - 1 ? meta.height - top : cellHeight;
    const tile = await sharp(input)
      .extract({ left, top, width, height })
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(384, 384, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 78, alphaQuality: 100, effort: 6 })
      .toBuffer();
    const filename = `${tiers[column]}-${divisions[row]}.webp`;
    const destination = path.join(output, filename);
    await fs.writeFile(destination, tile);
    generated.push(destination);
  }
}

const contactCell = 192;
const layers = await Promise.all(generated.map(async (file, index) => ({
  input: await sharp(file).resize(contactCell, contactCell, { fit: 'contain' }).png().toBuffer(),
  left: (index % tiers.length) * contactCell,
  top: Math.floor(index / tiers.length) * contactCell,
})));
await sharp({
  create: {
    width: tiers.length * contactCell,
    height: divisions.length * contactCell,
    channels: 4,
    background: { r: 14, g: 22, b: 34, alpha: 1 },
  },
}).composite(layers).webp({ quality: 82, effort: 6 }).toFile(contactSheet);
```

- [ ] **Step 2: Generate one safe master sheet with built-in `imagegen`**

Use exactly this structured prompt and request a genuinely transparent background:

```text
Use case: stylized-concept
Asset type: premium mobile-game rank shield master sheet for Phraseman
Primary request: exactly 24 unique heraldic rank shields arranged as a strict 8-column by 3-row grid; each column is one tier family and each row is its progression III, II, I
Subject: columns from left to right are Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Legend; rows from top to bottom are III, II, I; every shield represents language learning and knowledge; III centers an open-book emblem, II evolves the book with a luminous speech/sound symbol, I grows a knowledge crystal from the book and gains page-shaped wings; within each column keep the same silhouette language, material family and colors while increasing ornament, glow and prestige from III to II to I
Style/medium: extremely polished premium mobile-game UI asset, dimensional metal and enamel, friendly energetic Phraseman aesthetic, crisp silhouette, readable at 132 px, refined stylized 3D rendering
Color palette: Bronze warm patina; Silver cold matte silver; Gold saturated noble gold; Platinum icy white-blue; Diamond cyan crystal; Master violet and gold arcane metal; Grandmaster crimson and black premium alloy; Legend white gold with lime and subtle prismatic Phraseman energy
Composition/framing: orthographic front view, one centered shield per equal cell, generous transparent separation, identical scale and lighting, no overlap, no perspective tilt
Lighting/mood: premium studio rim light contained inside each object, triumphant and aspirational, never dark or threatening
Materials/textures: metal, enamel, luminous pages and knowledge crystal with clean game-ready highlights; increasingly elaborate but uncluttered from III to I
Constraints: genuinely transparent background; exactly 24 shields; no text, no letters, no Roman numerals, no numbers, no logos, no characters, no weapons, no skulls, no rectangular plates, no cast shadow outside each cell, no watermark
Avoid: gritty e-sports, medieval horror, muddy colors, tiny details, duplicated shields, inconsistent camera angle, background scenery
```

Move the selected built-in output from its generated-images location to `.codex-tmp/arena-rank-shields/master.png` and save the prompt beside it as `prompt.txt`. Do not use `OPENAI_API_KEY` or any project credential.

- [ ] **Step 3: Inspect the master before slicing**

Use `view_image` on `.codex-tmp/arena-rank-shields/master.png` and reject it unless all of these are true:

- 8 visibly distinct columns and 3 clearly progressive rows;
- exactly one isolated shield per cell;
- each tier's three shields share colors/materials;
- `III → II → I` gains prestige without changing family identity;
- all silhouettes remain legible around 132 px;
- no text, numerals, watermark, scene background, or overlap.

If one tier alone fails, generate one three-shield transparent correction strip for that named tier and replace only its three cells before slicing. Do not start a 24-image in-thread batch.

- [ ] **Step 4: Slice and compress the runtime files**

```powershell
node scripts/build_arena_rank_shields.mjs --input .codex-tmp/arena-rank-shields/master.png --output assets/images/arena/ranks --contact-sheet .codex-tmp/arena-rank-shields/contact-sheet.webp
```

Expected: exactly 24 `384×384` WebP files with alpha.

- [ ] **Step 5: Run the asset contract to GREEN**

```powershell
npx jest --runTestsByPath tests/arena_rank_shield_assets.test.ts --runInBand --no-cache
```

Expected: PASS, 24 required names, 24 unique files, no unwired extra variant.

- [ ] **Step 6: Inspect the generated QA contact sheet**

Open `.codex-tmp/arena-rank-shields/contact-sheet.webp` with `view_image`. Verify consistent canvas, alpha edges, scale, progression, and no accidental crop. The builder created this contact sheet from the final WebPs, not from the raw master.

- [ ] **Step 7: Commit only the builder and final wired assets**

```powershell
git add -- components/arena/arena_rank_shield_assets.ts tests/arena_rank_shield_assets.test.ts scripts/build_arena_rank_shields.mjs assets/images/arena/ranks
git commit -m "feat(arena): add 24 premium rank shields"
```

Do not add `.codex-tmp/arena-rank-shields/`.

### Task 3: Replace the stats grid with the floating rank hero

**Files:**
- Create: `tests/arena_hub_rank_hero_contract.test.ts`
- Modify: `components/arena/ArenaHubSummary.tsx`
- Modify: `components/arena/ArenaHubSurface.tsx`
- Modify: `tests/arena_redesign_audit_regressions.test.ts`

- [ ] **Step 1: Write the failing UI boundary contract**

```ts
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena hub floating rank hero', () => {
  it('renders the shield, three-star progress and no old stats grid', () => {
    const source = read('components/arena/ArenaHubSummary.tsx');
    expect(source).toContain('arenaRankShieldAsset');
    expect(source).toContain('<ArenaRankStars');
    expect(source).toContain('size={38}');
    expect(source).toContain("arenaText(lang, 'rankNext')");
    expect(source).not.toContain("arenaText(lang, 'wins')");
    expect(source).not.toContain("arenaText(lang, 'losses')");
    expect(source).not.toContain("arenaText(lang, 'streakLabel')");
  });

  it('runs transform-only motion only while active and motion is allowed', () => {
    const source = read('components/arena/ArenaHubSummary.tsx');
    expect(source).toContain('if (!active || reduceMotion)');
    expect(source).toContain('withRepeat(');
    expect(source).toContain('cancelAnimation(shieldY)');
    expect(source).toContain('cancelAnimation(starsY)');
    expect(source).toContain('translateY: shieldY.value');
    expect(source).toContain('translateY: starsY.value');
    expect(source).not.toMatch(/withTiming\([^\n]*(width|height|top|left)/);
  });

  it('receives the existing runtime and reduced-motion state from the hub', () => {
    const source = read('components/arena/ArenaHubSurface.tsx');
    expect(source).toContain('<ArenaHubSummary model={hub} active={active} reduceMotion={reduceMotion} />');
  });
});
```

- [ ] **Step 2: Run the contract and verify RED**

```powershell
npx jest --runTestsByPath tests/arena_hub_rank_hero_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because the summary still contains `wins`, `losses`, and `streakLabel`.

- [ ] **Step 3: Replace `ArenaHubSummary` with the approved composition**

Replace the file with this complete component:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { ArenaHubModel } from '../../modules/arena/hub_view';
import { arenaText } from '../../modules/arena/copy';
import { useLang } from '../LangContext';
import { V2Card } from '../ui/v2_ui';
import { useTournamentPalette } from '../ui/v2_theme';
import { ArenaRankStars } from './ArenaRankStars';
import { arenaRankShieldAsset } from './arena_rank_shield_assets';

const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const ROMAN = ['', 'I', 'II', 'III'] as const;

export function ArenaHubSummary({ model, active, reduceMotion }: Readonly<{
  model: ArenaHubModel;
  active: boolean;
  reduceMotion: boolean;
}>) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const rank = model.rank;
  const shieldY = useSharedValue(0);
  const starsY = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(shieldY);
    cancelAnimation(starsY);
    shieldY.value = 0;
    starsY.value = 0;
    if (!active || reduceMotion) return undefined;
    shieldY.value = withRepeat(withSequence(
      withTiming(-7, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
    starsY.value = withRepeat(withSequence(
      withTiming(-4, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
    return () => { cancelAnimation(shieldY); cancelAnimation(starsY); };
  }, [active, reduceMotion, shieldY, starsY]);

  const shieldStyle = useAnimatedStyle(() => ({ transform: [{ translateY: shieldY.value }] }));
  const starsStyle = useAnimatedStyle(() => ({ transform: [{ translateY: starsY.value }] }));
  const rankLabel = rank
    ? `${arenaText(lang, TIER_COPY[rank.tierIndex])} ${ROMAN[rank.division]}`
    : '—';
  const progressLabel = rank?.top
    ? arenaText(lang, 'rankTop')
    : `${arenaText(lang, 'rankNext')}: ${rank ? `${rank.winsToNextRank} ★` : '—'}`;
  const summaryAccessibilityLabel = rank
    ? `${rankLabel}. ${arenaText(lang, 'rankStars')}: ${rank.starsInRank}/${rank.starsPerRank}. ${progressLabel}`
    : `${arenaText(lang, 'ranks')}: ${arenaText(lang, 'valueUnknown')}`;

  return (
    <V2Card pad={16} style={styles.card}>
      <View
        testID="arena-rank-hero"
        accessible
        accessibilityLabel={summaryAccessibilityLabel}
        style={styles.hero}
      >
        <Text accessible={false} style={[styles.rank, { color: P.text }]}>{rankLabel}</Text>
        <Animated.View accessible={false} style={[styles.shieldStage, shieldStyle]}>
          {rank ? (
            <Image
              accessible={false}
              fadeDuration={0}
              source={arenaRankShieldAsset(rank.tierKey, rank.division)}
              style={styles.shield}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="shield-half" size={104} color={P.muted} />
          )}
        </Animated.View>
        <Animated.View accessible={false} style={[styles.starsStage, starsStyle]}>
          <ArenaRankStars filled={rank?.starsInRank ?? 0} size={38} />
        </Animated.View>
        <Text accessible={false} style={[styles.progress, { color: rank?.top ? P.gold : P.muted }]}>
          {progressLabel}
        </Text>
      </View>
    </V2Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'visible' },
  hero: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  rank: { maxWidth: '100%', textAlign: 'center', fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.4 },
  shieldStage: { width: 148, height: 168, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  shield: { width: 148, height: 168 },
  starsStage: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  progress: { maxWidth: '100%', textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 2 },
});
```

This keeps a fixed 148×168 shield stage, centered text, a minimum 52 px star row, and no absolute layout that can overlap at 320 pt. The whole hero is one accessible summary; decorative children are hidden from duplicate announcements.

- [ ] **Step 4: Pass runtime state from the hub surface**

Replace:

```tsx
<ArenaHubSummary model={hub} />
```

with:

```tsx
<ArenaHubSummary model={hub} active={active} reduceMotion={reduceMotion} />
```

- [ ] **Step 5: Update the existing redesign regression to the owner-approved hero**

Keep the assertions that `ArenaHubSurface` still feeds authoritative `wins` and `losses` into the model. Replace only the obsolete `model.streak` rendering assertion with:

```ts
expect(summary).toContain('winsToNextRank');
expect(summary).toContain('arenaRankShieldAsset');
expect(summary).not.toContain('model.streak');
expect(summary).not.toContain("arenaText(lang, 'wins')");
expect(summary).not.toContain("arenaText(lang, 'losses')");
```

- [ ] **Step 6: Run focused hub tests**

```powershell
npx jest --runTestsByPath tests/arena_hub_rank_hero_contract.test.ts tests/arena_hub_surface_contract.test.ts tests/arena_redesign_audit_regressions.test.ts tests/arena_hub_view.test.ts --runInBand --no-cache
```

Expected: PASS with the authoritative profile totals still present in `ArenaHubSurface` and the old stats grid absent only from `ArenaHubSummary`.

- [ ] **Step 7: Commit the hero**

```powershell
git add -- components/arena/ArenaHubSummary.tsx components/arena/ArenaHubSurface.tsx tests/arena_hub_rank_hero_contract.test.ts tests/arena_redesign_audit_regressions.test.ts
git commit -m "feat(arena): float current rank above star progress"
```

### Task 4: Align the loading geometry and owner record

**Files:**
- Modify: `components/arena/ArenaHubSkeleton.tsx`
- Modify: `docs/arena/OWNER_DECISIONS.md`
- Modify: `tests/arena_hub_rank_hero_contract.test.ts`

- [ ] **Step 1: Extend the failing contract to require matching skeleton geometry**

Add:

```ts
it('reserves the hero geometry in the Arena skeleton', () => {
  const source = read('components/arena/ArenaHubSkeleton.tsx');
  expect(source).toContain('styles.rankShield');
  expect(source).toContain('width={148}');
  expect(source).toContain('height={168}');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run the hero contract alone. Expected: FAIL because the skeleton still draws a compact bar card.

- [ ] **Step 3: Replace the rank skeleton with the hero silhouette**

Use a centered title bone, a 148×168 rounded shield-stage bone, a 142×38 star-row bone, and a 180×14 progress bone. Keep `accessibilityElementsHidden` and the existing palette-derived shimmer tones.

```tsx
<View style={[styles.card, styles.rankCard, { backgroundColor: palette.surfaceGradB }]}>
  <SkeletonBlock width="48%" height={24} borderRadius={12} baseColor={bone} highlightColor={shine} />
  <SkeletonBlock width={148} height={168} borderRadius={48} baseColor={bone} highlightColor={shine} style={styles.rankShield} />
  <SkeletonBlock width={142} height={38} borderRadius={19} baseColor={bone} highlightColor={shine} />
  <SkeletonBlock width={180} height={14} borderRadius={7} baseColor={bone} highlightColor={shine} />
</View>
```

Replace the obsolete `rankHead` style with these exact styles:

```ts
rankCard: { minHeight: 332, alignItems: 'center', justifyContent: 'center', gap: 10 },
rankShield: { marginVertical: 2 },
```

- [ ] **Step 4: Append the owner decision**

Add a dated entry recording:

- the old wins/losses/streak grid is removed only from the hub hero;
- the rank hero uses 24 unique DALL·E shields;
- each tier is one three-step visual family `III → II → I`;
- three existing rank stars remain the truthful progress source;
- shield and star-row levitation stop off-screen and under reduced motion;
- rank arithmetic, history, and stored stats remain unchanged.

- [ ] **Step 5: Run the hero and asset contracts**

```powershell
npx jest --runTestsByPath tests/arena_hub_rank_hero_contract.test.ts tests/arena_rank_shield_assets.test.ts --runInBand --no-cache
```

Expected: PASS.

- [ ] **Step 6: Commit skeleton and decision**

```powershell
git add -- components/arena/ArenaHubSkeleton.tsx docs/arena/OWNER_DECISIONS.md tests/arena_hub_rank_hero_contract.test.ts
git commit -m "docs(arena): record floating rank hero"
```

### Task 5: Verify the complete Arena change

**Files:**
- Verify only; repair only files already listed in Tasks 1–4 if a focused gate exposes a defect.

- [ ] **Step 1: Run diff hygiene and the two new contracts**

```powershell
git diff --check
npx jest --runTestsByPath tests/arena_rank_shield_assets.test.ts tests/arena_hub_rank_hero_contract.test.ts --runInBand --no-cache
```

Expected: no whitespace errors; both test suites PASS.

- [ ] **Step 2: Acquire the shared heavy-test semaphore and run all root Arena suites**

```powershell
$bash = 'C:\Program Files\Git\bin\bash.exe'
& $bash '.claude/semaphore/slot.sh' acquire 'jest Arena root suites'
try {
  $arenaTests = Get-ChildItem 'tests' -Filter 'arena_*.test.ts' | ForEach-Object FullName
  npx jest --runTestsByPath @arenaTests --runInBand --no-cache
  if ($LASTEXITCODE -ne 0) { throw "Arena root tests failed: $LASTEXITCODE" }
} finally {
  & $bash '.claude/semaphore/slot.sh' release
}
```

Expected: every root `arena_*.test.ts` suite PASS.

- [ ] **Step 3: Run Arena Cloud Functions suites under the same semaphore discipline**

```powershell
$bash = 'C:\Program Files\Git\bin\bash.exe'
& $bash '.claude/semaphore/slot.sh' acquire 'jest Arena functions suites'
try {
  Push-Location 'functions'
  $arenaFunctionTests = Get-ChildItem 'src' -Filter 'arena_*.test.ts' | ForEach-Object FullName
  npx jest --runTestsByPath @arenaFunctionTests --runInBand
  if ($LASTEXITCODE -ne 0) { throw "Arena function tests failed: $LASTEXITCODE" }
} finally {
  Pop-Location
  & $bash '.claude/semaphore/slot.sh' release
}
```

Expected: every Functions `arena_*.test.ts` suite PASS.

- [ ] **Step 4: Perform visual and accessibility QA**

Open the Arena hub and verify:

- Bronze III, Gold II, Diamond I, and Legend I select different correct files;
- all three divisions within one tier look like one visual family;
- 0/3, 1/3, 2/3, and top-rank star states are truthful;
- the shield and star row float subtly without moving layout;
- backgrounding the app or leaving the Arena stops loops;
- reduced motion produces a fully static hero;
- 320 pt width and enlarged system font do not clip title/progress;
- VoiceOver/TalkBack announces rank, star count, and remaining wins once.

- [ ] **Step 5: Inspect final asset hygiene**

```powershell
$files = Get-ChildItem 'assets/images/arena/ranks' -Filter '*.webp'
if ($files.Count -ne 24) { throw "Expected 24 Arena rank shields, found $($files.Count)" }
rg -n "assets/images/arena/ranks/" components/arena/arena_rank_shield_assets.ts
git status --short -- components/arena assets/images/arena/ranks scripts/build_arena_rank_shields.mjs tests/arena_ docs/arena/OWNER_DECISIONS.md
```

Expected: exactly 24 bundled files; all 24 paths appear as static requires; no raw PNG/contact sheet is under `assets/images/**`.

- [ ] **Step 6: Run verification-before-completion and review the final diff**

Review only the Arena-owned paths, confirm no unrelated dirty files were staged, and report exact commands, suite counts, decisive failures if any, final asset paths, and the final built-in imagegen prompt.
