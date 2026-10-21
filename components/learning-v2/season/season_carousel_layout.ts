// ════════════════════════════════════════════════════════════════════════════
// season_carousel_layout.ts — математика карусели карт эпизодов «Сезона» (эталон course-hybrid-1-4.html, `.h2c` и `flowCard`).
//
// зачем (владелец 21.10): центральная карта крупнее, соседние уходят в глубину и поворачиваются, свайп листает. В CSS карта задана как
//   transform: translateX(k·116px) translateZ(−|k|·80px) rotateY(−k·26deg), родитель — perspective 900px, дальние карты (|k| ≥ 2) — opacity .5.
// React Native не знает translateZ, поэтому глубина заменена масштабом s = 900 / (900 + |k|·80) (та же перспективная проекция), сдвиг по X
// тоже умножается на s (в CSS translateZ идёт между поворотом и сдвигом — сдвиг масштабируется проекцией). Offset — дробный: во время свайпа
// карта плавно проходит все промежуточные положения. Функции помечены 'worklet' — их зовёт анимация на UI-треде (Reanimated), без setState на кадр.
// ════════════════════════════════════════════════════════════════════════════

export const SEASON_CAROUSEL = {
  /** `.h2c`: ширина 172, высота 230, радиус 24. */
  cardWidth: 172,
  cardHeight: 230,
  cardRadius: 24,
  /** `.h2flow`: высота 244, отступ сверху 12, перспектива 900. */
  flowHeight: 244,
  flowMarginTop: 12,
  perspective: 900,
  /** Шаг по X между соседними картами, глубина на шаг, поворот на шаг. */
  shiftX: 116,
  depthZ: 80,
  rotateDeg: 26,
  /** Прозрачность дальних карт (|k| ≥ 2). */
  farOpacity: 0.5,
  /** Сколько карт по каждую сторону центра реально рисуем (виртуализация, №39): вне окна карты не монтируются. */
  windowRadius: 2,
} as const;

export type SeasonCardLayout = Readonly<{
  translateX: number;
  scale: number;
  rotateYDeg: number;
  opacity: number;
  zIndex: number;
}>;

/** Положение карты по её смещению от центра (offset = индекс карты − позиция карусели, дробное). */
export function seasonCardLayout(offset: number): SeasonCardLayout {
  'worklet';
  const a = Math.abs(offset);
  const scale = SEASON_CAROUSEL.perspective / (SEASON_CAROUSEL.perspective + a * SEASON_CAROUSEL.depthZ);
  // прозрачность: у центра и ближайших соседей 1, к |offset| = 2 плавно падает до farOpacity и дальше не меняется
  const opacity = a <= 1 ? 1 : a >= 2 ? SEASON_CAROUSEL.farOpacity : 1 - (a - 1) * (1 - SEASON_CAROUSEL.farOpacity);
  return {
    translateX: offset * SEASON_CAROUSEL.shiftX * scale,
    scale,
    rotateYDeg: -offset * SEASON_CAROUSEL.rotateDeg,
    opacity,
    zIndex: Math.round(10 - a),
  };
}

/** Ближайший индекс карты для позиции карусели (с зажимом в границы колоды). */
export function seasonNearestIndex(position: number, count: number): number {
  'worklet';
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(position)));
}

/** Индексы карт, которые нужно смонтировать вокруг центра (окно ±radius, зажатое в границы колоды). */
export function seasonWindowIndexes(center: number, count: number, radius: number = SEASON_CAROUSEL.windowRadius): number[] {
  const from = Math.max(0, Math.floor(center) - radius);
  const to = Math.min(count - 1, Math.ceil(center) + radius);
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

/**
 * Порог смены карты при отпускании пальца: далеко протянули (больше четверти шага) или быстро смахнули (скорость больше порога) —
 * листаем в сторону жеста, иначе возвращаемся к ближайшей. Возвращает целевой индекс.
 */
export function seasonSnapTarget(position: number, velocityX: number, count: number): number {
  'worklet';
  const FLICK = 520; // px/с: быстрый смах листает даже при коротком протягивании
  // палец влево (velocity < 0) двигает позицию к следующей карте, вправо — к предыдущей
  const target = Math.abs(velocityX) > FLICK
    ? (velocityX < 0 ? Math.floor(position) + 1 : Math.ceil(position) - 1)
    : Math.round(position);
  return Math.min(count - 1, Math.max(0, target));
}
