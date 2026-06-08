# Telegram UX Implementation Guide для Phraseman

## Полный Чеклист Фишек с Местами Внедрения

---

## 1. BLUR EFFECTS IMPLEMENTATION

### 1.1 Header Blur при Scrolling

**Где применить в Phraseman:**
- `app/(tabs)/home.tsx` - Главный экран (blur на "Главная" текст)
- `app/(tabs)/lessons.tsx` - Список уроков (blur на "Уроки" заголовок)
- `app/(tabs)/arena.tsx` - Arena экран
- `app/(tabs)/friends.tsx` - Friends список (blur на header)
- `app/(tabs)/settings.tsx` - Settings экран (ужу есть, можно улучшить)

**Как работает (верифицировано ✓):**
```
ПРАВИЛЬНО (precomputed blur pattern):
При scrollY = 0    → BlurView opacity = 0.0  (прозрачный)
При scrollY = 100  → BlurView opacity = 0.5  (полупрозрачный)
При scrollY = 200+ → BlurView opacity = 1.0  (полный)

BlurView создан ОДИН РАЗ с фиксированным intensity={8}
Меняется ТОЛЬКО opacity обёртки — это дёшево!

НЕПРАВИЛЬНО (не делать):
<BlurView intensity={dynamicValue} /> ← меняем intensity каждый кадр — ЛАГАЕТ
```

**Интеграция (используйте AdaptiveBlurHeader из CODE_EXAMPLES):**
```typescript
import { AdaptiveBlurHeader } from '../../components/AdaptiveBlurHeader';

// В компоненте экрана:
const scrollOffset = useRef(new Animated.Value(0)).current;

<AdaptiveBlurHeader title="Главная" scrollOffset={scrollOffset} />

<Animated.FlatList
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollOffset } } }],
    { useNativeDriver: false }  // false — т.к. opacity не поддерживает native driver
  )}
  scrollEventThrottle={16}
/>
```

**Priority**: HIGH - Affects UX on 5 main screens

---

### 1.2 Safe Area Blur Backgrounds

**Где применить:**
- `components/ThemedChoiceModal.tsx` - Modal backgrounds
- `components/ThemedConfirmModal.tsx` - Confirm dialog
- `components/PremiumCard.tsx` - Premium modals
- `components/StatsPremiumBlur.tsx` - Already done, enhance it
- All overlay modals - Add blur background behind

**Implementation Pattern:**
```typescript
<BlurView intensity={6} tint="dark" style={StyleSheet.absoluteFill}>
  <View style={{
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    flex: 1
  }}>
    {/* Modal Content */}
  </View>
</BlurView>
```

**Priority**: HIGH - Affects all modals (5+ modals)

---

### 1.3 Avatar Blur Backgrounds

**Где применить:**
- `components/AvatarView.tsx` - User avatars
- `components/PlayerProfileModal.tsx` - Profile view
- `components/PremiumAvatarHalo.tsx` - Premium avatar effect
- Arena match screens - Opponent avatars

**Implementation:**
```typescript
// Static blur (no animation needed)
<BlurView intensity={3} style={{borderRadius: 50}}>
  <Image source={avatarUri} />
</BlurView>
```

**Priority**: MEDIUM - Cosmetic enhancement

---

### 1.4 Progress/Loading Blur

**Где применить:**
- Loading screens
- Saving progress
- Network request overlays
- `components/SaveProgressBanner.tsx` - Enhance existing

**Implementation:**
```typescript
{isLoading && (
  <BlurView intensity={4} style={{position: 'absolute'}}>
    <ActivityIndicator />
  </BlurView>
)}
```

**Priority**: MEDIUM - Better loading UX

---

## 2. HAPTIC FEEDBACK SYSTEM

### 2.1 Tap Feedback on All Interactive Elements

**Текущий статус в Phraseman:**
- ✓ Hook `useHaptics()` существует
- ✓ `hapticTap()` реализован
- ✗ Не везде используется
- ✗ Нет комбинированных паттернов

