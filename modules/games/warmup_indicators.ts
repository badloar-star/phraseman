// warmup_indicators.ts — точки, деления и места карт «Разминки» одним расчётом.
//
// зачем (обход экранов 12.11, w1_warmup: «три индикатора показывают разное»): по макету elevate-mechanics.app.js (workout)
//   • точка горит у карты спереди (idx);
//   • деление закрашено у сыгранной игры — по номеру игры дня, а не по порядку прохождения (играть можно в любом порядке);
//   • карты лежат по кругу: спереди idx, справа следующая, слева предыдущая (при двух играх левой нет).
// Экран берёт все три индикатора отсюда — разойтись они не могут по построению.
import type { WarmupState } from './warmup_state';

export type WarmupIndicators = Readonly<{
  count: number;
  /** Номер карты спереди; −1 — игр нет. */
  front: number;
  dots: readonly boolean[];
  segs: readonly boolean[];
  /** Место карты: 0 — спереди, 1 — справа, −1 — слева. */
  cardPos: readonly (-1 | 0 | 1)[];
  played: number;
  /**
   * Метки строки «Разминка N/3» на «Сегодня» — счётчик, закрашивается слева (макет elevate-real.js `.m3 i.on` по порядку).
   * зачем (обход 12.11, заход 3): строка рисовала метку у сыгранной игры — при игре не по порядку «2/3» горело справа.
   */
  todayMarks: readonly boolean[];
}>;

export function warmupIndicators(state: WarmupState, index: number): WarmupIndicators {
  const count = state.games.length;
  if (count === 0) return { count: 0, front: -1, dots: [], segs: [], cardPos: [], played: 0, todayMarks: [] };
  const front = ((index % count) + count) % count;
  const segs = state.games.map((g) => state.results[g.id] !== undefined);
  const cardPos = state.games.map((_, i): -1 | 0 | 1 => {
    const d = (i - front + count) % count;
    return d === 0 ? 0 : count > 2 && d === count - 1 ? -1 : 1;
  });
  const played = segs.filter(Boolean).length;
  return { count, front, dots: state.games.map((_, i) => i === front), segs, cardPos, played, todayMarks: state.games.map((_, i) => i < played) };
}
