# Statistics Surface Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed old/new statistics route with the approved five-block, borderless, theme-gradient surface while preserving achievements, Plus gates, streak protection, revive, wager, multiplier, percentile, and account boundaries.

**Architecture:** Keep `app/streak_stats.tsx` as the route owner, but move the achievement image registry into a shared asset module and give `TodaysBoonStrip` an embedded presentation for the unified “Сегодня” surface. Reuse the existing theme `cardGradient`, data loaders, premium overlay, freeze confirmation flow, and routes; remove only the explicitly rejected visible legacy composition.

**Tech Stack:** Expo Router, React Native, TypeScript, AsyncStorage, `SafeLinearGradient`, Jest source-contract tests.

---

### Task 1: Lock the approved information architecture with failing contracts

**Files:**
- Modify: `tests/stats_selected_design_contract.test.ts`
- Create: `tests/stats_surface_composition.test.ts`

- [ ] **Step 1: Write the failing composition contract**

Add a source-level test that reads `app/streak_stats.tsx`, slices the active scroll content, and asserts the markers appear in this order:

```ts
const ORDERED_MARKERS = [
  'stats-primary-analytics',
  'stats-today-benefits',
  'stats-recent-achievements',
  'stats-comparison-content',
  'stats-series-status',
];

let cursor = -1;
for (const marker of ORDERED_MARKERS) {
  const next = activeSurface.indexOf(marker);
  expect(next).toBeGreaterThan(cursor);
  cursor = next;
}
```

The same test must assert:

```ts
expect(activeSurface).not.toContain('stats-series-protection-toggle');
expect(activeSurface).not.toContain('<StreakStatsHero');
expect(activeSurface).not.toContain('stats-comparison-toggle');
expect(activeSurface).not.toContain('achievement.icon');
expect(activeSurface).toContain('чем за предыдущие 7 дней');
```

Add focused checks that the style literals for the five new top-level surfaces and the metric selector use `borderWidth: 0`.
Keep a contract for synchronous cache hydration:

```ts
expect(statsSource).toContain('const _sc = getStatsCache(studyTarget)');
expect(statsSource).toContain('useState(_sc.loaded)');
expect(statsSource).not.toContain('ActivityIndicator');
```

- [ ] **Step 2: Run the focused contract and confirm RED**

Run:

```powershell
npx jest tests/stats_surface_composition.test.ts --runInBand
```

Expected: FAIL because the current surface still has the old series/comparison toggles, emoji achievement icon, borders, and old comparison copy.

- [ ] **Step 3: Preserve existing metric-selection tests**

Run:

```powershell
npx jest tests/stats_primary_metric.test.ts tests/stats_selected_design_contract.test.ts --runInBand
```

Expected: existing tests pass before implementation; record any pre-existing failure without weakening the assertion.

### Task 2: Extract the real achievement image registry

**Files:**
- Create: `constants/achievementImageAssets.ts`
- Modify: `app/achievements_screen.tsx`
- Modify: `components/AchievementToast.tsx`
- Modify: `app/streak_stats.tsx`
- Modify: `tests/achievements.test.ts`

- [ ] **Step 1: Update the achievement asset contract**

Change the focused test to import or inspect the shared module:

```ts
const sharedAssetSource = readFileSync(
  path.join(process.cwd(), 'constants', 'achievementImageAssets.ts'),
  'utf8',
);
expect(sharedAssetSource).toContain('export const ACHIEVEMENT_IMAGE');
expect(screenSource).toContain(
  "import { ACHIEVEMENT_IMAGE } from '../constants/achievementImageAssets'",
);
expect(toastSource).toContain(
  "import { ACHIEVEMENT_IMAGE } from '../constants/achievementImageAssets'",
);
expect(statsSource).toContain(
  "import { ACHIEVEMENT_IMAGE } from '../constants/achievementImageAssets'",
);
```

- [ ] **Step 2: Run the asset contract and confirm RED**

Run:

```powershell
npx jest tests/achievements.test.ts --runInBand
```

Expected: FAIL because the shared module does not exist.

- [ ] **Step 3: Move the existing static map without changing its entries**

Create `constants/achievementImageAssets.ts` containing the current `ACHIEVEMENT_IMAGE` map from `app/achievements_screen.tsx`, with paths adjusted from:

```ts
require('../assets/images/achievements/streak_3.webp')
```

to:

```ts
require('../assets/images/achievements/streak_3.webp')
```

The relative path remains correct because both `constants/` and `app/` are one level below the repository root. Export:

```ts
export const ACHIEVEMENT_IMAGE: Readonly<Record<string, number>> = {
  // every existing id-to-require entry is moved here unchanged
};
```

Remove the local map from `app/achievements_screen.tsx` and import it from the shared module. Update `AchievementToast` and statistics to import from the same module. Do not add, delete, regenerate, or recompress any image.

- [ ] **Step 4: Render latest achievement assets**

In `RecentAchievementsCard`, replace the emoji text with:

