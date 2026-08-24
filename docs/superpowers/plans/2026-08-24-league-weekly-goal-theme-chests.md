# League Weekly Goal Theme Chests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and ship nine new open-chest assets so «Общая цель недели» displays unique art for every selectable interface theme.

**Architecture:** A dedicated `Record<ThemeMode, ImageSourcePropType>` owns static league asset requires. `LeagueBonusMission` resolves the current theme locally and renders the asset with `expo-image`, preserving the current vector fallback until the image loads. Three built-in DALL·E source sheets keep in-thread image payload bounded; a deterministic Sharp script crops, centres, and compresses the nine final WebP files.

**Tech Stack:** React Native, Expo Image, TypeScript, Jest static contracts, Sharp, Codex built-in image generation.

---

## File map

- Create `components/league/leagueWeeklyGoalAssets.ts`: exhaustive static theme-to-asset registry.
- Modify `components/league/LeagueBonusMission.tsx`: resolve and render the current theme asset.
- Create `scripts/process-league-weekly-goal-chests.mjs`: deterministic three-panel sheet processor.
- Create `tests/league_weekly_goal_theme_assets.test.ts`: registry, file, and component contracts.
- Create `assets/images/league/weekly-goal/<theme>.webp`: nine final bundled assets.
- Keep raw generation under `.codex-tmp/league-weekly-goal-chests/`: non-bundled source sheets, crops, and QA contact sheet.

### Task 1: Lock the runtime contract with a failing test

**Files:**
- Create: `tests/league_weekly_goal_theme_assets.test.ts`

- [ ] **Step 1: Write the failing static contract**

```ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const THEMES = ['dark', 'gold', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'indigo', 'sagePorcelain'] as const;

describe('league weekly goal theme art', () => {
  test('has one static bundled asset per ThemeMode', () => {
    const registryPath = path.join(ROOT, 'components/league/leagueWeeklyGoalAssets.ts');
    const source = fs.readFileSync(registryPath, 'utf8');

    for (const theme of THEMES) {
      const relative = `../../assets/images/league/weekly-goal/${theme}.webp`;
      expect(source).toContain(`require('${relative}')`);
      expect(fs.existsSync(path.join(ROOT, relative.replace('../../', '')))).toBe(true);
    }
    expect(source).toContain('satisfies Record<ThemeMode, ImageSourcePropType>');
  });

  test('renders the theme asset as the primary chest art', () => {
    const mission = fs.readFileSync(path.join(ROOT, 'components/league/LeagueBonusMission.tsx'), 'utf8');
    expect(mission).toContain("from './leagueWeeklyGoalAssets'");
    expect(mission).toContain('getLeagueWeeklyGoalAsset(themeMode)');
    expect(mission).toContain("from 'expo-image'");
    expect(mission).toContain('source={weeklyGoalAsset as ImageSource}');
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run after acquiring the shared heavy-process slot:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire 'jest weekly goal chest RED'
try { npx jest tests/league_weekly_goal_theme_assets.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: FAIL because `components/league/leagueWeeklyGoalAssets.ts` and the nine final files do not exist.

### Task 2: Wire the theme registry before generating files

**Files:**
- Create: `components/league/leagueWeeklyGoalAssets.ts`
- Modify: `components/league/LeagueBonusMission.tsx`

- [ ] **Step 1: Create the exhaustive static registry**

```ts
import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../../constants/theme';

const LEAGUE_WEEKLY_GOAL_ASSETS = {
  dark: require('../../assets/images/league/weekly-goal/dark.webp'),
  gold: require('../../assets/images/league/weekly-goal/gold.webp'),
  olive: require('../../assets/images/league/weekly-goal/olive.webp'),
  midnight: require('../../assets/images/league/weekly-goal/midnight.webp'),
  ember: require('../../assets/images/league/weekly-goal/ember.webp'),
  aurora: require('../../assets/images/league/weekly-goal/aurora.webp'),
  volt: require('../../assets/images/league/weekly-goal/volt.webp'),
  indigo: require('../../assets/images/league/weekly-goal/indigo.webp'),
  sagePorcelain: require('../../assets/images/league/weekly-goal/sagePorcelain.webp'),
} as const satisfies Record<ThemeMode, ImageSourcePropType>;

