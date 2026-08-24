# Achievement Shelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the earned-achievement grid on `/achievements_screen` with a horizontally snapping trophy shelf under one fixed spotlight, without adding a bottom-tab destination or removing reward/share behavior.

**Architecture:** Keep data loading, progress calculation, localization, reward claims, and the existing detail modal in `app/achievements_screen.tsx`. Add a pure shelf geometry/selection model and a focused carousel component that owns virtualization, snap selection, fixed light/shelf layers, reduced motion, and accessibility. Integrate the carousel into the existing stack screen while preserving all current entry points and user-owned in-progress mistake-practice edits.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, legacy native-driver `Animated`, Expo Image, SafeLinearGradient, Jest/ts-jest.

---

### Task 1: Pure shelf geometry and selection model

**Files:**
- Create: `app/achievement_shelf_model.ts`
- Create: `tests/achievement_shelf_model.test.ts`

- [ ] **Step 1: Write the failing model tests**

```ts
import {
  achievementShelfInitialId,
  achievementShelfItemWidth,
  achievementShelfSideInset,
  achievementShelfIndexFromOffset,
  achievementShelfIndicator,
} from '../app/achievement_shelf_model';

test('shelf geometry centers first and last trophies', () => {
  expect(achievementShelfItemWidth(390)).toBe(172);
  expect(achievementShelfSideInset(390, 172)).toBe(109);
  expect(achievementShelfIndexFromOffset(343, 172, 4)).toBe(2);
});

test('initial selection is the most recently earned visible trophy', () => {
  expect(achievementShelfInitialId(
    [{ id: 'old' }, { id: 'new' }, { id: 'locked' }],
    new Map([
      ['old', { unlockedAt: '2026-01-01T00:00:00.000Z' }],
      ['new', { unlockedAt: '2026-08-20T00:00:00.000Z' }],
    ]),
  )).toBe('new');
});

test('long collections use a compact count instead of dozens of dots', () => {
  expect(achievementShelfIndicator(2, 6)).toEqual({ kind: 'dots', active: 2, total: 6 });
  expect(achievementShelfIndicator(18, 40)).toEqual({ kind: 'count', label: '19 / 40' });
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_model.test.ts --no-cache --runInBand`

Expected: FAIL because `app/achievement_shelf_model.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

```ts
export const ACHIEVEMENT_SHELF_MIN_ITEM_WIDTH = 148;
export const ACHIEVEMENT_SHELF_MAX_ITEM_WIDTH = 184;

export function achievementShelfItemWidth(viewportWidth: number): number {
  return Math.max(
    ACHIEVEMENT_SHELF_MIN_ITEM_WIDTH,
    Math.min(ACHIEVEMENT_SHELF_MAX_ITEM_WIDTH, Math.round(viewportWidth * 0.44)),
  );
}

export function achievementShelfSideInset(viewportWidth: number, itemWidth: number): number {
  return Math.max(0, (viewportWidth - itemWidth) / 2);
}

export function achievementShelfIndexFromOffset(offset: number, itemWidth: number, count: number): number {
  if (count <= 0 || itemWidth <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offset / itemWidth)));
}

export function achievementShelfInitialId<T extends { id: string }>(
  items: readonly T[],
  states: ReadonlyMap<string, { unlockedAt?: string | null }>,
): string | null {
  let selected: { id: string; unlockedAt: string } | null = null;
  for (const item of items) {
    const unlockedAt = states.get(item.id)?.unlockedAt;
    if (unlockedAt && (!selected || unlockedAt > selected.unlockedAt)) selected = { id: item.id, unlockedAt };
  }
  return selected?.id ?? items[0]?.id ?? null;
}

