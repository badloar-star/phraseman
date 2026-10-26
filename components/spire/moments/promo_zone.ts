// promo_zone.ts — где встаёт полоса «топ-5» на лестнице окна повышения (MomentPromotion, акт 1).
// зачем (координатор 26.10, давняя ошибка): метка зоны (1,6 с) брала высоту строки из замыкания сценария, запущенного на монтировании, —
// всегда запасные 48. Настоящая высота строки сюда не доходила, и если строка выше или ниже, полоса вставала мимо границы топ-5.
// Теперь высота живёт в трекере: зона берёт последнюю измеренную; если строка измерилась уже после старта зоны — полоса доезжает до неё.

export const PROMO_ROW_GAP = 6;
export const PROMO_FALLBACK_ROW_H = 48;
export const PROMO_TOP5 = 5;

/** Верх полосы «топ-5»: под пятой строкой лестницы. */
export function promoZoneTop(rowH: number): number {
  return (rowH + PROMO_ROW_GAP) * PROMO_TOP5 - 3;
}

export type PromoZoneMove = 'zone_start' | 'late_measure';

export type PromoZoneTracker = Readonly<{
  /** Замер первой строки (onLayout). */
  measured: (rowH: number) => void;
  /** Метка зоны сценария: полоса начинает ехать к границе. */
  start: () => void;
  rowH: () => number;
}>;

export function createPromoZoneTracker(move: (top: number, why: PromoZoneMove) => void): PromoZoneTracker {
  let h = PROMO_FALLBACK_ROW_H;
  let started = false;
  return {
    measured(next) {
      const rounded = Math.round(next);
      if (!(rounded > 0) || rounded === h) return; // пустой или тот же замер — полосе ехать некуда
      h = rounded;
      if (started) move(promoZoneTop(h), 'late_measure');
    },
    start() {
      started = true;
      move(promoZoneTop(h), 'zone_start');
    },
    rowH: () => h,
  };
}
