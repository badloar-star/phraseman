/**
 * Игра «Гонка с собой» — правила без React. Эталон: docs/design/v2-app/elevate-games.js, `race` (это `blitz` из
 * elevate-modes.js с дорожками). Минута на верные переводы; верхняя монета — сегодняшний заход, нижняя — вчерашний,
 * она идёт по времени. Очков нет, сравнивается число верных. Три ошибки заканчивают заход.
 *
 * Хранение (владелец 11.11.2026: «продолжать реализовывать в приложении всё с макетов»): чтобы нижняя монета шла
 * «как вчера», на устройстве лежит вчерашний и сегодняшний заход — число верных и моменты верных ответов — и рекорд.
 *   • AsyncStorage, ключ на владельца аккаунта. В сеть ничего не уходит.
 *   • Память процесса отдаёт историю сразу (peek), диск дочитывается фоном.
 *   • Изменения идут одной очередью; сбой записи не теряет заход — он держится в памяти и дописывается следующим.
 * Логи — префикс [GAME-RACE] на каждом раннем выходе и catch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from '../../app/account_owner_change';
import { RACE_MOTION } from './race_motion';

const LOG = '[GAME-RACE]';
const KEY_PREFIX = 'game_race_v1:';
const ANON_OWNER = 'anon';

// ── задания ─────────────────────────────────────────────────────────────

export interface RaceItem {
  readonly id: string;
  /** Фраза на изучаемом языке. */
  readonly text: string;
  /** Перевод на язык интерфейса — уже без пометок урока. */
  readonly translation: string;
}

export interface RaceQuestion {
  readonly id: string;
  readonly text: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
}

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

