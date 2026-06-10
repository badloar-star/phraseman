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
 * АРХИТЕКТУРА v8 — ЧИСТО НАТИВНЫЙ overscroll, БЕЗ translateY-наложения.
 *
 * ПОЧЕМУ переписано (баги v7):
 *   v7 одновременно держал нативный bounce И докручивал свой translateY,
 *   читая contentOffset. Это давало два дефекта на проде:
 *     • iOS: нативный `bounces` уже уводит контент за край (contentOffset.y<0),
 *       а v7 читал тот же y и ДОБАВЛЯЛ translateY поверх → смещения
 *       складывались → ДВОЙНОЙ/преувеличенный bounce + рассинхрон хвоста
 *       (нативный decay vs reanimated-spring).
 *     • Android: нативный scroll КЛАМПИТ contentOffset.y в [0,maxScroll] при
 *       оверскролле → y<0 не наступал → translateY-докрутка не срабатывала
 *       вообще. Резинка была «инвертирована» относительно намерения: на iOS
 *       двойная, на Android отсутствовала.
 *   Бонусом докстринг обещал чтение на UI-потоке через useAnimatedScrollHandler,
 *   но в коде его не было — резинка считалась на JS-потоке (лаг под нагрузкой).
 *
 * РЕШЕНИЕ v8: резинку целиком отдаём НАТИВНОМУ overscroll, translateY НЕ двигаем.
 *   • iOS: родной UIScrollView rubber-band (`bounces` + `alwaysBounceVertical`) —
 *     двунаправленный, работает даже при коротком контенте. Идеально, даром.
 *   • Android: системный stretch-overscroll (EdgeEffect, API 31+) через
 *     `overScrollMode="always"` — двунаправленный, тоже нативный.
 *   Никакого Pan/GestureDetector, никакого scroll→translateY. Скролл = чистый
 *   нативный ScrollView, сломать нечем.
 *
 * ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ (Android + контент КОРОЧЕ вьюпорта): системный stretch
 *   не запускается, когда скроллить нечего (RN #18857) → резинки на таком
 *   экране не будет. В v7 её там тоже не было (кламп оффсета) — не регресс.
 *   Если на конкретном коротком экране резинка нужна — оборачивать в
 *   <BounceView> (Pan-докрутка, рассчитанная на отсутствие скролла).
 *
 * СОВМЕСТИМОСТЬ API (не менять вызовы на ~58 экранах) — всё сохранено:
 *   useBouncy() → { stretch, scrollY, pan, onBouncyScroll, GestureWrap }
 *   useBouncyStyle(stretch) → animatedStyle (translateY, теперь всегда 0)
 *   <BouncyScrollView> — drop-in ScrollView
 *   `stretch`/`GestureWrap`/`useBouncyStyle` сохранены, но дают transform: 0
 *   (нативная резинка их не использует). `scrollY` по-прежнему живой — экраны
 *   читают его для scale-хедера и пр. `pan` — НИ-ОП (Gesture.Tap), безвреден.
 */

import { Gesture } from 'react-native-gesture-handler';
import { BOUNCE_SPRING } from './bounceMath';

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
 * v8: резинку для скролл-экранов целиком отдаём НАТИВНОМУ overscroll —
 * `stretch` (translateY) больше не двигаем. Эта функция оставлена как тонкая
 * прослойка ради обратной совместимости сигнатуры (её зовёт onBouncyScroll),
 * но translateY она НЕ трогает — только страхует сброс к 0, если где-то
 * осталось ненулевое смещение от прежней версии.
 *
 * ПОЧЕМУ убрана translateY-докрутка (баги v7):
 *   • iOS: нативный `bounces` уже физически уводит контент за край и репортит
 *     отрицательный contentOffset.y. Старый код читал этот же y и ДОБАВЛЯЛ свой
 *     translateY поверх → резинка складывалась → ДВОЙНОЙ/преувеличенный bounce.
 *   • Android: нативный scroll КЛАМПИТ contentOffset.y в [0, maxScroll] при
 *     оверскролле, поэтому y<0 практически не наступал → translateY-докрутка
 *     не срабатывала ВООБЩЕ. Реальную резинку там даёт системный stretch
 *     (EdgeEffect, API 31+) через overScrollMode="always".
 *
 * Итог: на обеих платформах резинка теперь чисто нативная (см. флаги на
 * ScrollView ниже), translateY не наслаивается. translateY-узел/обёртка
 * (GestureWrap/useBouncyStyle) сохранены в API, но всегда дают transform: 0.
 *
 * Известное ограничение: на Android при контенте КОРОЧЕ вьюпорта системный
 * stretch не запускается (RN #18857) — резинки на таком экране не будет.
 * В сломанной v7 её там тоже не было (кламп оффсета), так что это не регресс.
 * Для таких экранов есть отдельный <BounceView> (Pan-докрутка без скролла).
 */
function applyBounce(
  stretch: SharedValue<number>,
  _y: number,
  _layoutH: number,
  _contentH: number,
  _dim: number,
) {
  'worklet';
  // translateY-резинку не трогаем (нативный overscroll). Только страхуем:
  // если осталось ненулевое смещение — мягко вернуть к 0.
  if (stretch.value !== 0) {
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
