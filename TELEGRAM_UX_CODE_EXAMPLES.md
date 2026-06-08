# Telegram UX - Готовые Примеры Кода

## Введение

Этот документ содержит готовые к использованию примеры кода для интеграции Telegram-подобного UX в Phraseman.

---

## 1. ANIMATION UTILITIES

### 1.1 Animation Constants

**File: `constants/animations.ts`**

```typescript
import { Easing } from 'react-native';

// Duration constants (milliseconds)
export const ANIMATION_DURATIONS = {
  // Immediate feedback
  INSTANT: 0,
  MICRO: 50,
  QUICK: 100,
  
  // Standard interactions
  FAST: 150,
  NORMAL: 250,
  STANDARD: 300,
  
  // Slower animations
  SLOW: 400,
  SLOWER: 600,
  VERY_SLOW: 800,
  
  // Special
  SPRING: 400,
  TYPING: 1000,
  BOUNCE: 500,
  GENTLE_SCROLL: 400,
} as const;

// Easing functions (cubic bezier presets)
export const EASING = {
  // For opening/entering animations (starts slow, ends fast)
  easeOut: Easing.out(Easing.cubic),
  easeOutQuad: Easing.out(Easing.quad),
  easeOutQuart: Easing.out(Easing.quart),
  
  // For closing/exiting animations (starts fast, ends slow)
  easeIn: Easing.in(Easing.cubic),
  easeInQuad: Easing.in(Easing.quad),
  easeInQuart: Easing.in(Easing.quart),
  
  // For smooth continuous animations
  easeInOut: Easing.inOut(Easing.cubic),
  easeInOutQuad: Easing.inOut(Easing.quad),
  easeInOutQuart: Easing.inOut(Easing.quart),
  
  // Linear (for non-spatial transforms like rotation)
  linear: Easing.linear,
  
  // Spring-like effect (bouncy)
  spring: Easing.bezier(0.12, 0.73, 0.58, 1),
  springOut: Easing.bezier(0.17, 0.67, 0.83, 0.67),
  
  // Elastic (more bouncy)
  elastic: Easing.elastic(1),
  
  // Back (anticipation effect)
  back: Easing.back(1),
} as const;

// Common animation configs
export const ANIMATION_CONFIGS = {
  // Modal entrance
  modalIn: {
    duration: ANIMATION_DURATIONS.STANDARD,
    easing: EASING.easeOut,
    useNativeDriver: true,
  },
  
  // Modal exit
  modalOut: {
    duration: ANIMATION_DURATIONS.NORMAL,
    easing: EASING.easeIn,
    useNativeDriver: true,
  },
  
  // Smooth scroll to position
  smoothScroll: {
    duration: ANIMATION_DURATIONS.GENTLE_SCROLL,
    easing: EASING.easeInOut,
  },
  
  // Quick tap feedback
  tapFeedback: {
    duration: ANIMATION_DURATIONS.QUICK,
    easing: EASING.easeOut,
    useNativeDriver: true,
  },
  
  // List item selection
  itemSelect: {
    duration: ANIMATION_DURATIONS.FAST,
    easing: EASING.easeOut,
    useNativeDriver: true,
  },
  
  // Smooth transition
  transition: {
    duration: ANIMATION_DURATIONS.NORMAL,
    easing: EASING.easeInOut,
    useNativeDriver: true,
  },
} as const;

// Spring animation configs
export const SPRING_CONFIGS = {
  // Bouncy spring
  default: {
    damping: 10,
    mass: 1,
    stiffness: 100,
    overshootClamping: false,
    restSpeedThreshold: 2,
    restDisplacementThreshold: 2,
  },
  
  // Stiff spring (less bounce)
  stiff: {
    damping: 15,
    mass: 1,
    stiffness: 150,
    overshootClamping: true,
  },
  
  // Bouncy spring (more bounce)
  bouncy: {
    damping: 8,
    mass: 1,
    stiffness: 120,
    overshootClamping: false,
  },
  
  // Gentle spring
  gentle: {
    damping: 12,
    mass: 1,
    stiffness: 80,
    overshootClamping: false,
  },
} as const;
```

---

### 1.2 Animation Hooks

**File: `hooks/use-animation.ts`**