```tsx
<Image
  source={ACHIEVEMENT_IMAGE[achievement.id]}
  resizeMode="contain"
  fadeDuration={0}
  style={{ width: 58, height: 58 }}
/>
```

If an id has no mapped source, render the existing neutral achievement image fallback plus an Ionicon, never `achievement.icon`.

- [ ] **Step 5: Run focused achievement tests**

Run:

```powershell
npx jest tests/achievements.test.ts tests/stats_surface_composition.test.ts --runInBand
```

Expected: asset-registry assertions pass; composition may remain red for later tasks.

### Task 3: Make the primary analytics card borderless and precise

**Files:**
- Modify: `app/streak_stats.tsx`
- Modify: `components/ActivityHeatmap365.tsx`
- Modify: `tests/stats_surface_composition.test.ts`

- [ ] **Step 1: Remove borders from the approved primary surface**

Set the top-level card, metric selector, chart inset, and three metric areas to `borderWidth: 0`. Replace the three boxed metrics with columns inside one unbordered tonal/gradient row:

```tsx
<LinearGradient
  colors={statsCardGradient(t)}
  style={{ borderRadius: 15, flexDirection: 'row', overflow: 'hidden' }}
>
  {summaryItems.map(item => (
    <View key={item.key} style={{ flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={item.icon} size={17} color={accent}/>
      <Text>{item.value}</Text>
    </View>
  ))}
</LinearGradient>
```

Do not append `активности`, `практики`, or `за 7 дней` to the three values.

- [ ] **Step 2: Correct the rolling-period copy**

Use:

```ts
ru: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${
  weekDeltaMinutes > 0 ? 'больше' : 'меньше'
}, чем за предыдущие 7 дней`,
```

Keep the existing guard that hides comparison for an incomplete or empty previous period.

- [ ] **Step 3: Keep the 365-day view inside the primary card**

Ensure compact `ActivityHeatmap365` does not draw an outer border and does not expose its old next-step CTA. Keep metric persistence through `statsPrimaryMetricKey(studyTarget)`.

- [ ] **Step 4: Run primary-card tests**

Run:

```powershell
npx jest tests/stats_primary_metric.test.ts tests/stats_surface_composition.test.ts --runInBand
```

Expected: primary metric persistence, copy, and border contracts pass.

### Task 4: Build the unified “Сегодня” surface

**Files:**
- Modify: `components/TodaysBoonStrip.tsx`
- Modify: `app/streak_stats.tsx`
- Modify: `tests/boon_icon_assets.test.ts`
- Modify: `tests/stats_surface_composition.test.ts`

- [ ] **Step 1: Add an embedded boon presentation**

Extend the props without changing the default call sites:

```ts
interface TodaysBoonStripProps {
  marginTop?: number;
  embedded?: boolean;
}
```

When `embedded` is true, the tappable boon row uses transparent background, no border, and no external radius. The existing generated boon asset, modal, refresh subscriptions, mystery-claim state, and accessibility labels remain unchanged.

- [ ] **Step 2: Extract a deterministic multiplier view model**

Inside `streak_stats.tsx`, derive:

```ts
type ActiveXpMultiplierItem = {
  key: string;
  label: string;
  value: string;
  color: string;
  meta?: string;
};

type ActiveXpMultiplierViewModel = {
  total: number;
  items: ActiveXpMultiplierItem[];
};
```

Use the same sources and additive calculation already used by the current multiplier block. Do not change `xp_manager` or any multiplier constants.

- [ ] **Step 3: Render one gradient card**

Add a `StatsCardArtSurface` with `testID="stats-today-benefits"` containing:

```tsx
<TodaysBoonStrip embedded marginTop={0}/>
<Pressable
  accessibilityRole="button"
  onPress={() => setBonusOpen(value => !value)}
  style={{ minHeight: 48, borderWidth: 0 }}
>
  <Text>{`XP ×${multiplierModel.total.toFixed(2)}`}</Text>
  <Text>{visibleMultiplierSummary}</Text>
</Pressable>
```

Show at most two active sources and `+N` in the collapsed state. Expanded state lists every active source and its existing time/XP metadata inside the same outer gradient surface.

- [ ] **Step 4: Run boon and composition tests**

Run:

```powershell
npx jest tests/boon_icon_assets.test.ts tests/stats_surface_composition.test.ts --runInBand
```

Expected: the boon still uses generated image assets; the unified surface marker and order pass.

### Task 5: Render comparison directly and replace the old series expansion

**Files:**
- Modify: `app/streak_stats.tsx`
- Modify: `tests/stats_surface_composition.test.ts`
- Modify: `tests/stats_selected_design_contract.test.ts`

- [ ] **Step 1: Remove comparison toggle state**

Delete `comparisonOpen` and the `stats-comparison-toggle` header. Render:

```tsx
<StatsPremiumBlur
  isPremium={isPremium}
  context="percentiles"
  snapshotKey="percentiles"
  devUnlock={statsDevUnlock}
