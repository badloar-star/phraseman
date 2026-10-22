// ═══════════════════════════════════════════════════════════════════════════
// tabbar_cap_math.ts — аналитический расчёт заливки плашки активной вкладки таб-бара (CapFill в V2TabBar) для запекания и сторожа.
//
// зачем (пункт 5 плана ускорения первого кадра, одобрен владельцем 22.10): плашка рисуется SVG-радиалом — отдельный холст и шейдер. Градиент задан в долях размера
// (центр 22 % / 0 %, rx 120 % ширины, ry 95 % высоты; стопы: цвет темы α 0,32 → 0,16 на 55 % → белый α 0,10 на 100 %), поэтому растягивается без потери вида.
// Разложение на две белые маски: C — под цвет темы, W — белый блик; α_C = α(t)·(1−u), α_W = α(t)·u, где u — доля пути от цвета темы к белому (0 до 55 %).
// ═══════════════════════════════════════════════════════════════════════════

export const CAP_STOPS = { a0: 0.32, a1: 0.16, a2: 0.1, mid: 0.55 } as const;
/** Классы прозрачности цвета плашки `accentCap` (байт альфы 8-значного hex; без альфы — FF), встречающиеся в темах: светлые темы несут цвет с альфой 10–18 %. */
export const CAP_ALPHA_CLASSES = ['ff', '1a', '24', '29', '2e'] as const;

/** Расстояние до центра в долях эллипса (0…1+) для точки (u, v) ∈ [0,1]²: cx 22 %, cy 0, rx 120 % ширины, ry 95 % высоты. */
export function capT(u: number, v: number): number {
  return Math.hypot((u - 0.22) / 1.2, v / 0.95);
}

/** Альфа-маски C и W в точке градиента t. */
export function capMasks(t: number, a = 1): { c: number; w: number; alpha: number; mix: number } {
  const tt = Math.min(1, Math.max(0, t));
  if (tt <= CAP_STOPS.mid) {
    const alpha = (CAP_STOPS.a0 + (CAP_STOPS.a1 - CAP_STOPS.a0) * (tt / CAP_STOPS.mid)) * a;
    return { c: alpha, w: 0, alpha, mix: 0 };
  }
  const u = (tt - CAP_STOPS.mid) / (1 - CAP_STOPS.mid);
  // альфа цвета темы `a` множит только первые два стопа; белый конец (0,10) с ней не связан
  const alpha = CAP_STOPS.a1 * a + (CAP_STOPS.a2 - CAP_STOPS.a1 * a) * u;
  return { c: alpha * (1 - u), w: alpha * u, alpha, mix: u };
}

/** Эталон: цвет градиента в точке поверх фона (все каналы 0…255) — как рисует SVG (интерполяция цвета и альфы, потом src-over). */
export function capComposite(accent: readonly number[], bg: readonly number[], t: number, a = 1): number[] {
  const { alpha, mix } = capMasks(t, a);
  return [0, 1, 2].map((i) => {
    const colour = accent[i]! * (1 - mix) + 255 * mix;
    return bg[i]! * (1 - alpha) + colour * alpha;
  });
}

/** Разложенный вариант: слой C (цвет темы, α_C), затем слой W (белый, α_W) — как будет рисовать приложение из двух масок. */
export function capCompositeFromMasks(accent: readonly number[], bg: readonly number[], _t: number, aC: number, aW: number): number[] {
  return [0, 1, 2].map((i) => {
    const afterC = bg[i]! * (1 - aC) + accent[i]! * aC;
    return afterC * (1 - aW) + 255 * aW;
  });
}
