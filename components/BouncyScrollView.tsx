import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';
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
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Кросс-платформенная overscroll-резинка — В ОБЕ СТОРОНЫ (верх и низ).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * АРХИТЕКТУРА v9 — iOS native bounce + Android edge-pull fallback.
 *
 * ПОЧЕМУ переписано с нуля (баги v1-v6):
 *   Старые версии вешали поверх ScrollView свой `Gesture.Pan()`. Это и есть
 *   корень всех бед:
 *     1. pan пересоздавался на каждом рендере -> GestureDetector переустанавливал
 *        нативный хэндлер -> гонка с нативным скроллом -> "скролл ломается после
 *        3/5/N раз".
 *     2. pan конкурировал со скроллом за тот же вертикальный drag
 *        (без simultaneousWithExternalGesture) -> периодически крал тач.
 *     3. translateY мог застрять !=0 при ремаунте -> смещал hit-area -> скролл мертв.
 *     4. нижний край не детектился -> резинка только сверху.
 *
 *   • iOS: родной UIScrollView rubber-band (`bounces` + `alwaysBounceVertical`)
 *     дает настоящую резинку в обе стороны бесплатно. Кастомный Pan там выключен,
 *     чтобы не получить двойной bounce.
 *   • Android: native ScrollView часто клампит contentOffset в [0,maxScroll],
 *     поэтому offset-only v7 может визуально не двигаться вообще. Для Android
 *     ставим edge-only Pan fallback: он simultaneous с нативным scroll, активен
 *     только на вертикальную тягу, и двигает контент только когда список уже у
 *     верхнего/нижнего края и палец тянет наружу.
 *
 *   translateY-узел - отдельный <Animated.View> снаружи ScrollView. Он чисто
 *   визуальный (transform), тача не перехватывает.
 *
 * СОВМЕСТИМОСТЬ API (не менять вызовы на ~58 экранах) — всё сохранено:
 *   useBouncy() → { stretch, scrollY, pan, onBouncyScroll, GestureWrap }
 *   useBouncyStyle(stretch) → animatedStyle (translateY)
 *   <BouncyScrollView> — drop-in ScrollView
 *   `pan` сохранен в возврате как Android edge-pull gesture для старых мест,
 *   которые ожидали это поле.
 */

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { rubberBand, BOUNCE_SPRING } from './bounceMath';

export interface BouncyScrollViewProps extends ScrollViewProps {
  /** Высота вьюпорта для формулы сопротивления. По умолчанию — высота экрана. */
  dimension?: number;
}

type BouncyScroll = {
  /** translateY-смещение резинки (UI-поток). Подаётся в useBouncyStyle. */
  stretch: SharedValue<number>;
  /** Текущий contentOffset.y (UI-поток) — для экранов, которым он нужен. */
  scrollY: SharedValue<number>;
  /** Android edge-pull gesture. On iOS it is disabled so native bounce stays clean. */
  pan: ReturnType<typeof Gesture.Pan>;
  /** Прокинуть в onScroll скролл-вью (или в listener у Animated.event). */
  onBouncyScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Обёртка translateY. <GestureWrap style={bouncyStyle}>{scroll}</GestureWrap> */
  GestureWrap: (props: { children: React.ReactNode; style?: any }) => React.ReactElement;
};

function updateScrollMetrics(
  stretch: SharedValue<number>,
  scrollY: SharedValue<number>,
  layoutHeight: SharedValue<number>,
  contentHeight: SharedValue<number>,
  y: number,
  layoutH: number,
  contentH: number,
) {
  'worklet';
  scrollY.value = y;
  layoutHeight.value = layoutH;
  contentHeight.value = contentH;

  const maxScroll = Math.max(contentH - layoutH, 0);
  const insideScrollableBody = maxScroll > 0 && y > 1 && y < maxScroll - 1;
  if (insideScrollableBody && stretch.value !== 0) {
    stretch.value = withSpring(0, BOUNCE_SPRING);
  }
}

