/**
 * ComboRing — кольцо заряда серии (спек §2 ComboRing, AC 4).
 *
 * SVG-круг со strokeDashoffset (animated props Reanimated), число серии в центре.
 * Заполнение отражает прогресс к следующему порогу уровня. Цвет: level>=1 —
 * золото (t.gold), иначе t.accent. На level>=2 — лёгкий glow (дублирующий круг с
 * прозрачностью + тень). Цвета из useTheme, hex не хардкодим.
 *
 * Perf: анимация на UI-треде, конечная (реагирует на смену value); монтируется
 * хостом только в шапке активной сессии. Без вечных циклов.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import {
  COMBO_LIGHTNING_AT,
  COMBO_SPARK_AT,
  COMBO_STORM_AT,
  type ComboLevel,
} from '../../app/feedback/combo_engine';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ComboRingProps {
  value: number;
  level: ComboLevel;
  size?: number;
}

/** Доля заполнения кольца в пределах текущего уровня (0..1). */
function fractionForBand(value: number, level: ComboLevel): number {
  if (level >= 3) return 1; // гроза — кольцо полное (открытый верх)
  let from = 0;
  let to = COMBO_SPARK_AT;
  if (level === 1) {
    from = COMBO_SPARK_AT;
    to = COMBO_LIGHTNING_AT;
  } else if (level === 2) {
    from = COMBO_LIGHTNING_AT;
    to = COMBO_STORM_AT;
  }
  const span = Math.max(1, to - from);
  return Math.max(0, Math.min(1, (value - from) / span));
}

export function ComboRing({ value, level, size = 56 }: ComboRingProps) {
  const { theme: t } = useTheme();

  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  const targetFraction = fractionForBand(value, level);

  useEffect(() => {
    progress.value = withTiming(targetFraction, { duration: 320 });
    return () => cancelAnimation(progress);
  }, [progress, targetFraction]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const ringColor = level >= 1 ? t.gold : t.accent;
  const showGlow = level >= 2;
  const numberColor = level >= 1 ? t.gold : t.textPrimary;

  const glowStyle = useMemo(
    () =>
      showGlow
        ? {
            shadowColor: ringColor,
            shadowOpacity: 0.7,
            shadowRadius: level >= 3 ? 12 : 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: level >= 3 ? 8 : 5,
          }
        : null,
    [showGlow, ringColor, level],
  );

  return (
    <View style={[{ width: size, height: size }, styles.center, glowStyle]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* трек */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.border}
          strokeWidth={stroke}
          fill="none"
        />
        {/* дублирующий круг для glow на level>=2 */}
        {showGlow ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ringColor}
            strokeWidth={stroke + 2}
            strokeLinecap="round"
            fill="none"
            opacity={0.35}
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
        {/* основной прогресс */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.number, { color: numberColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
});

export default ComboRing;
