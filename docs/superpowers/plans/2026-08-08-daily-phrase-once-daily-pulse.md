# Daily Phrase Once-Daily Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the visible “Check yourself” CTA from the home Daily Phrase card and pulse the complete tappable card twice on its first qualifying viewport appearance each local day.

**Architecture:** The home screen will calculate card visibility from its existing `BouncyScrollView` offset, viewport height, and the card wrapper layout without putting scroll position into React state. A small pure helper will own intersection math and the local-day storage policy. `DailyPhraseCard` will consume a boolean visibility prop and run one finite native-driver scale sequence after the helper atomically claims the current day.

**Tech Stack:** React Native, TypeScript, React Native `Animated`, AsyncStorage, Jest.

---

## File Structure

- Create `app/daily_phrase_pulse.ts`: pure visibility math plus versioned AsyncStorage claim helper.
- Create `tests/daily_phrase_pulse.test.ts`: deterministic threshold and once-per-local-day tests.
- Modify `app/(tabs)/home.tsx`: collect scroll/layout measurements and pass current card visibility.
- Modify `components/DailyPhraseCard.tsx`: remove CTA markup/copy and animate the whole home card.
- Modify `tests/daily_phrase_quest_card_contract.test.ts`: source contract for CTA removal and finite accessible motion.
- Modify `tests/home_reference_cards_contract.test.ts`: source contract for viewport wiring on the home screen.

### Task 1: Daily pulse policy

**Files:**
- Create: `app/daily_phrase_pulse.ts`
- Create: `tests/daily_phrase_pulse.test.ts`

- [ ] **Step 1: Write the failing threshold and storage tests**

```ts
import {
  claimDailyPhrasePulseForDay,
  isDailyPhraseCardHalfVisible,
} from '../app/daily_phrase_pulse';

describe('daily phrase pulse policy', () => {
  it('requires at least half the card to intersect the viewport', () => {
    expect(isDailyPhraseCardHalfVisible({ cardTop: 700, cardHeight: 100, scrollY: 0, viewportHeight: 749 })).toBe(false);
    expect(isDailyPhraseCardHalfVisible({ cardTop: 700, cardHeight: 100, scrollY: 0, viewportHeight: 750 })).toBe(true);
  });

  it('claims only once for the same local day and allows the next day', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    };

    await expect(claimDailyPhrasePulseForDay('2026-08-08', storage)).resolves.toBe(true);
    await expect(claimDailyPhrasePulseForDay('2026-08-08', storage)).resolves.toBe(false);
    await expect(claimDailyPhrasePulseForDay('2026-08-09', storage)).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `npx jest tests/daily_phrase_pulse.test.ts --runInBand`

Expected: FAIL because `app/daily_phrase_pulse.ts` does not exist.

- [ ] **Step 3: Implement the pure threshold and atomic day claim**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DAILY_PHRASE_PULSE_DAY_KEY = 'daily_phrase_home_pulse_day_v1';

type PulseStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export function isDailyPhraseCardHalfVisible(args: {
  cardTop: number;
  cardHeight: number;
  scrollY: number;
  viewportHeight: number;
}): boolean {
  const { cardTop, cardHeight, scrollY, viewportHeight } = args;
  if (cardHeight <= 0 || viewportHeight <= 0) return false;
  const cardBottom = cardTop + cardHeight;
  const viewportBottom = scrollY + viewportHeight;
  const visibleHeight = Math.max(0, Math.min(cardBottom, viewportBottom) - Math.max(cardTop, scrollY));
  return visibleHeight >= cardHeight * 0.5;
}

export async function claimDailyPhrasePulseForDay(
  localDay: string,
  storage: PulseStorage = AsyncStorage,
): Promise<boolean> {
  const previousDay = await storage.getItem(DAILY_PHRASE_PULSE_DAY_KEY);
  if (previousDay === localDay) return false;
  await storage.setItem(DAILY_PHRASE_PULSE_DAY_KEY, localDay);
  return true;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx jest tests/daily_phrase_pulse.test.ts --runInBand`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit only the new policy files**

