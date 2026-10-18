// ═══════════════════════════════════════════════════════════════════════════
// StreakMomentRings.tsx — графика сцен рубежей: круг года/двух лет из дуг-месяцев, кольцо пути к Легенде (500) и календарь месяца (30).
// Образец: streak-milestones.html (`monthRing`, `half500`, `.cal`).
//
// зачем (координатор 14.10: «у каждого рубежа своя сцена, не перекраска»): 12 дуг на год (внешнее кольцо — первый год), каждая зажигается 260 мс со своей задержкой;
// кольцо 500 заполняется до половины за 1,6 с; календарь — 35 клеток, 30 горят, появляются по 26 мс. Всё на UI-треде (animatedProps/entering); reduceMotion — сразу в конечном виде.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { useStreakColors } from './use_streak_colors';
import { STREAK_PROBE, traceCalendarPaint, type CalendarPaintRefs } from './streak_calendar_probe';

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
  const colors = useStreakColors();
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
        {arcs.map((a) => <MonthArc key={a.key} d={a.d} lit={lit} delayMs={a.delayMs} track={p.track} color={colors.accentGraphic} />)}
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
  const colors = useStreakColors();
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
        <AnimatedCircle cx={c} cy={c} r={113} fill="none" stroke={colors.accentGraphic} strokeWidth={12} strokeLinecap="round" strokeDasharray={HALF_LEN} animatedProps={animated} transform={`rotate(-90 ${c} ${c})`} />
      </Svg>
      {children}
    </View>
  );
});

/** Календарь месяца: 35 клеток, горят первые `lit`; клетки появляются по 26 мс. */
const CAL_CELLS = 35;
const CELL_DELAY_MS = 26;
const CELL_DUR_MS = 300;

/** probeRefs — только отладка (STREAK_PROBE): столбец текста и родитель для [STREAK-MILESTONE] calendar:paint. */
export const MonthCalendar = memo(function MonthCalendar({ lit = 30, probeRefs }: Readonly<{ lit?: number; probeRefs?: () => Pick<CalendarPaintRefs, 'column' | 'parent'> }>) {
  const p = useSpirePalette();
  const colors = useStreakColors();
  const reduceMotion = useReducedMotion();
  // зачем (Сверка d30c: смонтирован, но не нарисован) — пробы клеток живут только в отладке; в сторе ни onLayout на клетках, ни таймеров
  const probe = STREAK_PROBE && !!probeRefs;
  const rootRef = useRef<View>(null);
  const firstRef = useRef<View>(null);
  const thirtiethRef = useRef<View>(null);
  const laidOutRef = useRef(0);
  const tracedRef = useRef(false);
  // зачем (Макеты 8a2a2bccf: клетки 42×0, scaleZero весь отрезок 2 с) — сперва журнал [D30-CAL]: раскладка клетки ДО преобразований (если h=0 при w=42 —
  // не масштаб, а высота не задана), ширина ряда, плановый старт ZoomIn и его конец с замером на экране (итоговый масштаб). Только отладка.
  const mountAtRef = useRef(Date.now());
  const d30Log = (what: string, data: Record<string, unknown>) => console.log(`[D30-CAL] ${what} ${JSON.stringify({ sinceMountMs: Date.now() - mountAtRef.current, ...data })}`); // guard-ok: строка пробы (только отладка)
  // плановый конец ZoomIn клетки (задержка + длительность) + 50 мс: замер на экране = итоговый масштаб (без колбэка воркета — тесты его не грузят)
  const measureAfterEnter = (i: number) => {
    const atMs = (reduceMotion ? 0 : i * CELL_DELAY_MS + CELL_DUR_MS) + 50;
    setTimeout(() => {
      const ref = i === 0 ? firstRef.current : thirtiethRef.current;
      if (!ref) { d30Log('enter:end', { i, plannedEndMs: atMs, box: null, reason: 'no_ref_unmounted' }); return; }
      ref.measureInWindow((x, y, w, h) => d30Log('enter:end', { i, plannedEndMs: atMs, box: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, scaleZero: Math.round(w) === 0 || Math.round(h) === 0 }));
    }, atMs);
  };
  const enteringFor = (i: number) => (reduceMotion ? undefined : ZoomIn.delay(i * CELL_DELAY_MS).duration(CELL_DUR_MS));
  const onCellLayout = (i: number, w: number, h: number) => {
    if (i === 0 || i === 29) measureAfterEnter(i);
    if (i === 0 || i === 29) d30Log('cell:layout', { i, w: Math.round(w), h: Math.round(h), heightZero: Math.round(h) === 0, plannedEnterStartMs: reduceMotion ? null : i * CELL_DELAY_MS, durMs: CELL_DUR_MS, style: { width: '12.2%', aspectRatio: 1 } });
    laidOutRef.current += 1;
    if (tracedRef.current || laidOutRef.current < CAL_CELLS || !probeRefs) return;
    tracedRef.current = true;
    traceCalendarPaint(() => ({ root: rootRef.current, first: firstRef.current, thirtieth: thirtiethRef.current, ...probeRefs() }), {
      laidOut: () => laidOutRef.current, total: CAL_CELLS, lit, cellOn: colors.accentGraphic, cellOff: p.control, reduceMotion, cellDelayMs: CELL_DELAY_MS, cellDurMs: CELL_DUR_MS,
    });
  };
  return (
    <View ref={rootRef} accessible={false} style={s.cal} onLayout={probe ? (e) => d30Log('row:layout', { w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height), reduceMotion }) : undefined}>
      {Array.from({ length: CAL_CELLS }, (_, i) => (
        <Animated.View
          key={i} // guard-ok: 35 одинаковых клеток фиксированного календаря, порядок не меняется
          ref={i === 0 ? firstRef : i === 29 ? thirtiethRef : undefined}
          entering={enteringFor(i)}
          onLayout={probe ? (e) => onCellLayout(i, e.nativeEvent.layout.width, e.nativeEvent.layout.height) : undefined}
          style={[s.cell, { backgroundColor: i < lit ? colors.accentGraphic : p.control }]}
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
