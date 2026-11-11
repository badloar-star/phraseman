/**
 * Разминка на 4 минуты — три игры подряд. Эталон: docs/design/v2-app/elevate-mechanics.app.js, `workout()` и `GAMES`.
 * Владелец 11.11.2026: разминка — отдельная строка каждый день, в счёт трёх заданий дня не входит;
 * отдельного списка игр нет — «игры приходят сами», выбирать не нужно.
 *
 * зачем так: все игры лежат в одном списке, а день сам берёт из него три подряд (окно сдвигается на три позиции
 * каждый день) — за три дня человек встречает каждую игру, и ни одного экрана выбора не появляется.
 * Состояние «какие игры сегодня сыграны» живёт в памяти процесса и привязано к дню.
 */
import { peekAppLang, peekStudyTargetRaw } from '../../app/app_snapshot_bootstrap';
import type { SkillId } from '../skills/skill_points_table';
import { currentGameLesson, isGameAvailable } from './task_source';

export type WarmupGameId = 'flow' | 'odd_word' | 'sort' | 'listen' | 'memory' | 'exact' | 'forms' | 'hunt' | 'order';

type Copy = Readonly<{ ru: string; uk: string; es: string; en: string }>;

export interface WarmupGame {
  readonly id: WarmupGameId;
  readonly route: string;
  readonly skill: SkillId;
  readonly icon: 'flash' | 'checkmark' | 'layers' | 'albums' | 'locate' | 'git-branch' | 'search' | 'chatbubbles' | 'ear';
  readonly name: Copy;
  readonly description: Copy;
}

/** Все игры разминки. Первые три — состав и подписи из макета; остальные — игры из elevate-games.js. */
export const WARMUP_POOL: readonly WarmupGame[] = [
  {
    id: 'flow', route: '/game_flow', skill: 'speed', icon: 'flash',
    name: { ru: 'Поток', uk: 'Потік', es: 'Flujo', en: 'Flow' },
    description: { ru: 'Фраза мелькает — успей понять смысл', uk: 'Фраза мигтить — встигни зрозуміти зміст', es: 'La frase pasa rápido: capta el sentido', en: 'The phrase flashes by — catch the meaning' },
  },
  {
    id: 'odd_word', route: '/game_odd_word', skill: 'grammar', icon: 'checkmark',
    name: { ru: 'Лишнее слово', uk: 'Зайве слово', es: 'Palabra de más', en: 'Extra word' },
    description: { ru: 'Убери слово, которое ломает фразу', uk: 'Прибери слово, яке ламає фразу', es: 'Quita la palabra que rompe la frase', en: 'Remove the word that breaks the phrase' },
  },
  {
    id: 'sort', route: '/game_sort', skill: 'grammar', icon: 'layers',
    name: { ru: 'Сортировка', uk: 'Сортування', es: 'Clasificación', en: 'Sorting' },
    description: { ru: 'Разложи фразы: сейчас или обычно', uk: 'Розклади фрази: зараз чи зазвичай', es: 'Ordena las frases: ahora o normalmente', en: 'Sort the phrases: now or usually' },
  },
  {
    id: 'listen', route: '/game_quiz?kind=listen', skill: 'listening', icon: 'ear',
    name: { ru: 'На слух', uk: 'На слух', es: 'De oído', en: 'By ear' },
    description: { ru: 'Послушай фразу и выбери, что прозвучало', uk: 'Послухай фразу й обери, що прозвучало', es: 'Escucha la frase y elige qué sonó', en: 'Listen to the phrase and choose what was said' },
  },
  {
    id: 'memory', route: '/game_quiz?kind=memory', skill: 'vocab', icon: 'albums',
    name: { ru: 'Память', uk: 'Пам’ять', es: 'Memoria', en: 'Memory' },
    description: { ru: 'Запомни пары и вспомни одну из них', uk: 'Запам’ятай пари і згадай одну з них', es: 'Memoriza los pares y recuerda uno', en: 'Memorise the pairs and recall one' },
  },
  {
    id: 'exact', route: '/game_quiz?kind=exact', skill: 'vocab', icon: 'locate',
    name: { ru: 'Точное слово', uk: 'Точне слово', es: 'Palabra exacta', en: 'Exact word' },
    description: { ru: 'Выбери слово, которое встаёт в пропуск', uk: 'Обери слово, яке стає у пропуск', es: 'Elige la palabra que encaja en el hueco', en: 'Choose the word that fits the gap' },
  },
  {
    id: 'forms', route: '/game_quiz?kind=forms', skill: 'grammar', icon: 'git-branch',
    name: { ru: 'Три формы', uk: 'Три форми', es: 'Tres formas', en: 'Three forms' },
    description: { ru: 'Назови третью форму глагола', uk: 'Назви третю форму дієслова', es: 'Di la tercera forma del verbo', en: 'Name the third form of the verb' },
  },
  {
    id: 'hunt', route: '/game_hunt', skill: 'grammar', icon: 'search',
    name: { ru: 'Охота на ошибку', uk: 'Полювання на помилку', es: 'Caza del error', en: 'Error hunt' },
    description: { ru: 'Найди в диалоге одно неверное слово', uk: 'Знайди в діалозі одне неправильне слово', es: 'Encuentra la palabra incorrecta del diálogo', en: 'Find the one wrong word in the dialogue' },
  },
  {
    id: 'order', route: '/game_order', skill: 'grammar', icon: 'chatbubbles',
    name: { ru: 'Собери диалог', uk: 'Збери діалог', es: 'Arma el diálogo', en: 'Build the dialogue' },
    description: { ru: 'Расставь реплики по порядку', uk: 'Розстав репліки по порядку', es: 'Ordena las réplicas', en: 'Put the lines in order' },
  },
];

