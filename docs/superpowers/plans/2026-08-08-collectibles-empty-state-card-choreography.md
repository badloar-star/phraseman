# Collectibles Empty-State Card Choreography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium, theme-native card-stack entrance and quiet idle drift to the empty collectibles screen.

**Architecture:** A focused presentational component owns all empty-state layout and Reanimated work. The existing screen continues to own loading, collection state, localization, and navigation; it passes only semantic theme/font values and localized copy into the component.

**Tech Stack:** React Native, Expo Router, React Native Reanimated, existing Phraseman theme/motion/runtime hooks, Jest contract tests.

---

## Working-tree constraints

- Execute inline in the current Phraseman worktree because `app/collectibles_screen.tsx` already contains two user-owned uncommitted edits that must remain intact.
- Do not edit `functions/src/level_reward_spins.ts`, `app/level_reward_spins_client.ts`, `app/level_reward_spin.tsx`, or `components/LevelSpinFinishLine.tsx`.
- Do not commit during this task: a parallel Spin task shares the repository and owns the current `HEAD` workflow.

### Task 1: Establish the empty-state motion contract

**Files:**
- Create: `tests/collectibles_empty_state_motion_contract.test.ts`
- Read: `app/collectibles_screen.tsx`
- Future target: `components/collectibles/CollectiblesEmptyStateMotion.tsx`

- [ ] **Step 1: Write the failing contract test**

```ts
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('collectibles empty-state motion contract', () => {
  const screen = read('app/collectibles_screen.tsx');
  const component = read('components/collectibles/CollectiblesEmptyStateMotion.tsx');

  it('wires the motion component only into the loaded empty branch', () => {
    expect(screen).toContain("import CollectiblesEmptyStateMotion from '../components/collectibles/CollectiblesEmptyStateMotion';");
    expect(screen).toMatch(/ownedCount === 0[\s\S]*?<CollectiblesEmptyStateMotion/);
    expect(screen).toContain("ru: 'Здесь появятся ваши карточки'");
    expect(screen).toContain("ru: 'Проходите уроки и собирайте коллекцию'");
  });

  it('gates repeating motion by runtime activity and reduced motion', () => {
    expect(component).toContain("useReduceMotion");
    expect(component).toContain("useRuntimeActive");
    expect(component).toContain("if (reduceMotion || !runtimeActive)");
    expect(component).toContain("withRepeat");
    expect(component).toContain("cancelAnimation");
  });

  it('uses semantic theme roles without local palette literals', () => {
    for (const token of [
      'theme.bgCard',
      'theme.bgSurface',
      'theme.bgSurface2',
      'theme.textSecond',
      'theme.textMuted',
      'theme.border',
      'theme.borderLight',
    ]) {
      expect(component).toContain(token);
    }
    expect(component).toContain('getVolumetricShadow(themeMode, theme, 1)');
    expect(component).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('keeps decoration out of the accessibility tree', () => {
    expect(component).toContain('testID="collectibles-empty-state-motion"');
    expect(component).toContain('accessibilityElementsHidden');
    expect(component).toContain('importantForAccessibility="no-hide-descendants"');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/collectibles_empty_state_motion_contract.test.ts --runInBand
```

Expected: FAIL with `ENOENT` for `components/collectibles/CollectiblesEmptyStateMotion.tsx`.

### Task 2: Implement the theme-native motion component

**Files:**
- Create: `components/collectibles/CollectiblesEmptyStateMotion.tsx`
- Test: `tests/collectibles_empty_state_motion_contract.test.ts`

- [ ] **Step 1: Create the focused component**

Implement these exact public types and runtime dependencies:

```ts
type Props = {
  theme: Theme;
  themeMode: ThemeMode;
  fonts: Fonts;
  title: string;
  subtitle: string;
};
```

