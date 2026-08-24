# MAX Prestart Lesson Mission Plaque Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disabled tutor Start button during premint preparation with the approved one-shot typed mission plaque, then expose the active CTA immediately when premint is ready.

**Architecture:** A focused `MaxLessonMissionPlaque` component owns only finite text reveal, fixed geometry, theming, and accessibility. `max_call_prestart.tsx` keeps ownership of preview/premint state and selects plaque versus CTA; it passes the already-prefetched `MaxTutorPreview.outcome` as the mission. Motion numbers live in `motionHybrid.ts`, and non-tutor call formats keep their current behavior.

**Tech Stack:** React Native, TypeScript, React hooks, React Native `Animated`, Jest, React Native Testing Library.

**Workspace constraint:** Execute inline in the current checkout. Do not create a branch/worktree or delegated coding task because `AGENTS.md` forbids them without an explicit owner request.

---

## File structure

- Create `components/max/MaxLessonMissionPlaque.tsx`: presentational mission card plus one-shot typewriter timer and reserved final text geometry.
- Modify `constants/motionHybrid.ts`: canonical MAX prestart typing and CTA-resolve tokens.
- Modify `app/max_call_prestart.tsx`: tutor-only state selection, preview outcome wiring, Reduce Motion input, and ready CTA entrance.
- Create `tests/max_lesson_mission_plaque.test.ts`: real component timer, Reduce Motion, cleanup, geometry, and accessibility tests.
- Modify `tests/max_call_prestart_ready_gate_contract.test.ts`: integration contract for tutor preparing/ready branches and prefetched mission source.

### Task 1: Mission plaque component

**Files:**
- Create: `components/max/MaxLessonMissionPlaque.tsx`
- Modify: `constants/motionHybrid.ts`
- Create: `tests/max_lesson_mission_plaque.test.ts`

- [ ] **Step 1: Write the failing real-component tests**

Create `tests/max_lesson_mission_plaque.test.ts` with fake timers, `React.createElement`, and a deterministic theme mock:

