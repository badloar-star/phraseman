# Statistics Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the statistics screen a compact XP summary and progressively disclosed learning insights with honest, distinct visualizations.

**Architecture:** Keep calculation independent of rendering in a new pure `app/stats_learning_insights.ts` module. `streak_stats.tsx` supplies the existing daily XP/time rows and renders compact reusable cards; it does not change reward, subscription, or cloud-sync logic. The 365-day map always renders the canonical 53×7 grid and no longer switches to the large-cell history view.

**Tech Stack:** React Native, TypeScript, Expo Router, existing `react-native-svg`, Jest source contracts.

---

### Task 1: Derive compact and truthful insight data

**Files:**
- Create: `app/stats_learning_insights.ts`
- Create: `tests/stats_learning_insights.test.ts`

- [ ] **Step 1: Write failing pure-data tests**

```ts
import { buildStatsLearningInsights, formatCompactDuration } from '../app/stats_learning_insights';

it('formats duration without seconds and pads hour minutes', () => {
  expect(formatCompactDuration(64 * 60_000, 'ru')).toBe('1 ч 04 мин');
  expect(formatCompactDuration(42 * 60_000, 'ru')).toBe('42 мин');
});

it('compares the current week with the preceding complete seven days', () => {
  const insights = buildStatsLearningInsights(daysWithFourteenDailyRows);
  expect(insights.weekComparison.currentXp).toBe(920);
  expect(insights.weekComparison.previousXp).toBe(740);
});

it('returns an unavailable best-time insight without hourly observations', () => {
  expect(buildStatsLearningInsights(daysWithFourteenDailyRows).bestTime.status).toBe('unavailable');
});
```

- [ ] **Step 2: Run the test to verify the new module is missing**

Run: `npx jest tests/stats_learning_insights.test.ts --runInBand --forceExit`

Expected: FAIL because `app/stats_learning_insights` does not exist.

- [ ] **Step 3: Implement the pure view model**

```ts
export type InsightDailyRow = { date: string; xp: number; foregroundMs: number; active: boolean };

export function formatCompactDuration(ms: number, lang: Lang): string { /* 1 ч 04 мин / 42 мин */ }

export function buildStatsLearningInsights(rows: readonly InsightDailyRow[]) {
  // return weekly rhythm, activeDays/7, a best rolling seven-day XP total,
  // current-vs-previous week values, XP-per-foreground-minute trend, and
  // { status: 'unavailable' } for bestTime until hourly data exists.
}
```

Rules: normalise invalid values to zero; never divide by zero; use only the supplied local daily rows; do not fabricate a best study hour.

- [ ] **Step 4: Run the focused data tests**

Run: `npx jest tests/stats_learning_insights.test.ts --runInBand --forceExit`

Expected: PASS.

### Task 2: Replace the partial 365-day view with the full-year grid

**Files:**
- Modify: `components/ActivityHeatmap365.tsx:107-236,596-687`
- Modify: `tests/stats_year_preview_contract.test.ts`
- Modify: `tests/stats_tonal_hierarchy_contract.test.ts`

- [ ] **Step 1: Change contracts before rendering code**

```ts
expect(source).toContain('const YEAR_DAYS = 365;');
expect(source).toContain('<CanonicalYearHeatmap');
expect(source).not.toContain('<CompactHistoryHeatmap');
expect(source).not.toContain('yearHeaderSurface');
expect(source).not.toContain('monthLabels');
```

- [ ] **Step 2: Run the preview contracts**

Run: `npx jest tests/stats_year_preview_contract.test.ts tests/stats_tonal_hierarchy_contract.test.ts --runInBand --forceExit`

Expected: FAIL because the compact-history branch is still active.

- [ ] **Step 3: Render only the canonical year geometry**

```tsx
<CanonicalYearHeatmap
  model={yearModel}
  statusText={statusText}
  onOpenMonth={setSelectedMonthKey}
/>
```

Remove the active compact-history branch and its large-cell surface. Keep the existing month explorer modal and day tap behavior. In `buildCanonicalYear`, retain 365 date positions; distinguish dates before the first observed activity with a quieter neutral cell so they are not presented as missed study days. Do not render detached abbreviated months.

- [ ] **Step 4: Run the focused visual contracts**

Run: `npx jest tests/stats_year_preview_contract.test.ts tests/stats_tonal_hierarchy_contract.test.ts --runInBand --forceExit`

Expected: PASS.

### Task 3: Add an expandable XP summary without touching XP accounting

**Files:**
- Create: `components/StatsXpProgressSummary.tsx`
- Modify: `app/streak_stats.tsx` imports and `PrimaryAnalyticsCard`
- Modify: `tests/stats_selected_design_contract.test.ts`

- [ ] **Step 1: Add a failing screen contract**

```ts
expect(statsSource).toContain('StatsXpProgressSummary');
expect(statsSource).toContain('totalXP={totalXP}');
expect(statsSource).toContain('weekXP={metrics.xp7}');
expect(statsSource).toContain('testID="stats-xp-progress-expand"');
```

- [ ] **Step 2: Run the contract**

Run: `npx jest tests/stats_selected_design_contract.test.ts --runInBand --forceExit`

Expected: FAIL because the summary component is absent.

- [ ] **Step 3: Implement a 44px-minimum touchable summary**