function applyEdgePull(
  stretch: SharedValue<number>,
  scrollY: SharedValue<number>,
  layoutHeight: SharedValue<number>,
  contentHeight: SharedValue<number>,
  translationY: number,
  dim: number,
) {
  'worklet';
  const maxScroll = Math.max(contentHeight.value - layoutHeight.value, 0);
  const atTop = scrollY.value <= 1;
  const atBottom = maxScroll <= 0 || scrollY.value >= maxScroll - 1;

  if (translationY > 0 && atTop) {
    stretch.value = rubberBand(translationY, dim);
    return;
  }

  if (translationY < 0 && atBottom) {
    stretch.value = -rubberBand(-translationY, dim);
    return;
  }

  if (stretch.value !== 0) {
    stretch.value = withSpring(0, BOUNCE_SPRING);
  }
}

export function useBouncy({ dimension }: { dimension?: number } = {}): BouncyScroll {
  const { height: screenH } = useWindowDimensions();
  const dim = dimension ?? screenH;
  const isAndroid = Platform.OS === 'android';
  const stretch = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const layoutHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isAndroid)
        .simultaneousWithExternalGesture(nativeGesture)
        .activeOffsetY([-10, 10])
        .failOffsetX([-18, 18])
        .onUpdate((e) => {
          'worklet';
          applyEdgePull(stretch, scrollY, layoutHeight, contentHeight, e.translationY, dim);
        })
        .onEnd(() => {
          'worklet';
          stretch.value = withSpring(0, BOUNCE_SPRING);
        })
        .onFinalize(() => {
          'worklet';
          stretch.value = withSpring(0, BOUNCE_SPRING);
        }),
    [contentHeight, dim, isAndroid, layoutHeight, nativeGesture, scrollY, stretch],
  );
  const scrollGesture = useMemo(
    () => Gesture.Simultaneous(nativeGesture, pan),
    [nativeGesture, pan],
  );

  const onBouncyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      updateScrollMetrics(
        stretch,
        scrollY,
        layoutHeight,
        contentHeight,
        contentOffset.y,
        layoutMeasurement.height,
        contentSize.height,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      cancelAnimation(stretch);
      stretch.value = 0;
    },
    [stretch],
  );

  const GestureWrap = useCallback(
    ({ children, style }: { children: React.ReactNode; style?: any }) => {
      const child = React.isValidElement(children)
        ? children
        : children as React.ReactElement;
      const scrollChild = isAndroid && React.isValidElement(child)
        ? React.cloneElement(child as React.ReactElement<any>, { overScrollMode: 'never' })
        : child;
      if (!isAndroid) {
        return <Animated.View style={[{ flex: 1 }, style]}>{scrollChild}</Animated.View>;
      }
      return (
        <Animated.View style={[{ flex: 1 }, style]}>
          <GestureDetector gesture={scrollGesture}>{scrollChild}</GestureDetector>
        </Animated.View>
      );
    },
    [isAndroid, scrollGesture],
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
  const { stretch, onBouncyScroll, GestureWrap } = useBouncy({ dimension });
  const animatedStyle = useBouncyStyle(stretch);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      dispatchScrollProp(onScroll, e);
      onBouncyScroll(e);
    },
    [onScroll, onBouncyScroll],
  );

  return (
    <GestureWrap style={animatedStyle}>
      <Animated.ScrollView
        ref={ref as any}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        bounces
        alwaysBounceVertical
        overScrollMode="never"
        style={style}
        {...rest}
      >
        {children}
      </Animated.ScrollView>
    </GestureWrap>
  );
});

export default BouncyScrollView;

function dispatchScrollProp(
  onScroll: ScrollViewProps['onScroll'] | undefined,
  e: NativeSyntheticEvent<NativeScrollEvent>,
) {
  if (typeof onScroll === 'function') {
    onScroll(e);
  }
}