**Где добавить haptic tap:**

| Component | Current | Action | Priority |
|-----------|---------|--------|----------|
| Buttons | None/Partial | All buttons | HIGH |
| TabBar | ✓ | Keep | Done |
| ListItems | Partial | Tap on items | HIGH |
| Card Interactions | None | Tap/Swipe | HIGH |
| Menu Items | Partial | Selection | MEDIUM |
| Input Fields | None | Focus | MEDIUM |
| Expandable Sections | None | Expand/Collapse | MEDIUM |

**Implementation Pattern (верифицировано ✓ — onPressIn, не onPress):**
```typescript
import { hapticTap } from '../hooks/use-haptics';

// ПРАВИЛЬНО — haptic в onPressIn даёт Taptic Engine ~50ms форы
// Это соответствует тому, как работает iOS UIFeedbackGenerator prepare()
<TouchableOpacity 
  onPressIn={() => hapticTap()}  // ← сюда, не в onPress
  onPress={() => onPress?.()}
>
  {children}
</TouchableOpacity>

// НЕПРАВИЛЬНО (текущий паттерн в большинстве мест Phraseman):
<TouchableOpacity 
  onPress={() => {
    hapticTap();  // ← haptic и action одновременно = нет форы
    onPress?.();
  }}
>
```

**Priority**: CRITICAL - Affects every interaction

---

### 2.2 Success/Warning/Error Haptic Patterns

**Где применить:**

| Сценарий | Haptic Pattern | Где в Phraseman |
|----------|----------------|-----------------|
| Quiz Complete | Success (3x pulse) | `quizzes.tsx` |
| Lesson Complete | Success (3x pulse) | `lessons.tsx` |
| Achievement | Success + Heavy | Achievement modal |
| Incorrect Answer | Warning (2x pulse) | Quiz screen |
| Lose Streak | Error (heavy) | Home screen |
| Network Error | Error (heavy) | Network errors |
| Low Energy | Warning (2x) | Energy bar |
| Premium Unlock | Success (3x) | Premium purchase |

**Implementation:**
```typescript
// Success pattern
await hapticTap();
setTimeout(() => hapticSuccess(), 150);

// Error pattern
await hapticError();

// Warning pattern  
await hapticWarning();
```

**Priority**: HIGH - Significantly improves feedback feel

---

### 2.3 Continuous Interaction Haptics

**Где применить:**
- Slider dragging (light haptic on tick marks)
- Swipe gestures (haptic at threshold)
- Long press (haptic at activation)
- Scroll momentum (optional subtle haptic at edges)

**Implementation:**
```typescript
// Slider with haptic
const handleSliderChange = (value: number) => {
  const tick = Math.round(value);
  if (tick !== lastTick.current) {
    hapticTap();
    lastTick.current = tick;
  }
  setValue(value);
};
```

**Priority**: MEDIUM - Polish feature

---

## 3. ANIMATION TIMING & EASING

### 3.1 Standardized Animation Durations

**Define constants in `constants/animations.ts`:**

```typescript
export const ANIMATION_DURATIONS = {
  // Micro interactions
  MICRO: 100,      // Button press, quick feedback
  QUICK: 150,      // Menu open, simple transition
  
  // Standard transitions
  STANDARD: 250,   // Tab switch, modal slide
  NORMAL: 300,     // Screen transition
  
  // Longer animations
  SLOW: 400,       // Complex transition
  VERY_SLOW: 600,  // Special effects
  
  // Special
  SPRING_DURATION: 400,
  TYPING_DURATION: 1000,
  BOUNCE_DURATION: 500,
} as const;

export const EASING = {
  // For entering/opening
  easeOut: Easing.out(Easing.cubic),
  
  // For exiting/closing
  easeIn: Easing.in(Easing.cubic),
  
  // For continuous/looping
  easeInOut: Easing.inOut(Easing.cubic),
  
  // Linear (rarely used)
  linear: Easing.linear,
  
  // Spring-like
  spring: Easing.bezier(0.12, 0.73, 0.58, 1),
} as const;
```

