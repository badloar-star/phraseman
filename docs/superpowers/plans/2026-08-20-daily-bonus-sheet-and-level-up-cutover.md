# Daily Bonus Sheet and Level-Up Gift Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved A-style animated daily-bonus bottom sheet and remove automatic legacy one/two-gift modals from the global level-up flow without touching gift inventory claims.

**Architecture:** Add a focused `BoonActivatedSheet` that owns presentation only and reuses `HybridSheetShell`, the existing boon copy/art sources, and the shared reward-impact choreography. Route `BoonActivatedHost` to it. Reduce `GlobalLevelUpHandler` to its device-owned Spin queue while leaving legacy gift persistence and inventory application modules intact.

**Tech Stack:** React Native, Expo, React Native Reanimated, Gesture Handler, Jest/ts-jest, project Motion Hybrid primitives.

**Implementation note (2026-08-20 audit repair):** The snippets below record
the original plan. The verified implementation additionally uses the shell's
render-prop `requestDismiss`, one ring/zero dust, truthful per-boon status copy,
dynamic WCAG foreground helpers, 200% scroll/reflow, modal accessibility
isolation, and the preserved level-5 after-win upsell at the final Spin boundary.

---

### Task 1: Lock the new contracts in failing tests

**Files:**
- Create: `tests/boon_activated_sheet_contract.test.ts`
- Modify: `tests/level_up_spin_sheet_contract.test.ts`
- Verify unchanged: `tests/level_spin_gifts_entry_contract.test.ts`

- [x] **Step 1: Write the failing daily-bonus sheet contract**

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('daily boon production sheet', () => {
  const host = readFileSync(join(process.cwd(), 'components', 'BoonActivatedHost.tsx'), 'utf8');
  const sheet = readFileSync(join(process.cwd(), 'components', 'BoonActivatedSheet.tsx'), 'utf8');

  test('routes production display through the new Hybrid bottom sheet', () => {
    expect(host).toContain("import BoonActivatedSheet from './BoonActivatedSheet'");
    expect(host).toContain('<BoonActivatedSheet visible={visible} boon={boon} onClose={close} />');
    expect(sheet).toContain('<HybridSheetShell');
    expect(sheet).toContain('useRewardImpactHybrid');
    expect(sheet).toContain('RewardImpactRings');
  });

  test('uses themed accessible controls and the existing boon art', () => {
    expect(sheet).toContain('weeklyBoonIconSource(boon, themeMode)');
    expect(sheet).toContain('accessible={false}');
    expect(sheet).toContain('accessibilityLabel={ctaLabel}');
    expect(sheet).toContain('backgroundColor: t.accent');
    expect(sheet).toContain('color: t.correctText');
  });
});
```

- [x] **Step 2: Change the level-up contract to reject automatic legacy modals**

```ts
test('keeps level-up runtime Spin-only while gift inventory retains legacy application modals', () => {
  const inventory = readFileSync(join(process.cwd(), 'app', 'level_gifts_inventory.tsx'), 'utf8');
  expect(source).not.toContain("import LevelGiftModal from '../components/LevelGiftModal'");
  expect(source).not.toContain("import LevelGiftDualModal from '../components/LevelGiftDualModal'");
  expect(source).not.toContain('<LevelGiftModal');
  expect(source).not.toContain('<LevelGiftDualModal');
  expect(source).toContain('loadPendingLevelSpinLevelUps');
  expect(source).toContain('acknowledgePendingLevelSpinLevelUp');
  expect(inventory).toContain('<LevelGiftModal');
  expect(inventory).toContain('<LevelGiftDualModal');
});
```

- [x] **Step 3: Run RED**

Run:

```powershell
npx jest --runInBand --no-cache tests/boon_activated_sheet_contract.test.ts tests/level_up_spin_sheet_contract.test.ts tests/level_spin_gifts_entry_contract.test.ts
```

Expected: the new sheet test fails because `BoonActivatedSheet.tsx` does not exist, and the level-up contract fails because `_layout.tsx` still renders both legacy modals.

### Task 2: Build the A-style daily bonus sheet

**Files:**
- Create: `components/BoonActivatedSheet.tsx`
- Modify: `components/BoonActivatedHost.tsx`

- [x] **Step 1: Implement the presentation-only sheet**

Create a memoized component with this structure:

```tsx
<HybridSheetShell visible={visible} onClose={handleClose} closeLabel={ctaLabel} glowColor={t.accent} testID="boon-activated-sheet">
  <View style={styles.heroFrame}>
    <RewardImpactRings {...ringProps} color={t.accent} />
    <Animated.View style={impact.styles.hero}>
      <Image source={iconSource} contentFit="contain" style={styles.heroImage} accessible={false} />
    </Animated.View>
  </View>
  <Animated.View style={impact.styles.text}>
    <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>{copy.title}</Text>
    <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>{copy.subtitle}</Text>
  </Animated.View>
  <Animated.View style={[styles.statusRow, impact.styles.rows]}>
    <View style={[styles.statusDot, { backgroundColor: t.accent }]} />
    <Text style={[styles.statusText, { color: t.accent }]}>{activeTodayLabel}</Text>
  </Animated.View>
  <Animated.View style={impact.styles.cta}>
    <PressableHybrid accessibilityLabel={ctaLabel} variant="primary" onPress={handleClose} contentStyle={[styles.cta, { backgroundColor: t.accent }]}>
      <Text style={[styles.ctaText, { color: t.correctText }]}>{ctaLabel}</Text>
    </PressableHybrid>
  </Animated.View>