```bash
git add app/daily_phrase_pulse.ts tests/daily_phrase_pulse.test.ts
git commit -m "feat: add daily phrase pulse policy"
```

### Task 2: Remove the CTA and animate the whole home card

**Files:**
- Modify: `components/DailyPhraseCard.tsx`
- Modify: `tests/daily_phrase_quest_card_contract.test.ts`

- [ ] **Step 1: Replace the old CTA contract with a failing pulse contract**

Update the home-card contract to assert these exact invariants:

```ts
it('keeps the whole home phrase card tappable without a separate CTA', () => {
  const liveHomeBranchStart = source.indexOf('{homeAdditional ? (');
  const liveHomeBranch = source.slice(liveHomeBranchStart, source.indexOf('            ) : (', liveHomeBranchStart));

  expect(liveHomeBranch).not.toContain('homeAdditionalAction');
  expect(source).not.toContain('homeActionLabel');
  expect(source).not.toContain('homeAdditionalActionText');
  expect(source).toContain('accessibilityRole="button"');
});

it('uses a finite two-pulse native-driver cue for the complete home card', () => {
  expect(source).toContain('claimDailyPhrasePulseForDay');
  expect(source).toContain('const homePulseScale = useRef(new Animated.Value(1)).current;');
  expect(source).toContain('Animated.sequence([');
  expect(source.match(/toValue: 1\.025/g)).toHaveLength(2);
  expect(source).toContain('useNativeDriver: true');
  expect(source).not.toContain('Animated.loop');
  expect(source).not.toContain('setInterval');
});
```

- [ ] **Step 2: Run the component contract and verify RED**

Run: `npx jest tests/daily_phrase_quest_card_contract.test.ts --runInBand`

Expected: FAIL because the CTA is still present and the home pulse is not implemented.

- [ ] **Step 3: Add the visibility prop and finite animation**

Change the props and component setup:

```ts
interface Props {
  userLevel?: number;
  variant?: 'default' | 'homeAdditional';
  homeCardVisible?: boolean;
}

function DailyPhraseCard({
  userLevel: _userLevel,
  variant = 'default',
  homeCardVisible = false,
}: Props) {
  const homePulseScale = useRef(new Animated.Value(1)).current;
  const pulseClaimedThisMountRef = useRef(false);
```

Use `getLocalDayKey()` and claim before starting the sequence. The effect must stop and settle the value during cleanup and must skip when `!homeAdditional`, `!homeCardVisible`, `reduceMotion`, or the mount guard is already set:

```ts
useEffect(() => {
  if (!homeAdditional || !homeCardVisible || reduceMotion || pulseClaimedThisMountRef.current) return;
  let cancelled = false;
  pulseClaimedThisMountRef.current = true;

  void claimDailyPhrasePulseForDay(getLocalDayKey()).then((claimed) => {
    if (!claimed || cancelled) return;
    const pulse = Animated.sequence([
      Animated.timing(homePulseScale, { toValue: 1.025, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(homePulseScale, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(homePulseScale, { toValue: 1.025, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(homePulseScale, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    pulse.start(({ finished }) => { if (!finished) homePulseScale.setValue(1); });
  }).catch(() => {});

  return () => {
    cancelled = true;
    homePulseScale.stopAnimation();
    homePulseScale.setValue(1);
  };
}, [homeAdditional, homeCardVisible, homePulseScale, reduceMotion]);
```

Wrap only the home variant's entire `Pressable` in an `Animated.View` whose transform is `[{ scale: homePulseScale }]`; keep the default variant at scale `1`. Remove `homeActionLabel`, the `!homeQuestAnswered` CTA block, and the unused `homeAdditionalAction` / `homeAdditionalActionText` styles. Simplify the accessibility label to title plus phrase.

- [ ] **Step 4: Run the component contract and verify GREEN**

