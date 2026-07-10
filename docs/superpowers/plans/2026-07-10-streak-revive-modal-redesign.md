# Streak Revive Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the outlined reward-card streak-recovery modal with the approved borderless asymmetric recovery pass while preserving all existing business behavior.

**Architecture:** Keep offer state, countdown, recovery, shop navigation, haptics, and events inside `StreakReviveModal.tsx`. Replace only its `RewardCardV2` presentation with a local accessible `Modal` composition so shared reward modals remain unchanged. Protect the visual contract with a narrow source contract test and run the existing streak-flow tests for behavioral regressions.

**Tech Stack:** React Native, Expo Router, TypeScript, `expo-image`, React Native `Modal`/`Pressable`/`ScrollView`, Jest source-contract tests.

---

## File Map

- Modify `components/StreakReviveModal.tsx`: retain all business callbacks and replace the renderer/styles with the recovery-pass UI.
- Create `tests/streak_revive_modal_design_contract.test.ts`: guard the selected structure, accessibility hooks, and no-border rule.
- Modify `tests/energy_restore_modals_locale_runtime.test.ts`: replace only the streak-modal copy expectations and guard all eight supported locales.
- Do not modify `components/reward_v2/RewardCardV2.tsx`: other reward modals keep their current design.

### Task 1: Lock the selected design contract

**Files:**
- Create: `tests/streak_revive_modal_design_contract.test.ts`
- Read: `components/StreakReviveModal.tsx`

- [ ] **Step 1: Write the failing contract test**

```ts
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'StreakReviveModal.tsx'),
  'utf8',
);

describe('streak revive modal design contract', () => {
  it('uses the standalone asymmetric recovery pass', () => {
    expect(source).not.toContain("from './reward_v2/RewardCardV2'");
    expect(source).toContain('testID="streak-revive-pass"');
    expect(source).toContain('testID="streak-revive-header"');
    expect(source).toContain('testID="streak-revive-backdrop"');
    expect(source).toContain('testID="streak-revive-close"');
    expect(source).toContain('testID="streak-revive-primary"');
    expect(source).toContain('testID="streak-revive-secondary"');
    expect(source.indexOf('testID="streak-revive-backdrop"')).toBeLessThan(source.indexOf('testID="streak-revive-pass"'));
  });

  it('keeps the modal borderless and accessible', () => {
    expect(source).not.toMatch(/borderWidth\s*:/);
    expect(source).not.toMatch(/borderColor\s*:/);
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).not.toContain('onStartShouldSetResponder');

    const between = (startMarker: string, endMarker: string) => {
      const start = source.indexOf(startMarker);
      const end = source.indexOf(endMarker, start + startMarker.length);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      return source.slice(start, end);
    };
    const backdrop = between('testID="streak-revive-backdrop"', 'testID="streak-revive-pass"');
    const close = between('testID="streak-revive-close"', 'testID="streak-revive-primary"');
    const primary = between('testID="streak-revive-primary"', 'testID="streak-revive-secondary"');
    const secondary = between('testID="streak-revive-secondary"', '</ScrollView>');

    for (const control of [backdrop, close, primary, secondary]) {
      expect(control).toContain('accessibilityRole="button"');
      expect(control).toContain('disabled={busy}');
      expect(control).toContain('accessibilityState={{ disabled: busy }}');
    }
    for (const dismissControl of [backdrop, close, secondary]) {
      expect(dismissControl).toContain('onPress={handleDismiss}');
    }
    expect(primary).toContain('void onConfirm()');
  });

  it('preserves restore, dismiss, timer, and shop behavior', () => {
    expect(source).toContain('onRequestClose={handleDismiss}');
    const dismissStart = source.indexOf('const handleDismiss = useCallback');
    const dismissEnd = source.indexOf('}, [busy, onDismiss]);', dismissStart);
    const dismissBody = source.slice(dismissStart, dismissEnd);
    expect(dismissBody).toContain('if (busy) return;');
    expect(dismissBody).toContain('onDismiss();');
    expect(source).toContain('setInterval(tick, 1000)');
    expect(source).toContain("source: 'streak_revive'");
  });

  it('provides compact scrolling, scalable streak text, and a localized busy label', () => {
    expect(source).toContain('fontScale > 1.15');
    expect(source).toContain('styles.headerCompact');
    expect(source).toContain('styles.streakNumberCompact');
    expect(source).toContain('style={styles.bodyScroll}');
    expect(source).toContain('adjustsFontSizeToFit');
    expect(source).toContain('{busy ? busyLabel : primaryLabel}');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails for the old renderer**

Run:

```powershell
npx jest tests/streak_revive_modal_design_contract.test.ts --runInBand
```

Expected: FAIL because `StreakReviveModal.tsx` still imports `RewardCardV2` and lacks the recovery-pass test IDs.

- [ ] **Step 3: Commit the red test**

```powershell
git add tests/streak_revive_modal_design_contract.test.ts
git commit -m "test: define streak revive modal design contract"
```

### Task 2: Build the borderless recovery pass

**Files:**
- Modify: `components/StreakReviveModal.tsx`
- Modify: `tests/energy_restore_modals_locale_runtime.test.ts`
- Test: `tests/streak_revive_modal_design_contract.test.ts`

- [ ] **Step 1: Replace presentation imports while retaining all domain imports**

Use React Native primitives and safe-area/window sizing:

```ts
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

