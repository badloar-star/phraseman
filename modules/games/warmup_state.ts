/**
 * Разминка на 4 минуты — три игры подряд. Эталон: docs/design/v2-app/elevate-mechanics.app.js, `workout()` и `GAMES`.
 * Владелец 11.11.2026: разминка — отдельная строка каждый день, в счёт трёх заданий дня не входит;
 * отдельного списка игр нет — игры приходят сами.
 *
 * Состояние «какие игры сегодня сыграны» живёт в памяти процесса и привязано к дню: новый день — чистая разминка.
 */
import type { SkillId } from '../skills/skill_points_table';

export type WarmupGameId = 'flow' | 'odd_word' | 'sort';

export interface WarmupGame {
  readonly id: WarmupGameId;
  readonly route: string;
  readonly skill: SkillId;
  readonly name: Readonly<{ ru: string; uk: string; es: string; en: string }>;
  readonly description: Readonly<{ ru: string; uk: string; es: string; en: string }>;
}

/** Порядок и подписи — из макета. Подпись навыка берётся из таблицы навыков, а не пишется отдельно. */
export const WARMUP_GAMES: readonly WarmupGame[] = [
  {
    id: 'flow', route: '/game_flow', skill: 'speed',
    name: { ru: 'Поток', uk: 'Потік', es: 'Flujo', en: 'Flow' },
    description: { ru: 'Фраза мелькает — успей понять смысл', uk: 'Фраза мигтить — встигни зрозуміти зміст', es: 'La frase pasa rápido: capta el sentido', en: 'The phrase flashes by — catch the meaning' },
  },
  {
    id: 'odd_word', route: '/game_odd_word', skill: 'grammar',
    name: { ru: 'Лишнее слово', uk: 'Зайве слово', es: 'Palabra de más', en: 'Extra word' },
    description: { ru: 'Убери слово, которое ломает фразу', uk: 'Прибери слово, яке ламає фразу', es: 'Quita la palabra que rompe la frase', en: 'Remove the word that breaks the phrase' },
  },
  {
    id: 'sort', route: '/game_sort', skill: 'grammar',
    name: { ru: 'Сортировка', uk: 'Сортування', es: 'Clasificación', en: 'Sorting' },
    description: { ru: 'Разложи фразы: сейчас или обычно', uk: 'Розклади фрази: зараз чи зазвичай', es: 'Ordena las frases: ahora o normalmente', en: 'Sort the phrases: now or usually' },
  },
];

export interface WarmupState {
  readonly day: string;
  /** Результат сыгранной игры для метки на карте: «4 из 4». */
  readonly results: Readonly<Partial<Record<WarmupGameId, string>>>;
}

function localDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let now: () => number = () => Date.now();
let state: WarmupState = { day: localDayKey(now()), results: {} };
const listeners = new Set<() => void>();

function rollDay(): void {
  const day = localDayKey(now());
  if (state.day !== day) state = { day, results: {} };
}

export function peekWarmup(): WarmupState {
  rollDay();
  return state;
}

export function subscribeWarmup(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Игра дошла до итога. Повторная игра обновляет метку результата. */
export function markWarmupGamePlayed(id: WarmupGameId, result: string): void {
  rollDay();
  state = { day: state.day, results: { ...state.results, [id]: result } };
  listeners.forEach((listener) => listener());
}

export function warmupPlayedCount(current: WarmupState): number {
  return WARMUP_GAMES.filter((game) => current.results[game.id] !== undefined).length;
}

/** Следующая несыгранная игра, начиная с `fromIndex`; null — разминка пройдена. */
export function nextWarmupIndex(current: WarmupState, fromIndex: number): number | null {
  for (let step = 0; step < WARMUP_GAMES.length; step += 1) {
    const index = (fromIndex + step) % WARMUP_GAMES.length;
    if (current.results[WARMUP_GAMES[index].id] === undefined) return index;
  }
  return null;
}

export const __warmupTestHooks = Object.freeze({
  reset(nowFn: () => number = () => Date.now()): void {
    now = nowFn;
    state = { day: localDayKey(now()), results: {} };
    listeners.clear();
  },
});
