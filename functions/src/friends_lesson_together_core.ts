/**
 * «Урок вместе» — чистые правила сервера (docs/work/tasks/lesson-together-server-2026-10-22.md).
 *
 * зачем (владелец 21.10): после занятия зовёшь до 3 друзей на это же занятие; друг проходит его до своей полуночи →
 * обоим +2 монеты. Условие владельца: «+2 не чаще 1 раза в день на пару, только сервер» — ключ награды пара + день друга.
 */
import { createHash } from 'node:crypto';

export const LESSON_INVITE_MAX_FRIENDS = 3;
export const LESSON_INVITE_PER_LESSON_PER_DAY = 3;
export const LESSON_TOGETHER_COINS = 2;
export const LESSON_ORDINAL_MAX = 999;
export const LESSON_MINUTES_MAX = 180;
export const LESSON_STARS_MAX = 999;

export type LessonInviteInput = Readonly<{
  friendUids: readonly string[];
  lessonKey: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  minutes?: number;
  stars?: number;
}>;

function intInRange(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/** Разбор запроса приглашения; null — запрос не принимаем. minutes/stars вне границ просто не кладём (поправка Ядра). */
export function parseLessonInviteInput(raw: Record<string, unknown> | undefined, callerUid: string): LessonInviteInput | null {
  const list = Array.isArray(raw?.friendUids) ? raw?.friendUids as unknown[] : null;
  if (!list || list.length < 1 || list.length > LESSON_INVITE_MAX_FRIENDS) return null;
  const friendUids = list.map((value) => (typeof value === 'string' ? value.trim() : ''));
  if (friendUids.some((uid) => !uid || uid.length > 160 || uid === callerUid)) return null;
  if (new Set(friendUids).size !== friendUids.length) return null;
  const lessonOrdinal = intInRange(raw?.lessonOrdinal, 1, LESSON_ORDINAL_MAX);
  const sessionOrdinal = intInRange(raw?.sessionOrdinal, 1, LESSON_ORDINAL_MAX);
  if (lessonOrdinal === null || sessionOrdinal === null) return null;
  const lessonKey = typeof raw?.lessonKey === 'string' ? raw.lessonKey.trim().slice(0, 120) : '';
  const minutes = intInRange(raw?.minutes, 0, LESSON_MINUTES_MAX);
  const stars = intInRange(raw?.stars, 0, LESSON_STARS_MAX);
  return Object.freeze({
    friendUids,
    lessonKey,
    lessonOrdinal,
    sessionOrdinal,
    ...(minutes === null ? {} : { minutes }),
    ...(stars === null ? {} : { stars }),
  });
}

/** Сдвиг часового пояса — минуты к востоку от UTC (как friends_push_v1.tz и isQuietHours). */
export function tzOffsetOrDefault(raw: unknown, fallbackMinutes: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) <= 14 * 60 ? raw : fallbackMinutes;
}

/** Местный день (YYYY-MM-DD) по сдвигу. */
export function localDayKey(nowMs: number, tzOffsetMinutes: number): string {
  return new Date(nowMs + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Ближайшая местная полночь после nowMs, в мс UTC — срок приглашения «до своей полуночи». */
export function nextLocalMidnightMs(nowMs: number, tzOffsetMinutes: number): number {
  const shift = tzOffsetMinutes * 60_000;
  const dayStartLocal = Math.floor((nowMs + shift) / 86_400_000) * 86_400_000;
  return dayStartLocal + 86_400_000 - shift;
}

/** Ключ пары — оба stableUid по возрастанию (как friend_pairs). */
export function lessonPairKey(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/** id приглашения — детерминирован от requestId и друга: повтор запроса даёт те же id. */
export function lessonInviteId(requestId: string, friendUid: string): string {
  return `fli_${createHash('sha256').update(`${requestId}|${friendUid}`).digest('hex').slice(0, 32)}`;
}

/**
 * opId начисления. OP_ID_RE журнала — одно двоеточие, хвост ≤96, поэтому хешируем: `lesson_together:<48 hex>`.
 * Исходные pairKey, dayKey и uid кладём в поля операции (meta) — журнал читаем без хеша.
 */
export function lessonTogetherOpId(pairKey: string, dayKey: string, uid: string): string {
  return `lesson_together:${createHash('sha256').update(`${pairKey}|${dayKey}|${uid}`).digest('hex').slice(0, 48)}`;
}

/** Засчитанное занятие друга, как его отдаёт Learning V2 (помощник — их зона). */
export type LessonCompletionFact = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
  studyTarget: string;
  awardedAtMs: number;
}>;

export type LessonClaimVerdict =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: 'not_completed' | 'wrong_session' | 'outside_window' }>;

/** Занятие засчитано, то самое, и в окне [создание приглашения, полночь друга]. Язык пары может отличаться. */
export function judgeLessonClaim(
  invite: Readonly<{ lessonOrdinal: number; sessionOrdinal: number; createdAtMs: number; expiresAtMs: number }>,
  fact: LessonCompletionFact | null,
): LessonClaimVerdict {
  if (!fact) return { ok: false, reason: 'not_completed' };
  if (fact.lessonOrdinal !== invite.lessonOrdinal || fact.sessionOrdinal !== invite.sessionOrdinal) {
    return { ok: false, reason: 'wrong_session' };
  }
  if (fact.awardedAtMs < invite.createdAtMs || fact.awardedAtMs > invite.expiresAtMs) {
    return { ok: false, reason: 'outside_window' };
  }
  return { ok: true };
}