```tsx
/* eslint-disable import/first */
import React from 'react';
import { act, render } from '@testing-library/react-native';

jest.unmock('react-native');
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#b9f34a',
      accentBg: '#26331b',
      bgSurface: '#151923',
      correctText: '#07110a',
      textMuted: '#9aa5b8',
      textPrimary: '#f6f8fc',
    },
    f: { label: 12, body: 14 },
  }),
}));

import MaxLessonMissionPlaque from '../components/max/MaxLessonMissionPlaque';
import { MAX_PRESTART_MISSION_HYBRID } from '../constants/motionHybrid';

describe('MaxLessonMissionPlaque', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('types a mission once and reserves the full final text footprint', async () => {
    const screen = await render(
      <MaxLessonMissionPlaque mission="Hello MAX" lang="ru" reduceMotion={false} />,
    );
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('');
    expect(screen.getByTestId('max-lesson-mission-layout-text').props.children).toBe('Hello MAX');

    await act(async () => {
      jest.advanceTimersByTime(MAX_PRESTART_MISSION_HYBRID.characterMs * 5);
    });
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('Hello');

    await act(async () => jest.runAllTimers());
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('Hello MAX');
  });

  it('renders the full mission immediately under Reduce Motion without timers', async () => {
    const screen = await render(
      <MaxLessonMissionPlaque mission="Hello MAX" lang="ru" reduceMotion />,
    );
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.children[0]).toBe('Hello MAX');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleans the pending character timer on unmount', async () => {
    const screen = await render(
      <MaxLessonMissionPlaque mission="Hello MAX" lang="ru" reduceMotion={false} />,
    );
    expect(jest.getTimerCount()).toBe(1);
    screen.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('exposes one stable full-sentence accessibility label', async () => {
    const screen = await render(
      <MaxLessonMissionPlaque mission="Hello MAX" lang="ru" reduceMotion={false} />,
    );
    expect(screen.getByLabelText('Сегодня с MAX. Hello MAX')).toBeTruthy();
    expect(screen.getByTestId('max-lesson-mission-visible-text').props.accessible).toBe(false);
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Acquire the shared heavy-test slot, run:

```powershell
npx jest tests/max_lesson_mission_plaque.test.ts --runInBand
```

Expected: FAIL because `MaxLessonMissionPlaque` and `MAX_PRESTART_MISSION_HYBRID` do not exist.

- [ ] **Step 3: Add canonical motion tokens**

Append to `constants/motionHybrid.ts`:

```ts
export const MAX_PRESTART_MISSION_HYBRID = {
  characterMs: 34,
  cardMinHeight: 108,
  badgeSize: 32,
  caretWidth: 2,
  ctaStartShiftPx: 4,
  ctaResolveMs: LUM.contentMs,
} as const;
```

- [ ] **Step 4: Implement the focused plaque component**

Create `components/max/MaxLessonMissionPlaque.tsx` with this public API and behavior:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { glassFill } from '../GlassSurface';
import { useTheme } from '../ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { MAX_PRESTART_MISSION_HYBRID } from '../../constants/motionHybrid';

type Props = {
  mission: string;
  lang: Lang;
  reduceMotion: boolean;
};

export function MaxLessonMissionPlaque({ mission, lang, reduceMotion }: Props) {
  const { theme: t, f } = useTheme();
  const cleanMission = useMemo(() => mission.trim().replace(/\s+/gu, ' '), [mission]);
  const [visibleCharacters, setVisibleCharacters] = useState(
    reduceMotion ? cleanMission.length : 0,
  );
  const label = triLang(lang, {
    ru: 'Сегодня с MAX', uk: 'Сьогодні з MAX', es: 'Hoy con MAX',
    'pt-BR': 'Hoje com o MAX', vi: 'Hôm nay cùng MAX', id: 'Hari ini bersama MAX',
    tr: 'Bugün MAX ile', pl: 'Dziś z MAX',
  });

  useEffect(() => {
    setVisibleCharacters(reduceMotion ? cleanMission.length : 0);
    if (reduceMotion || cleanMission.length === 0) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let nextCount = 1;
    const revealNext = () => {
      timer = setTimeout(() => {
        setVisibleCharacters(nextCount);
        nextCount += 1;
        if (nextCount <= cleanMission.length) revealNext();
      }, MAX_PRESTART_MISSION_HYBRID.characterMs);
    };
    revealNext();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cleanMission, reduceMotion]);

  const textStyle = {
    color: t.textPrimary,
    fontSize: f.body,
    fontWeight: '700' as const,
    lineHeight: Math.round(f.body * 1.45),
  };

  return (
    <View
      testID="max-lesson-mission-plaque"
      accessible
      accessibilityLabel={`${label}. ${cleanMission}`}
      style={{
        minHeight: MAX_PRESTART_MISSION_HYBRID.cardMinHeight,
        borderRadius: 20,
        padding: 17,
        flexDirection: 'row',
        gap: 13,
        backgroundColor: glassFill(t.bgSurface, 0.72),
      }}
    >
      <View style={{
        width: MAX_PRESTART_MISSION_HYBRID.badgeSize,
        height: MAX_PRESTART_MISSION_HYBRID.badgeSize,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.accent,
      }}>
        <Text style={{ color: t.correctText, fontWeight: '700' }}>M</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '700', marginBottom: 8 }}>
          {label}
        </Text>
        <View style={{ position: 'relative' }}>
          <Text
            testID="max-lesson-mission-layout-text"
            accessible={false}
            style={[textStyle, { opacity: 0 }]}
            maxFontSizeMultiplier={2}
          >
            {cleanMission}
          </Text>
          <Text
            testID="max-lesson-mission-visible-text"
            accessible={false}
            style={[textStyle, StyleSheet.absoluteFillObject]}
            maxFontSizeMultiplier={2}
          >
            {cleanMission.slice(0, visibleCharacters)}
            <Text style={{ color: t.accent }}>|</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

export default MaxLessonMissionPlaque;
```

- [ ] **Step 5: Run the component test and verify GREEN**

Run the same focused Jest command under the shared slot.

Expected: 4 tests PASS, with no timer leak or act warning.

### Task 2: Tutor prestart integration

**Files:**
- Modify: `app/max_call_prestart.tsx`
- Modify: `tests/max_call_prestart_ready_gate_contract.test.ts`

- [ ] **Step 1: Extend the integration contract and verify RED**

Add these expectations to `tests/max_call_prestart_ready_gate_contract.test.ts`:

```ts
it('shows the prefetched lesson mission instead of a disabled tutor CTA while preparing', () => {
  expect(source).toContain("import MaxLessonMissionPlaque from '../components/max/MaxLessonMissionPlaque'");
  expect(source).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion'");
  expect(source).toContain("const reduceMotion = useReduceMotion();");
  expect(source).toContain("prepState === 'preparing' ? (");
  expect(source).toContain('<MaxLessonMissionPlaque');
  expect(source).toContain('mission={activeTutorPreview.outcome}');
  expect(source).toContain('reduceMotion={reduceMotion}');
  expect(source).toContain("prepState === 'ready' && !noMinutesLeft");
});
```

Run:

```powershell
npx jest tests/max_call_prestart_ready_gate_contract.test.ts --runInBand
```

Expected: FAIL because the plaque is not wired into prestart.

- [ ] **Step 2: Wire Reduce Motion and ready-CTA resolve**

In `app/max_call_prestart.tsx`:

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaxLessonMissionPlaque from '../components/max/MaxLessonMissionPlaque';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { MAX_PRESTART_MISSION_HYBRID } from '../constants/motionHybrid';
```

Inside `MaxCallPrestartContent`, add:

```tsx
const reduceMotion = useReduceMotion();
const startCtaReveal = useRef(new Animated.Value(0)).current;