export function getLeagueWeeklyGoalAsset(themeMode: ThemeMode): ImageSourcePropType {
  return LEAGUE_WEEKLY_GOAL_ASSETS[themeMode];
}
```

- [ ] **Step 2: Render the registry asset inside the existing ring**

Add `useEffect`, `useMemo`, and `useState` to the React import; import `Image` and `ImageSource` from `expo-image`, `useTheme`, and `getLeagueWeeklyGoalAsset`. In the component:

```tsx
const { themeMode } = useTheme();
const weeklyGoalAsset = useMemo(() => getLeagueWeeklyGoalAsset(themeMode), [themeMode]);
const [weeklyGoalAssetLoaded, setWeeklyGoalAssetLoaded] = useState(false);
const chestAccessibilityLabel = triLang(lang, {
  ru: 'Сундук Бонус-лиги', uk: 'Скриня Бонус-ліги', es: 'Cofre de liga',
  'pt-BR': 'Baú da liga', vi: 'Rương giải đấu', id: 'Peti liga',
  tr: 'Lig sandığı', pl: 'Skrzynia ligi',
});

useEffect(() => setWeeklyGoalAssetLoaded(false), [weeklyGoalAsset]);
```

Replace the direct fallback with this bounded layer:

```tsx
<View style={styles.chestArt}>
  {!weeklyGoalAssetLoaded ? (
    <RetiredRasterFallback
      kind="league"
      size={44}
      color={model.canClaim ? palette.accentText : palette.warning}
      accessibilityLabel={chestAccessibilityLabel}
    />
  ) : null}
  <Image
    source={weeklyGoalAsset as ImageSource}
    contentFit="contain"
    accessible={false}
    onLoad={() => setWeeklyGoalAssetLoaded(true)}
    onError={() => setWeeklyGoalAssetLoaded(false)}
    style={[StyleSheet.absoluteFill, { opacity: weeklyGoalAssetLoaded ? 1 : 0 }]}
  />
</View>
```

Add `chestArt: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }` and hoist the existing localized chest label into `chestAccessibilityLabel`.

- [ ] **Step 3: Confirm the static test now fails only on absent image files**

Expected: registry and component assertions pass; nine `existsSync` assertions remain RED.

### Task 3: Generate three bounded DALL·E source sheets

**Files:**
- Create: `.codex-tmp/league-weekly-goal-chests/sources/sheet-1.png`
- Create: `.codex-tmp/league-weekly-goal-chests/sources/sheet-2.png`
- Create: `.codex-tmp/league-weekly-goal-chests/sources/sheet-3.png`

- [ ] **Step 1: Generate sheet 1 (`indigo`, `sagePorcelain`, `olive`)**

Use built-in `image_gen` with this prompt:

```text
Use case: stylized-concept
Asset type: three-panel mobile game UI chest sprite sheet
Primary request: exactly three distinct slightly open reward chests, one per equal vertical panel, isolated and not touching: indigo celestial travel coffer; sage porcelain keepsake chest; dark olive expedition chest.
Style/medium: polished premium 3D illustration, clean silhouette, restrained detail, consistent three-quarter camera and scale.
Composition/framing: horizontal three-panel sheet, one centred chest per panel, very generous transparent gutters, entire chest visible including feet and open lid.
Lighting/mood: light emerges only from inside each chest; indigo moonlight, warm cream porcelain light, calm amber olive light.
Constraints: genuinely transparent background; no panel dividers; no labels; no text; no logos; no watermark; no coins; no loose gems; no characters; no square safe shape; no circular vault door; no dominant front lock; each silhouette and material must be structurally different.
```

- [ ] **Step 2: Generate sheet 2 (`midnight`, `ember`, `aurora`)**

Use built-in `image_gen` with this prompt:

```text
Use case: stylized-concept
Asset type: three-panel mobile game UI chest sprite sheet
Primary request: exactly three distinct slightly open reward chests, one per equal vertical panel, isolated and not touching: asymmetric lunar obsidian chest with a crescent-like lid edge; low forged basalt chest with irregular iron ribs; frosted translucent glass chest with a wave-shaped lid.
Style/medium: polished premium 3D illustration, clean silhouette, restrained detail, consistent three-quarter camera and scale.
Composition/framing: horizontal three-panel sheet, one centred chest per panel, very generous transparent gutters, entire chest visible including feet and open lid.
Lighting/mood: light emerges only from inside each chest; cold cyan midnight light, orange-gold firelight, turquoise-pink aurora light.
Constraints: genuinely transparent background; no panel dividers; no labels; no text; no logos; no watermark; no coins; no loose gems; no characters; no square safe shape; no circular vault door; no dominant front lock; each silhouette and material must be structurally different.
```

- [ ] **Step 3: Generate sheet 3 (`volt`, `dark`, `gold`)**

Use built-in `image_gen` with this prompt:

```text
Use case: stylized-concept
Asset type: three-panel mobile game UI chest sprite sheet
Primary request: exactly three distinct slightly open reward chests, one per equal vertical panel, isolated and not touching: low angular graphite energy case with sharp cuts and exposed hinge; carved black-wood forest reliquary with dark-green leaf-like metalwork; black piano-lacquer jewellery coffer with restrained champagne trim.
Style/medium: polished premium 3D illustration, clean silhouette, restrained detail, consistent three-quarter camera and scale.
Composition/framing: horizontal three-panel sheet, one centred chest per panel, very generous transparent gutters, entire chest visible including feet and open lid.
Lighting/mood: light emerges only from inside each chest; acid-yellow electric pulse, rich emerald forest light, warm white-gold light.
Constraints: genuinely transparent background; no panel dividers; no labels; no text; no logos; no watermark; no coins; no loose gems; no characters; no square safe shape; no circular vault door; no dominant front lock; each silhouette and material must be structurally different.
```

- [ ] **Step 4: Inspect all sheets**

Reject and regenerate a sheet if it has fewer or more than three chests, a non-transparent background, touching panels, text, a vault-door motif, or near-identical silhouettes.

### Task 4: Crop, centre, and compress the nine assets

**Files:**
- Create: `scripts/process-league-weekly-goal-chests.mjs`
- Create: nine files under `assets/images/league/weekly-goal/`

- [ ] **Step 1: Add the deterministic Sharp processor**

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const sheetPath = valueFor('--sheet');
const outDir = valueFor('--out-dir');
const themes = (valueFor('--themes') ?? '').split(',').filter(Boolean);

if (!sheetPath || !outDir || themes.length !== 3) {
  throw new Error('Usage: --sheet <png> --themes a,b,c --out-dir <dir>');
}

const metadata = await sharp(sheetPath).metadata();
if (!metadata.width || !metadata.height || !metadata.hasAlpha) {
  throw new Error('Source sheet must have known dimensions and an alpha channel');
}

await fs.mkdir(outDir, { recursive: true });
const basePanelWidth = Math.floor(metadata.width / 3);

for (const [index, theme] of themes.entries()) {
  const left = index * basePanelWidth;
  const width = index === 2 ? metadata.width - left : basePanelWidth;
  const panel = await sharp(sheetPath)
    .extract({ left, top: 0, width, height: metadata.height })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(420, 420, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  const output = path.join(outDir, `${theme}.webp`);
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: panel.data,
      left: Math.round((512 - panel.info.width) / 2),
      top: Math.round((512 - panel.info.height) / 2),
    }])
    .webp({ quality: 76, alphaQuality: 100, smartSubsample: true })
    .toFile(output);

  const finalMetadata = await sharp(output).metadata();
  if (finalMetadata.width !== 512 || finalMetadata.height !== 512 || !finalMetadata.hasAlpha) {
    throw new Error(`Invalid output metadata for ${theme}`);
  }
}
```

