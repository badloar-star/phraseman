# Statistics Tonal Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore visual grouping in the Statistics route with static per-theme tonal separation while keeping cards borderless.

**Architecture:** `constants/statsThemeChrome.ts` owns a Statistics-only page field token. `app/streak_stats.tsx` applies that token at its root. `StatsCardArtSurface` receives an opt-in lighter dark scrim for Statistics only, leaving other consumers unchanged.

**Tech Stack:** Expo, React Native, TypeScript, Jest contract tests.

---

### Task 1: Lock the intended visual contract

**Files:**
- Create: `tests/stats_tonal_hierarchy_contract.test.ts`
- Test: `tests/stats_tonal_hierarchy_contract.test.ts`

- [ ] **Step 1: Write a failing test**

```ts
expect(chrome).toContain('STATS_PAGE_FIELD_BY_THEME');
expect(chrome).toContain('export function statsPageField');
expect(stats).toContain('backgroundColor: statsPageField(themeMode)');
expect(surface).toContain("scrim = 'stats'");
expect(surface).not.toContain('BlurView');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/stats_tonal_hierarchy_contract.test.ts --runInBand`

Expected: FAIL because the token and screen integration do not exist.

### Task 2: Add the stats-only tonal field

**Files:**
- Modify: `constants/statsThemeChrome.ts`
- Modify: `components/StatsCardArtSurface.tsx`
- Modify: `app/streak_stats.tsx`

- [ ] **Step 1: Add a complete `ThemeMode` page-field record and `statsPageField()` export**

Use a static colour for each theme. Dark page fields are lighter than the card scrim; `businessLight` is a muted paper field.

- [ ] **Step 2: Make the card scrim opt-in**

Add `scrim: 'stats'` as a new surface variant. It must make only dark cards slightly less black, and must not change the default consumed by the activity heatmap.

- [ ] **Step 3: Apply the field to the Statistics safe area and pass the opt-in scrim from Statistics card calls**

Keep every card `borderWidth: 0`; do not change stateful choice borders in the wager modal.

- [ ] **Step 4: Run the contract test**

Run: `npx jest tests/stats_tonal_hierarchy_contract.test.ts --runInBand`

Expected: PASS.

### Task 3: Verify regression boundaries

**Files:**
- Test: `tests/streak_stats_practice_balance.test.ts`
- Test: `tests/stats_premium_blur_performance_contract.test.ts`

- [ ] **Step 1: Run focused statistics guards**

Run: `npx jest tests/stats_tonal_hierarchy_contract.test.ts tests/streak_stats_practice_balance.test.ts tests/stats_premium_blur_performance_contract.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 2: Run the strict border audit**

Run: `npm run audit:borderless-surfaces:strict`

Expected: exit code 0 with no pending or unreviewed decorative surface border.