Use shared values for `rearEntrance`, `middleEntrance`, `frontEntrance`, `iconEntrance`, `titleEntrance`, `subtitleEntrance`, `rearDrift`, and `middleDrift`. Initialize entrance values at `1` so inactive/reduced-motion startup always has a complete static frame.

Define stable module-level timing configs:

```ts
const ENTRANCE_TIMING = {
  duration: MOTION_DURATION.slow,
  easing: Easing.bezier(...MOTION_EASING.easeOutQuint),
} as const;
const COPY_TIMING = {
  duration: MOTION_DURATION.normal,
  easing: Easing.bezier(...MOTION_EASING.easeOutQuint),
} as const;
const DRIFT_TIMING = {
  duration: 2400,
  easing: Easing.inOut(Easing.sin),
} as const;
```

The effect must follow this state machine:

```ts
useEffect(() => {
  const values = [
    rearEntrance,
    middleEntrance,
    frontEntrance,
    iconEntrance,
    titleEntrance,
    subtitleEntrance,
    rearDrift,
    middleDrift,
  ];
  values.forEach(cancelAnimation);

  const showFinalFrame = () => {
    rearEntrance.value = 1;
    middleEntrance.value = 1;
    frontEntrance.value = 1;
    iconEntrance.value = 1;
    titleEntrance.value = 1;
    subtitleEntrance.value = 1;
    rearDrift.value = 0;
    middleDrift.value = 0;
  };

  if (reduceMotion || !runtimeActive) {
    showFinalFrame();
    if (reduceMotion) hasEntered.current = true;
    return () => values.forEach(cancelAnimation);
  }

  if (!hasEntered.current) {
    hasEntered.current = true;
    rearEntrance.value = 0;
    middleEntrance.value = 0;
    frontEntrance.value = 0;
    iconEntrance.value = 0;
    titleEntrance.value = 0;
    subtitleEntrance.value = 0;
    rearEntrance.value = withDelay(40, withSpring(1, MOTION_SPRING.ui));
    middleEntrance.value = withDelay(100, withSpring(1, MOTION_SPRING.ui));
    frontEntrance.value = withDelay(160, withSpring(1, MOTION_SPRING.ui));
    iconEntrance.value = withDelay(240, withTiming(1, ENTRANCE_TIMING));
    titleEntrance.value = withDelay(320, withTiming(1, COPY_TIMING));
    subtitleEntrance.value = withDelay(400, withTiming(1, COPY_TIMING));
  }

  rearDrift.value = withDelay(
    720,
    withRepeat(withTiming(1, DRIFT_TIMING), -1, true),
  );
  middleDrift.value = withDelay(
    1320,
    withRepeat(withTiming(1, DRIFT_TIMING), -1, true),
  );

  return () => values.forEach(cancelAnimation);
}, [
  frontEntrance,
  iconEntrance,
  middleDrift,
  middleEntrance,
  rearDrift,
  rearEntrance,
  reduceMotion,
  runtimeActive,
  subtitleEntrance,
  titleEntrance,
]);
```

Use Reanimated styles with the following final geometry:

- Rear: `translateY 30 → 0`, rotation `-12° → -7.5°`, final opacity `0.24`, idle `-2 px / -0.6°`.
- Middle: `translateY 26 → 0`, rotation `11° → 6.5°`, final opacity `0.34`, idle `-2 px / +0.6°`.
- Front: `translateY 22 → 0`, scale `0.94 → 1`, final opacity `0.82`.
- Icon: `translateY 8 → 0`, scale `0.92 → 1`, opacity `0 → 1`.
- Copy: `translateY 8 → 0`, opacity `0 → 1`.

Render three `Animated.View` silhouettes using `theme.bgSurface2`, `theme.bgSurface`, and `theme.bgCard`; use `theme.borderLight`/`theme.border` for contours and `getVolumetricShadow(themeMode, theme, 1)` for depth. Wrap the decorative stack in:

```tsx
<View
  accessibilityElementsHidden
  importantForAccessibility="no-hide-descendants"
  pointerEvents="none"
  style={styles.visual}
>
```

