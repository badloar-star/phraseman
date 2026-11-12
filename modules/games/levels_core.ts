/**
 * Уровни сложности игры — правила без React. Эталон: docs/design/v2-app/elevate-games.js, `levels()`.
 * Правило с макета: «Три хороших захода подряд — уровень вверх. Два слабых — вниз». Уровень человек не выбирает.
 * зачем отдельным модулем: правило одинаково для любой игры с уровнями (в макете — «Блиц»); экран только рисует,
 * а что считать «хорошим заходом», решает игра при подключении.
 */

/** Пять ступеней лестницы «Блица» (elevate-games.js:92). */
export const LEVELS_COUNT = 5;
/** Сколько хороших заходов подряд поднимают уровень — по числу делений на экране. */
export const LEVELS_GOOD_TO_RISE = 3;
/** Сколько слабых заходов подряд опускают уровень. */
export const LEVELS_WEAK_TO_DROP = 2;

export interface LevelsState {
  /** Номер ступени с нуля: 0 — «Старт». */
  readonly level: number;
  /** Хороших заходов подряд к этому моменту — столько делений горит. */
  readonly good: number;
  /** Слабых заходов подряд к этому моменту. */
  readonly weak: number;
}

export const INITIAL_LEVELS_STATE: LevelsState = { level: 0, good: 0, weak: 0 };

export interface LevelsRunResult {
  readonly state: LevelsState;
  /** Как изменился уровень: +1, −1 или 0 — по нему экран решает, подскакивает ли надпись. */
  readonly moved: -1 | 0 | 1;
}

const clampInt = (value: unknown, min: number, max: number): number => {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
};

/** Привести внешние данные (адрес экрана, сохранённое значение) к допустимому состоянию. */
export function normalizeLevelsState(raw: Partial<Record<keyof LevelsState, unknown>> | null | undefined): LevelsState {
  return {
    level: clampInt(raw?.level, 0, LEVELS_COUNT - 1),
    good: clampInt(raw?.good, 0, LEVELS_GOOD_TO_RISE - 1),
    weak: clampInt(raw?.weak, 0, LEVELS_WEAK_TO_DROP - 1),
  };
}

/**
 * Итог одного захода. Хороший заход обнуляет серию слабых, слабый — серию хороших.
 * На верхней ступени уровень дальше не растёт, на нижней — не падает; серия при этом всё равно обнуляется,
 * чтобы деления не застывали полными.
 */
export function applyLevelRun(state: LevelsState, good: boolean): LevelsRunResult {
  const current = normalizeLevelsState(state);
  if (good) {
    const streak = current.good + 1;
    if (streak < LEVELS_GOOD_TO_RISE) return { state: { level: current.level, good: streak, weak: 0 }, moved: 0 };
    const level = Math.min(LEVELS_COUNT - 1, current.level + 1);
    return { state: { level, good: 0, weak: 0 }, moved: level > current.level ? 1 : 0 };
  }
  const streak = current.weak + 1;
  if (streak < LEVELS_WEAK_TO_DROP) return { state: { level: current.level, good: 0, weak: streak }, moved: 0 };
  const level = Math.max(0, current.level - 1);
  return { state: { level, good: 0, weak: 0 }, moved: level < current.level ? -1 : 0 };
}

export type LevelRowState = 'done' | 'cur' | 'next';

/** Вид строки лестницы: пройденная, текущая или впереди (elevate-games.js:98). */
export function levelRowState(state: LevelsState, index: number): LevelRowState {
  if (index < state.level) return 'done';
  return index === state.level ? 'cur' : 'next';
}