```typescript
import { useRef } from 'react';
import { Animated } from 'react-native';
import { ANIMATION_CONFIGS, ANIMATION_DURATIONS, EASING } from '../constants/animations';

// Hook for fade animation
export function useFadeAnimation(initialValue: number = 0) {
  const opacity = useRef(new Animated.Value(initialValue)).current;
  
  const fadeIn = (duration = ANIMATION_DURATIONS.NORMAL) => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }).start();
  };
  
  const fadeOut = (duration = ANIMATION_DURATIONS.NORMAL) => {
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      easing: EASING.easeIn,
      useNativeDriver: true,
    }).start();
  };
  
  const toggleFade = () => {
    const toValue = opacity._value > 0.5 ? 0 : 1;
    Animated.timing(opacity, {
      toValue,
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: EASING.easeInOut,
      useNativeDriver: true,
    }).start();
  };
  
  return { opacity, fadeIn, fadeOut, toggleFade };
}

// Hook for scale animation
export function useScaleAnimation(initialValue: number = 1) {
  const scale = useRef(new Animated.Value(initialValue)).current;
  
  const scaleTo = (
    toValue: number,
    duration = ANIMATION_DURATIONS.QUICK,
    easing = EASING.easeOut
  ) => {
    Animated.timing(scale, {
      toValue,
      duration,
      easing,
      useNativeDriver: true,
    }).start();
  };
  
  const bounce = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: ANIMATION_DURATIONS.QUICK,
        easing: EASING.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.QUICK,
        easing: EASING.easeIn,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  return { scale, scaleTo, bounce };
}

// Hook for slide animation
export function useSlideAnimation(initialValue: number = 0) {
  const translateX = useRef(new Animated.Value(initialValue)).current;
  const translateY = useRef(new Animated.Value(initialValue)).current;
  
  const slideX = (
    toValue: number,
    duration = ANIMATION_DURATIONS.NORMAL,
    easing = EASING.easeOut
  ) => {
    Animated.timing(translateX, {
      toValue,
      duration,
      easing,
      useNativeDriver: true,
    }).start();
  };
  
  const slideY = (
    toValue: number,
    duration = ANIMATION_DURATIONS.NORMAL,
    easing = EASING.easeOut
  ) => {
    Animated.timing(translateY, {
      toValue,
      duration,
      easing,
      useNativeDriver: true,
    }).start();
  };
  
  return { translateX, translateY, slideX, slideY };
}

// Hook for combined animations
export function useAnimationCombo() {
  const animations = {
    opacity: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0.8)).current,
    translateY: useRef(new Animated.Value(20)).current,
  };
  
  const animateIn = (duration = ANIMATION_DURATIONS.NORMAL) => {
    Animated.parallel([
      Animated.timing(animations.opacity, {
        toValue: 1,
        duration,
        easing: EASING.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(animations.scale, {
        toValue: 1,
        duration,
        easing: EASING.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(animations.translateY, {
        toValue: 0,
        duration,
        easing: EASING.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const animateOut = (duration = ANIMATION_DURATIONS.NORMAL) => {
    Animated.parallel([
      Animated.timing(animations.opacity, {
        toValue: 0,
        duration,
        easing: EASING.easeIn,
        useNativeDriver: true,
      }),
      Animated.timing(animations.scale, {
        toValue: 0.8,
        duration,
        easing: EASING.easeIn,
        useNativeDriver: true,
      }),
      Animated.timing(animations.translateY, {
        toValue: -20,
        duration,
        easing: EASING.easeIn,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const reset = () => {
    animations.opacity.setValue(0);
    animations.scale.setValue(0.8);
    animations.translateY.setValue(20);
  };
  
  return { ...animations, animateIn, animateOut, reset };
}
```

---

## 2. BLUR COMPONENTS

### 2.1 Adaptive Header Blur

**File: `components/AdaptiveBlurHeader.tsx`**

```typescript
import React, { useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from './ThemeContext';

interface AdaptiveBlurHeaderProps {
  title: string;
  scrollOffset: Animated.Value;
  style?: ViewStyle;
  blurThreshold?: number;
  maxBlur?: number;
}

export function AdaptiveBlurHeader({
  title,
  scrollOffset,
  style,
  blurThreshold = 100,
  maxBlur = 10,
}: AdaptiveBlurHeaderProps) {
  const { theme: t, f } = useTheme();
  
  // Interpolate blur intensity based on scroll offset
  const blurIntensity = scrollOffset.interpolate({
    inputRange: [0, blurThreshold],
    outputRange: [0, maxBlur],
    extrapolate: 'clamp',
  });
  
  // Header background opacity
  const headerOpacity = scrollOffset.interpolate({
    inputRange: [0, blurThreshold / 2],
    outputRange: [0, 0.8],
    extrapolate: 'clamp',
  });
  
  return (
    <View style={[styles.container, style]}>
      {/* Blur effect */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: headerOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      
      {/* Content */}
      <View style={[styles.content, { paddingVertical: 16 }]}>
        <Animated.Text
          style={[
            styles.title,
            {
              color: t.textPrimary,
              fontSize: f.title3,
              fontWeight: '600',
            },
          ]}
        >
          {title}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
});
```

