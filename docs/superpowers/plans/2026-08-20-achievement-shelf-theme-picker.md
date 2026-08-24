# Achievement Shelf Theme Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the achievement showcase materials follow every active interface theme, render the collectible stage as native UI instead of a DALL-E cabinet, and replace the top category chips with one centered bottom capsule whose category menu expands upward like Cards.

**Architecture:** Add a pure theme-material resolver and a focused `AchievementCategoryDock`. The existing carousel keeps ownership of trophy scrolling while consuming resolved materials and drawing a shallow podium from React Native gradients/views; `AchievementsScreen` keeps category state, removes the chip row, supplies localized dock options, and preserves all reward/modal/navigation behavior.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, React Native Reanimated, react-native-svg, native gradient/view layers, Jest/ts-jest, shared Motion Hybrid tokens.

---

### Task 1: Theme-derived shelf materials

**Files:**
- Create: `components/achievements/achievementShelfMaterials.ts`
- Create: `tests/achievement_shelf_materials.test.ts`
- Modify: `components/achievements/AchievementShelfCarousel.tsx`

- [ ] **Step 1: Write the failing material tests**

```ts
import { achievementShelfMaterials } from '../components/achievements/achievementShelfMaterials';

const theme = {
  bgPrimary: '#010203', bgCard: '#111213', bgSurface: '#212223', bgSurface2: '#313233',
  textPrimary: '#F1F2F3', accent: '#47C870', border: 'rgba(255,255,255,0.07)',
  borderHighlight: 'rgba(71,200,112,0.18)', cardShadow: 'rgba(0,0,0,0.55)', shadowDark: '#000000',
};

test('large shelf materials are derived from the current theme', () => {
  const result = achievementShelfMaterials(theme, true);
  expect(result.frameGradient).toEqual(['#313233', '#111213']);
  expect(result.cavityGradient).toEqual(['#212223', '#010203']);
  expect(result.railGradient).toContain('#47C870');
  expect(result.border).toBe(theme.border);
  expect(result.textureOpacity).toBeLessThan(0.3);
});

test('light themes use a quieter neutral texture', () => {
  expect(achievementShelfMaterials(theme, false).textureOpacity)
    .toBeLessThan(achievementShelfMaterials(theme, true).textureOpacity);
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_materials.test.ts --no-cache --runInBand`

Expected: FAIL because `achievementShelfMaterials.ts` does not exist.

- [ ] **Step 3: Implement the pure resolver**

Create a resolver accepting only the theme fields it needs. Return `frameGradient`, `cavityGradient`, `railGradient`, `spotlightGradient`, `border`, `highlight`, `shadow`, and `textureOpacity`. Use a local `colorWithAlpha` helper that converts `#RGB`/`#RRGGBB` to `rgba(...)`; never hard-code brass, wood, or a theme mode table.

- [ ] **Step 4: Consume materials in the carousel**

In `AchievementShelfCarousel`, compute:

```ts
const { theme: t, f, isDark } = useTheme();
const materials = useMemo(() => achievementShelfMaterials(t, isDark), [isDark, t]);
```

Render a theme-gradient base, the neutral DALL-E texture at `materials.textureOpacity`, the material spotlight, and a rail gradient. Remove `t.gold + '44'` and the fixed warm `rgba(255,...)` cone.

- [ ] **Step 5: Run GREEN**

Run: `npx jest --runTestsByPath tests/achievement_shelf_materials.test.ts tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: both suites pass.

### Task 2: Centered upward category dock

**Files:**
- Create: `components/achievements/AchievementCategoryDock.tsx`
- Modify: `constants/motionHybrid.ts`
- Modify: `tests/achievement_shelf_contract.test.ts`

- [ ] **Step 1: Extend the contract before implementation**

Add source assertions that the dock contains:

```ts
expect(dock).toContain('testID="achievement-category-dock"');
expect(dock).toContain('testID="achievement-category-dock-scrim"');
expect(dock).toContain('accessibilityState={{ expanded: open }}');
expect(dock).toContain('BackHandler');
expect(dock).toContain('ACHIEVEMENT_CATEGORY_DOCK_HYBRID');
expect(motion).toContain('export const ACHIEVEMENT_CATEGORY_DOCK_HYBRID');
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the dock component and tokens do not exist.

