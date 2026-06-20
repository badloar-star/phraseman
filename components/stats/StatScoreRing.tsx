import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** Уважение к prefers-reduced-motion недоступно на RN напрямую; анимации
 *  короткие (≤900ms) и однократные при появлении — без бесконечных циклов. */
const FILL_DURATION_MS = 900;
const COUNT_DURATION_MS = 900;

type StatScoreRingProps = {
  /** 0..100 — доля заполнения кольца. */
  progress: number;
  /** Текст в центре. Если число — анимируется count-up'ом; иначе показывается как есть. */
  centerValue: string | number;
  /** Маленькая подпись под центральным значением (например «/100» или «дн.»). */
  centerSubLabel?: string;
  /** Основной цвет дуги. */
  accent: string;
  /** Цвет «трека» (незаполненной части). */
  trackColor: string;
  /** Цвет градиентного «хвоста» дуги — если задан, дуга переливается accent→accentSoft. */
  accentSoft?: string;
  size?: number;
  strokeWidth?: number;
  centerColor: string;
  subColor: string;
  /** Задержка старта анимации (для каскада карточек). */
  delayMs?: number;
  centerTextStyle?: TextStyle;
  subTextStyle?: TextStyle;
};

/**
 * Killer-кольцо оценки: анимированная SVG-дуга, заполняющаяся от 0 до `progress`
 * при появлении, с count-up числом в центре. Идиома проекта —
 * Reanimated `useAnimatedProps` + `strokeDashoffset` (см. _anim_demo_lab.tsx).
 */
export function StatScoreRing({
  progress,
  centerValue,
  centerSubLabel,
  accent,
  trackColor,
  accentSoft,
  size = 104,
  strokeWidth = 10,
  centerColor,
  subColor,
  delayMs = 0,
  centerTextStyle,
  subTextStyle,
}: StatScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));

  const fill = useSharedValue(0);
  const isNumber = typeof centerValue === 'number' && Number.isFinite(centerValue);
  const target = isNumber ? (centerValue as number) : 0;
  const [displayNum, setDisplayNum] = React.useState(isNumber ? 0 : null);
  const counter = useSharedValue(0);

  useEffect(() => {
    fill.value = 0;
    fill.value = withDelay(delayMs, withTiming(clamped / 100, { duration: FILL_DURATION_MS, easing: Easing.out(Easing.cubic) }));
    if (isNumber) {
      counter.value = 0;
      counter.value = withDelay(delayMs, withTiming(target, { duration: COUNT_DURATION_MS, easing: Easing.out(Easing.cubic) }));
    }
    return () => {
      cancelAnimation(fill);
      cancelAnimation(counter);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, target, isNumber, delayMs]);

  const rounded = useDerivedValue(() => Math.round(counter.value));
  useAnimatedReaction(
    () => rounded.value,
    (v, prev) => {
      if (v !== prev) runOnJS(setDisplayNum)(v);
    },
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  const centerText = isNumber ? String(displayNum ?? 0) : String(centerValue);
  const gradId = React.useId();

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {accentSoft ? (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={accent} />
              <Stop offset="1" stopColor={accentSoft} />
            </LinearGradient>
          </Defs>
        ) : null}
        {/* Трек */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Анимированная дуга прогресса */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accentSoft ? `url(#${gradId})` : accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Стартуем дугу сверху (12 часов)
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.centerNum, { color: centerColor }, centerTextStyle]} numberOfLines={1}>
          {centerText}
        </Text>
        {centerSubLabel ? (
          <Text style={[styles.sub, { color: subColor }, subTextStyle]} numberOfLines={1}>
            {centerSubLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerNum: { fontSize: 30, fontWeight: '900', lineHeight: 34, textAlign: 'center' },
  sub: { fontSize: 10, fontWeight: '800', marginTop: 1, textAlign: 'center' },
});

export default StatScoreRing;