---

### 2.2 Safe Area Blur Modal Wrapper

**File: `components/SafeAreaBlurModal.tsx`**

```typescript
import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Modal as RNModal,
  ModalProps as RNModalProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

interface SafeAreaBlurModalProps extends RNModalProps {
  children: ReactNode;
  blurIntensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export function SafeAreaBlurModal({
  children,
  blurIntensity = 6,
  tint = 'dark',
  ...props
}: SafeAreaBlurModalProps) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  
  return (
    <RNModal {...props} transparent statusBarTranslucent>
      {/* Blur background */}
      <BlurView
        intensity={blurIntensity}
        tint={tint}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Scrim overlay */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(0,0,0,0.2)',
            },
          ]}
        />
      </BlurView>
      
      {/* Safe area aware content */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {children}
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
```

---

## 3. HAPTIC FEEDBACK PATTERNS

### 3.1 Haptic Feedback Module

**File: `hooks/use-haptic-patterns.ts`**

```typescript
import { hapticTap, hapticSuccess, hapticWarning, hapticError } from './use-haptics';

// Standard patterns
export async function hapticSelect() {
  await hapticTap();
}

export async function hapticSuccess_Pattern() {
  // Three pulses: quick + slow + quick
  await hapticTap();
  await new Promise(resolve => setTimeout(resolve, 100));
  await hapticSuccess();
}

export async function hapticError_Pattern() {
  // Single strong impact
  await hapticError();
}

export async function hapticWarning_Pattern() {
  // Two pulses
  await hapticWarning();
}

export async function hapticSwipeComplete() {
  // Swipe completed feedback
  await hapticTap();
  await new Promise(resolve => setTimeout(resolve, 80));
  await hapticTap();
}

export async function hapticExpand() {
  // Expand/open gesture
  await hapticTap();
  await new Promise(resolve => setTimeout(resolve, 60));
  await hapticTap();
}

export async function hapticCollapse() {
  // Collapse/close gesture
  await hapticTap();
}

export async function hapticAchievement() {
  // Achievement unlocked celebration
  await hapticTap();
  await new Promise(resolve => setTimeout(resolve, 120));
  await hapticSuccess();
  await new Promise(resolve => setTimeout(resolve, 100));
  await hapticSuccess();
}

export async function hapticLevelUp() {
  // Level up celebration
  for (let i = 0; i < 3; i++) {
    await hapticSuccess();
    if (i < 2) await new Promise(resolve => setTimeout(resolve, 150));
  }
}

export async function hapticStreak() {
  // Streak milestone
  await hapticTap();
  await new Promise(resolve => setTimeout(resolve, 80));
  await hapticTap();
  await new Promise(resolve => setTimeout(resolve, 80));
  await hapticSuccess();
}
```

---

## 4. ENHANCED INTERACTIVE COMPONENTS

### 4.1 Enhanced Pressable with Haptic & Scale

**File: `components/EnhancedPressable.tsx`**

```typescript
import React, { useRef } from 'react';
import {
  Pressable,
  PressableProps,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { ANIMATION_DURATIONS, EASING } from '../constants/animations';

interface EnhancedPressableProps extends PressableProps {
  children: React.ReactNode;
  scale?: number;
  haptic?: boolean;
  hapticFeedback?: () => Promise<void>;
  animationDuration?: number;
  style?: StyleProp<ViewStyle>;
}

export function EnhancedPressable({
  children,
  onPress,
  scale = 0.95,
  haptic = true,
  hapticFeedback,
  animationDuration = ANIMATION_DURATIONS.QUICK,
  style,
  ...props
}: EnhancedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    if (haptic) {
      hapticFeedback ? hapticFeedback() : hapticTap();
    }
    
    Animated.timing(scaleAnim, {
      toValue: scale,
      duration: animationDuration,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animationDuration,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        onPress?.(e);
      }}
      onPressIn={(e) => {
        handlePressIn();
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        handlePressOut();
        props.onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
```

---

## 5. EXAMPLE INTEGRATIONS

### 5.1 Home Screen with Scroll-based Blur Header

**File snippet for `app/(tabs)/home.tsx`**

```typescript
import { Animated, FlatList } from 'react-native';
import { AdaptiveBlurHeader } from '../../components/AdaptiveBlurHeader';
import { ANIMATION_DURATIONS } from '../../constants/animations';

export default function HomeScreen() {
  const scrollOffset = useRef(new Animated.Value(0)).current;
  
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollOffset } } }],
    { useNativeDriver: false }
  );
  
  return (
    <View style={{ flex: 1 }}>
      <AdaptiveBlurHeader
        title="Главная"
        scrollOffset={scrollOffset}
        blurThreshold={100}
        maxBlur={10}
      />
      
      <FlatList
        data={/* your data */}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate={Platform.OS === 'ios' ? 0.95 : 0.98}
        renderItem={({ item }) => (
          <EnhancedPressable
            onPress={() => handleItemPress(item)}
            haptic
          >
            {/* Item content */}
          </EnhancedPressable>
        )}
      />
    </View>
  );
}
```

