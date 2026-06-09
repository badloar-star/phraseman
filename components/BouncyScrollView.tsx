import React, { forwardRef, useRef, useCallback } from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * Кросс-платформенная overscroll-резинка — ТОЛЬКО у верхнего края.
 *
 * Поведение: когда список доскроллен до самого верха (scrollY <= 0) и палец
 * тянет ВНИЗ — контент отъезжает вниз с затухающим сопротивлением и пружинит
 * назад. В любом другом положении (середина, низ) — обычный скролл, резинки нет.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * АРХИТЕКТУРА v4 (стабильная, без вылетов):
 *
 * 1. Pan-жест скомпонован с нативным скроллом через `Gesture.Simultaneous`
 *    и вешается на САМ ScrollView. Так Pan видит касания, но НЕ перехватывает
 *    управление у скролла → нет «скролл через раз» (баг v1: Pan-обёртка снаружи
 *    создавала race condition).
 *
 * 2. `useAnimatedStyle` НЕ вызывается внутри useBouncy. Его дергает компонент
 *    через `useBouncyStyle(stretch)`. Иначе на Fabric при Fast Refresh / двойном
 *    монтировании viewTag инвалидируется и Reanimated кидает
 *    "set key `current` on frozen object" (баг v2/v3 — вылеты на всех экранах).
 *
 * 3. Pan активен только при scrollY≈0 и тяге вниз — иначе stretch=0 и скролл
 *    работает как обычно.
 *
 * Drop-in замена ScrollView. Для Animated.event-экранов — хук useBouncy +
 * useBouncyStyle + onBouncyScroll + GestureWrap (см. примеры в проекте).
 */

const SPRING = { damping: 16, stiffness: 170, mass: 0.6 } as const;
const RESISTANCE_DIV = 2.2; // больше = «тяжелее» тянется

export interface BouncyScrollViewProps extends ScrollViewProps {
  maxStretch?: number;
}

export function useBouncy({ maxStretch = 110 }: { maxStretch?: number } = {}) {
  const stretch = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const ms = useSharedValue(maxStretch);
  ms.value = maxStretch;

  // Нативный жест ScrollView — Pan работает ОДНОВРЕМЕННО с ним.
  const native = useRef(Gesture.Native()).current;

  const pan = useRef(
    Gesture.Pan()
      .activeOffsetY(12)
      .failOffsetX([-20, 20])
      .onUpdate((e) => {
        'worklet';
        // Резинка ТОЛЬКО у верха (scrollY≈0) и ТОЛЬКО при тяге вниз.
        if (scrollY.value > 1 || e.translationY <= 0) {
          stretch.value = 0;
          return;
        }
        const limit = ms.value;
        stretch.value = limit * (1 - Math.exp(-e.translationY / (limit * RESISTANCE_DIV)));
      })
      .onEnd(() => {
        'worklet';
        stretch.value = withSpring(0, SPRING);
      })
      .onFinalize(() => {
        'worklet';
        if (stretch.value !== 0) stretch.value = withSpring(0, SPRING);
      }),
  ).current;

  // Композиция: оба жеста активны одновременно, вешается на ScrollView.
  const composed = useRef(Gesture.Simultaneous(native, pan)).current;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll(e) {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Для Animated.event-экранов: обновляет только scrollY (UI-thread читает его в Pan).
  const onBouncyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Обёртка для Animated.event-экранов: оборачивает ИХ Animated.ScrollView.
  const GestureWrap = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <GestureDetector gesture={composed}>{children as React.ReactElement}</GestureDetector>
    ),
    [composed],
  );

  return { stretch, scrollY, composed, scrollHandler, onBouncyScroll, GestureWrap };
}

/**
 * animatedStyle для контент-обёртки. ДОЛЖЕН вызываться в компоненте
 * (не внутри useBouncy) — иначе Fabric не привязывает viewTag корректно.
 */
export function useBouncyStyle(stretch: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: stretch.value }],
  }));
}

const BouncyScrollView = forwardRef<ScrollView, BouncyScrollViewProps>(function BouncyScrollView(
  { children, onScroll, maxStretch = 110, ...rest },
  ref,
) {
  const { stretch, composed, scrollHandler, onBouncyScroll } = useBouncy({ maxStretch });
  const animatedStyle = useBouncyStyle(stretch);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      (onScroll as ((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined)?.(e);
      onBouncyScroll(e);
    },
    [onScroll, onBouncyScroll],
  );

  return (
    <GestureDetector gesture={composed}>
      <Animated.ScrollView
        ref={ref as any}
        scrollEventThrottle={16}
        onScroll={onScroll ? handleScroll : scrollHandler}
        overScrollMode="never"
        {...rest}
      >
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </Animated.ScrollView>
    </GestureDetector>
  );
});

export default BouncyScrollView;