Remove the `RewardCardV2`, `rewardModalSoftSurface`, and `rewardModalPanelBorder` imports. Keep `useTheme`, shard imagery, router, localization, haptics, and streak-recovery imports unchanged.

- [ ] **Step 2: Add localized presentation copy and layout inputs**

Inside `StreakReviveModal`, derive these values without changing `formatStreakDays`, `formatCountdown`, `onConfirm`, or `onDismiss`:

```ts
const insets = useSafeAreaInsets();
const { height: windowHeight, fontScale } = useWindowDimensions();
const compactHeight = windowHeight < 700 || fontScale > 1.15;
const accent = '#FF7A45';
const accentDarkText = '#241008';
const passSurface = themeMode === 'light' ? '#F7F5FA' : '#171824';
const primarySurface = themeMode === 'light' ? '#6E5AE8' : '#F3F0FF';
const primaryText = themeMode === 'light' ? '#FFFFFF' : '#171421';

const title = triLang(lang, {
  ru: 'Рекорд всё ещё твой',
  uk: 'Рекорд усе ще твій',
  es: 'Tu récord sigue siendo tuyo',
  'pt-BR': 'Seu recorde ainda é seu',
  vi: 'Kỷ lục vẫn là của bạn',
  id: 'Rekormu masih milikmu',
  tr: 'Rekorun hâlâ senin',
  pl: 'Twój rekord nadal jest Twój',
});
```

Add equally complete `description`, `primaryLabel`, `busyLabel`, `secondaryLabel`, `costLabel`, and `closeLabel` maps for all existing interface languages. Keep the copy concise enough to wrap within a 326-pixel pass.

- [ ] **Step 3: Update the exact locale guard for every new visible string**

Replace only the streak-copy expectations in `tests/energy_restore_modals_locale_runtime.test.ts`; leave `EnergyRefillShardModal` expectations untouched:

