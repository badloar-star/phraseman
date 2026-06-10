import React, { memo, useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';

interface Props {
  /** Ширина области (px), по которой бежит блик. Обычно ширина кнопки. */
  width: number;
  /** Высота области (px). Обычно высота кнопки. */
  height: number;
  /** Период одного прохода блика, мс. Default 2600. */
  durationMs?: number;
  /** Пауза между проходами, мс. Default 1400. */
  gapMs?: number;
  /** Радиус скругления (должен совпадать с кнопкой), чтобы блик не вылезал. */
  borderRadius?: number;
  /** Ширина самой полосы света, px. Default 46. */
  bandWidth?: number;
  /** Наклон полосы, deg. Default 18. */
  skewDeg?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Переиспользуемый бегущий блик («полоса света») поверх любой кнопки/карточки.
 * Кладётся последним ребёнком внутрь элемента с overflow:'hidden'.
 *
 * ВАЖНО: в приложении уже есть локальные shine в PremiumGoldButton,
 * PremiumCelebrationModal, ShopNeonCta, LeagueResultModal, RankChangeModal —
 * туда этот компонент НЕ добавлять (будет двойной блик). Использовать только
 * на кнопках без своего shimmer (premium_modal_v2 CTA, IntroFullAccessModal и т.п.).
 *
 * На Reanimated — анимация на UI-потоке, луп с паузой.
 */
function ShineOverlay({
  width,
  height,
  durationMs = 2600,
  gapMs = 1400,
  borderRadius = 16,
  bandWidth = 46,
  skewDeg = 18,
  style,
}: Props) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = 0;
    const cycle = durationMs + gapMs;
    // Один цикл = проход (durationMs) + пауза (gapMs) на конце, луп бесконечно.
    sweep.value = withRepeat(
      withTiming(1, {
        duration: cycle,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(sweep);
  }, [sweep, durationMs, gapMs, width]);

  const bandStyle = useAnimatedStyle(() => {
    // Фаза прохода: блик движется только в первой части цикла, потом ждёт за краем.
    const passFraction = durationMs / (durationMs + gapMs);
    const t = Math.min(1, sweep.value / passFraction);
    const x = interpolate(t, [0, 1], [-bandWidth, width + bandWidth]);
    return {
      transform: [{ translateX: x }, { rotateZ: `${skewDeg}deg` }],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }, style]}
    >
      <Reanimated.View style={[{ width: bandWidth, height: height * 2, marginTop: -height / 2 }, bandStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Reanimated.View>
    </View>
  );
}

export default memo(ShineOverlay);