useEffect(() => {
  startCtaReveal.stopAnimation();
  if (!startReady || reduceMotion) {
    startCtaReveal.setValue(startReady ? 1 : 0);
    return undefined;
  }
  startCtaReveal.setValue(0);
  const animation = Animated.timing(startCtaReveal, {
    toValue: 1,
    duration: MAX_PRESTART_MISSION_HYBRID.ctaResolveMs,
    useNativeDriver: true,
  });
  animation.start();
  return () => animation.stop();
}, [reduceMotion, startCtaReveal, startReady]);
```

Place this effect after `startReady` is declared so it does not read a variable
before initialization.

- [ ] **Step 3: Replace only the tutor CTA slot**

Replace the tutor branch's unconditional Start `TouchableOpacity` with:

```tsx
{prepState === 'preparing' ? (
  <MaxLessonMissionPlaque
    mission={activeTutorPreview.outcome}
    lang={lang}
    reduceMotion={reduceMotion}
  />
) : startReady ? (
  <Animated.View
    style={{
      opacity: startCtaReveal,
      transform: [{
        translateY: startCtaReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [MAX_PRESTART_MISSION_HYBRID.ctaStartShiftPx, 0],
        }),
      }],
    }}
  >
    <TouchableOpacity
      testID="max-call-start-button"
      accessibilityRole="button"
      accessibilityLabel={a11y.startLabel}
      accessibilityHint={a11y.startHint}
      accessibilityState={{ disabled: false }}
      onPress={startCall}
      style={{
        minHeight: 60,
        backgroundColor: t.accent,
        borderRadius: 20,
        paddingVertical: 17,
        paddingHorizontal: 18,
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Ionicons name="call" size={22} color={t.correctText} />
      <Text
        style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '900' }}
        maxFontSizeMultiplier={2}
      >
        {triLang(lang, {
          ru: 'Начать урок', uk: 'Почати урок', es: 'Empezar la clase',
          'pt-BR': 'Começar a aula', vi: 'Bắt đầu bài học', id: 'Mulai pelajaran',
          tr: 'Dersi başlat', pl: 'Rozpocznij lekcję',
        })}
      </Text>
    </TouchableOpacity>
  </Animated.View>
) : null}
```

Do not change the non-tutor CTA branch. Do not add a minimum plaque duration.

- [ ] **Step 4: Run integration and component tests GREEN**

Under one shared test slot, run:

```powershell
npx jest tests/max_call_prestart_ready_gate_contract.test.ts tests/max_lesson_mission_plaque.test.ts --runInBand
```

Expected: both suites PASS.

### Task 3: Focused regression verification

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Run the focused MAX suite under the shared slot**

```powershell
npx jest tests/max_lesson_mission_plaque.test.ts tests/max_call_prestart_ready_gate_contract.test.ts tests/max_call_prestart_design_contract.test.ts tests/max_call_premint.test.ts tests/max_voice_accessibility.test.tsx --runInBand
```

Expected: all selected suites PASS. If `max_call_home_entry_contract.test.ts`
is also run, report its independently stale Home-premint/failed-state assertions
separately instead of weakening the approved premint flow.

- [ ] **Step 2: Verify final source invariants**

Run:

```powershell
git diff --check -- app/max_call_prestart.tsx components/max/MaxLessonMissionPlaque.tsx constants/motionHybrid.ts tests/max_lesson_mission_plaque.test.ts tests/max_call_prestart_ready_gate_contract.test.ts
rg -n "MaxLessonMissionPlaque|mission=\{activeTutorPreview\.outcome\}|prepState === 'preparing'|MAX_PRESTART_MISSION_HYBRID" app/max_call_prestart.tsx components/max/MaxLessonMissionPlaque.tsx constants/motionHybrid.ts
```

Expected: no whitespace errors; all integration tokens are present; no new
`setInterval`, network call, LLM call, or Firestore dependency exists.

- [ ] **Step 3: Commit only owned files when the shared index is free**

```powershell
git add -- app/max_call_prestart.tsx components/max/MaxLessonMissionPlaque.tsx constants/motionHybrid.ts tests/max_lesson_mission_plaque.test.ts tests/max_call_prestart_ready_gate_contract.test.ts docs/superpowers/plans/2026-08-24-max-prestart-lesson-mission-plaque.md
git commit --only -m "feat: animate MAX lesson mission while preparing" -- app/max_call_prestart.tsx components/max/MaxLessonMissionPlaque.tsx constants/motionHybrid.ts tests/max_lesson_mission_plaque.test.ts tests/max_call_prestart_ready_gate_contract.test.ts docs/superpowers/plans/2026-08-24-max-prestart-lesson-mission-plaque.md
```

Expected: the commit contains only the listed files. If another live Git process
owns `.git/index.lock`, leave source verified and uncommitted; do not remove a
live lock or include another session's staged files.