```ts
it('keeps every streak recovery label explicit in all eight interface locales', () => {
  const localeMarkers = ['ru:', 'uk:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:'];
  const copyNames = [
    'title',
    'description',
    'primaryLabel',
    'busyLabel',
    'secondaryLabel',
    'costLabel',
    'closeLabel',
  ];

  for (const copyName of copyNames) {
    const start = streakSource.indexOf(`const ${copyName} = triLang`);
    expect(start).toBeGreaterThanOrEqual(0);
    const end = streakSource.indexOf('});', start);
    const copyBlock = streakSource.slice(start, end);
    for (const marker of localeMarkers) expect(copyBlock).toContain(marker);
  }

  expect(streakSource).toContain("ru: 'Рекорд всё ещё твой'");
  expect(streakSource).toContain("'pt-BR': 'Seu recorde ainda é seu'");
  expect(streakSource).toContain("vi: 'Kỷ lục vẫn là của bạn'");
  expect(streakSource).toContain("id: 'Rekormu masih milikmu'");
  expect(streakSource).toContain("tr: 'Rekorun hâlâ senin'");
  expect(streakSource).toContain("pl: 'Twój rekord nadal jest Twój'");
});
```

- [ ] **Step 4: Replace `RewardCardV2` with sibling backdrop and modal-content layers**

Add one guarded dismissal callback so Android back, backdrop, close, and secondary actions all obey the busy lock:

```ts
const handleDismiss = useCallback(() => {
  if (busy) return;
  onDismiss();
}, [busy, onDismiss]);
```

Implement this hierarchy. The absolute backdrop and the independent pass are siblings; do not nest controls inside the backdrop and do not use responder interception:

```tsx
if (!visible || !offer) return null;

return (
  <Modal
    visible
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={handleDismiss}
  >
    <View
      style={[styles.modalRoot, { paddingTop: Math.max(18, insets.top), paddingBottom: Math.max(18, insets.bottom) }]}
    >
      <Pressable
        testID="streak-revive-backdrop"
        style={styles.backdrop}
        onPress={handleDismiss}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        accessibilityState={{ disabled: busy }}
      />
      <View
        testID="streak-revive-pass"
        style={[styles.pass, compactHeight && styles.passCompact, { backgroundColor: passSurface }]}
        accessibilityViewIsModal
      >
        <View testID="streak-revive-header" style={[styles.header, compactHeight && styles.headerCompact, { backgroundColor: accent }]}>
          <Pressable
            testID="streak-revive-close"
            onPress={handleDismiss}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            accessibilityState={{ disabled: busy }}
            hitSlop={8}
            style={styles.closeButton}
          >
            <Text style={[styles.closeGlyph, { color: accentDarkText }]}>×</Text>
          </Pressable>
          <Text
            style={[styles.streakNumber, compactHeight && styles.streakNumberCompact, { color: accentDarkText }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {lostStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: accentDarkText }]}>{streakUnit}</Text>
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <Text style={[styles.description, { color: t.textSecond, fontSize: f.body }]}>{description}</Text>
          <Pressable
            testID="streak-revive-primary"
            onPress={() => { hapticTap(); void onConfirm(); }}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: primarySurface }, pressed && !busy && styles.pressed]}
          >
            {busy ? <ActivityIndicator color={primaryText} /> : null}
            <Text style={[styles.primaryText, { color: primaryText }]}>{busy ? busyLabel : primaryLabel}</Text>
          </Pressable>
          <View style={styles.costRow}>
            <Image source={oskolokImageForPackShards(cost)} style={styles.priceIcon} contentFit="contain" />
            <Text style={[styles.costText, { color: t.textSecond }]}>{costLabel}: {cost}</Text>
          </View>
          <Pressable
            testID="streak-revive-secondary"
            onPress={handleDismiss}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [styles.secondaryButton, pressed && !busy && styles.pressed]}
          >
            <Text style={[styles.secondaryText, { color: t.textMuted }]}>{secondaryLabel}</Text>
          </Pressable>
          {msLeft > 0 ? <Text style={[styles.countdown, { color: t.textMuted }]}>{formatCountdown(msLeft, lang)}</Text> : null}
        </ScrollView>
      </View>
    </View>
  </Modal>
);
```

- [ ] **Step 5: Replace old pill styles with filled, borderless recovery-pass styles**