- [ ] **Step 3: Add named motion and layout tokens**

Append `ACHIEVEMENT_CATEGORY_DOCK_HYBRID` to `constants/motionHybrid.ts` with named values for row translate, row starting scale, stagger, timing fallback, spring open/close, scrim opacity, dock bottom gap, row height, row gap, and maximum menu height. Components must not introduce new spring or duration literals.

- [ ] **Step 4: Implement `AchievementCategoryDock`**

Use this public interface:

```ts
export type AchievementCategoryOption<T extends string = string> = {
  id: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props<T extends string> = {
  options: readonly AchievementCategoryOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  openLabel: string;
  closeLabel: string;
};
```

The root is `StyleSheet.absoluteFillObject` with `pointerEvents="box-none"`. A centered capsule stays above the safe bottom inset. When open, a Pressable scrim covers the screen and a height-limited `ScrollView` of localized option rows sits directly above the capsule. Each row owns a Reanimated progress value and resolves upward using transform/opacity; Reduce Motion uses timing without travel. Android Back closes the menu first. Selection haptics use `hapticTap`.

- [ ] **Step 5: Run GREEN**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: dock and motion contracts pass.

### Task 3: Replace top chips and neutralize the detail card

**Files:**
- Modify: `app/achievements_screen.tsx`
- Modify: `tests/achievement_shelf_contract.test.ts`

- [ ] **Step 1: Add failing screen integration assertions**

```ts
expect(screen).toContain("import AchievementCategoryDock from '../components/achievements/AchievementCategoryDock'");
expect(screen).toContain('<AchievementCategoryDock');
expect(screen).not.toContain('testID="achievement-shelf-category-filter"');
expect(screen).not.toContain("colors={[color + '28', t.bgCard, t.bgSurface]}");
expect(tabs).not.toContain('achievements_screen');
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the top chip row is still rendered and the dock is not integrated.

- [ ] **Step 3: Integrate the dock**

Build localized options from `['all', ...shelfCategories]`, `achievementShelfCategoryLabel`, and `CAT_ICON`. Remove the nested horizontal chip `ScrollView`. Render the dock as an absolute sibling after `ContentWrap` and increase vertical content bottom padding so the report button clears the capsule.

Selecting an option calls `setShelfCategory`, closes inside the dock, and lets the existing `achievementShelfInitialId` effect choose the most recent trophy in the new category.

- [ ] **Step 4: Make the detail card theme-native**

Replace the category-filled gradient and border with:

```tsx
colors={[t.bgSurface2, t.bgCard, t.bgSurface]}
borderColor: t.borderHighlight
```

Use `t.accent` for the small open icon. Do not change trophy artwork colors.

- [ ] **Step 5: Run GREEN**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts tests/achievements_modal_scroll_contract.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand`

Expected: all selected suites pass.

### Task 4: Neutralize and verify the texture asset

**Files:**
- Modify mechanically: `assets/images/achievements/shelf/achievement-shelf-showcase.webp`

- [ ] **Step 1: Convert the existing wired image to neutral monochrome**

Run Sharp against the existing WebP using `grayscale()`, preserve 1280×800, and write WebP quality 74/effort 6 back to the same statically required path. Keep the DALL-E original outside the bundled asset tree.

- [ ] **Step 2: Verify asset properties**

Run a Sharp metadata/stats command and confirm WebP, 1280×800, compressed size below 100 KB, and equal grayscale channel means. Confirm exactly one source `require()` references the bundled file.

### Task 5: Focused verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused gates**

Run: `npx jest --runTestsByPath tests/achievement_shelf_materials.test.ts tests/achievement_shelf_model.test.ts tests/achievement_shelf_contract.test.ts tests/achievements_modal_scroll_contract.test.ts tests/achievements_tonal_container_design_contract.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand`

Expected: all shelf/motion/modal suites pass.