**Priority**: HIGH - Foundation for all animations

---

### 3.2 Tab Switch Animation

**Current state**: Uses simple opacity

**Improvement needed:**
```typescript
// Animated slide + fade combination
Animated.parallel([
  Animated.timing(translateX, {
    toValue: direction === 'left' ? -width : width,
    duration: ANIMATION_DURATIONS.STANDARD,
    easing: EASING.easeOut,
    useNativeDriver: true,
  }),
  Animated.timing(opacity, {
    toValue: 0,
    duration: ANIMATION_DURATIONS.STANDARD,
    easing: EASING.easeOut,
    useNativeDriver: true,
  }),
]).start();
```

**Priority**: HIGH - Main navigation feel

---

### 3.3 Modal Open/Close Animation

**Current**: Slide from bottom

**Enhancement - Add scale + fade:**
```typescript
const openModal = () => {
  Animated.parallel([
    Animated.timing(translateY, {
      toValue: 0,
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 1,
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }),
  ]).start();
};
```

**Apply to:**
- `ThemedChoiceModal`
- `ThemedConfirmModal`
- `PremiumCard`
- `AchievementToast`
- All modals/toasts

**Priority**: HIGH - Affects 10+ modals

---

### 3.4 List Item Highlight Animation

**Current**: Simple color change

**Enhancement:**
```typescript
const handleItemPress = () => {
  Animated.sequence([
    Animated.timing(highlight, {
      toValue: 1,
      duration: 100,
      easing: EASING.easeOut,
      useNativeDriver: false,
    }),
    Animated.timing(highlight, {
      toValue: 0,
      duration: 200,
      easing: EASING.easeInOut,
      useNativeDriver: false,
    }),
  ]).start();
};
```

**Apply to:**
- Lesson list items
- Friend list items
- Arena players
- Message list items

**Priority**: MEDIUM - Improves list feel

---

### 3.5 Pull to Refresh Animation

**Current**: Simple spinner

**Enhancement - Add scale effect:**
```typescript
const refreshScale = scrollOffset.interpolate({
  inputRange: [0, 100],
  outputRange: [1, 1.5],
  extrapolate: 'clamp',
});

<Animated.View style={{transform: [{scale: refreshScale}]}}>
  <RefreshControl />
</Animated.View>
```

**Priority**: MEDIUM - Better pull feedback

---

## 4. SCROLL BEHAVIOR OPTIMIZATION

### 4.1 ScrollView Configuration

**Current Phraseman settings**: Default

**Recommended optimization:**
```typescript
<FlatList
  // Performance
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  
  // Scroll physics
  decelerationRate={Platform.OS === 'ios' ? 0.95 : 0.98}
  scrollEventThrottle={16}
  showsVerticalScrollIndicator={false}
  bounces={true}
  bouncesZoom={true}
  
  // Android specifics
  overScrollMode="always"
  
  // Content
  keyExtractor={(item, idx) => idx.toString()}
/>
```

**Apply to:**
- Lessons list
- Friends list
- Quiz history
- Messages
- All FlatLists/SectionLists

**Priority**: HIGH - Major performance impact

---

### 4.2 Momentum Scrolling Configuration

**iOS specific:**
```typescript
// Heavier scroll feel (like Telegram)
decelerationRate: 0.95  // Default 0.998, slower = heavier
```

**Android specific:**
```typescript
// Android momentum physics
overScrollMode="always"
scrollEventThrottle={16}
```

**Priority**: MEDIUM - Feel improvement

---

### 4.3 Scroll-to-Top Animation

**Current**: Jumps to top

**Enhancement:**
```typescript
const scrollToTop = () => {
  flatListRef.current?.scrollToOffset({
    offset: 0,
    animated: true,
  });
};
```

**Apply to:**
- Home screen
- Lessons screen
- All scrollable screens

**Priority**: MEDIUM - Quality of life

---

## 5. SAFE AREA ADAPTATIONS

### 5.1 Consistent Padding

