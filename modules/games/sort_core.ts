/**
 * Игра «Сортировка» — правила без React. Эталон: docs/design/v2-app/elevate-mechanics.app.js, `sort()`.
 * Игрок смахивает фразу в одну из двух корзин; промах возвращает карту и считается «с подсказкой».
 */

export type SortSide = 'left' | 'right';

export interface SortTask {
  readonly id: string;
  readonly text: string;
  readonly side: SortSide;
  /** Подсказка на карте: почему фраза относится к своей корзине. */
  readonly hint: string;
}

export interface SortBin {
  readonly title: string;
  readonly example: string;
}

export interface SortDeck {
  readonly id: string;
  readonly left: SortBin;
  readonly right: SortBin;
  readonly tasks: readonly SortTask[];
}

/** Утверждённый владельцем пример из макета (11.11.2026). Колоды по урокам — отдельная задача с вычиткой. */
export const SORT_SEED_DECK: SortDeck = {
  id: 'seed-now-usually',
  left: { title: 'Прямо сейчас', example: 'am / is / are + -ing' },
  right: { title: 'Обычно', example: 'каждый день, всегда' },
  tasks: [
    { id: 's1', text: 'I am working now', side: 'left', hint: 'now — действие идёт прямо сейчас' },
    { id: 's2', text: 'He cooks dinner every day', side: 'right', hint: 'every day — это привычка' },
    { id: 's3', text: 'She is writing messages', side: 'left', hint: 'is writing — она в процессе' },
    { id: 's4', text: 'We usually wait here', side: 'right', hint: 'usually — так бывает обычно' },
    { id: 's5', text: 'They are watching TV', side: 'left', hint: 'are watching — они в процессе' },
    { id: 's6', text: 'I listen to music on Fridays', side: 'right', hint: 'on Fridays — повторяется' },
  ],
};

/** Порог смахивания из макета: дальше 90 точек — карта уходит в корзину, ближе — возвращается. */
export const SORT_SWIPE_THRESHOLD = 90;
/** С этого смещения корзина подсвечивается. */
export const SORT_HOT_THRESHOLD = 70;

export function sortSideFromSwipe(dx: number): SortSide | null {
  if (!Number.isFinite(dx) || Math.abs(dx) <= SORT_SWIPE_THRESHOLD) return null;
  return dx < 0 ? 'left' : 'right';
}

export interface SortState {
  readonly index: number;
  readonly left: number;
  readonly right: number;
  readonly misses: number;
  /** На текущей карте уже был промах. */
  readonly missedThisCard: boolean;
}

export const INITIAL_SORT_STATE: SortState = { index: 0, left: 0, right: 0, misses: 0, missedThisCard: false };

export interface SortDropResult {
  readonly correct: boolean;
  readonly finished: boolean;
  /** Карта решена с первого раза — только тогда идут очки навыка. */
  readonly firstTry: boolean;
  readonly state: SortState;
}

export function dropSortCard(state: SortState, deck: SortDeck, side: SortSide): SortDropResult {
  const task = deck.tasks[state.index];
  if (!task) return { correct: false, finished: true, firstTry: false, state };
  if (task.side !== side) {
    return { correct: false, finished: false, firstTry: false, state: { ...state, misses: state.misses + 1, missedThisCard: true } };
  }
  const next: SortState = { ...state, index: state.index + 1, [side]: state[side] + 1, missedThisCard: false };
  return { correct: true, finished: next.index >= deck.tasks.length, firstTry: !state.missedThisCard, state: next };
}