---

### 5.2 Achievement Modal with Celebration Haptic

**File snippet**

```typescript
import { SafeAreaBlurModal } from '../../components/SafeAreaBlurModal';
import { hapticAchievement } from '../../hooks/use-haptic-patterns';

function AchievementModal({ visible, achievement }: Props) {
  const [showAchievement, setShowAchievement] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        setShowAchievement(true);
        hapticAchievement(); // Celebration pattern
      }, 200);
    }
  }, [visible]);
  
  return (
    <SafeAreaBlurModal
      visible={visible}
      onRequestClose={() => setShowAchievement(false)}
      blurIntensity={8}
      tint="dark"
    >
      {/* Achievement content */}
    </SafeAreaBlurModal>
  );
}
```

---

## 6. VERIFIED SPRING CONFIGS (Новое — из исследования)

### 6.0 Верифицированные настройки Spring для React Native Reanimated

```typescript
import { withSpring } from 'react-native-reanimated';

// ФИЗИКА: damped harmonic motion ks(t) + cs'(t) + ms''(t) = 0
// k = stiffness, c = damping, m = mass

// Telegram-like button press (упругий, быстрый)
const SPRING_BUTTON = { damping: 10, stiffness: 120, mass: 1 };

// Modal appear (плавный, без bounce)
const SPRING_MODAL = { damping: 20, stiffness: 200, mass: 1, overshootClamping: true };

// Tab switch (средний, небольшой отскок)
const SPRING_TAB = { damping: 15, stiffness: 150, mass: 1 };

// Swipe gesture follow-through (лёгкий, живой)
const SPRING_SWIPE = { damping: 8, stiffness: 100, mass: 1 };

// Пример использования с жестом (velocity из gesture → spring):
// v_relative = v_absolute / (targetValue - currentValue)
const handleSwipeEnd = (gestureVelocity: number, targetValue: number, currentValue: number) => {
  const normalizedVelocity = gestureVelocity / (targetValue - currentValue);
  translateX.value = withSpring(targetValue, {
    ...SPRING_SWIPE,
    velocity: normalizedVelocity, // передаём нормализованную скорость
  });
};

// Для iOS Animated API (не Reanimated):
Animated.spring(value, {
  toValue: 1,
  damping: 15,
  stiffness: 150,
  useNativeDriver: true,
}).start();
```

---

## 7. OPTIMIZATION TIPS

### 7.1 FlatList Optimization Configuration

```typescript
<FlatList
  // Rendering optimization
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={15}
  removeClippedSubviews={true}
  
  // Scroll physics
  decelerationRate={Platform.OS === 'ios' ? 0.95 : 0.98}
  scrollEventThrottle={16}
  bounces={true}
  
  // Memory optimization
  keyExtractor={(item, idx) => item.id ?? idx.toString()}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### 7.2 Animation Performance

```typescript
// Always use useNativeDriver when possible
Animated.timing(value, {
  toValue: targetValue,
  duration: 300,
  useNativeDriver: true,  // ← Important!
}).start();

// Avoid animating non-native properties if possible
// Native properties: transform, opacity  ← useNativeDriver: true
// Non-native: backgroundColor, height, width (can jank) ← useNativeDriver: false

// Для backgroundColor используйте Reanimated:
import Animated, { useAnimatedStyle, interpolateColor } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    progress.value,
    [0, 1],
    ['#ffffff', '#000000']
  ),
}));
// Это будет работать на UI thread без JS jank
```

---

## SUMMARY

These code examples provide:
- ✓ Ready-to-use animation utilities
- ✓ Blur effect components
- ✓ Haptic feedback patterns
- ✓ Enhanced interactive elements
- ✓ Performance optimizations

**Next Steps:**
1. Copy `constants/animations.ts` to your project
2. Copy `hooks/use-animation.ts` to your hooks folder
3. Copy `components/AdaptiveBlurHeader.tsx` to components
4. Copy `components/SafeAreaBlurModal.tsx` to components
5. Update `use-haptics.ts` with patterns from `hooks/use-haptic-patterns.ts`
6. Replace `Pressable` with `EnhancedPressable` in components
7. Test on iOS and Android devices

---

**Document Version**: 1.0
**Created**: 2026-06-07