export function achievementShelfIndicator(index: number, total: number) {
  if (total <= 9) return { kind: 'dots' as const, active: Math.max(0, index), total };
  return { kind: 'count' as const, label: `${Math.max(0, index) + 1} / ${total}` };
}
```

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `npx jest --runTestsByPath tests/achievement_shelf_model.test.ts --no-cache --runInBand`

Expected: PASS, 3 tests.

### Task 2: Motion tokens and reusable carousel

**Files:**
- Modify: `constants/motionHybrid.ts`
- Create: `components/achievements/AchievementShelfCarousel.tsx`
- Create: `tests/achievement_shelf_contract.test.ts`

- [ ] **Step 1: Write the failing source contract**

```ts
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const carousel = fs.readFileSync(path.join(root, 'components/achievements/AchievementShelfCarousel.tsx'), 'utf8');
const motion = fs.readFileSync(path.join(root, 'constants/motionHybrid.ts'), 'utf8');

test('shelf uses one fixed spotlight and a snapping virtualized track', () => {
  expect(carousel).toContain('testID="achievement-shelf-spotlight"');
  expect(carousel).toContain('snapToInterval={itemWidth}');
  expect(carousel).toContain('decelerationRate="fast"');
  expect(carousel).toContain('accessibilityActions');
  expect(carousel).toContain('useReduceMotion');
  expect(carousel).not.toContain('BlurView');
});

