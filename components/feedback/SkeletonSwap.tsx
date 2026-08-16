// ─── SkeletonSwap — общий примитив «скелетон → контент» ────────────────────
// зачем: у нескольких экранов был жёсткий скачок «скелетон исчез, контент
// появился» (или того хуже — return null на время загрузки, ломающий
// стабильность лэйаута). Один переиспользуемый кроссфейд вместо N локальных
// копипаст: opacity resolveMs + микро-scale settle (числа из LUM —
// constants/motionHybrid.ts, база «Световод» без отскока). Reduce Motion —
// мгновенная замена без анимации (закон витрины: один кадр).
//
// Геометрия обеих веток (skeleton/children) должна совпадать — это на
// совести вызывающего компонента (tests/layout_stability_contract.test.ts
// не ослабляем: первый кадр = финальная геометрия).
import React, { useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LUM } from '../../constants/motionHybrid';

interface SkeletonSwapProps {
  /** true = показываем skeleton; false = показываем children (контент). */
  loading: boolean;
  /** Скелетон-заглушка: форма должна совпадать с geometry контента. */
  skeleton: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Кроссфейд «скелетон → контент»: skeleton не исчезает мгновенно — оба слоя
 * недолго сосуществуют друг над другом (skeleton поверх, opacity вниз;
 * контент под ним, opacity вверх + микро-scale 0.985→1 settle), затем
 * скелетон размонтируется. При loading=true — просто скелетон, без анимации
 * входа (анимируем только МОМЕНТ появления контента, не сам скелетон-цикл).
 */
export default function SkeletonSwap({ loading, skeleton, children, style }: SkeletonSwapProps) {
  const reduceMotion = useReduceMotion();
  const contentOpacity = useSharedValue(loading ? 0 : 1);
  const contentScale = useSharedValue(loading ? 0.985 : 1);
  const skeletonOpacity = useSharedValue(loading ? 1 : 0);
  // Держим скелетон смонтированным чуть дольше, пока идёт кроссфейд — иначе
  // он пропадает раньше, чем контент успевает проявиться, и виден пустой кадр.
  const [showSkeleton, setShowSkeleton] = React.useState(loading);
  const prevLoading = useRef(loading);

  useEffect(() => {
    if (prevLoading.current === loading) return;
    prevLoading.current = loading;

    if (reduceMotion) {
      cancelAnimation(contentOpacity);
      cancelAnimation(contentScale);
      cancelAnimation(skeletonOpacity);
      contentOpacity.value = loading ? 0 : 1;
      contentScale.value = loading ? 0.985 : 1;
      skeletonOpacity.value = loading ? 1 : 0;
      setShowSkeleton(loading);
      return;
    }

    if (loading) {
      // Назад в состояние загрузки (редко: обновление вручную) — без анимации,
      // чтобы не мигать скелетоном под уже показанным контентом.
      cancelAnimation(contentOpacity);
      cancelAnimation(contentScale);
      cancelAnimation(skeletonOpacity);
      contentOpacity.value = 0;
      contentScale.value = 0.985;
      skeletonOpacity.value = 1;
      setShowSkeleton(true);
      return;
    }

    // loading → false: контент проявляется светом (opacity + settle без
    // отскока), скелетон гаснет короче входа (закон №15: выход короче входа).
    setShowSkeleton(true);
    contentOpacity.value = withTiming(1, {
      duration: LUM.resolveMs,
      easing: Easing.out(Easing.cubic),
    });
    contentScale.value = withTiming(1, {
      duration: LUM.resolveMs,
      easing: Easing.out(Easing.cubic),
    });
    skeletonOpacity.value = withTiming(0, { duration: LUM.exitMs, easing: Easing.out(Easing.cubic) });
    // Размонтируем скелетон с JS-потока по таймеру (совпадает с длительностью
    // ухода) — проще и надёжнее runOnJS-колбэка из worklet для одного булева сеттера.
    const hideTimer = setTimeout(() => setShowSkeleton(false), LUM.exitMs);
    return () => clearTimeout(hideTimer);
  }, [loading, reduceMotion, contentOpacity, contentScale, skeletonOpacity]);

  useEffect(() => {
    return () => {
      cancelAnimation(contentOpacity);
      cancelAnimation(contentScale);
      cancelAnimation(skeletonOpacity);
    };
  }, [contentOpacity, contentScale, skeletonOpacity]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));
  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  if (reduceMotion) {
    return <>{loading ? skeleton : children}</>;
  }

  return (
    <Reanimated.View style={style}>
      <Reanimated.View style={contentStyle}>{children}</Reanimated.View>
      {showSkeleton && (
        <Reanimated.View
          pointerEvents={loading ? 'auto' : 'none'}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, skeletonStyle]}
        >
          {skeleton}
        </Reanimated.View>
      )}
    </Reanimated.View>
  );
}