function shuffled<T>(list: readonly T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Годные фразы: с текстом и переводом, переводы не повторяются (иначе вышло бы два «верных» варианта). */
function usable(pool: readonly RaceItem[]): RaceItem[] {
  const seen = new Set<string>();
  return pool.filter((item) => {
    const text = item.text?.trim();
    const translation = item.translation?.trim();
    if (!item.id || !text || !translation) return false;
    const key = translation.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function canStartRace(pool: readonly RaceItem[]): boolean {
  return usable(pool).length >= RACE_MOTION.options;
}

/**
 * Вопросы захода: каждая годная фраза — один раз; короткие (до пяти слов) идут первыми — карточка в макете
 * крупная (32 / 38), длинная фраза читается дольше минуты на круг. Неверные варианты — переводы других фраз урока.
 * Вопросы в игре идут по кругу (elevate-modes.js: «вопросы идут по кругу»).
 */
export function buildRaceQuestions(pool: readonly RaceItem[], rng: () => number = Math.random): RaceQuestion[] {
  const items = usable(pool);
  if (items.length < RACE_MOTION.options) return [];
  const short = (item: RaceItem) => words(item.text) <= 5;
  const order = [...shuffled(items.filter(short), rng), ...shuffled(items.filter((item) => !short(item)), rng)];
  return order.map((item) => {
    const wrong = shuffled(items.filter((other) => other.id !== item.id), rng).slice(0, RACE_MOTION.options - 1).map((other) => other.translation.trim());
    const options = shuffled([item.translation.trim(), ...wrong], rng);
    return { id: item.id, text: item.text.trim(), options, correctIndex: options.indexOf(item.translation.trim()) };
  });
}

// ── ход захода ──────────────────────────────────────────────────────────

export interface RaceState {
  /** Сколько вопросов уже задано (номер текущего, по кругу). */
  readonly asked: number;
  readonly correct: number;
  readonly misses: number;
  readonly lives: number;
  /** Мгновения верных ответов от старта, мс, — по ним завтра пойдёт нижняя монета. */
  readonly marks: readonly number[];
}

export const INITIAL_RACE_STATE: RaceState = { asked: 0, correct: 0, misses: 0, lives: RACE_MOTION.lives, marks: [] };

export function raceQuestionAt(questions: readonly RaceQuestion[], asked: number): RaceQuestion | null {
  if (questions.length === 0) return null;
  return questions[((Math.floor(asked) % questions.length) + questions.length) % questions.length];
}

export interface RaceAnswerResult {
  readonly correct: boolean;
  /** Заход окончен: кончились сердца или минута. */
  readonly over: boolean;
  readonly state: RaceState;
}

/** Ответ на вопрос в момент `atMs` от старта. После конца захода ответы не принимаются. */
export function answerRace(state: RaceState, question: RaceQuestion, optionIndex: number, atMs: number): RaceAnswerResult {
  if (isRaceOver(state, atMs)) return { correct: false, over: true, state };
  const correct = optionIndex === question.correctIndex;
  const at = Math.max(0, Math.min(RACE_MOTION.durationMs, Math.round(atMs)));
  const next: RaceState = correct
    ? { ...state, asked: state.asked + 1, correct: state.correct + 1, marks: [...state.marks, at] }
    : { ...state, asked: state.asked + 1, misses: state.misses + 1, lives: Math.max(0, state.lives - 1) };
  return { correct, over: isRaceOver(next, atMs), state: next };
}

export function isRaceOver(state: RaceState, elapsedMs: number): boolean {
  return state.lives <= 0 || !(elapsedMs < RACE_MOTION.durationMs);
}

/** Секунды на таймере «0:47»: целые, вниз от 60, не меньше нуля. */
export function raceSecondsLeft(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) return 0;
  return Math.max(0, Math.min(RACE_MOTION.durationMs / 1000, RACE_MOTION.durationMs / 1000 - Math.floor(Math.max(0, elapsedMs) / 1000)));
}

export function formatRaceClock(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Доля пути монеты по дорожке и доля полосы в панели рекорда: верных / 30, не больше единицы. */
export function raceShare(correct: number): number {
  if (!Number.isFinite(correct) || correct <= 0) return 0;
  return Math.min(1, correct / RACE_MOTION.scale);
}

/** Сколько верных было у вчерашнего захода к мгновению `elapsedMs` — по нему идёт нижняя монета. */
export function ghostCorrectAt(marks: readonly number[], elapsedMs: number): number {
  return marks.filter((m) => m <= elapsedMs).length;
}

// ── история заходов ─────────────────────────────────────────────────────

export interface RaceRun {
  readonly correct: number;
  readonly marks: readonly number[];
}

export interface RaceHistory {
  readonly ownerKey: string;
  /** Заходы по дням «ГГГГ-ММ-ДД»: лучший заход дня. Хранятся только сегодня и вчера. */
  readonly days: Readonly<Record<string, RaceRun>>;
  readonly best: number;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function raceDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Предыдущий календарный день; битая дата — null. */
export function previousRaceDay(dayKey: string): string | null {
  if (!DAY_RE.test(dayKey)) return null;
  const [y, m, d] = dayKey.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  if (Number.isNaN(prev.getTime())) return null;
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
}

/** Вчерашний заход относительно `today`; нет — null (нижняя монета стоит на старте, «Вчера · 0»). */
export function yesterdayRun(history: RaceHistory | null, today: string): RaceRun | null {
  const prev = previousRaceDay(today);
  return prev && history ? history.days[prev] ?? null : null;
}

const isRun = (value: unknown): value is RaceRun => {
  if (typeof value !== 'object' || value === null) return false;
  const run = value as Record<string, unknown>;
  return Number.isInteger(run.correct) && (run.correct as number) >= 0 && Array.isArray(run.marks)
    && run.marks.every((m) => typeof m === 'number' && Number.isFinite(m) && m >= 0 && m <= RACE_MOTION.durationMs);
};

/** Записать заход дня: на день остаётся лучший заход, старше вчерашнего — удаляется, рекорд только растёт. */
export function withRaceRun(history: RaceHistory, today: string, run: RaceRun): RaceHistory {
  const prev = previousRaceDay(today);
  const kept: Record<string, RaceRun> = {};
  if (prev && history.days[prev]) kept[prev] = history.days[prev];
  const before = history.days[today];
  kept[today] = before && before.correct >= run.correct ? before : { correct: run.correct, marks: [...run.marks].sort((a, b) => a - b) };
  return { ownerKey: history.ownerKey, days: kept, best: Math.max(history.best, run.correct) };
}

export function parseRaceHistory(raw: string | null, ownerKey: string): RaceHistory {
  const empty: RaceHistory = { ownerKey, days: {}, best: 0 };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} parse:bad_json ${JSON.stringify({ error: errText(error), action: 'start_empty' })}`);
    return empty;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.warn(`${LOG} parse:wrong_shape ${JSON.stringify({ action: 'start_empty' })}`);
    return empty;
  }
  const obj = parsed as Record<string, unknown>;
  const rawDays = typeof obj.days === 'object' && obj.days !== null && !Array.isArray(obj.days) ? (obj.days as Record<string, unknown>) : {};
  const days = Object.fromEntries(Object.entries(rawDays).filter(([day, run]) => DAY_RE.test(day) && isRun(run)));
  const best = Number.isInteger(obj.best) && (obj.best as number) > 0 ? (obj.best as number) : 0;
  return { ownerKey, days: days as Record<string, RaceRun>, best: Math.max(best, ...Object.values(days).map((r) => (r as RaceRun).correct)) };
}

// ── хранилище на устройстве ─────────────────────────────────────────────

export type RaceStoreDeps = Readonly<{ ownerStableId: () => Promise<string | null> }>;

async function defaultOwnerStableId(): Promise<string | null> {
  const { captureAccountGeneration } = await import('../../app/account_generation');
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

const DEFAULT_DEPS: RaceStoreDeps = Object.freeze({ ownerStableId: defaultOwnerStableId });

let deps: RaceStoreDeps = DEFAULT_DEPS;
let current: RaceHistory | null = null;
let unsaved = false;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

// зачем: память модуля принадлежит владельцу — без сброса следующий аккаунт увидел бы чужой вчерашний заход
onAccountOwnerChanged('game_race', () => {
  unsaved = false;
  current = null;
  listeners.forEach((listener) => listener());
});

function errText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function log(event: string, fields: Record<string, unknown>): void {
  console.log(`${LOG} ${event} ${JSON.stringify(fields)}`); // guard-ok: одна строка на событие хранилища
}

async function ownerKey(): Promise<string> {
  try {
    return (await deps.ownerStableId())?.trim() || ANON_OWNER;
  } catch (error) {
    console.warn(`${LOG} owner:read_failed ${JSON.stringify({ error: errText(error), fallback: ANON_OWNER })}`);
    return ANON_OWNER;
  }
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch((error: unknown) => console.warn(`${LOG} queue:job_failed ${JSON.stringify({ error: errText(error) })}`));
  return next;
}

function publish(next: RaceHistory | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

async function persist(history: RaceHistory): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}${history.ownerKey}`, JSON.stringify({ v: 1, days: history.days, best: history.best }));
    return true;
  } catch (error) {
    console.warn(`${LOG} save:failed ${JSON.stringify({ owner: history.ownerKey === ANON_OWNER ? 'anon' : 'account', error: errText(error), action: 'keep_in_memory_retry_next' })}`);
    return false;
  }
}

async function loadFor(owner: string): Promise<RaceHistory> {
  if (current && current.ownerKey === owner) return current;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(`${KEY_PREFIX}${owner}`);
  } catch (error) {
    console.warn(`${LOG} load:failed ${JSON.stringify({ error: errText(error), action: 'start_empty' })}`);
  }
  return parseRaceHistory(raw, owner);
}

/** История из памяти процесса — без ожидания диска; null — ещё не прочитана. */
export function peekRaceHistory(): RaceHistory | null {
  return current;
}

export function subscribeRaceHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Дочитать историю с диска (фоном, при входе на экран). */
export function refreshRaceHistory(): Promise<RaceHistory> {
  return enqueue(async () => {
    const owner = await ownerKey();
    const loaded = await loadFor(owner);
    if (current !== loaded) publish(loaded);
    return loaded;
  });
}

/** Записать законченный заход. Память обновляется сразу; диск — в той же очереди. */
export function saveRaceRun(today: string, run: RaceRun): Promise<RaceHistory> {
  return enqueue(async () => {
    const owner = await ownerKey();
    const base = await loadFor(owner);
    const next = withRaceRun(base, today, run);
    publish(next);
    const ok = await persist(next);
    unsaved = !ok;
    log('run:saved', { correct: run.correct, best: next.best, disk: ok, retryPending: unsaved });
    return next;
  });
}

export const __raceTestHooks = Object.freeze({
  reset(): void {
    deps = DEFAULT_DEPS;
    current = null;
    unsaved = false;
    queue = Promise.resolve();
    listeners.clear();
  },
  setDeps(next: RaceStoreDeps): void {
    deps = next;
  },
});
