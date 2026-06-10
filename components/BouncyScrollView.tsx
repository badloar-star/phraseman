import React, { forwardRef, useCallback } from 'react';
import {
  ScrollView,
  Platform,
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

/**
 * Кросс-платформенная overscroll-резинка — В ОБЕ СТОРОНЫ (верх и низ).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * АРХИТЕКТУРА v7 — БЕЗ Pan-жеста (нативный bounce + reanimated-усиление).
 *
 * ПОЧЕМУ переписано с нуля (баги v1–v6):
 *   Старые версии вешали поверх ScrollView свой `Gesture.Pan()`. Это и есть
 *   корень всех бед:
 *     1. pan пересоздавался на каждом рендере → GestureDetector переустанавливал
 *        нативный хэндлер → гонка с нативным скроллом → «скролл ломается после
 *        3/5/N раз».
 *     2. pan конкурировал со скроллом за тот же вертикальный drag
 *        (без simultaneousWithExternalGesture) → периодически крал тач.
 *     3. translateY мог застрять ≠0 при ремаунте → смещал hit-area → скролл мёртв.
 *     4. нижний край не детектился → резинка только сверху.
 *
 * РЕШЕНИЕ v7: НИКАКОГО Gesture.Pan / GestureDetector. Скролл остаётся чистым
 *   нативным ScrollView — его НЕВОЗМОЖНО сломать жестом, которого нет.
 *
 *   • iOS: родной UIScrollView rubber-band (`bounces` + `alwaysBounceVertical`)
 *     даёт настоящую резинку в обе стороны бесплатно.
 *   • Android: `overScrollMode="always"` (родной glow слабый), поэтому СВЕРХУ
 *     докручиваем эффект сами — через useAnimatedScrollHandler читаем
 *     contentOffset на UI-потоке и при оверскролле за край сдвигаем контент
 *     translateY с резиновым сопротивлением (формула Apple). При возврате к
 *     краю — критически задемпфированный spring (без overshoot, как на iOS).
 *
 *   translateY-узел — отдельный <Animated.View> СНАРУЖИ ScrollView. Он чисто
 *   визуальный (transform), тача не перехватывает. Сброс к 0 происходит сам в
 *   том же scroll-worklet, как только палец отпущен и offset вернулся в границы
 *   → застрять ≠0 нельзя (нет гесчура, чей onEnd мог бы не сработать).
 *
 * СОВМЕСТИМОСТЬ API (не менять вызовы на ~58 экранах):
 *   useBouncy() → { stretch, scrollY, pan, onBouncyScroll, GestureWrap }
 *   useBouncyStyle(stretch) → animatedStyle (translateY)
 *   <BouncyScrollView> — drop-in ScrollView
 *   `pan` сохранён в возврате как НИ-ОП (Gesture.Tap, ни на что не влияет) —
 *   на случай если где-то остался <GestureDetector gesture={pan}>; такой
 *   детектор станет безвредным no-op вместо конфликтующего Pan.
 */

import { Gesture } from 'react-native-gesture-handler';
import { bounceOffset, BOUNCE_SPRING } from './bounceMath';

export interface BouncyScrollViewProps extends ScrollViewProps {
  /** Высота вьюпорта для формулы сопротивления. По умолчанию — высота экрана. */
  dimension?: number;
}

type BouncyScroll = {
  /** translateY-смещение резинки (UI-поток). Подаётся в useBouncyStyle. */
  stretch: SharedValue<number>;
  /** Текущий contentOffset.y (UI-поток) — для экранов, которым он нужен. */
  scrollY: SharedValue<number>;
  /** No-op gesture для обратной совместимости со старыми <GestureDetector>. */
  pan: ReturnType<typeof Gesture.Tap>;
  /** Прокинуть в onScroll скролл-вью (или в listener у Animated.event). */
  onBouncyScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Обёртка translateY. <GestureWrap style={bouncyStyle}>{scroll}</GestureWrap> */
  GestureWrap: (props: { children: React.ReactNode; style?: any }) => React.ReactElement;
};

/**
 * Применяет резиновое смещение к stretch по сырому scroll-событию.
 * Двунаправленно: top (y<0) и bottom (y за пределом). Worklet-safe вызывается с
 * UI-потока (через runOnUI scroll handler) и с JS-потока (через onScroll listener
 * экранов bucket B) — в обоих случаях лишь пишет в shared value.
 */
function applyBounce(
  stretch: SharedValue<number>,
  y: number,
  layoutH: number,
  contentH: number,
  dim: number,
) {
  'worklet';
  const target = bounceOffset(y, layoutH, contentH, dim);
  if (target !== null) {
    // Оверскролл (верх → target>0, низ → target<0): сразу следуем за пальцем.
    stretch.value = target;
  } else if (stretch.value !== 0) {
    // Вернулись в границы — мягко пружиним к 0 (без overshoot).
    stretch.value = withSpring(0, BOUNCE_SPRING);
  }
}

export function useBouncy({ dimension }: { dimension?: number } = {}): BouncyScroll {
  const { height: screenH } = useWindowDimensions();
  const dim = dimension ?? screenH;
  const stretch = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // No-op жест: оставлен только ради обратной совместимости со старой разметкой,
  // где мог сохраниться <GestureDetector gesture={pan}>. Tap без обработчиков
  // ничего не перехватывает и НЕ конфликтует со скроллом.
  const pan = Gesture.Tap();

  const onBouncyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const y = contentOffset.y;
      scrollY.value = y;
      applyBounce(stretch, y, layoutMeasurement.height, contentSize.height, dim);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dim],
  );

  const GestureWrap = useCallback(
    ({ children, style }: { children: React.ReactNode; style?: any }) => (
      <Animated.View style={[{ flex: 1 }, style]}>{children as React.ReactElement}</Animated.View>
    ),
    [],
  );

  return { stretch, scrollY, pan, onBouncyScroll, GestureWrap };
}

/** animatedStyle для translateY-обёртки. Вызывать В КОМПОНЕНТЕ. */
export function useBouncyStyle(stretch: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: stretch.value }],
  }));
}

const BouncyScrollView = forwardRef<ScrollView, BouncyScrollViewProps>(function BouncyScrollView(
  { children, onScroll, dimension, style, ...rest },
  ref,
) {
  const { stretch, onBouncyScroll } = useBouncy({ dimension });
  const animatedStyle = useBouncyStyle(stretch);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      (onScroll as ((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined)?.(e);
      onBouncyScroll(e);
    },
    [onScroll, onBouncyScroll],
  );

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Animated.ScrollView
        ref={ref as any}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        bounces
        alwaysBounceVertical
        overScrollMode={Platform.OS === 'android' ? 'always' : 'never'}
        style={style}
        {...rest}
      >
        {children}
      </Animated.ScrollView>
    </Animated.View>
  );
});

export default BouncyScrollView;
