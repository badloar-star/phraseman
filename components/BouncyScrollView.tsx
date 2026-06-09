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
 * 1. Pan-жест активен ТОЛЬКО когда atTop=true (scrollY≈0). Через
 *    `simultaneousWithExternalGesture(nativeGesture)` он НЕ блокирует нативный
 *    скролл → нет race condition «скролл через раз» (баг v1).
 *
 * 2. `useAnimatedStyle` НЕ вызывается внутри useBouncy. Его дергает компонент
 *    через `useBouncyStyle(stretch)`. Иначе на Fabric при Fast Refresh / двойном
 *    монтировании viewTag инвалидируется и Reanimated кидает
 *    "set key `current` on frozen object" (баг v2/v3 — вылеты на всех экранах).
 *
 * 3. `GestureWrap` — реальная обёртка GestureDetector (НЕ pass-through),
 *    объявлена ВНЕ useBouncy (стабильная ссылка). Экраны с Animated.event
 *    оборачивают свой Animated.ScrollView в <BouncyWrap>.
 *
 * Drop-in замена ScrollView. Для Animated.event-экранов — хук useBouncy +
 * useBouncyStyle + onBouncyScroll (см. примеры использования в проекте).
 */

const SPRING = { damping: 16, stiffness: 170, mass: 0.6 } as const;
const RESISTANCE_DIV = 2.2; // чем больше — тем «тяжелее» тянется

export interface BouncyScrollViewProps extends ScrollViewProps {
  maxStretch?: number;
}

interface BouncyCore {
  /** Текущее смещение резинки (px, >= 0 = контент вниз). */
  stretch: SharedValue<number>;
  /** scrollY в UI-thread — обновляется и scrollHandler, и onBouncyScroll. */
  scrollY: SharedValue<number>;
  /** Pan-жест для верхней резинки (нужен GestureWrap). */
  pan: ReturnType<typeof Gesture.Pan>;
  /** Animated scroll handler (UI-thread) — для BouncyScrollView. */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** JS-listener для Animated.event-экранов (обновляет только scrollY). */
  onBouncyScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Обёртка GestureDetector. */
  GestureWrap: (props: { children: React.ReactNode }) => React.ReactElement;
  maxStretch: number;
}

/**
 * Создаёт жест/handler/обёртку. Вызывать на верхнем уровне компонента.
 */
export function useBouncy({ maxStretch = 110 }: { maxStretch?: number } = {}): BouncyCore {
  const stretch = useSharedValue(0);
  const scrollY = useSharedValue(0);
  // Стартовое смещение резинки на момент начала жеста (для накопительного pull).
  const panStart = useSharedValue(0);

  const ms = useSharedValue(maxStretch);
  ms.value = maxStretch;

  // Нативный жест скролла — чтобы Pan работал ОДНОВРЕМЕННО с ним, не блокируя.
  const nativeGesture = useRef(Gesture.Native()).current;

  const pan = useRef(
    Gesture.Pan()
      .simultaneousWithExternalGesture(nativeGesture)
      // Активируемся только на заметном вертикальном движении.
      .activeOffsetY(10)
      .failOffsetX([-20, 20])
      .onBegin(() => {
        'worklet';
        panStart.value = stretch.value;
      })
      .onUpdate((e) => {
        'worklet';
        // Резинка ТОЛЬКО у верха и ТОЛЬКО при тяге вниз.
        if (scrollY.value > 1) {
          stretch.value = 0;
          return;
        }
        const dy = e.translationY;
        if (dy <= 0) {
          // Палец пошёл вверх — отдаём управление скроллу.
          stretch.value = 0;
          return;
        }
        const limit = ms.value;
        // Логарифмическое сопротивление: тянется всё тяжелее к пределу.
        stretch.value = limit * (1 - Math.exp(-dy / (limit * RESISTANCE_DIV)));
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

  const scrollHandler = useAnimatedScrollHandler({
    onScroll(e) {
      scrollY.value = e.contentOffset.y;
    },
  });

  const onBouncyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const GestureWrap = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <GestureDetector gesture={pan}>{children as React.ReactElement}</GestureDetector>
    ),
    [pan],
  );

  return { stretch, scrollY, pan, scrollHandler, onBouncyScroll, GestureWrap, maxStretch };
}

/**
 * Возвращает animatedStyle для контент-обёртки. ДОЛЖЕН вызываться в компоненте
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
  const { stretch, scrollHandler, onBouncyScroll, GestureWrap } = useBouncy({ maxStretch });
  const animatedStyle = useBouncyStyle(stretch);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      (onScroll as ((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined)?.(e);
      onBouncyScroll(e);
    },
    [onScroll, onBouncyScroll],
  );

  return (
    <GestureWrap>
      <Animated.ScrollView
        ref={ref as any}
        scrollEventThrottle={16}
        onScroll={onScroll ? handleScroll : scrollHandler}
        overScrollMode="never"
        {...rest}
      >
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </Animated.ScrollView>
    </GestureWrap>
  );
});

export default BouncyScrollView;
