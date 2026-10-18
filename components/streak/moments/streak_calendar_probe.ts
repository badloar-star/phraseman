// streak_calendar_probe.ts — отладочные пробы календаря рубежа 30 ([STREAK-MILESTONE] calendar:visual / calendar:paint).
// зачем (Сверка d30c 3328e1d51: календарь смонтирован, на экране, такт extra отыгран — а на кадре 0 ярких клеток из 35 112 проб; и он ПОВЕРХ подзаголовка):
// сперва логи, без гадания. Ревизор 3.34 (320d018b6): довески проб — таймеры повторных замеров, onScroll прокрутки — НЕ уезжают в стор:
// всё, кроме единичной строки раскладки, живёт только за `__DEV__ && !IS_STORE_RELEASE` (как render_cause_probe).
import type { View } from 'react-native';
import { IS_STORE_RELEASE } from '../../../app/config';

export const STREAK_PROBE = typeof __DEV__ !== 'undefined' && __DEV__ && !IS_STORE_RELEASE;
export const STREAK_PROBE_DELAYS_MS = [500, 1000, 2000] as const;
const PAINT_DELAYS_MS = [0, 500, 2000] as const;

type Box = Readonly<{ x: number; y: number; w: number; h: number }>;
const box = (v: View | null): Promise<Box | null> => new Promise((resolve) => {
  if (!v) { resolve(null); return; }
  v.measureInWindow((x, y, w, h) => resolve({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }));
});

export type CalendarPaintRefs = Readonly<{
  root: View | null;
  first: View | null;
  thirtieth: View | null;
  /** Столбец текста сцены (надзаголовок, заголовок, подзаголовок, календарь) и родитель календаря. */
  column?: View | null;
  parent?: View | null;
}>;

/**
 * Замер «нарисован ли календарь»: реальные размеры на экране первой и 30-й клетки (масштаб ZoomIn 0 → w=h=0),
 * их цвет и задержка появления, сколько клеток разложено, где столбец текста против календаря и порядок слоёв экрана.
 * Прозрачность layout-анимации из JS не читается — её заменяет размер клетки (ZoomIn ведёт масштаб и прозрачность вместе).
 */
export function traceCalendarPaint(getRefs: () => CalendarPaintRefs, info: Readonly<{
  laidOut: () => number; total: number; lit: number; cellOn: string; cellOff: string; reduceMotion: boolean; cellDelayMs: number; cellDurMs: number;
}>): void {
  if (!STREAK_PROBE) return;
  PAINT_DELAYS_MS.forEach((ms) => setTimeout(() => {
    const r = getRefs();
    void Promise.all([box(r.root), box(r.first), box(r.thirtieth), box(r.column ?? null), box(r.parent ?? null)]).then(([root, first, thirtieth, column, parent]) => {
      console.log(`[STREAK-MILESTONE] calendar:paint ${JSON.stringify({
        at: `+${ms}ms`, laidOut: info.laidOut(), total: info.total, root, parent, column,
        overlapsColumnText: !!(root && column) && root.y < column.y + column.h - root.h - 1,
        first: { box: first, color: info.cellOn, delayMs: 0, scaleZero: !!first && (first.w === 0 || first.h === 0) },
        thirtieth: { box: thirtieth, color: info.lit >= 30 ? info.cellOn : info.cellOff, delayMs: 29 * info.cellDelayMs, scaleZero: !!thirtieth && (thirtieth.w === 0 || thirtieth.h === 0) },
        entering: info.reduceMotion ? 'none(reduceMotion)' : `ZoomIn delay i*${info.cellDelayMs} dur ${info.cellDurMs} внутри Beat FadeInDown`,
        layers: 'MomentFullScreen: градиент → ореол(glowTop) → fill[конфетти → ScrollView(сцена)]; календарь — последний ребёнок столбца, zIndex не задан',
      })}`); // guard-ok: строка пробы (только отладка)
    }).catch((e: unknown) => console.warn(`[STREAK-MILESTONE] calendar:paint failed ${String(e)}`)); // guard-ok: причина сбоя пробы
  }, ms));
}