test('shelf motion numbers live in the shared hybrid dictionary', () => {
  expect(motion).toContain('export const ACHIEVEMENT_SHELF_HYBRID');
  expect(carousel).toContain('ACHIEVEMENT_SHELF_HYBRID');
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the carousel file and token group do not exist.

- [ ] **Step 3: Add named motion tokens**

Append a single `ACHIEVEMENT_SHELF_HYBRID` export to `constants/motionHybrid.ts`:

```ts
export const ACHIEVEMENT_SHELF_HYBRID = {
  selectedScale: 1.08,
  neighborScale: 0.88,
  neighborOpacity: 0.48,
  selectedOpacity: 1,
  detailFadeMs: LUM.contentMs,
  selectionHapticMinIntervalMs: 90,
  spotlightWidthRatio: 0.58,
  spotlightTopOpacity: 0.34,
} as const;
```

- [ ] **Step 4: Implement `AchievementShelfCarousel`**

Create a component that:

```tsx
type Props = {
  items: readonly Achievement[];
  selectedId: string | null;
  viewportWidth: number;
  onSelected: (achievement: Achievement) => void;
  onOpen: (achievement: Achievement) => void;
  renderTrophy: (achievement: Achievement, size: number) => React.ReactNode;
  renderDetail: (achievement: Achievement) => React.ReactNode;
};
```

Use `Animated.FlatList`, `snapToInterval={itemWidth}`, centered side padding, native-driver scroll interpolation for scale/opacity, a fixed `SafeLinearGradient` spotlight with `pointerEvents="none"`, a fixed shelf rail/background, `onMomentumScrollEnd` selection, light haptics only when the index changes, and adjustable accessibility actions for previous/next. Under reduced motion, keep scale/opacity static while retaining snap and spotlight selection.

- [ ] **Step 5: Run the carousel contract and verify GREEN**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: PASS, 2 tests.

### Task 3: Integrate the shelf into the existing stack screen

**Files:**
- Modify: `app/achievements_screen.tsx`
- Modify: `tests/achievement_shelf_contract.test.ts`

- [ ] **Step 1: Extend the failing contract for screen integration**

```ts
const screen = fs.readFileSync(path.join(root, 'app/achievements_screen.tsx'), 'utf8');
const tabs = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');

test('existing stack screen renders the shelf without adding a bottom tab', () => {
  expect(screen).toContain("import AchievementShelfCarousel from '../components/achievements/AchievementShelfCarousel'");
  expect(screen).toContain('<AchievementShelfCarousel');
  expect(screen).toContain('testID="achievement-shelf-category-filter"');
  expect(screen).toContain('ALL_ACHIEVEMENTS.filter(isVisibleAchievement)');
  expect(screen).toContain('<AchievementModal');
  expect(tabs).not.toContain('achievements_screen');
});
```

- [ ] **Step 2: Run the integration contract and verify RED**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the existing screen does not render the shelf.

- [ ] **Step 3: Replace only the rendered accordion list with the shelf composition**

Keep existing achievement loading, stats, image fallback, modal, reward claim, share, and dev-toggle logic. Add:

```tsx
const [shelfCategory, setShelfCategory] = useState<'all' | Achievement['category']>('all');
const [shelfSelectedId, setShelfSelectedId] = useState<string | null>(null);

const earnedAchievements = useMemo(
  () => visibleAchievementDefinitions.filter((achievement) =>
    showAllAchievements || !!stateMap.get(achievement.id)?.unlockedAt,
  ),
  [showAllAchievements, stateMap, visibleAchievementDefinitions],
);

const shelfAchievements = useMemo(
  () => shelfCategory === 'all'
    ? earnedAchievements
    : earnedAchievements.filter((achievement) => achievement.category === shelfCategory),
  [earnedAchievements, shelfCategory],
);
```

Set the initial/category selection with `achievementShelfInitialId`. Render localized category pills, `AchievementShelfCarousel`, the existing `BadgeShield` at trophy scale, and a stable inline detail card. Pressing the trophy or detail card opens the existing `AchievementModal`, preserving claim/share behavior. Retain the report-error footer and earned-only production behavior.

- [ ] **Step 4: Run integration and existing focused contracts**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts tests/achievements_modal_scroll_contract.test.ts tests/achievements_locale_runtime.test.ts --no-cache --runInBand`

Expected: PASS for all selected tests. If a pre-existing dirty-worktree test fails outside shelf behavior, record the exact failure and do not rewrite unrelated work.

### Task 4: Wire the neutral shelf backdrop

**Files:**
- Create: `constants/achievementShelfAssets.ts`
- Create: `assets/images/achievements/shelf/achievement-shelf-showcase.webp`
- Modify: `components/achievements/AchievementShelfCarousel.tsx`
- Modify: `tests/achievement_shelf_contract.test.ts`

- [ ] **Step 1: Add the static require and failing asset contract before generation**

```ts
export const ACHIEVEMENT_SHELF_BACKDROP = require('../assets/images/achievements/shelf/achievement-shelf-showcase.webp');
```

The contract checks that the static require and consuming `ExpoImage` reference exist.

- [ ] **Step 2: Generate one empty shelf backdrop with built-in DALL-E**

Generate a square/portrait-safe empty exhibition module: graphite lacquer, thin dark-walnut inset, restrained antique-brass rail, one central warm overhead spotlight and soft cone, empty shelf plane, no trophies, no text, no plaques, no logos, no room furniture.

- [ ] **Step 3: Copy, crop if needed, and compress the selected output**

Use `sharp` to create the final WebP with alpha preserved where present and a quality in the project-approved 58–80 range. Keep the original generated image outside the bundled asset tree.

- [ ] **Step 4: Run the asset/source contract**

Run: `npx jest --runTestsByPath tests/achievement_shelf_contract.test.ts --no-cache --runInBand`

Expected: PASS and the bundled asset has exactly one static consumer.

### Task 5: Focused verification and review

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the focused shelf gates**

Run: `npx jest --runTestsByPath tests/achievement_shelf_model.test.ts tests/achievement_shelf_contract.test.ts tests/achievements_modal_scroll_contract.test.ts tests/achievements_locale_runtime.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand`

Expected: all selected suites pass.

- [ ] **Step 2: Run a targeted TypeScript check over touched files**

Run the project TypeScript compiler and reduce output to diagnostics mentioning `achievement_shelf_model.ts`, `AchievementShelfCarousel.tsx`, `achievements_screen.tsx`, or `achievementShelfAssets.ts`. Store full output outside the conversation if the project-wide dirty tree emits unrelated diagnostics.

Expected: zero diagnostics in touched shelf files.

- [ ] **Step 3: Review the diff for protected behavior**

Confirm that the diff does not add an Achievements bottom tab, does not remove `/achievements_screen`, does not delete `AchievementModal`, does not alter reward accounting, and preserves current user-owned mistake-practice changes.

- [ ] **Step 4: Report implementation status without committing overlapping dirty files**

Because `app/achievements_screen.tsx` and `constants/motionHybrid.ts` already contain user-owned uncommitted work, do not create an implementation commit that would absorb unrelated changes. Report the exact changed files, focused test evidence, and any unrelated pre-existing failures.