**Current implementation**: Used in `_layout.tsx`

**Needed improvements:**
- [ ] Every screen uses `useSafeAreaInsets()`
- [ ] Content respects safe area
- [ ] Headers account for status bar
- [ ] Modals account for home indicator

**Checklist for each screen:**
```typescript
const insets = useSafeAreaInsets();

<View style={{
  flex: 1,
  paddingTop: insets.top,
  paddingBottom: insets.bottom,
  paddingLeft: insets.left,
  paddingRight: insets.right,
}}>
  {/* Content */}
</View>
```

**Apply to:**
- All tab screens
- All modal screens
- All overlay screens
- All full-screen components

**Priority**: HIGH - Critical for proper display

---

### 5.2 Status Bar Awareness

**Current**: Default status bar

**Improvement:**
```typescript
// Make status bar transparent on each screen
<StatusBar 
  barStyle={statusBarLight ? 'light-content' : 'dark-content'}
  backgroundColor="transparent"
  translucent={true}
/>
```

**Apply to:**
- Home (gradient background)
- Settings (dark background)
- All screens with custom backgrounds

**Priority**: MEDIUM - Modern look

---

### 5.3 Dynamic Inset Updates

**For rotatable devices:**
```typescript
useEffect(() => {
  const subscription = useWindowDimensions().addEventListener?.('change', updateInsets);
  return () => subscription?.remove();
}, []);
```

**Priority**: LOW - Most phones are portrait-only

---

## 6. GESTURE & TOUCH IMPROVEMENTS

### 6.1 Swipe Gestures

**Add to navigable screens:**

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const swipeBack = Gesture.Fling()
  .direction(Gesture.Directions.RIGHT)
  .onEnd(() => {
    hapticTap();
    router.back();
  });

<GestureDetector gesture={swipeBack}>
  {/* Screen Content */}
</GestureDetector>
```

**Apply to:**
- Lesson detail screens
- Player profile modal
- Achievement detail
- Any detail screen

**Priority**: MEDIUM - Power user feature

---

### 6.2 Long Press Actions

**Add context menus:**
```typescript
import { LongPressGestureHandler } from 'react-native-gesture-handler';

<LongPressGestureHandler 
  onActivated={() => {
    hapticMediumImpact();
    showContextMenu();
  }}
>
  {/* Item */}
</LongPressGestureHandler>
```

**Apply to:**
- Messages/chat items
- Friend items
- Profile items

**Priority**: LOW - Advanced feature

---

### 6.3 Press Response Scaling

**All pressable items:**
```typescript
<PressableScale scale={0.95} onPress={onPress}>
  {children}