- [ ] **Step 2: Process each source sheet**

```powershell
node scripts/process-league-weekly-goal-chests.mjs --sheet .codex-tmp/league-weekly-goal-chests/sources/sheet-1.png --themes indigo,sagePorcelain,olive --out-dir assets/images/league/weekly-goal
node scripts/process-league-weekly-goal-chests.mjs --sheet .codex-tmp/league-weekly-goal-chests/sources/sheet-2.png --themes midnight,ember,aurora --out-dir assets/images/league/weekly-goal
node scripts/process-league-weekly-goal-chests.mjs --sheet .codex-tmp/league-weekly-goal-chests/sources/sheet-3.png --themes volt,dark,gold --out-dir assets/images/league/weekly-goal
```

Expected: nine `512x512` WebP files, each with alpha and no raw sheet inside `assets/images/**`.

### Task 5: Verify GREEN and visual quality

**Files:**
- Modify if required: only the failed theme asset or focused registry/component code.

- [ ] **Step 1: Run the focused contract with the shared slot**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire 'jest weekly goal chest GREEN'
try { npx jest tests/league_weekly_goal_theme_assets.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: PASS, 2 tests.

- [ ] **Step 2: Run deterministic image metadata checks**

Use Sharp to assert nine files, 512×512 dimensions, alpha present, and bounded file sizes. Expected: all nine pass.

- [ ] **Step 3: Build a non-bundled contact sheet**

Create `.codex-tmp/league-weekly-goal-chests/qa/contact-sheet.webp` with each chest on its matching theme background and an additional 44 px preview. Inspect for clipped lids, muddy silhouettes, halo artifacts, similarity to old vault assets, and low contrast.

- [ ] **Step 4: Re-run the focused test after any targeted replacement**

Expected: PASS and no changes to league progress, claim, boost, accessibility, or navigation logic.