export const WARMUP_GAMES_PER_DAY = 3;

export interface WarmupState {
  readonly day: string;
  /** Язык обучения, для которого собрана тройка. */
  readonly target: string;
  /** Три игры этого дня — в порядке прохождения. */
  readonly games: readonly WarmupGame[];
  /** Результат сыгранной игры для метки на карте: «4/4». */
  readonly results: Readonly<Partial<Record<WarmupGameId, string>>>;
}

function localDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Номер локального дня — считается по календарной дате, поэтому не зависит от часового пояса и перевода часов. */
function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

/**
 * Игры дня: окно по списку доступных игр, каждый день сдвигается на три позиции.
 * зачем `pool`: в разминку попадают только игры, у которых есть задания для языка обучения, — человек, который учит
 * испанский, не получит английские задания. Если доступных игр меньше трёх, день состоит из тех, что есть.
 */
export function warmupGamesForDay(dayKey: string, pool: readonly WarmupGame[] = WARMUP_POOL): readonly WarmupGame[] {
  if (pool.length <= WARMUP_GAMES_PER_DAY) return pool;
  // зачем: битая дата дня давала NaN и тройку из пустых мест — экран разминки упал бы на game.id;
  // сторож: tests/game_content_integrity.test.ts
  const dayIndex = dayNumber(dayKey);
  const day = Number.isFinite(dayIndex) ? dayIndex : 0;
  const start = (((day * WARMUP_GAMES_PER_DAY) % pool.length) + pool.length) % pool.length;
  return Array.from({ length: WARMUP_GAMES_PER_DAY }, (_, i) => pool[(start + i) % pool.length]);
}

/** Язык обучения из памяти процесса; сбой чтения не ломает разминку — берётся английский. */
function currentTarget(): string {
  try {
    const raw: unknown = peekStudyTargetRaw();
    return typeof raw === 'string' && raw ? raw : 'en';
  } catch (error) {
    console.warn(`[WARMUP] target:peek_failed ${error instanceof Error ? error.message : String(error)}`);
    return 'en';
  }
}

/** Язык интерфейса из памяти процесса; сбой чтения не ломает разминку — язык считается неизвестным. */
function currentUiLang(): string | null {
  try {
    const raw: unknown = peekAppLang();
    return typeof raw === 'string' && raw ? raw : null;
  } catch (error) {
    console.warn(`[WARMUP] ui_lang:peek_failed ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export function availableWarmupGames(target: string, uiLang: string | null = currentUiLang()): readonly WarmupGame[] {
  const lesson = currentGameLesson(target);
  return WARMUP_POOL.filter((game) => isGameAvailable(game.id, target, lesson, uiLang));
}

function freshState(dayKey: string): WarmupState {
  const target = currentTarget();
  return { day: dayKey, target, games: warmupGamesForDay(dayKey, availableWarmupGames(target)), results: {} };
}

let now: () => number = () => Date.now();
let state: WarmupState = freshState(localDayKey(now()));
const listeners = new Set<() => void>();

function rollDay(): void {
  const day = localDayKey(now());
  // зачем: смена языка обучения посреди дня пересобирает тройку — иначе остались бы игры прежнего языка
  if (state.day !== day || state.target !== currentTarget()) state = freshState(day);
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

/** Игра дошла до итога. Повторная игра обновляет метку результата; игра не из сегодняшней тройки тоже запоминается. */
export function markWarmupGamePlayed(id: WarmupGameId, result: string): void {
  rollDay();
  state = { ...state, results: { ...state.results, [id]: result } };
  listeners.forEach((listener) => listener());
}

/** Сколько из трёх игр дня сыграно. */
export function warmupPlayedCount(current: WarmupState): number {
  return current.games.filter((game) => current.results[game.id] !== undefined).length;
}

/** Следующая несыгранная игра дня, начиная с `fromIndex`; null — разминка пройдена. */
export function nextWarmupIndex(current: WarmupState, fromIndex: number): number | null {
  for (let step = 0; step < current.games.length; step += 1) {
    const index = (fromIndex + step) % current.games.length;
    if (current.results[current.games[index].id] === undefined) return index;
  }
  return null;
}

export const __warmupTestHooks = Object.freeze({
  reset(nowFn: () => number = () => Date.now()): void {
    now = nowFn;
    state = freshState(localDayKey(now()));
    listeners.clear();
  },
});