</PressableScale>
```

**Where is `PressableScale`?**
- Already exists in components!
- Use it everywhere instead of `Pressable`

**Check and improve:**
- All buttons
- All list items
- All cards
- All interactive elements

**Priority**: HIGH - Affects all interactions

---

## 7. SPECIFIC SCREEN IMPROVEMENTS

### 7.1 Home Screen (`home.tsx`)

**Current issues:**
- No blur on header
- Basic animations
- Limited haptic feedback

**Improvements needed:**
- [ ] Add header blur on scroll
- [ ] Enhance animations for cards
- [ ] Add haptic feedback to buttons
- [ ] Improve momentum scrolling
- [ ] Better toast/notification animations

**Estimated effort**: 4-6 hours

---

### 7.2 Lessons Screen (`lessons.tsx`)

**Current issues:**
- Static list
- No progress animations
- Limited feedback

**Improvements needed:**
- [ ] Header blur on scroll
- [ ] Lesson card expand animation
- [ ] Progress bar animation
- [ ] Haptic on selection
- [ ] Better scroll physics

**Estimated effort**: 5-7 hours

---

### 7.3 Settings Screen (`settings.tsx`)

**Current state**: Already has some blur

**Further improvements:**
- [ ] Enhance blur intensity
- [ ] Smooth toggle animations
- [ ] Better section transitions
- [ ] Haptic feedback on toggles
- [ ] Smooth save animations

**Estimated effort**: 2-3 hours

---

### 7.4 Friends Screen (`friends.tsx`)

**Current issues:**
- Basic list
- No interactions animations
- Limited feedback

**Improvements needed:**
- [ ] Header blur
- [ ] Swipe actions with haptic
- [ ] Friend card hover effect
- [ ] Smooth list operations
- [ ] Better loading states

**Estimated effort**: 4-6 hours

---

### 7.5 Arena Screen

**Current issues:**
- Limited animations
- Basic match display

**Improvements needed:**
- [ ] Match entrance animation
- [ ] Player card animations
- [ ] Result celebration effect
- [ ] Haptic combo on win
- [ ] Better loading feedback

**Estimated effort**: 5-7 hours

---

### 7.6 Modals & Overlays

**Audit all modals:**
- [ ] `ThemedChoiceModal` - Add blur background
- [ ] `ThemedConfirmModal` - Enhance animation
- [ ] `PremiumCard` - Better entrance
- [ ] `AchievementToast` - Celebration haptic
- [ ] `InGameToast` - Smooth animations
- [ ] 10+ more modals - Consistent feel

**Estimated effort**: 6-8 hours total

---

## 8. PRIORITY MATRIX

### CRITICAL (Do First)
1. ✓ Header blur on main screens (HIGH IMPACT)
2. ✓ Haptic feedback on all interactions (AFFECTS EVERYTHING)
3. ✓ Animation timing constants (FOUNDATION)
4. ✓ Safe area consistency (FUNCTIONAL)

### HIGH (Do Next)
1. Modal blur backgrounds
2. Enhanced modal animations
3. ScrollView optimization
4. Toast/notification polish

### MEDIUM (Do After)
1. Gesture support
2. Advanced animations
3. Loading state improvements
4. List item enhancements

### LOW (Polish)
1. Long press menus
2. Special effect animations
3. Micro-interactions
4. Edge cases

---

## 9. EFFORT ESTIMATION

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| Animation constants | 2h | Foundation | CRITICAL |
| Header blur (5 screens) | 8h | HIGH | CRITICAL |
| Haptic everywhere | 6h | HIGH | CRITICAL |
| Modal blur | 4h | HIGH | HIGH |
| Scroll optimization | 4h | MEDIUM | HIGH |
| Enhanced animations | 10h | HIGH | HIGH |
| Safe area polish | 3h | MEDIUM | HIGH |
| Gesture support | 4h | MEDIUM | MEDIUM |
| Testing & tuning | 8h | HIGH | CRITICAL |

**Total Estimate**: 50-60 hours
**Sprint Duration**: 2-3 weeks (30-40 hrs/week)

---

## 10. TESTING CHECKLIST

- [ ] All animations smooth at 60fps (no jank)
- [ ] All haptic feedback responsive
- [ ] Blur effects don't cause performance drop
- [ ] Safe area respected on all screens
- [ ] Scroll physics feel natural
- [ ] No memory leaks from animations
- [ ] Works on iOS and Android
- [ ] Works on different screen sizes
- [ ] User testing confirms improved feel

---

## 11. RESOURCES NEEDED

### Libraries Already Available
- ✓ `react-native-reanimated` (v4.1.1)
- ✓ `expo-blur` (v15.0.8)
- ✓ `expo-haptics` (v15.0.8)
- ✓ `react-native-gesture-handler` (v2.28.0)
- ✓ `react-native-safe-area-context` (v5.6.0)

### To Install (if needed)
- None! All libraries present

### Documentation Links
- Reanimated: https://docs.swmansion.com/react-native-reanimated/
- Expo Blur: https://docs.expo.dev/versions/latest/sdk/blur-view/
- Expo Haptics: https://docs.expo.dev/versions/latest/sdk/haptics/
- Gesture Handler: https://docs.swmansion.com/react-native-gesture-handler/

---

**Document Version**: 1.0
**Created**: 2026-06-07
**Status**: Ready for Implementation

