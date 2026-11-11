/**
 * Игра «Лишнее слово» — правила без React. Эталон: docs/design/v2-app/elevate-mechanics.app.js, `cut()`.
 * Во фразу вставлено одно лишнее слово; игрок убирает его нажатием. Промах сбрасывает серию.
 */

export interface OddWordTask {
  readonly id: string;
  readonly words: readonly string[];
  /** Индекс лишнего слова. */
  readonly extraIndex: number;
  /** Перевод верной фразы. */
  readonly translation: string;
  /** Объяснение: короткий заголовок и одна фраза «почему». */
  readonly whyTitle: string;
  readonly whyText: string;
}

/** Утверждённые владельцем примеры из макета (11.11.2026). Банк по урокам — отдельная задача с вычиткой. */
export const ODD_WORD_SEED_TASKS: readonly OddWordTask[] = [
  { id: 'seed-1', words: ['They', 'are', 'do', 'watching', 'TV'], extraIndex: 2, translation: 'Они смотрят телевизор', whyTitle: '«do» здесь лишнее', whyText: 'В «are watching» помощник уже есть — это are.' },
  { id: 'seed-2', words: ['She', 'is', 'writing', 'to', 'messages'], extraIndex: 3, translation: 'Она пишет сообщения', whyTitle: '«to» здесь лишнее', whyText: 'Write messages — без предлога.' },
  { id: 'seed-3', words: ['I', 'am', 'be', 'working', 'now'], extraIndex: 2, translation: 'Я работаю сейчас', whyTitle: '«be» здесь лишнее', whyText: 'Am — это уже форма be.' },
  { id: 'seed-4', words: ['We', 'are', 'waiting', 'at', 'here'], extraIndex: 3, translation: 'Мы ждём здесь', whyTitle: '«at» здесь лишнее', whyText: 'Here не требует предлога.' },
];

export const ODD_WORD_DURATION_SEC = 60;

/** Задание годится, если лишнее слово существует и после его удаления остаётся фраза. */
export function isValidOddWordTask(task: OddWordTask): boolean {
  return Boolean(task.id) && task.words.length >= 3 && Number.isInteger(task.extraIndex)
    && task.extraIndex >= 0 && task.extraIndex < task.words.length && task.words.every((w) => w.trim().length > 0);
}

export interface OddWordState {
  readonly round: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly solved: number;
  readonly misses: number;
  /** На текущей фразе уже был промах — для очков «с первого раза». */
  readonly missedThisRound: boolean;
}

export const INITIAL_ODD_WORD_STATE: OddWordState = { round: 0, streak: 0, bestStreak: 0, solved: 0, misses: 0, missedThisRound: false };

export interface OddWordTapResult {
  readonly correct: boolean;
  readonly state: OddWordState;
}

/** Нажатие на слово. Верное — серия растёт и раунд решён; промах — серия в ноль, фраза остаётся. */
export function tapOddWord(state: OddWordState, task: OddWordTask, wordIndex: number): OddWordTapResult {
  if (wordIndex !== task.extraIndex) {
    return { correct: false, state: { ...state, streak: 0, misses: state.misses + 1, missedThisRound: true } };
  }
  const streak = state.streak + 1;
  return { correct: true, state: { ...state, streak, bestStreak: Math.max(state.bestStreak, streak), solved: state.solved + 1 } };
}

export function nextOddWordRound(state: OddWordState): OddWordState {
  return { ...state, round: state.round + 1, missedThisRound: false };
}

// ── Тропа: монета идёт по кривой из макета ──────────────────────────────
/** `M36 70 C 92 20, 138 96, 200 54 S 312 12, 372 44` — поле 400×96. */
export const ODD_WORD_TRAIL_PATH = 'M36 70 C 92 20, 138 96, 200 54 S 312 12, 372 44';
export const ODD_WORD_TRAIL_W = 400;
export const ODD_WORD_TRAIL_H = 96;

type Pt = readonly [number, number];
const SEGMENTS: readonly (readonly [Pt, Pt, Pt, Pt])[] = [
  [[36, 70], [92, 20], [138, 96], [200, 54]],
  // «S» отражает вторую опорную точку прошлого отрезка: 2·(200,54) − (138,96) = (262,12)
  [[200, 54], [262, 12], [312, 12], [372, 44]],
];

function bezier([p0, p1, p2, p3]: readonly [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

const SAMPLES_PER_SEGMENT = 60;

function sampledTrail(): { points: Pt[]; lengths: number[] } {
  const points: Pt[] = [];
  for (const segment of SEGMENTS) {
    for (let i = points.length === 0 ? 0 : 1; i <= SAMPLES_PER_SEGMENT; i += 1) points.push(bezier(segment, i / SAMPLES_PER_SEGMENT));
  }
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, lengths };
}

export interface OddWordTrail {
  /** Полная длина кривой — для штриха «пройдено». */
  readonly length: number;
  /** Точки остановок: индекс 0 — старт, далее по одной на каждую фразу. */
  readonly stops: readonly { readonly x: number; readonly y: number }[];
}

/** Остановки монеты: старт и по точке на каждую решённую фразу, равными долями длины кривой. */
export function oddWordTrail(taskCount: number): OddWordTrail {
  const n = Math.max(1, Math.floor(taskCount));
  const { points, lengths } = sampledTrail();
  const total = lengths[lengths.length - 1];
  const at = (share: number) => {
    const target = total * share;
    let i = lengths.findIndex((l) => l >= target);
    if (i <= 0) i = target <= 0 ? 0 : lengths.length - 1;
    return { x: points[i][0], y: points[i][1] };
  };
  return { length: total, stops: Array.from({ length: n + 1 }, (_, k) => at(k / n)) };
}
