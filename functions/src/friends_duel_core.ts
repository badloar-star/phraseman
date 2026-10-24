/**
 * «Дуэль на 5 фраз» — чистые правила сервера (docs/work/tasks/friends-duel-2026-10-22.md).
 *
 * зачем (владелец 21.10, идея 3; координатор 22.10): одна дуэль — один документ, один ход — одна запись, срок — лениво,
 * без плановой функции. Правила итога те же, что считает телефон: точность → меньшее время → ничья.
 * Точность хода присылает телефон: без монет за победу это допустимо, сервер только обрезает (условие 1 · ЯДРО 22.10).
 */

export const DUEL_PHRASE_COUNT = 5;
export const DUEL_PHRASE_ID_MAX = 96;
export const DUEL_TTL_MS = 24 * 60 * 60 * 1_000;
export const DUEL_DAILY_CHALLENGE_LIMIT = 3;
export const DUEL_ELAPSED_MAX_MS = 15 * 60 * 1_000;

export type DuelMove = Readonly<{ results: readonly boolean[]; elapsedMs: number }>;
export type DuelOutcome = 'win' | 'loss' | 'draw';
export type DuelStatus = 'open' | 'finished' | 'declined' | 'expired';

/** Ровно 5 разных строк длиной 1–96 после обрезки пробелов; иначе null. Разбирать id не нужно (контракт клиента). */
export function parseDuelPhraseIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length !== DUEL_PHRASE_COUNT) return null;
  const ids = raw.map((value) => (typeof value === 'string' ? value.trim() : ''));
  if (ids.some((id) => id.length < 1 || id.length > DUEL_PHRASE_ID_MAX)) return null;
  return new Set(ids).size === DUEL_PHRASE_COUNT ? ids : null;
}

/** Ровно 5 отметок true/false; время — целые мс, обрезка 0…15 мин. Мусор в отметках → null (ход не принимаем). */
export function parseDuelMove(raw: unknown): DuelMove | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as { results?: unknown; elapsedMs?: unknown };
  if (!Array.isArray(value.results) || value.results.length !== DUEL_PHRASE_COUNT) return null;
  if (value.results.some((item) => typeof item !== 'boolean')) return null;
  const elapsedRaw = typeof value.elapsedMs === 'number' ? value.elapsedMs : Number(value.elapsedMs);
  const elapsedMs = Number.isFinite(elapsedRaw)
    ? Math.min(DUEL_ELAPSED_MAX_MS, Math.max(0, Math.floor(elapsedRaw)))
    : DUEL_ELAPSED_MAX_MS;
  return Object.freeze({ results: Object.freeze([...(value.results as boolean[])]), elapsedMs });
}

export function duelCorrect(move: DuelMove): number {
  return move.results.filter(Boolean).length;
}

// зачем (ЗАМОК ВЛАДЕЛЬЦА 22.10 «сервер для сохранения, а не решений»; координатор 24.10): итог дуэли считает телефон
// (duelOutcomeByScore, 8 · МОМЕНТЫ) по двум ходам — серверный вердикт снят вместе с duelOutcome/invertDuelOutcome.

/** Тот же ключ пары, что у friend_pairs (friends_together.ts::pairId): оба stableUid по возрастанию. */
export function duelPairKey(a: string, b: string): string {
  return [a, b].sort().join('__');
}

export function duelDocumentId(pairKey: string, seq: number): string {
  return `${pairKey}_${seq}`;
}

/** Ленивый срок: открытая дуэль после expiresAtMs считается просроченной любым вызовом. */
export function isDuelExpired(expiresAtMs: unknown, nowMs: number): boolean {
  return typeof expiresAtMs === 'number' && Number.isFinite(expiresAtMs) && nowMs >= expiresAtMs;
}

/** Дневной лимит вызовов — по UTC-дню, как у «Позвать» (friends_together.ts::todayDayKey). */
export function duelDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function duelMoveSummary(move: DuelMove): { correct: number; elapsedMs: number; results: boolean[] } {
  return { correct: duelCorrect(move), elapsedMs: move.elapsedMs, results: [...move.results] };
}