```tsx
<StatsXpProgressSummary
  totalXP={totalXP}
  weekXP={metrics.xp7}
  level={getLevelFromXP(totalXP)}
  levelStartXP={TOTAL_XP_FOR_LEVEL(level)}
  nextLevelXP={TOTAL_XP_FOR_LEVEL(level + 1)}
  onToggle={...}
/>
```

The collapsed state contains: level, total XP, this-week XP, remaining XP to the next level, and one level-progress bar. Tapping exposes three labelled bars: total XP, current level, and weekly XP. Use the existing level helpers from `constants/theme.ts`; do not calculate thresholds separately. The component must preserve first-frame geometry and use `Pressable` with a visible accessibility label.

- [ ] **Step 4: Run the XP-summary contract**

Run: `npx jest tests/stats_selected_design_contract.test.ts --runInBand --forceExit`

Expected: PASS.

### Task 4: Render main and detailed insight cards with distinct graphs

**Files:**
- Create: `components/StatsLearningInsights.tsx`
- Modify: `app/streak_stats.tsx` data adaptation and screen composition
- Modify: `tests/stats_surface_composition.test.ts`

- [ ] **Step 1: Add source contracts for progressive disclosure**

```ts
expect(statsSource).toContain('<StatsLearningInsights');
expect(statsSource).toContain('testID="stats-insights-open"');
expect(statsSource).toContain('testID="stats-insight-rhythm"');
expect(statsSource).toContain('testID="stats-insight-regularity"');
```

- [ ] **Step 2: Run the surface test**

Run: `npx jest tests/stats_surface_composition.test.ts --runInBand --forceExit`

Expected: FAIL because the new insight surface is absent.

- [ ] **Step 3: Implement the cards and detail sheet**

```tsx
<StatsLearningInsights
  insights={buildStatsLearningInsights(insightRows)}
  totalStreak={totalStreak}
  bestStreak={bestStreak}
  onOpenSeries={onToggleSeries}
/>
```

Render on the main screen only `Ритм недели`, `Регулярность`, the compact series row, and a `Все показатели` action. The action opens a modal/sheet with: XP trend (line), time (bars), 365 days (existing full map), best time (unavailable state unless truthful hourly data exists), speed (line of XP per active foreground minute), best week (record bar), current vs previous (paired bars), and series (seven-day chain). Each icon-only control must have an accessibility label; no card relies on colour alone.

- [ ] **Step 4: Run the insight and existing stats contracts**

Run: `npx jest tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_learning_insights.test.ts --runInBand --forceExit`

Expected: PASS.

### Task 5: Keep series protection discoverable and hide Plus only for subscribers

**Files:**
- Modify: `app/streak_stats.tsx:2547-2785` and current Plus badge call sites
- Modify: `tests/stats_surface_composition.test.ts`

- [ ] **Step 1: Add tests for the two display states**

```ts
expect(primarySurface).toContain('testID="stats-series-protection-status"');
expect(primarySurface).toContain('testID="stats-series-freeze-action"');
expect(statsSource).toContain('{!isPremium && <PlusBadge');
```

- [ ] **Step 2: Run the contract**

Run: `npx jest tests/stats_surface_composition.test.ts --runInBand --forceExit`

Expected: FAIL until the status and conditional badge exist.

- [ ] **Step 3: Make the series panel explicit**

```tsx
<View testID="stats-series-protection-status">
  <Text>{freezeActive ? 'Защита активна сегодня' : 'Защита серии доступна'}</Text>
</View>
```

Keep the existing purchase/use action enabled only when the current business rule says it is actionable (`streakAtRisk && !freezeActive`). Keep revive and wager intact. Wrap every promotional `PlusBadge` in `!isPremium`; do not hide a non-promotional entitlement/status indicator.

- [ ] **Step 4: Run the complete focused suite and syntax check**

Run: `npx jest tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_year_preview_contract.test.ts tests/stats_tonal_hierarchy_contract.test.ts tests/stats_learning_insights.test.ts --runInBand --forceExit`

Expected: PASS.

Run: `npx eslint app/streak_stats.tsx components/ActivityHeatmap365.tsx components/StatsXpProgressSummary.tsx components/StatsLearningInsights.tsx app/stats_learning_insights.ts --no-ignore`

Expected: no new lint failures in changed lines; record any pre-existing baseline findings separately.

### Task 6: Update the approved design record and do a device smoke test

**Files:**
- Modify: `docs/superpowers/specs/2026-07-18-stats-simplification-design.md`

- [ ] **Step 1: Update the spec from future design to shipped behavior**

Replace the phrases saying «стартовая реализация» with the concrete visual states delivered above. Keep the explicit limitation that the best-time card waits for hourly data rather than guessing.

- [ ] **Step 2: Run Metro with cache reset and verify the active LAN client**

Run: `npx expo start --dev-client --lan --clear --port 8085`

Expected: Metro reports a bundle request from the iOS/Android client after manual reload.

- [ ] **Step 3: Smoke-check at 375px width**

Check: no horizontal overflow; XP summary expands/collapses; time uses `1 ч 04 мин`; all 365 positions are small cells; month labels are absent; Plus badge is absent for a Plus account; gift sections and series actions remain reachable.

**Worktree note:** do not stage or commit while the shared worktree contains unrelated user changes. Report exact modified paths instead.