Render the localized title and subtitle as normal accessible `Text` nodes using `theme.textSecond`, `theme.textMuted`, `fonts.body`, and `fonts.sub`.

- [ ] **Step 2: Run the contract test**

Run:

```powershell
npx jest tests/collectibles_empty_state_motion_contract.test.ts --runInBand
```

Expected: FAIL only on the missing screen import/wiring assertions; component theme, lifecycle, and accessibility assertions pass.

### Task 3: Wire the component into the collection screen

**Files:**
- Modify: `app/collectibles_screen.tsx`
- Test: `tests/collectibles_empty_state_motion_contract.test.ts`

- [ ] **Step 1: Add the import**

Add exactly:

```ts
import CollectiblesEmptyStateMotion from '../components/collectibles/CollectiblesEmptyStateMotion';
```

Keep all existing imports and user changes intact.

- [ ] **Step 2: Replace only the loaded empty branch**

Replace the inline `<View>` under `ownedCount === 0` with:

```tsx
<CollectiblesEmptyStateMotion
  theme={t}
  themeMode={themeMode}
  fonts={f}
  title={triLang(lang, {
    ru: 'Здесь появятся ваши карточки',
    uk: 'Тут зʼявляться ваші картки',
    es: 'Aquí aparecerán tus cartas',
    'pt-BR': 'Suas cartas aparecerão aqui',
    vi: 'Thẻ của bạn sẽ xuất hiện ở đây',
    id: 'Kartu Anda akan muncul di sini',
    tr: 'Kartların burada görünecek',
    pl: 'Tu pojawią się Twoje karty',
  })}
  subtitle={triLang(lang, {
    ru: 'Проходите уроки и собирайте коллекцию',
    uk: 'Проходьте уроки та збирайте колекцію',
    es: 'Completa lecciones y amplía tu colección',
    'pt-BR': 'Complete lições e amplie sua coleção',
    vi: 'Hoàn thành bài học và mở rộng bộ sưu tập',
    id: 'Selesaikan pelajaran dan perluas koleksimu',
    tr: 'Dersleri tamamla ve koleksiyonunu büyüt',
    pl: 'Ukończ lekcje i rozwijaj kolekcję',
  })}
/>
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
npx jest tests/collectibles_empty_state_motion_contract.test.ts --runInBand
```

Expected: PASS, 4 tests.

### Task 4: Focused quality gates

**Files:**
- Verify: `components/collectibles/CollectiblesEmptyStateMotion.tsx`
- Verify: `app/collectibles_screen.tsx`
- Verify: `tests/collectibles_empty_state_motion_contract.test.ts`

- [ ] **Step 1: Confirm the target diff preserves pre-existing edits**

Run:

```powershell
git diff -- app/collectibles_screen.tsx components/collectibles/CollectiblesEmptyStateMotion.tsx tests/collectibles_empty_state_motion_contract.test.ts
```

Expected: the original `decelerationRate="normal"` and localized “собирайте коллекцию” change remain present; the only new screen change is the component import and empty-branch replacement.

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
npm run typecheck
```

Expected: exit code 0. If unrelated existing failures occur, record exact diagnostics and run a focused `npx tsc --noEmit` equivalent supported by the project without repairing unrelated files.

- [ ] **Step 3: Run focused ESLint**

Run:

```powershell
npx eslint components/collectibles/CollectiblesEmptyStateMotion.tsx app/collectibles_screen.tsx tests/collectibles_empty_state_motion_contract.test.ts
```

Expected: exit code 0 for changed files.

- [ ] **Step 4: Re-run the focused Jest test**

Run:

```powershell
npx jest tests/collectibles_empty_state_motion_contract.test.ts --runInBand
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Report manual acceptance scope**

Manual verification remains: open the empty collection under all eight selectable themes, background/foreground the app, navigate away/back, and enable system reduced motion. Do not claim those device-only checks passed unless they were actually run.