- [ ] **Step 2: Run TypeScript and filter touched-file diagnostics**

Run the project compiler with an 8 GB heap through `scripts/codex-safe-run.mjs`, then search its log for `achievementShelfMaterials`, `AchievementCategoryDock`, `AchievementShelfCarousel`, and `achievements_screen`. Expected: no diagnostics in touched files; unrelated dirty-worktree diagnostics are recorded separately.

- [ ] **Step 3: Review protected behavior**

Confirm the bottom-tabs layout still contains no `achievements_screen`, existing stack/toast/stats entry points remain, `AchievementModal` still renders, and claim/share code is untouched.

- [ ] **Step 4: Do not create an implementation commit**

`app/achievements_screen.tsx`, `constants/motionHybrid.ts`, and the index already overlap user work, while unrelated Arena files are staged. Leave implementation changes uncommitted and report exact files and verification evidence.

### Task 6: Replace the raster cabinet with a native UI podium

**Files:**
- Modify: `tests/achievement_shelf_contract.test.ts`
- Modify: `tests/achievement_shelf_materials.test.ts`
- Modify: `components/achievements/achievementShelfMaterials.ts`
- Modify: `components/achievements/AchievementShelfCarousel.tsx`
- Delete after zero-reference verification: `constants/achievementShelfAssets.ts`
- Delete after zero-reference verification: `assets/images/achievements/shelf/achievement-shelf-showcase.webp`

- [ ] **Step 1: Write the failing native-podium contracts**

Add assertions requiring `testID="achievement-shelf-podium"`, `testID="achievement-shelf-halo"`, `materials.stageGradient`, `materials.podiumTopGradient`, and `materials.podiumFaceGradient`. Add negative assertions for `ExpoImage`, `ACHIEVEMENT_SHELF_BACKDROP`, `achievement-shelf-spotlight`, `styles.cavity`, and `styles.shelfRail`.

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_materials.test.ts tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the carousel still imports the raster cabinet and renders the rectangular spotlight/cavity/rail.

- [ ] **Step 3: Resolve native stage materials**

Replace the cabinet fields with the following public material contract:

```ts
export type AchievementShelfMaterials = {
  stageGradient: [string, string, string];
  podiumTopGradient: [string, string];
  podiumFaceGradient: [string, string];
  podiumEdge: string;
  haloCore: string;
  haloOuter: string;
  border: string;
  shadow: string;
  shadowDark: string;
};
```

Derive every value from `bgPrimary`, `bgCard`, `bgSurface`, `bgSurface2`, `textPrimary`, `accent`, `border`, `borderHighlight`, `cardShadow`, and `shadowDark`. Do not add a theme-name table or gold/brass literals.

- [ ] **Step 4: Draw the podium from React Native layers**

Remove `ExpoImage` and `ACHIEVEMENT_SHELF_BACKDROP`. Make the stage shorter than 300 points and render, behind the list, two compact rounded halo ellipses centered on the selected cell. Render, in front of the list, a podium composed of a shallow top-plane gradient, a front-face gradient, a one-point theme edge, and a soft grounded shadow. The halo dimensions must be fixed compact ellipses, not a full-height beam or rectangular column.

- [ ] **Step 5: Run GREEN**