>
  <StatsCardArtSurface testID="stats-comparison-content" ...>
    {pItems.map(item => <StatProgressRow key={item.label} ... />)}
  </StatsCardArtSurface>
</StatsPremiumBlur>
```

Keep `PlusBadge` next to the section heading and do not add `Сравнение доступно с Plus`.

- [ ] **Step 2: Replace the series accordion**

Use `testID="stats-series-status"` for a compact gradient status card. It shows the real streak/freeze asset, current day count, and protection state. It must not render `StreakStatsHero`.

Keep `seriesOpen` only for a new compact action area. When expanded, render only currently relevant preserved actions:

- `WagerCard`;
- revive action when `reviveOffer` exists;
- current protection/freeze state.

Do not render the old best-streak, old day count, old calendar, Compass copy, or old analytics.

- [ ] **Step 3: Put blocks in the approved order**

The active scroll content must be:

```tsx
<PrimaryAnalyticsCard ... />
<TodayBenefits ... />
<RecentAchievementsCard ... />
<ComparisonSection ... />
<SeriesStatus ... />
```

- [ ] **Step 4: Run the full focused stats contracts**

Run:

```powershell
npx jest tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_primary_metric.test.ts --runInBand
```

Expected: all focused statistics contracts pass.

### Task 6: Move freeze into the Home streak card contextually

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `tests/owner_direction_runtime_contract.test.ts`
- Create: `tests/home_contextual_freeze_contract.test.ts`

- [ ] **Step 1: Write the contextual-freeze contract**

Assert:

```ts
expect(homeSource).toContain('home-streak-freeze-shield');
expect(homeSource).toContain('streakAtRisk && !freezeActive');
expect(homeSource).not.toContain('ЗАМОРОЗКА ЦЕПОЧКИ — для всех когда цепочка под угрозой');
```

The test also checks that the shield calls `event.stopPropagation?.()` before `handleFreezeStreak()` so the parent stats navigation does not fire.

- [ ] **Step 2: Run the new contract and confirm RED**

Run:

```powershell
npx jest tests/home_contextual_freeze_contract.test.ts --runInBand
```

Expected: FAIL because the current Home uses a separate freeze card.

- [ ] **Step 3: Add the contextual shield**

Inside the existing `home-stats-card` streak area, render only when:

```ts
streakAtRisk && !freezeActive
```

Use:

```tsx
<Pressable
  testID="home-streak-freeze-shield"
  accessibilityRole="button"
  accessibilityLabel={localizedFreezeLabel}
  hitSlop={8}
  onPress={event => {
    event.stopPropagation?.();
    hapticTap();
    void handleFreezeStreak();
  }}
  style={{ minWidth: 44, minHeight: 44, borderWidth: 0 }}
>
  <StreakChainIcon frozen themeMode={themeMode} streakDays={streak} size={28}/>
</Pressable>
```

Use the active theme gradient/tonal fill and dark foreground on a lime surface. Remove the old separate freeze card only after the shield is wired to the same handler.

- [ ] **Step 4: Run Home and freeze contracts**

Run:

```powershell
npx jest tests/home_contextual_freeze_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/streak_freeze_active.test.ts --runInBand
```

Expected: all pass; no auth, price, shard-spend, or storage behavior changes.

### Task 7: Focused verification and LAN Metro handoff

**Files:**
- Verify all files above
- Do not deploy

- [ ] **Step 1: Run every narrow affected test**

Run:

```powershell
npx jest tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_primary_metric.test.ts tests/achievements.test.ts tests/boon_icon_assets.test.ts tests/home_contextual_freeze_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/streak_freeze_active.test.ts --runInBand
```

Expected: PASS with no snapshot updates and no source writes from tests.

- [ ] **Step 2: Verify source invariants**

Run targeted searches for:

```powershell
rg -n "stats-series-protection-toggle|stats-comparison-toggle|achievement\\.icon|borderWidth: 1" app/streak_stats.tsx
rg -n "home-streak-freeze-shield|streakAtRisk && !freezeActive" "app/(tabs)/home.tsx"
```

Expected: rejected markers are absent from the active new surface; contextual freeze markers are present.

- [ ] **Step 3: Verify performance and account-boundary guards**

Run:

```powershell
npx jest tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/target_storage_keys.test.ts --runInBand
```

Expected: synchronous cached first-frame behavior, frozen navigation, and per-study-target preference keys remain intact. No auth, account-switch, cloud-sync, Firestore, or server file is modified by this plan.

- [ ] **Step 4: Verify the live LAN bundle**

Request the already-running Metro bundle:

```powershell
Invoke-WebRequest -UseBasicParsing "http://172.20.10.2:8085/index.bundle?platform=ios&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app" -TimeoutSec 120
```

Expected: HTTP 200 and bundle markers for all five ordered blocks plus `home-streak-freeze-shield`.

- [ ] **Step 5: Report without deployment**

Report every changed file, focused test counts, Metro URL/version, preserved flows, and any unverified device-only behavior. Do not deploy, push, or write production data.
