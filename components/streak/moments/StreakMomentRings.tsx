// ═══════════════════════════════════════════════════════════════════════════
// StreakMomentRings.tsx — графика сцен рубежей: круг года/двух лет из дуг-месяцев, кольцо пути к Легенде (500) и календарь месяца (30).
// Образец: streak-milestones.html (`monthRing`, `half500`, `.cal`).
//
// зачем (координатор 14.10: «у каждого рубежа своя сцена, не перекраска»): 12 дуг на год (внешнее кольцо — первый год), каждая зажигается 260 мс со своей задержкой;
// кольцо 500 заполняется до половины за 1,6 с; календарь — 35 клеток, 30 горят, появляются по 26 мс. Всё на UI-треде (animatedProps/entering); reduceMotion — сразу в конечном виде.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSpirePalette } from '../../spire/useSpirePalette';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE = Easing.bezier(0.2, 1, 0.3, 1);

/** Путь дуги месяца m (0…11) на радиусе r: 30° на месяц, зазор 5° (эталон `monthRing`). */
export function monthArcPath(c: number, r: number, month: number): string {
  const pt = (a: number) => [c + r * Math.cos(((a - 90) * Math.PI) / 180), c + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = pt(month * 30 + 2.5);
  const [x1, y1] = pt(month * 30 + 27.5);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

type ArcProps = Readonly<{ d: string; lit: boolean; delayMs: number; track: string; color: string }>;
const MonthArc = memo(function MonthArc({ d, lit, delayMs, track, color }: ArcProps) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(0);
  useEffect(() => {
    on.value = !lit ? 0 : reduceMotion ? 1 : withDelay(delayMs, withTiming(1, { duration: 260, easing: EASE }));
  }, [lit, delayMs, reduceMotion, on]);
  const animated = useAnimatedProps(() => ({ strokeOpacity: on.value }));
  return (
    <>
      <Path d={d} fill="none" stroke={track} strokeWidth={14} strokeLinecap="round" />
      <AnimatedPath d={d} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" animatedProps={animated} />
    </>
  );
});

export type MonthRingProps = Readonly<{ rings: 1 | 2; size: number; center: string; lit: boolean; stepMs: number }>;

/** Круг месяцев; внешнее кольцо — первый год и зажигается первым. */
export const MonthRing = memo(function MonthRing({ rings, size, center, lit, stepMs }: MonthRingProps) {
  const p = useSpirePalette();
  const c = size / 2;
  const arcs = useMemo(() => {
    const out: { key: string; d: string; delayMs: number }[] = [];
    for (let k = 0; k < rings; k++) {
      for (let m = 0; m < 12; m++) out.push({ key: `${k}-${m}`, d: monthArcPath(c, c - 12 - k * 24, m), delayMs: (k * 12 + m) * stepMs });
    }
    return out;
  }, [rings, c, stepMs]);
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={s.overflow}>
        {arcs.map((a) => <MonthArc key={a.key} d={a.d} lit={lit} delayMs={a.delayMs} track={p.track} color={p.cta} />)}
      </Svg>
      <View style={s.center} pointerEvents="none"><Text style={[s.centerText, { color: p.text }]}>{center}</Text></View>
    </View>
  );
});

export type HalfRingProps = Readonly<{ size: number; run: boolean; children?: React.ReactNode }>;
const HALF_LEN = 710;

/** Кольцо пути к Легенде: дорожка и дуга, которая за 1,6 с доходит до половины; в центре — огонь. */
export const HalfRing = memo(function HalfRing({ size, run, children }: HalfRingProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(reduceMotion ? HALF_LEN / 2 : HALF_LEN);
  useEffect(() => {
    if (run) offset.value = reduceMotion ? HALF_LEN / 2 : withTiming(HALF_LEN / 2, { duration: 1600, easing: EASE });
  }, [run, reduceMotion, offset]);
  const animated = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={[StyleSheet.absoluteFill, s.overflow]}>
        <Circle cx={c} cy={c} r={113} fill="none" stroke={p.track} strokeWidth={12} />
        <AnimatedCircle cx={c} cy={c} r={113} fill="none" stroke={p.cta} strokeWidth={12} strokeLinecap="round" strokeDasharray={HALF_LEN} animatedProps={animated} transform={`rotate(-90 ${c} ${c})`} />
      </Svg>
      {children}
    </View>
  );
});

/** Календарь месяца: 35 клеток, горят первые `lit`; клетки появляются по 26 мс. */
export const MonthCalendar = memo(function MonthCalendar({ lit = 30 }: Readonly<{ lit?: number }>) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  return (
    <View accessible={false} style={s.cal}>
      {Array.from({ length: 35 }, (_, i) => (
        <Animated.View
          key={i} // guard-ok: 35 одинаковых клеток фиксированного календаря, порядок не меняется
          entering={reduceMotion ? undefined : ZoomIn.delay(i * 26).duration(300)}
          style={[s.cell, { backgroundColor: i < lit ? p.cta : p.control }]}
        />
      ))}
    </View>
  );
});

const s = StyleSheet.create({
  overflow: { overflow: 'visible' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 40, lineHeight: 48, fontWeight: '800' },
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
  cell: { width: '12.2%', aspectRatio: 1, borderRadius: 8 },
});
