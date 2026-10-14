// ═══════════════════════════════════════════════════════════════════════════
// moments_effects.tsx — общие эффекты моментов Пика: фейерверк и дрожь экрана (эталон engagement-moments-v3.js: firework(), emRumble).
//
// зачем (координатор 14.10): анимация и тайминги — как в образце, Reanimated на UI-треде, reduceMotion — без движения. Фейерверк: 26 искр по кругу r 90–130 (+30 вниз),
// ядро-вспышка 500 мс, искры 1,2 с; цвета — иллюстрация образца (золото, мята, синий, белый, оранж), не токены темы. Дрожь «emRumble» — 700 мс, 8 шагов затухающей амплитуды.
// Случайность образца заменена детерминированной (по индексу): кадры воспроизводимы, тесты не мигают.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Цвета искр образца (theme-exempt: иллюстрация праздника, одинакова в любой теме). */
export const MOMENT_FIREWORK_COLORS = ['#FFE08A', '#5FE3C0', '#7C9BFF', '#FFFFFF', '#FF7A45'] as const; // theme-exempt: цвета искр фейерверка из образца

/** Детерминированное «случайное» 0…1 по индексу и соли (вместо Math.random образца). */
export function momentJitter(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type SparkProps = Readonly<{ progress: SharedValue<number>; dx: number; dy: number; color: string; delayK: number }>;

const Spark = memo(function Spark({ progress, dx, dy, color, delayK }: SparkProps) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - delayK) / (1 - delayK)));
    const eased = 1 - (1 - t) * (1 - t);
    return { opacity: t >= 1 ? 0 : t === 0 ? 0 : 1 - Math.max(0, (t - 0.55) / 0.45), transform: [{ translateX: dx * eased }, { translateY: dy * eased }, { scale: 1 - 0.55 * t }] };
  });
  return <Animated.View pointerEvents="none" style={[s.spark, { backgroundColor: color }, style]} />;
});

export type MomentFireworkProps = Readonly<{
  /** Центр взрыва в координатах родителя, dp. */
  x: number;
  y: number;
  /** Радиус разлёта, dp (образец: 110 / 70 / 80). */
  r?: number;
  n?: number;
  /** Пока false — взрыва нет; смена на true запускает его один раз. */
  fire: boolean;
  /** Задержка запуска, мс (образец: 0 / 250 / 450). */
  delayMs?: number;
}>;

/** Один взрыв фейерверка: искры по кругу + ядро-вспышка. Нет движения при reduceMotion. */
function MomentFirework({ x, y, r = 90, n = 26, fire, delayMs = 0 }: MomentFireworkProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const core = useSharedValue(0);
  React.useEffect(() => {
    if (!fire || reduceMotion) return;
    progress.value = withDelay(delayMs, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
    core.value = withDelay(delayMs, withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 380 })));
  }, [fire, reduceMotion, delayMs, progress, core]);
  const sparks = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = ((Math.PI * 2) / n) * i + momentJitter(i, 1) * 0.2;
    const radius = r + momentJitter(i, 2) * 40;
    return { key: i, dx: Math.cos(a) * radius, dy: Math.sin(a) * radius + 30, color: MOMENT_FIREWORK_COLORS[i % MOMENT_FIREWORK_COLORS.length], delayK: momentJitter(i, 3) * 0.07 };
  }), [n, r]);
  const coreStyle = useAnimatedStyle(() => ({ opacity: core.value, transform: [{ scale: 0.4 + core.value * 1.6 }] }));
  if (!fire || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={[s.burst, { left: x, top: y }]} accessible={false}>
      <Animated.View style={[s.core, coreStyle]} />
      {sparks.map((sp) => <Spark key={sp.key} progress={progress} dx={sp.dx} dy={sp.dy} color={sp.color} delayK={sp.delayK} />)}
    </View>
  );
}

export default memo(MomentFirework);

/** Дрожь экрана 700 мс (эталон emRumble): translate по затухающей амплитуде. Возвращает стиль для контейнера и запуск. Нет движения при reduceMotion. */
export function useMomentRumble(): Readonly<{ style: ReturnType<typeof useAnimatedStyle>; play: () => void }> {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const play = useCallback(() => {
    if (reduceMotion) return;
    const steps: readonly (readonly [number, number])[] = [[-6, 3], [6, -3], [-5, 2], [5, -2], [-3, 1], [3, -1], [-1, 0], [0, 0]];
    x.value = withSequence(...steps.map(([dx]) => withTiming(dx, { duration: 87, easing: Easing.linear })));
    y.value = withSequence(...steps.map(([, dy]) => withTiming(dy, { duration: 87, easing: Easing.linear })));
  }, [reduceMotion, x, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));
  return { style, play };
}

const s = StyleSheet.create({
  burst: { position: 'absolute', width: 0, height: 0 },
  spark: { position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: 3 },
  core: { position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }, // theme-exempt: вспышка ядра фейерверка — иллюстрация образца
});
