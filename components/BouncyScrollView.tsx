import React, { forwardRef, useCallback } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type ScrollViewProps,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * Кросс-платформенная overscroll-резинка — ТОЛЬКО у верхнего края.
 *
 * Поведение: список доскроллен до самого верха (scrollY ≈ 0) и палец тянет
 * ВНИЗ → весь блок скролла отъезжает вниз с затухающим сопротивлением и
 * пружинит назад. В любом другом положении — обычный скролл, резинки нет.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * АРХИТЕКТУРА v6 (стабильная — изоляция GestureDetector от useAnimatedStyle):
 *
 * Причина прошлых вылетов ("set key `current` on frozen object"):
 *   useAnimatedStyle применялся на <Animated.View> ВНУТРИ <GestureDetector>.
 *   GestureDetector.Wrap клонирует своего потомка → на Fabric это ремаунтит
 *   Reanimated animated-узел, его viewTag инвалидируется, и useEffect от
 *   useAnimatedStyle пишет в замороженный объект → краш (видно в стеке:
 *   GestureDetector → Wrap → AnimatedComponent → useAnimatedStyle).
 *
 * Решение: translateY-обёртка вынесена НАРУЖУ GestureDetector. Анимируемый
 *   <Animated.View> оборачивает <GestureDetector>, а НЕ наоборот. Wrap клонирует
 *   только внутренний скролл (без animated style) — Reanimated-узел снаружи не
 *   трогается. Жест и анимация больше не конфликтуют.
 *
 *   <Animated.View style={animatedStyle}>   ← translateY здесь (снаружи)
 *     <GestureDetector gesture={pan}>
 *       <ScrollView onScroll={onBouncyScroll}>{children}</ScrollView>
 *     </GestureDetector>
 *   </Animated.View>
 *
 * Для useBouncy-экранов структура такая же — см. useBouncyStyle + GestureWrap.
 */

// ── Физика iOS / Telegram ─────────────────────────────────────────────────────
// Telegram использует стандартный UIScrollView rubber-band. Воспроизводим точно:
//
// 1) СОПРОТИВЛЕНИЕ при оттягивании — формула Apple:
//      f(x, d, c) = (x · d · c) / (d + c · x)
//    где x — смещение пальца, d — высота вьюпорта, c = 0.55 (константа Apple).
//    Даёт «бесконечно тяжелеющее» оттягивание без жёсткого предела (в отличие
//    от exp-формулы со стенкой на maxStretch).
//
// 2) ВОЗВРАТ — iOS НЕ отскакивает (нет overshoot). Критически задемпфированный
//    spring: dampingRatio = 1. duration ≈ 0.5s — родная скорость отбоя iOS.
const APPLE_C = 0.55;
const SPRING = { dampingRatio: 1, duration: 500 } as const;

function rubberBand(x: number, dim: number): number {
  'worklet';
  // x — абсолютное смещение пальца (>0). Возвращает «сопротивлённое» смещение.
  return (x * dim * APPLE_C) / (dim + APPLE_C * x);
}

export interface BouncyScrollViewProps extends ScrollViewProps {
  /** Высота вьюпорта для формулы сопротивления. По умолчанию — высота экрана. */
  dimension?: number;
}

export function useBouncy({ dimension }: { dimension?: number } = {}) {
  const { height: screenH } = useWindowDimensions();
  const dim = dimension ?? screenH;
  const stretch = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      'worklet';
      // Резинка ТОЛЬКО у верха (scrollY ≈ 0) и ТОЛЬКО при тяге вниз.
      if (scrollY.value > 1 || e.translationY <= 0) {
        stretch.value = 0;
        return;
      }
      stretch.value = rubberBand(e.translationY, dim);
    })
    .onEnd(() => {
      'worklet';
      stretch.value = withSpring(0, SPRING);
    })
    .onFinalize(() => {
      'worklet';
      if (stretch.value !== 0) stretch.value = withSpring(0, SPRING);
    });

  const onBouncyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Обёртка для useBouncy-экранов. Принимает animatedStyle (из useBouncyStyle)
   * и оборачивает скролл-вью так, что translateY-узел остаётся СНАРУЖИ
   * GestureDetector (иначе вылет — см. шапку файла).
   *
   * Использование:
   *   const { stretch, onBouncyScroll, GestureWrap } = useBouncy();
   *   const bouncyStyle = useBouncyStyle(stretch);
   *   <GestureWrap style={bouncyStyle}>
   *     <Animated.ScrollView onScroll={Animated.event([...],{listener:onBouncyScroll})}>
   *       {content}
   *     </Animated.ScrollView>
   *   </GestureWrap>
   * (Внутри GestureWrap НЕ нужен отдельный <Animated.View style={bouncyStyle}>.)
   */
  const GestureWrap = useCallback(
    ({ children, style }: { children: React.ReactNode; style?: any }) => (
      <Animated.View style={[{ flex: 1 }, style]}>
        <GestureDetector gesture={pan}>{children as React.ReactElement}</GestureDetector>
      </Animated.View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pan],
  );

  return { stretch, scrollY, pan, onBouncyScroll, GestureWrap };
}

/**
 * animatedStyle для translateY-обёртки. Вызывать В КОМПОНЕНТЕ.
 */
export function useBouncyStyle(stretch: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: stretch.value }],
  }));
}

const BouncyScrollView = forwardRef<ScrollView, BouncyScrollViewProps>(function BouncyScrollView(
  { children, onScroll, dimension, style, ...rest },
  ref,
) {
  const { stretch, pan, onBouncyScroll } = useBouncy({ dimension });
  const animatedStyle = useBouncyStyle(stretch);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      (onScroll as ((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined)?.(e);
      onBouncyScroll(e);
    },
    [onScroll, onBouncyScroll],
  );

  // translateY-узел СНАРУЖИ GestureDetector — ключ к отсутствию вылетов.
  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <GestureDetector gesture={pan}>
        <Animated.ScrollView
          ref={ref as any}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          overScrollMode="never"
          style={style}
          {...rest}
        >
          {children}
        </Animated.ScrollView>
      </GestureDetector>
    </Animated.View>
  );
});

export default BouncyScrollView;
