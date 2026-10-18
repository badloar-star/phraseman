// ═══════════════════════════════════════════════════════════════════════════
// MonthCalendar.tsx — календарь месяца рубежа 30: сетка 5×7, горят первые `lit` (эталон engagement-moments-v3-all.html:859, `.calendar`).
//
// зачем (Сверка 15fc5ef7f, [D30-CAL]: «cell:layout w=42 h=0 с первой раскладки»; координатор 18.10): клетки `{ width: '12.2%', aspectRatio: 1 }`
// в ряду с переносом получали высоту 0 — календарь смонтирован, но не нарисован. Теперь надёжно, без опоры на aspectRatio и вложенные layout-анимации:
//  • размер клетки в пикселях от ширины ряда: (ширина − 6 × 6) / 7 — как `grid-template-columns: repeat(7, 1fr); gap: 6px` эталона;
//  • пока ширины нет — клеток нет (ряд пуст, ничего не мигает);
//  • появление — своё, по эталону: у каждой клетки `emPop 300ms var(--em-ease-pop)` с задержкой i × 26 мс (масштаб .4 → 1.12 на 70 % → 1, прозрачность 0 → 1 к 70 %),
//    на одних общих часах UI-потока, а не ZoomIn внутри FadeInDown такта. reduceMotion — сразу итог.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { useStreakColors } from './use_streak_colors';
import { STREAK_PROBE, traceCalendarPaint, type CalendarPaintRefs } from './streak_calendar_probe';

const CAL_CELLS = 35;
const COLS = 7;
const GAP = 6;
const CELL_DELAY_MS = 26;
const CELL_DUR_MS = 300;
const TOTAL_MS = (CAL_CELLS - 1) * CELL_DELAY_MS + CELL_DUR_MS;
/** --em-ease-pop: cubic-bezier(.3, 1.6, .5, 1). Своя функция (воркет), а не Easing.bezierFn — не зависит от подмен reanimated в тестах. */
export function easePop(x: number): number {
  'worklet';
  const x1 = 0.3, y1 = 1.6, x2 = 0.5, y2 = 1;
  const bx = (t: number) => 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t;
  const by = (t: number) => 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
  const dx = (t: number) => 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let k = 0; k < 8; k += 1) {
    const d = dx(t);
    if (Math.abs(d) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - (bx(t) - x) / d));
  }
  return by(t);
}

/** Размер клетки по ширине ряда: 7 колонок и 6 зазоров по 6 px; 0 — ширины ещё нет. */
export function monthCalendarCellSize(rowWidth: number): number {
  return rowWidth > 0 ? Math.floor((rowWidth - GAP * (COLS - 1)) / COLS) : 0;
}

type CellProps = Readonly<{ i: number; size: number; color: string; clock: SharedValue<number>; cellRef?: React.Ref<View>; onLayout?: (i: number, w: number, h: number) => void }>;

const CalCell = memo(function CalCell({ i, size, color, clock, cellRef, onLayout }: CellProps) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (clock.value - i * CELL_DELAY_MS) / CELL_DUR_MS));
    // emPop: 0 % — .4 и прозрачно; 70 % — 1.12 и видно; 100 % — 1; кривая --em-ease-pop на каждом отрезке ключей
    if (p < 0.7) {
      const e = easePop(p / 0.7);
      return { opacity: Math.min(1, e), transform: [{ scale: 0.4 + 0.72 * e }] };
    }
    const e = easePop((p - 0.7) / 0.3);
    return { opacity: 1, transform: [{ scale: 1.12 - 0.12 * e }] };
  });
  return (
    <Animated.View
      ref={cellRef}
      onLayout={onLayout ? (e) => onLayout(i, e.nativeEvent.layout.width, e.nativeEvent.layout.height) : undefined}
      style={[s.cell, { width: size, height: size, backgroundColor: color }, style]}
    />
  );
});

