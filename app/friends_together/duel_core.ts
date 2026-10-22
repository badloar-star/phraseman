/**
 * «Дуэль на 5 фраз» (идея 3) — правила без сети: итог, проверка хода, лимит вызовов, срок, выбор фраз.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 3; контракт — docs/work/tasks/friends-duel-2026-10-22.md):
 * асинхронная дуэль — оба собирают те же 5 фраз из пройденного, побеждает точность, при равенстве — время. Решает сервер;
 * телефон считает так же, чтобы показать итог сразу (Optimistic UI) и не разойтись с сервером в правилах.
 */

export const DUEL_PHRASES = 5;
export const DUEL_DAILY_LIMIT = 3;
export const DUEL_ANSWER_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Больше 15 минут на 5 фраз — значит телефон уснул посреди хода; такие числа не принимаем. */
export const DUEL_MAX_ELAPSED_MS = 15 * 60 * 1000;
/** Потолок одной фразы: телефон уснул на фразе — засчитываем 3 минуты, и сумма пяти никогда не выходит за DUEL_MAX_ELAPSED_MS. */
export const DUEL_PHRASE_MAX_MS = DUEL_MAX_ELAPSED_MS / DUEL_PHRASES;

export type DuelMove = Readonly<{ results: readonly boolean[]; elapsedMs: number }>;
export type DuelOutcome = 'win' | 'loss' | 'draw';

export function duelCorrect(move: DuelMove): number {
  return move.results.filter(Boolean).length;
}

export function isValidDuelMove(value: unknown): value is DuelMove {
  if (!value || typeof value !== 'object') return false;
  const { results, elapsedMs } = value as { results?: unknown; elapsedMs?: unknown };
  return Array.isArray(results)
    && results.length === DUEL_PHRASES
    && results.every((r) => typeof r === 'boolean')
    && typeof elapsedMs === 'number'
    && Number.isInteger(elapsedMs)
    && elapsedMs >= 0
    && elapsedMs <= DUEL_MAX_ELAPSED_MS;
}

/** Итог с моей стороны: точность, затем меньшее время, иначе ничья. */
export function duelOutcome(mine: DuelMove, theirs: DuelMove): DuelOutcome {
  const byAccuracy = duelCorrect(mine) - duelCorrect(theirs);
  if (byAccuracy !== 0) return byAccuracy > 0 ? 'win' : 'loss';
  if (mine.elapsedMs !== theirs.elapsedMs) return mine.elapsedMs < theirs.elapsedMs ? 'win' : 'loss';
  return 'draw';
}

export type DuelChallengeCheck = Readonly<{ ok: true }> | Readonly<{ ok: false; reason: 'limit' | 'open_duel' }>;

/** Можно ли вызвать: три вызова в день, и пока с этим другом открыта дуэль — новую нельзя. */
export function canChallenge(input: Readonly<{ sentToday: number; openWithFriend: boolean }>): DuelChallengeCheck {
  if (input.openWithFriend) return { ok: false, reason: 'open_duel' };
  if (input.sentToday >= DUEL_DAILY_LIMIT) return { ok: false, reason: 'limit' };
  return { ok: true };
}

export function duelExpiresAt(createdAtMs: number): number {
  return createdAtMs + DUEL_ANSWER_WINDOW_MS;
}

export function duelTimeLeftMs(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, expiresAtMs - nowMs);
}

/** Детерминированный генератор (mulberry32): одно зерно — один набор фраз, тесты и повтор хода сходятся. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Пять разных фраз из пройденного. Меньше пяти разных — пустой список: дуэли нет, экран вызова предложит «Позвать на занятие».
 * Входной пул не меняется.
 */
export function pickDuelPhrases<T>(pool: readonly T[], seed: number, count: number = DUEL_PHRASES): T[] {
  const distinct = [...new Set(pool)];
  if (distinct.length < count) return [];
  const rnd = seeded(seed);
  for (let i = distinct.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [distinct[i], distinct[j]] = [distinct[j] as T, distinct[i] as T];
  }
  return distinct.slice(0, count);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
