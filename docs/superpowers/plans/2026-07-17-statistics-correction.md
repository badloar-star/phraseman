# Statistics Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ambiguous and duplicated statistics modes with four factual views, flatten nested surfaces, integrate streak controls into the primary analytics surface, and make yearly activity readable.

**Architecture:** Keep existing stats storage, cache, percentiles, achievements, freeze, revive, wager, and boon engines unchanged. Add a small presentation adapter for daily learning breakdown, render all primary analytics inside one `StatsCardArtSurface`, and use the existing monthly activity view behind a larger horizontal yearly preview.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, Jest source contracts, React Native Reanimated.

---

### Task 1: Lock the corrected metric contract

**Files:**
- Modify: `tests/stats_primary_metric.test.ts`
- Modify: `tests/stats_surface_composition.test.ts`
- Modify: `tests/stats_selected_design_contract.test.ts`
- Modify: `app/stats_primary_metric.ts`

- [ ] **Step 1: Write failing metric tests**

Assert the exact mode list and legacy migration:

```ts
expect(STATS_PRIMARY_METRICS).toEqual(['activity', 'time', 'xp', 'year']);
expect(normalizeStatsPrimaryMetric('rhythm')).toBe('activity');
expect(normalizeStatsPrimaryMetric('learned')).toBe('activity');
```

Assert the active surface does not contain `PRIMARY_METRIC_COPY` entries or menu options for `rhythm` and `learned`.

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest tests/stats_primary_metric.test.ts tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts --runInBand --watchman=false
```

Expected: failures showing the old five-mode contract.

- [ ] **Step 3: Implement the four-mode contract**

Use:

```ts
export const STATS_PRIMARY_METRICS = ['activity', 'time', 'xp', 'year'] as const;

export function normalizeStatsPrimaryMetric(value: unknown): StatsPrimaryMetric {
  if (value === 'rhythm' || value === 'learned') return 'activity';
  return isStatsPrimaryMetric(value) ? value : DEFAULT_STATS_PRIMARY_METRIC;
}
```

- [ ] **Step 4: Run GREEN**

Run the same Jest command and require all suites to pass before continuing.

### Task 2: Flatten the primary analytics and add calendar dates

**Files:**
- Modify: `components/stats/StatBars.tsx`
- Modify: `app/streak_stats.tsx`
- Modify: `tests/stats_surface_composition.test.ts`

- [ ] **Step 1: Write failing composition tests**

Require:

```ts
expect(activeSurface).toContain("bottomLabel: `${day.shortLabel} ${day.dayNum}`");
expect(activeSurface).toContain("metric === 'activity'");
expect(activeSurface).not.toContain("day.combined");
expect(primaryCard).not.toContain('glassFill(');
expect(primaryCard).not.toContain('stats-primary-summary-gradient');
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest tests/stats_surface_composition.test.ts --runInBand --watchman=false
```

Expected: failures for ambiguous activity and nested surfaces.

- [ ] **Step 3: Implement factual weekly modes**

For `activity`, use:

```ts
const values = metrics.rhythmDays.map(day =>
  metric === 'activity' ? (day.active ? 1 : 0) :
  metric === 'time' ? day.minutes :
  day.points
);
```

Set the activity heading to `${metrics.active7} из 7 дней`, show weekday plus day number, remove the chart background/gradient wrapper, and make the three summary values transparent columns on the outer surface.

- [ ] **Step 4: Run GREEN**

Run the Task 2 test and require it to pass.

### Task 3: Integrate streak status and preserve all streak actions

**Files:**
- Modify: `app/streak_stats.tsx`
- Modify: `tests/stats_surface_composition.test.ts`
- Modify: `tests/home_contextual_freeze_contract.test.ts`

- [ ] **Step 1: Write failing streak-layout tests**

Require:

```ts
expect(primaryCard).toContain('stats-primary-series');
expect(primaryCard).toContain('bestStreak');
expect(primaryCard).toContain('handleFreezeStreak');
expect(activeAfterPrimary).not.toContain('testID="stats-series-status"');
expect(source).toContain('stats-series-wager-modal');
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest tests/stats_surface_composition.test.ts tests/home_contextual_freeze_contract.test.ts --runInBand --watchman=false
```

- [ ] **Step 3: Implement inline series**

Pass a `seriesContent: React.ReactNode` slot into `PrimaryAnalyticsCard`. Render a flat row containing current streak, best streak, protection state, and an at-risk freeze action. Expand inline text/actions without a nested surface. Open the unchanged `WagerCard` in a separate modal:

```tsx
<Modal visible={wagerOpen} transparent animationType="fade">
  <Pressable testID="stats-series-wager-modal" style={styles.modalBackdrop}>
    <WagerCard {...existingWagerProps} />
  </Pressable>