/** probeRefs — только отладка (STREAK_PROBE): столбец текста и родитель для [STREAK-MILESTONE] calendar:paint. */
export const MonthCalendar = memo(function MonthCalendar({ lit = 30, probeRefs }: Readonly<{ lit?: number; probeRefs?: () => Pick<CalendarPaintRefs, 'column' | 'parent'> }>) {
  const p = useSpirePalette();
  const colors = useStreakColors();
  const reduceMotion = useReducedMotion();
  const probe = STREAK_PROBE && !!probeRefs;
  const [size, setSize] = useState(0);
  const clock = useSharedValue(reduceMotion ? TOTAL_MS : 0);
  const rootRef = useRef<View>(null);
  const firstRef = useRef<View>(null);
  const thirtiethRef = useRef<View>(null);
  const laidOutRef = useRef(0);
  const tracedRef = useRef(false);
  const mountAtRef = useRef(Date.now());
  const d30Log = (what: string, data: Record<string, unknown>) => console.log(`[D30-CAL] ${what} ${JSON.stringify({ sinceMountMs: Date.now() - mountAtRef.current, ...data })}`); // guard-ok: строка пробы (только отладка)

  // часы появления стартуют, когда клетки получили размер (иначе первые клетки отыграли бы невидимыми)
  useEffect(() => {
    if (size === 0) return undefined;
    if (reduceMotion) { clock.value = TOTAL_MS; return undefined; }
    clock.value = 0;
    clock.value = withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [size, reduceMotion, clock]);

  const onRowLayout = (w: number, h: number) => {
    const next = monthCalendarCellSize(w);
    if (probe) d30Log('row:layout', { w: Math.round(w), h: Math.round(h), cell: next, reduceMotion });
    if (next !== size) setSize(next);
  };
  // плановый конец появления клетки + 50 мс: замер на экране = итоговый размер (только отладка)
  const measureAfterEnter = (i: number) => {
    const atMs = (reduceMotion ? 0 : i * CELL_DELAY_MS + CELL_DUR_MS) + 50;
    setTimeout(() => {
      const ref = i === 0 ? firstRef.current : thirtiethRef.current;
      if (!ref) { d30Log('enter:end', { i, plannedEndMs: atMs, box: null, reason: 'no_ref_unmounted' }); return; }
      ref.measureInWindow((x, y, w, h) => d30Log('enter:end', { i, plannedEndMs: atMs, box: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, scaleZero: Math.round(w) === 0 || Math.round(h) === 0 }));
    }, atMs);
  };
  const onCellLayout = (i: number, w: number, h: number) => {
    if (i === 0 || i === 29) {
      measureAfterEnter(i);
      d30Log('cell:layout', { i, w: Math.round(w), h: Math.round(h), heightZero: Math.round(h) === 0, plannedEnterStartMs: reduceMotion ? null : i * CELL_DELAY_MS, durMs: CELL_DUR_MS, style: { size } });
    }
    laidOutRef.current += 1;
    if (tracedRef.current || laidOutRef.current < CAL_CELLS || !probeRefs) return;
    tracedRef.current = true;
    traceCalendarPaint(() => ({ root: rootRef.current, first: firstRef.current, thirtieth: thirtiethRef.current, ...probeRefs() }), {
      laidOut: () => laidOutRef.current, total: CAL_CELLS, lit, cellOn: colors.accentGraphic, cellOff: p.control, reduceMotion, cellDelayMs: CELL_DELAY_MS, cellDurMs: CELL_DUR_MS,
    });
  };

  return (
    <View ref={rootRef} accessible={false} style={s.cal} onLayout={(e) => onRowLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}>
      {size > 0 ? Array.from({ length: CAL_CELLS }, (_, i) => (
        <CalCell
          key={i} // guard-ok: 35 одинаковых клеток фиксированного календаря, порядок не меняется
          i={i}
          size={size}
          color={i < lit ? colors.accentGraphic : p.control}
          clock={clock}
          cellRef={i === 0 ? firstRef : i === 29 ? thirtiethRef : undefined}
          onLayout={probe ? onCellLayout : undefined}
        />
      )) : null}
    </View>
  );
});

const s = StyleSheet.create({
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, width: '100%' },
  cell: { borderRadius: 8 },
});
