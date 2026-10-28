// ═══════════════════════════════════════════════════════════════════════════
// story_frame_clock.tsx — единые «часы кадра» историй и кривые макета.
//
// зачем (владелец 28.10, макет stories-templates-v1.html): удержание ставит на паузу ВСЁ — полосу и движение кадра. Часы кадра = прогресс полосы
// просмотра (SharedValue на UI-треде, 0..1 за 10 с): пауза и возобновление не требуют ни одного setState, кадр стоит ровно там, где палец его
// остановил. «Уменьшить движение» и экранный диктор — часы сразу «в конце»: кадр стоит в конечном состоянии, вечные циклы — в покое.
// Кривые — из макета: ease-out .23,1,.32,1 (входы), пружина .34,1.56,.64,1 (появление), CSS ease-out / ease-in-out.
// ═══════════════════════════════════════════════════════════════════════════
import { createContext, useContext, useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export type StoryFrameClock = Readonly<{
  /** Прогресс кадра 0..1 (полоса просмотра). */
  progress: SharedValue<number>;
  /** Длительность кадра, мс (10 с — STORY_SLIDE_MS). */
  durationMs: number;
  /** true — без движения: кадр сразу в конечном состоянии (уменьшение движения, диктор, превью без часов). */
  final: boolean;
}>;

const ClockContext = createContext<StoryFrameClock | null>(null);
export const StoryFrameClockProvider = ClockContext.Provider;

/** «Конец» для final: дальше любого входа макета (самый поздний закончится к ~3 с). */
export const STORY_FRAME_FINAL_MS = 1e7;

/** Часы текущего кадра; вне просмотра (тест, превью) — неподвижные часы в конечном состоянии. */
export function useStoryFrameClock(): StoryFrameClock {
  const ctx = useContext(ClockContext);
  const still = useSharedValue(1);
  return useMemo(() => ctx ?? { progress: still, durationMs: 10_000, final: true }, [ctx, still]);
}

/** Мс от начала кадра. */
export function frameMs(progress: number, durationMs: number, final: boolean): number {
  'worklet';
  return final ? STORY_FRAME_FINAL_MS : progress * durationMs;
}

/** Доля отрезка [d, d + dur] — 0 до начала, 1 после конца (как CSS animation с fill both). */
export function phase(t: number, d: number, dur: number): number {
  'worklet';
  if (t <= d) return 0;
  if (t >= d + dur) return 1;
  return (t - d) / dur;
}

/**
 * CSS cubic-bezier(x1, y1, x2, y2): значение кривой по доле времени x (Ньютон, при сбое — бисекция). Worklet.
 * зачем: своя функция, а не Easing.bezierFn — кривая нужна как обычная функция и на UI-треде, и в тесте с упрощённой подменой Reanimated.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return (x: number): number => {
    'worklet';
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const fx = ((ax * t + bx) * t + cx) * t - x;
      const dx = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(fx) < 1e-6 || Math.abs(dx) < 1e-6) break;
      t -= fx / dx;
    }
    if (t < 0 || t > 1 || Math.abs(((ax * t + bx) * t + cx) * t - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 24; i += 1) {
        if (((ax * t + bx) * t + cx) * t < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

/** ease-out .23,1,.32,1 — входы макета (stUp, stRise, полосы, кольцо). */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
/** Пружина .34,1.56,.64,1 — появление (stPop), с лёгким перелётом за 1. */
export const EASE_SPRING = cubicBezier(0.34, 1.56, 0.64, 1);
/** CSS ease-out — проявление (stFade). */
export const EASE_CSS_OUT = cubicBezier(0, 0, 0.58, 1);
/** CSS ease-in-out — дыхание и плавание арта. */
export const EASE_CSS_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);
/** .2,.7,.3,1 — разлёт конфетти. */
export const EASE_CONF = cubicBezier(0.2, 0.7, 0.3, 1);
/** .4,0,1,1 — падение монет. */
export const EASE_FALL = cubicBezier(0.4, 0, 1, 1);

/** Цикл туда-обратно (CSS `infinite alternate`) — 0..1..0 за 2 × period; в final — покой (0). */
export function pingPong(t: number, periodMs: number, final: boolean): number {
  'worklet';
  if (final || periodMs <= 0) return 0;
  const k = (t / periodMs) % 2;
  return k <= 1 ? k : 2 - k;
}

/** Цикл по кругу 0..1 (CSS `infinite`); в final — покой (0). */
export function loop(t: number, periodMs: number, final: boolean): number {
  'worklet';
  if (final || periodMs <= 0) return 0;
  return (t % periodMs) / periodMs;
}

/** Группы разрядов как в макете (`fmt`): 10 000, 1 420; неразрывный пробел, чтобы число не рвалось. */
export function groupThousands(value: number): string {
  'worklet';
  const n = Math.max(0, Math.round(value));
  const raw = String(n);
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const fromEnd = raw.length - i;
    out += raw[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ' ';
  }
  return out;
}