Run: `npx jest --runTestsByPath tests/achievement_shelf_materials.test.ts tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: both suites pass and the negative raster/spotlight assertions remain green.

- [ ] **Step 6: Remove the now-unwired raster files**

Run literal searches for `achievementShelfAssets` and `achievement-shelf-showcase.webp` across `app`, `components`, `constants`, `hooks`, `lib`, and `modules`. Only after both searches return zero source references, remove the constant file and WebP. Confirm no other file exists in the shelf asset directory.

- [ ] **Step 7: Run focused regression and touched-file TypeScript checks**

Run the six achievement/motion suites from Task 5 and the project TypeScript compiler through `scripts/codex-safe-run.mjs`. Require zero diagnostics for `AchievementShelfCarousel`, `achievementShelfMaterials`, `AchievementCategoryDock`, and `achievements_screen`; report unrelated project diagnostics separately.

### Task 7: Refine the native podium into Museum Glass

**Files:**
- Create: `components/achievements/AchievementShelfStageArt.tsx`
- Modify: `components/achievements/AchievementShelfCarousel.tsx`
- Modify: `components/achievements/achievementShelfMaterials.ts`
- Modify: `constants/motionHybrid.ts`
- Modify: `tests/achievement_shelf_contract.test.ts`
- Modify: `tests/achievement_shelf_materials.test.ts`

- [ ] **Step 1: Write failing Museum Glass contracts**

Extend the shelf contract to require the carousel to import and render `AchievementShelfStageArt`, own `withRepeat`, `cancelAnimation`, and selection reflection progress, and pass animated light/reflection styles. Read the stage-art source and require `RadialGradient`, transparent outer `Stop`, two shelf `Path` elements, and a clipped reflection track. Assert that neither the carousel nor stage art contains `Ellipse`, `Circle`, `borderRadius: 999`, `haloOuter`, or `haloCore` view layers.

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_materials.test.ts tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because `AchievementShelfStageArt.tsx` does not exist and the carousel still renders two oval views plus a pill-shaped podium.

- [ ] **Step 3: Extend the material contract**

Replace `podiumTopGradient`, `podiumFaceGradient`, `podiumEdge`, `haloCore`, and `haloOuter` with:

```ts
shelfTopStart: string;
shelfTopEnd: string;
shelfFaceStart: string;
shelfFaceEnd: string;
shelfEdge: string;
lightCore: string;
lightMid: string;
lightOuter: string;
reflection: string;
```

Derive every value from theme tokens with `colorWithAlpha`; `lightOuter` must end at alpha zero. Keep `stageGradient`, `border`, `shadow`, and `shadowDark`.

- [ ] **Step 4: Build `AchievementShelfStageArt`**

Expose this focused interface:

```ts
type Props = {
  materials: AchievementShelfMaterials;
  lightStyle: StyleProp<ViewStyle>;
  reflectionStyle: StyleProp<ViewStyle>;
};
```

Use `react-native-svg` with unique IDs derived from `useId()`. Draw one radial-gradient `Rect` for continuous light. Draw shelf depth in a separate 320×56 SVG using one trapezoid `Path` for the top plane and one for the front face, each with theme-derived linear gradients. Overlay a narrow Reanimated reflection inside an `overflow: 'hidden'` straight-edged track aligned to the shelf top. Do not draw concentric SVG shapes.

- [ ] **Step 5: Add named Museum Glass motion tokens**

Replace the unused spotlight tokens in `ACHIEVEMENT_SHELF_HYBRID` with `lightOpacityMin`, `lightOpacityMax`, `lightScaleMin`, `lightScaleMax`, `lightBreathMs`, `reflectionDelayMs`, `reflectionMs`, and `reflectionTravel`. Use roughly five seconds for breathing and under one second for the one-shot reflection.

- [ ] **Step 6: Own animation lifecycle in the carousel**

Create `lightProgress` and `reflectionProgress` shared values. When motion is allowed, run the light with `withRepeat(withTiming(...), -1, true)` and cancel it in effect cleanup. On `selectedId` change, run one delayed reflection with timing and cancel any previous pass. With Reduce Motion, set light progress to its midpoint and keep reflection at zero. Animated styles may change only opacity and transform. Render `AchievementShelfStageArt` behind/in front of the existing list without changing scrolling or accessibility behavior.

- [ ] **Step 7: Run GREEN and focused verification**

Run the two shelf suites, then the six focused achievement/motion suites. Run TypeScript through `scripts/codex-safe-run.mjs` and require zero diagnostics for `AchievementShelfStageArt`, `AchievementShelfCarousel`, `achievementShelfMaterials`, `AchievementCategoryDock`, and `achievements_screen`. Confirm the DALL-E asset remains absent and reward/modal/share/navigation invariants remain present.

- [ ] **Step 8: Leave implementation uncommitted**

The shared checkout contains unrelated staged and unstaged work. Do not stage, commit, merge, or discard implementation files; report focused evidence only.