</Modal>
```

Remove the separate active `stats-series-status` card while retaining revive, freeze, and wager functionality through the integrated controls.

- [ ] **Step 4: Run GREEN**

Run the Task 3 tests and require both suites to pass.

### Task 4: Flatten benefits and achievements

**Files:**
- Modify: `app/streak_stats.tsx`
- Modify: `components/TodaysBoonStrip.tsx` only if equal-row geometry needs a prop
- Modify: `tests/stats_surface_composition.test.ts`
- Modify: `tests/achievements.test.ts`

- [ ] **Step 1: Write failing visual-contract tests**

Require:

```ts
expect(todayBlock).not.toContain('<LinearGradient colors={[statsSoftBg');
expect(achievementsBlock).not.toContain('<StatsCardArtSurface');
expect(achievementsBlock).not.toContain('backgroundColor: achievement ?');
expect(achievementsBlock).toContain('ACHIEVEMENT_IMAGE[achievement.id]');
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest tests/stats_surface_composition.test.ts tests/achievements.test.ts --runInBand --watchman=false
```

- [ ] **Step 3: Implement flat sections**

Keep one `StatsCardArtSurface` for benefits and render its boon and multiplier rows with transparent backgrounds and matching minimum height. Replace `RecentAchievementsCard` with a plain section on the screen background; render real image assets directly, without per-item backgrounds.

- [ ] **Step 4: Run GREEN**

Run the Task 4 tests and require all assertions to pass.

### Task 5: Enlarge the yearly activity preview

**Files:**
- Modify: `components/ActivityHeatmap365.tsx`
- Create: `tests/activity_365_compact_layout_contract.test.ts`

- [ ] **Step 1: Write failing yearly-layout tests**

Require:

```ts
expect(source).toContain('const COMPACT_YEAR_ROWS = 7');
expect(source).toContain('const COMPACT_YEAR_CELL = 13');
expect(source).toContain('horizontal');
expect(source).toContain('scrollToEnd');
expect(source).toContain('setExpanded(true)');
```

Also assert compact mode does not wrap its preview in another `StatsCardArtSurface`.

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest tests/activity_365_compact_layout_contract.test.ts --runInBand --watchman=false
```

- [ ] **Step 3: Implement the compact 7 × 53 preview**

Render compact mode as a transparent fragment with a horizontal `ScrollView`, seven rows, 13-point cells, and an initial `scrollToEnd({ animated: false })`. Tapping the preview sets `expanded` and renders the existing monthly grid. Keep non-compact yearly analytics unchanged.

- [ ] **Step 4: Run GREEN**

Run the Task 5 test and the existing activity tests:

```powershell
npx jest tests/activity_365_compact_layout_contract.test.ts tests/activity_365_analytics.test.ts --runInBand --watchman=false
```

### Task 6: Final focused verification

**Files:**
- Verify all files above.

- [ ] **Step 1: Run task suites**

```powershell
npx jest tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_primary_metric.test.ts tests/home_contextual_freeze_contract.test.ts tests/streak_freeze_active.test.ts tests/achievements.test.ts tests/boon_icon_assets.test.ts tests/activity_365_compact_layout_contract.test.ts --runInBand --watchman=false
```

- [ ] **Step 2: Run performance guards**

```powershell
npx jest tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts --runInBand --watchman=false
```

Report unrelated pre-existing failures separately; do not weaken guards.

- [ ] **Step 3: Verify the live LAN bundle**

Request the iOS Metro bundle and require HTTP 200 plus one occurrence of:

```text
stats-primary-analytics
stats-primary-series
stats-today-benefits
stats-recent-achievements
stats-comparison-content
stats-series-wager-modal
```

- [ ] **Step 4: Inspect the final diff**

Run `git diff --check` on only the changed statistics files and document every file. Do not deploy, push, merge, or write production data.
