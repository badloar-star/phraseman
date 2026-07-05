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
  useAnimatedScrollHandler,
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
import { edgePull, BOUNCE_SPRING } from './bounceMath';

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
  /** UI-поток вариант onScroll для Animated.ScrollView (Reanimated). Избегает JS-моста. */
  onAnimatedScroll: ReturnType<typeof useAnimatedScrollHandler>;
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

/**
 * Edge-pull резинка для Android.
 *
 * КЛЮЧЕВОЕ ОТЛИЧИЕ от наивной версии: оттяжку считаем ОТ МОМЕНТА КАСАНИЯ КРАЯ,
 * а не от начала жеста. Pan активен одновременно с нативным скроллом
 * (Gesture.Simultaneous), поэтому к моменту, когда список упёрся в верх/низ,
 * `translationY` уже накопил весь путь пальца по экрану (сотни px). Если подать
 * это накопленное значение прямо в rubberBand — резинка ПРЫГАЕТ скачком в
 * большое смещение. Поэтому при первом пересечении края запоминаем
 * `edgeAnchor = translationY` и далее тянем только на `translationY - edgeAnchor`
 * — оттяжка плавно растёт с нуля от края.
 *
 * Якорь сбрасывается (NaN), как только палец уходит обратно внутрь скролла или
 * меняет сторону, чтобы следующее упирание снова стартовало с нуля.
 */
function applyEdgePull(
  stretch: SharedValue<number>,
  scrollY: SharedValue<number>,
  layoutHeight: SharedValue<number>,
  contentHeight: SharedValue<number>,
  edgeAnchor: SharedValue<number>,
  translationY: number,
  dim: number,
) {
  'worklet';
  const maxScroll = Math.max(contentHeight.value - layoutHeight.value, 0);
  const atTop = scrollY.value <= 1;
  const atBottom = maxScroll <= 0 || scrollY.value >= maxScroll - 1;

  const { stretch: target, anchor } = edgePull(
    translationY,
    edgeAnchor.value,
    atTop,
    atBottom,
    dim,
  );
  edgeAnchor.value = anchor;

  if (target !== 0) {
    // У края: rubberBand уже даёт плавную кривую от нуля — ставим напрямую, чтобы
    // резинка шла ровно за пальцем (spring здесь только добавил бы лаг).
    stretch.value = target;
  } else if (stretch.value !== 0) {
    // Палец внутри тела / отпустил край — мягко гасим остаточную оттяжку.
    stretch.value = withSpring(0, BOUNCE_SPRING);
  }
}

export function useBouncy({
  dimension,
  onScrollWorklet,
}: {
  dimension?: number;
  /**
   * Доп. worklet, вызывается из onAnimatedScroll на UI-потоке с текущим contentOffset.y.
   * Для экранов, которым помимо резинки нужен свой скролл-эффект (fade шапки и т.п.)
   * без второго обработчика и без JS-моста. Тело обязано быть worklet'ом.
   */
  onScrollWorklet?: (y: number) => void;
} = {}): BouncyScroll {
  const { height: screenH } = useWindowDimensions();
  const dim = dimension ?? screenH;
  const isAndroid = Platform.OS === 'android';
  const stretch = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const layoutHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  // Палец в момент касания края (см. applyEdgePull). NaN = край ещё не касались.
  const edgeAnchor = useSharedValue(NaN);

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
          applyEdgePull(stretch, scrollY, layoutHeight, contentHeight, edgeAnchor, e.translationY, dim);
        })
        .onEnd(() => {
          'worklet';
          edgeAnchor.value = NaN;
          stretch.value = withSpring(0, BOUNCE_SPRING);
        })
        .onFinalize(() => {
          'worklet';
          edgeAnchor.value = NaN;
          stretch.value = withSpring(0, BOUNCE_SPRING);
        }),
    [contentHeight, dim, edgeAnchor, isAndroid, layoutHeight, nativeGesture, scrollY, stretch],
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

  // UI-поток вариант — без JS-моста. Использовать с Animated.ScrollView (Reanimated)
  // вместо обычного ScrollView на тяжёлых экранах, где throttle=16 вызывает jank.
  const onAnimatedScroll = useAnimatedScrollHandler({
    onScroll(e) {
      updateScrollMetrics(
        stretch,
        scrollY,
        layoutHeight,
        contentHeight,
        e.contentOffset.y,
        e.layoutMeasurement.height,
        e.contentSize.height,
      );
      if (onScrollWorklet) onScrollWorklet(e.contentOffset.y);
    },
  });

  useEffect(
    () => () => {
      cancelAnimation(stretch);
      stretch.value = 0;
      edgeAnchor.value = NaN;
    },
    [stretch, edgeAnchor],
  );

  const GestureWrap = useCallback(
    ({ children, style }: { children: React.ReactNode; style?: any }) => {
      const child = React.isValidElement(children)
        ? children
        : <>{children}</>;
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

  return { stretch, scrollY, pan, onBouncyScroll, onAnimatedScroll, GestureWrap };
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