Use no `borderWidth` or `borderColor` declarations:

```ts
const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 4, 10, 0.76)',
  },
  pass: {
    width: 342,
    maxWidth: '100%',
    maxHeight: '92%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.48,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  passCompact: { maxHeight: '96%' },
  header: { minHeight: 206, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 24, justifyContent: 'flex-end' },
  headerCompact: { minHeight: 150, paddingTop: 20, paddingBottom: 18 },
  closeButton: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(36,16,8,0.10)' },
  closeGlyph: { fontSize: 29, lineHeight: 32, fontWeight: '500' },
  streakNumber: { fontSize: 100, lineHeight: 94, fontWeight: '900', letterSpacing: -5 },
  streakNumberCompact: { fontSize: 72, lineHeight: 68, letterSpacing: -3 },
  streakLabel: { marginTop: 5, fontSize: 15, fontWeight: '900' },
  bodyScroll: { flexShrink: 1 },
  body: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 20 },
  title: { fontWeight: '900', letterSpacing: -0.5 },
  description: { marginTop: 9, lineHeight: 23, fontWeight: '500' },
  primaryButton: { minHeight: 58, marginTop: 24, borderRadius: 19, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  pressed: { opacity: 0.82 },
  costRow: { minHeight: 34, marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  priceIcon: { width: 22, height: 22 },
  costText: { fontSize: 13, fontWeight: '700' },
  secondaryButton: { minHeight: 48, marginTop: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryText: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  countdown: { marginTop: 2, textAlign: 'center', fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 6: Run the design and existing behavior contracts**

Run:

```powershell
npx jest tests/streak_revive_modal_design_contract.test.ts tests/streak_revive_shop_stats_contract.test.ts tests/energy_restore_modals_locale_runtime.test.ts tests/owner_direction_runtime_contract.test.ts tests/modal_opaque_surfaces_contract.test.ts --runInBand
```

Expected: all selected suites PASS. If `modal_opaque_surfaces_contract` encodes the old shared reward-card anatomy, update only its `StreakReviveModal.tsx` expectation to recognize the new opaque local pass; do not weaken its checks for other modals.

- [ ] **Step 7: Commit the implementation**

```powershell
git add components/StreakReviveModal.tsx tests/streak_revive_modal_design_contract.test.ts tests/energy_restore_modals_locale_runtime.test.ts tests/modal_opaque_surfaces_contract.test.ts
git commit -m "feat: redesign streak recovery modal"
```

Stage `tests/modal_opaque_surfaces_contract.test.ts` only if its focused expectation required an update.

### Task 3: Verify runtime safety and visual behavior

**Files:**
- Verify: `components/StreakReviveModal.tsx`
- Verify: `tests/streak_revive_modal_design_contract.test.ts`

- [ ] **Step 1: Run TypeScript and diff hygiene**

```powershell
npx tsc --noEmit --pretty false
git diff --check HEAD~1
```

Expected: both commands exit with code 0.

- [ ] **Step 2: Verify the active Metro session**

Open the app through the existing Metro server, trigger the streak-recovery tester flow, and inspect these states on the Android emulator:

1. normal offer with four lost days;
2. long translated copy wrapping without clipping;
3. a short-height viewport with compact header and a scrollable body;
4. increased system font scale without a clipped streak number or unreachable action;
5. busy state showing spinner plus localized progress label while backdrop, close, primary, and secondary actions are disabled;
6. insufficient balance navigation to the shard shop;
7. close button, backdrop, and secondary action;
8. countdown and expiration.

Expected: the modal matches option B, uses no visible outlines, and every action remains reachable on a compact viewport.

- [ ] **Step 3: Request final advisor review**

Provide the advisor with the approved design spec, implementation plan, final diff, focused Jest output, TypeScript output, visual evidence, and unresolved limitations. Apply any required corrections and repeat focused verification until the advisor returns `DECISION: APPROVED`.
