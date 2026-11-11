/**
 * Игры на диалогах — правила без React. Эталон: docs/design/v2-app/elevate-games.js, `hunt()` и `order()`.
 *  • «Охота на ошибку»: в диалоге одно слово неверное — найти его нажатием; оно заменяется верным.
 *  • «Собери диалог»: реплики нажимаются по порядку и встают в ленту.
 */

// ── Охота на ошибку ─────────────────────────────────────────────────────
export interface HuntLine {
  /** Реплика справа (собеседник) или слева. */
  readonly right: boolean;
  /** Слова реплики; нажать можно только те, что помечены `tappable`. */
  readonly words: readonly string[];
  /** Индексы слов-кандидатов (подсвечиваются как нажимаемые). */
  readonly tappable: readonly number[];
}

export interface HuntTask {
  readonly id: string;
  readonly lines: readonly HuntLine[];
  /** Где ошибка: номер реплики и номер слова в ней. */
  readonly wrong: Readonly<{ line: number; word: number }>;
  /** Верное слово, которое встаёт на место ошибки. */
  readonly fix: string;
  /** Объяснение одной фразой. */
  readonly why: string;
}

/** Утверждённый владельцем пример из макета (11.11.2026). */
export const HUNT_SEED_TASKS: readonly HuntTask[] = [
  {
    id: 'hunt-1',
    lines: [
      { right: false, words: ['Does', 'she', 'work', 'here?'], tappable: [] },
      { right: true, words: ['Yes,', 'she', 'work', 'here', 'every', 'day.'], tappable: [2] },
      { right: false, words: ['Great,', 'I', 'am', 'waiting', 'for', 'her.'], tappable: [3] },
    ],
    wrong: { line: 1, word: 2 },
    fix: 'works',
    why: 'В настоящем после she глагол получает -s.',
  },
];

export function isValidHuntTask(task: HuntTask): boolean {
  const line = task.lines[task.wrong.line];
  if (!task.id || !line || !task.fix.trim()) return false;
  if (task.wrong.word < 0 || task.wrong.word >= line.words.length) return false;
  // зачем: ошибочное слово обязано быть среди нажимаемых, иначе задание нельзя решить
  if (!line.tappable.includes(task.wrong.word)) return false;
  return task.lines.every((l) => l.tappable.every((i) => i >= 0 && i < l.words.length));
}

export function isHuntHit(task: HuntTask, line: number, word: number): boolean {
  return task.wrong.line === line && task.wrong.word === word;
}

/** Реплики после исправления — для показа итога. */
export function huntFixedLines(task: HuntTask): readonly HuntLine[] {
  return task.lines.map((l, i) => (i === task.wrong.line ? { ...l, words: l.words.map((w, k) => (k === task.wrong.word ? task.fix : w)) } : l));
}

// ── Собери диалог ───────────────────────────────────────────────────────
export interface OrderTask {
  readonly id: string;
  /** Реплики в верном порядке; чётные — слева, нечётные — справа. */
  readonly lines: readonly string[];
}

export const ORDER_SEED_TASKS: readonly OrderTask[] = [
  { id: 'order-1', lines: ['Hi! Are you waiting here?', 'Yes, I am waiting for my friend.', 'Is he coming now?', 'He is parking the car.'] },
];

export function isValidOrderTask(task: OrderTask): boolean {
  const unique = new Set(task.lines.map((l) => l.trim().toLowerCase()));
  return Boolean(task.id) && task.lines.length >= 3 && unique.size === task.lines.length && task.lines.every((l) => l.trim().length > 0);
}

/**
 * Порядок кнопок с репликами. Перемешивание не должно совпасть с верным порядком, иначе игра решается
 * нажатием сверху вниз; при совпадении список сдвигается на одну позицию.
 */
export function shuffledOrder(count: number, rng: () => number = Math.random): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (count > 1 && order.every((v, i) => v === i)) return [...order.slice(1), order[0]];
  return order;
}

export interface OrderState {
  /** Сколько реплик уже поставлено. */
  readonly placed: number;
  readonly misses: number;
}

export const INITIAL_ORDER_STATE: OrderState = { placed: 0, misses: 0 };

export interface OrderTapResult {
  readonly correct: boolean;
  readonly finished: boolean;
  readonly state: OrderState;
}

/** Нажатие на реплику с номером `lineIndex` (номер в верном порядке). */
export function tapOrderLine(state: OrderState, task: OrderTask, lineIndex: number): OrderTapResult {
  if (state.placed >= task.lines.length) return { correct: false, finished: true, state };
  if (lineIndex !== state.placed) return { correct: false, finished: false, state: { ...state, misses: state.misses + 1 } };
  const next = { ...state, placed: state.placed + 1 };
  return { correct: true, finished: next.placed >= task.lines.length, state: next };
}