Run: `npx jest tests/daily_phrase_quest_card_contract.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Review the targeted diff before staging**

Run: `git diff -- components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts`

Expected: only CTA removal, new prop/imports/effect/wrapper, and matching test changes. Because the worktree already contains user changes, do not commit these files unless every staged hunk is confirmed to belong to this feature.

### Task 3: Trigger the cue from actual home viewport visibility

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `tests/home_reference_cards_contract.test.ts`

- [ ] **Step 1: Add a failing source contract for scroll/layout wiring**

```ts
it('drives the daily phrase cue from measured home viewport visibility', () => {
  expect(home).toContain('isDailyPhraseCardHalfVisible');
  expect(home).toContain('dailyPhraseLayoutRef');
  expect(home).toContain('homeViewportHeightRef');
  expect(home).toContain('homeScrollYRef');
  expect(home).toContain('setDailyPhraseCardVisible');
  expect(home).toContain('homeCardVisible={dailyPhraseCardVisible}');
});
```

- [ ] **Step 2: Run the home contract and verify RED**

Run: `npx jest tests/home_reference_cards_contract.test.ts --runInBand`

Expected: FAIL because the viewport wiring is absent.

- [ ] **Step 3: Add ref-based measurement without scroll-driven rerenders**

Import `LayoutChangeEvent`, `NativeScrollEvent`, `NativeSyntheticEvent`, and `isDailyPhraseCardHalfVisible`. Add refs for `{ top, height }`, viewport height, and current scroll Y plus one boolean state for the current threshold result.

```ts
const dailyPhraseLayoutRef = useRef({ top: 0, height: 0 });
const homeViewportHeightRef = useRef(0);
const homeScrollYRef = useRef(0);
const [dailyPhraseCardVisible, setDailyPhraseCardVisible] = useState(false);

const refreshDailyPhraseVisibility = useCallback(() => {
  const next = isDailyPhraseCardHalfVisible({
    cardTop: dailyPhraseLayoutRef.current.top,
    cardHeight: dailyPhraseLayoutRef.current.height,
    scrollY: homeScrollYRef.current,
    viewportHeight: homeViewportHeightRef.current,
  });
  setDailyPhraseCardVisible((current) => current === next ? current : next);
}, []);
```

Compose the existing top-fade handler rather than replacing it:

```ts
const handleHomeScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
  topFadeScroll?.onScroll?.(event);
  homeScrollYRef.current = event.nativeEvent.contentOffset.y;
  refreshDailyPhraseVisibility();
}, [refreshDailyPhraseVisibility, topFadeScroll]);
```

Set the scroll viewport height from `BouncyScrollView.onLayout`, set the card's content coordinates from a wrapper `View.onLayout`, call `refreshDailyPhraseVisibility()` after each measurement, and render:

```tsx
<View onLayout={(event: LayoutChangeEvent) => {
  dailyPhraseLayoutRef.current = {
    top: event.nativeEvent.layout.y,
    height: event.nativeEvent.layout.height,
  };
  refreshDailyPhraseVisibility();
}}>
  <DailyPhraseCard variant="homeAdditional" homeCardVisible={dailyPhraseCardVisible} />
</View>
```

- [ ] **Step 4: Run focused Daily Phrase and home contracts**

Run: `npx jest tests/daily_phrase_pulse.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/home_reference_cards_contract.test.ts tests/daily_phrase_locale.test.ts tests/gustav_french_daily_phrase_target_gate.test.ts tests/gustav_french_daily_tasks_target_filter.test.ts tests/achievements.test.ts --runInBand`

Expected: PASS for all selected suites.

- [ ] **Step 5: Run static verification**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors introduced by the feature.

Run: `npx eslint app/daily_phrase_pulse.ts 'app/(tabs)/home.tsx' components/DailyPhraseCard.tsx tests/daily_phrase_pulse.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/home_reference_cards_contract.test.ts`

Expected: exit code 0 or only explicitly documented pre-existing warnings outside changed lines.

- [ ] **Step 6: Inspect the final scoped diff**

Run: `git diff -- app/daily_phrase_pulse.ts 'app/(tabs)/home.tsx' components/DailyPhraseCard.tsx tests/daily_phrase_pulse.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/home_reference_cards_contract.test.ts`

Expected: no unrelated edits, no infinite animation, no interval, and no change to quiz/reward/business logic. Preserve all unrelated user changes already present in the dirty worktree.