</HybridSheetShell>
```

Use `getBoonCopy`, `weeklyBoonIconSource`, and `triLang` for all eight interface languages. Do not add motion literals; the sheet and impact hook already consume `LUM`, `CHK`, `SUITE`, and `SHEET`.

- [x] **Step 2: Route the host to the new surface**

Replace only the production import/render:

```tsx
import BoonActivatedSheet from './BoonActivatedSheet';
// ...
return <BoonActivatedSheet visible={visible} boon={boon} onClose={close} />;
```

Do not change eligibility, `SHOWN_KEY`, overlay arbitration, or Remote Config handling.

- [x] **Step 3: Run the focused sheet tests**

Run:

```powershell
npx jest --runInBand --no-cache tests/boon_activated_sheet_contract.test.ts tests/boon_activation_modal_contract.test.ts tests/boon_chests_onboarding_gate.test.ts tests/boon_live_kill_switch_contract.test.ts
```

Expected: all suites pass.

### Task 3: Make the global level-up handler Spin-only

**Files:**
- Modify: `app/_layout.tsx:28-63,780-1494`
- Modify: `tests/level_up_spin_sheet_contract.test.ts`

- [x] **Step 1: Remove automatic gift-modal presentation dependencies**

Remove `LevelGiftModal`, `LevelGiftDualModal`, legacy gift inventory display imports, and `acquireLevelGiftDisplay`/`reserveLevelGiftForDisplay` from `_layout.tsx`. Preserve the reconciler retry/repair calls so existing durable gifts can still reach inventory.

- [x] **Step 2: Reduce queue hydration to Spin levels**

Use this queue shape:

```ts
const [spinLevels, [[, name], [, xpRaw]]] = await Promise.all([
  loadPendingLevelSpinLevelUps(),
  AsyncStorage.multiGet(['user_name', 'user_total_xp']),
]);
spinLevelsRef.current = new Set(spinLevels);
const activeLevel = isShowingRef.current ? queueRef.current[0] : undefined;
queueRef.current = activeLevel
  ? [activeLevel, ...spinLevels.filter((level) => level !== activeLevel)]
  : spinLevels;
```

Delete the legacy `pending_level_up_queue` merge and the single/dual pre-roll state. Do not delete the persisted queue key or gift inventory data.

- [x] **Step 3: Keep one dismissal path**

`showNext` always presents a Spin plaque. `LevelUpThresholdModal` uses:

```tsx
spinReward
spinReceiptId={levelSpinCreditId(currentLevel)}
message=""
onContinue={finalizeSpinLevelUp}
```

Remove `dismissLevelUp`, `onGiftClose`, gift-open timers/guards, and both legacy modal JSX branches. Preserve `persistLevelUpBonusIntent` before `acknowledgePendingLevelSpinLevelUp`.

- [x] **Step 4: Run the level-up tests**

Run:

```powershell
npx jest --runInBand --no-cache tests/level_up_spin_sheet_contract.test.ts tests/level_spin_gifts_entry_contract.test.ts tests/level_spin_all_levelups_contract.test.ts tests/local_level_spins.test.ts tests/xp_manager_register_xp.test.ts
```

Expected: all suites pass and gift inventory still contains both application modals.

### Task 4: Verify motion, accessibility, and scope

**Files:**
- Verify: `components/BoonActivatedSheet.tsx`
- Verify: `components/BoonActivatedHost.tsx`
- Verify: `app/_layout.tsx`

- [ ] **Step 1: Run the narrow motion and lifecycle guards**

Focused Motion Hybrid suites pass. `runtime_lifecycle_ratchet` remains red on
unrelated pre-existing Arena/SaveToCards discoveries and a Flashcard owner-token
mismatch. A concurrent unrelated `LevelGiftDualModal` edit also leaves its
runtime-safety source assertion red. The daily-sheet idempotent-dismiss case
passes in isolation; none of the failing source files are in this change.

Run:

```powershell
npx jest --runInBand --no-cache tests/motion_hybrid_contract.test.ts tests/motion_hybrid_overlay_integrity_contract.test.ts tests/motion_hybrid_runtime_safety_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts
```

Expected: all suites pass with no new motion exceptions.

- [x] **Step 2: Inspect only the task diff**

Run:

```powershell
git diff -- components/BoonActivatedSheet.tsx components/BoonActivatedHost.tsx app/_layout.tsx tests/boon_activated_sheet_contract.test.ts tests/level_up_spin_sheet_contract.test.ts
```

Confirm the diff contains no unrelated edits and does not change boon effects, economy data, gift inventory claims, or the existing user-owned edits in `BoonActivatedModal.tsx` and `BoonActivatedHybrid.tsx`.

- [x] **Step 3: Leave the work uncommitted**

The repository already has a large shared dirty worktree. Do not stage or commit files unless the owner separately asks for a commit.
