# Home Streak Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dense home status card match the approved reference composition while retaining Phraseman theme colors and interactions.

**Architecture:** Only the `renderExperimentalHomeStatus` branch changes. Its existing state (`level`, `displayStreak`, `weekDays`, `weekDone`, `xpPct`) remains the data source; the JSX is regrouped into a left streak section and a right progress-and-week section. A source-contract test prevents the avatar and XP-number heading from returning to the dense variant.

**Tech Stack:** React Native, Expo, TypeScript, Jest source-contract tests.

---

### Task 1: Lock in the desired dense-card structure

**Files:**
- Create: `tests/home_streak_status_layout_contract.test.ts`
- Test: `tests/home_streak_status_layout_contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('dense home streak status layout', () => {
  const start = source.indexOf('const renderExperimentalHomeStatus = () =>');
  const end = source.indexOf('return (<BouncyScrollView', start);
  const status = source.slice(start, end);

  it('places a streak panel before the level progress panel without an avatar', () => {
    expect(status).toContain('testID="home-streak-status-panel"');
    expect(status).toContain('testID="home-level-progress-panel"');
    expect(status.indexOf('home-streak-status-panel')).toBeLessThan(status.indexOf('home-level-progress-panel'));
    expect(status).toContain('{experimentalStatusLevelLabel} {level}');
    expect(status).not.toContain('<AvatarView');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath tests/home_streak_status_layout_contract.test.ts --runInBand`

Expected: FAIL because neither approved panel test ID exists.

### Task 2: Preserve the current source fragment

**Files:**
- Create: `.codex-tmp/home-streak-status-backups/home-status-dense-20260717-<time>.tsxfrag`
- Read: `app/(tabs)/home.tsx:2380-2482`

- [ ] **Step 1: Copy only the active `renderExperimentalHomeStatus` fragment**

Store the exact pre-change source from `const renderExperimentalHomeStatus = () =>` through its closing `</Animated.View>);` in the timestamped backup file. Do not copy or restore the surrounding header, user changes, or unrelated branches.

- [ ] **Step 2: Verify the backup is exact**

Run: `Get-FileHash app/(tabs)/home.tsx; Get-Content .codex-tmp/home-streak-status-backups/home-status-dense-20260717-<time>.tsxfrag | Select-Object -First 1`

Expected: the backup starts with `const renderExperimentalHomeStatus = () =>` and is stored outside the production source tree.

### Task 3: Recompose the dense home status

**Files:**
- Modify: `app/(tabs)/home.tsx:2380-2482`
- Test: `tests/home_streak_status_layout_contract.test.ts`

- [ ] **Step 1: Replace only the top-level content of `renderExperimentalHomeStatus`**

Use two sibling panels in a row. The left panel has `testID="home-streak-status-panel"`, retains `StreakChainIcon`, `displayStreak`, `homeStreakDaysLabel`, `streakScaleAnim`, `nav.push('/streak_stats')`, and existing accessible button semantics. The right panel has `testID="home-level-progress-panel"`, starts with:

```tsx
<Text allowFontScaling={false} style={{ color: homeThemePanelText, fontSize: eliteStatsCompact ? 24 : 30, fontWeight: '900' }} numberOfLines={1}>
  {experimentalStatusLevelLabel} {level}
</Text>
```

Keep the existing XP bar and `weekDays.map(...)` beneath it. Do not use `AvatarView`, XP totals, fixed pink/black colors, border widths, or a new asset. Preserve the theme-derived fills and existing `weekDot*` helpers.

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `npm test -- --runTestsByPath tests/home_streak_status_layout_contract.test.ts --runInBand`

Expected: PASS, one suite and one test passed.

### Task 4: Verify surrounding home contracts

**Files:**
- Verify: `tests/home_streak_status_layout_contract.test.ts`
- Verify: `tests/home_header_shards_left_contract.test.ts`
- Verify: `app/(tabs)/home.tsx`

- [ ] **Step 1: Run narrow regression checks**

Run: `npm test -- --runTestsByPath tests/home_streak_status_layout_contract.test.ts tests/home_header_shards_left_contract.test.ts --runInBand`

Expected: PASS with two suites and no write-guard violations.

- [ ] **Step 2: Inspect the final diff and backup path**

Run: `git diff -- app/(tabs)/home.tsx tests/home_streak_status_layout_contract.test.ts; Get-ChildItem .codex-tmp/home-streak-status-backups`

Expected: the diff is limited to the dense status JSX and the new contract test; a timestamped rollback fragment exists.
