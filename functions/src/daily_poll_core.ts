// ═══ «Опрос дня» — чистые правила голоса (без Firebase) ═══════════════════════
// зачем (владелец 2026-09-30, «Делаем, вопросы из админки»): карточка «Опрос дня»
// на вкладке «Друзья» (макет community.html → COM-04-ACTIVITY). Вопросы заводит
// владелец в админке: daily_polls/{dateKey}. Голос пишет ТОЛЬКО сервер — счётчики
// нельзя доверить клиенту. Здесь вся логика решения, чтобы её можно было проверить
// тестом без эмулятора; callable (daily_poll_vote.ts) лишь читает/пишет документы.
import { HttpsError } from 'firebase-functions/v2/https';

export const DAILY_POLL_COLLECTION = 'daily_polls';
export const DAILY_POLL_VOTES_SUBCOLLECTION = 'votes';
export const DAILY_POLL_MIN_OPTIONS = 2;
export const DAILY_POLL_MAX_OPTIONS = 4;
/** Клиент берёт СВОЙ локальный день; от UTC он отличается максимум на сутки. */
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const OPTION_ID_RE = /^[a-z0-9_-]{1,24}$/;

export type DailyPollVoteInput = Readonly<{
  dateKey: string;
  optionId: string;
  stableId: string | null;
}>;

export type DailyPollCounts = Readonly<Record<string, number>>;

export type DailyPollVoteDecision =
  | Readonly<{ kind: 'accept'; optionId: string; counts: DailyPollCounts; voteCount: number }>
  | Readonly<{ kind: 'already_voted'; optionId: string; counts: DailyPollCounts; voteCount: number }>
  | Readonly<{ kind: 'reject'; code: 'not-found' | 'failed-precondition' | 'invalid-argument'; reason: string }>;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Разбор входа callable. Неверный вход — invalid-argument с машинной причиной. */
export function normalizeDailyPollVoteInput(data: unknown): DailyPollVoteInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request_object_required');
  const dateKey = String(data.dateKey ?? '').trim();
  if (!DATE_KEY_RE.test(dateKey) || !Number.isFinite(Date.parse(`${dateKey}T00:00:00Z`))) {
    throw new HttpsError('invalid-argument', 'date_key_invalid');
  }
  const optionId = String(data.optionId ?? '').trim();
  if (!OPTION_ID_RE.test(optionId)) throw new HttpsError('invalid-argument', 'option_id_invalid');
  const rawStable = typeof data.stableId === 'string' ? data.stableId.trim() : '';
  return { dateKey, optionId, stableId: rawStable ? rawStable.slice(0, 160) : null };
}

/**
 * Голосовать можно только в «сегодняшнем» опросе. У человека в другом поясе
 * локальный день на сутки впереди/позади UTC, поэтому окно — ±1 день.
 */
export function isDailyPollDateKeyInWindow(dateKey: string, nowMs: number): boolean {
  const dayStartMs = Date.parse(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(dayStartMs)) return false;
  const todayStartMs = Date.parse(`${new Date(nowMs).toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.abs(dayStartMs - todayStartMs) <= DAY_MS;
}

/** id вариантов опроса в порядке показа (пустые/битые пропускаются). */
export function dailyPollOptionIds(poll: RecordValue | null | undefined): string[] {
  const options = Array.isArray(poll?.options) ? poll?.options : [];
  const ids: string[] = [];
  for (const option of options as unknown[]) {
    const id = isRecord(option) ? String(option.id ?? '').trim() : '';
    if (OPTION_ID_RE.test(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Счётчики только по существующим вариантам; мусор и отрицательные — в ноль. */
export function normalizeDailyPollCounts(poll: RecordValue | null | undefined): Record<string, number> {
  const raw = isRecord(poll?.counts) ? (poll?.counts as RecordValue) : {};
  const out: Record<string, number> = {};
  for (const id of dailyPollOptionIds(poll)) {
    const n = Number(raw[id]);
    out[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/**
 * Решение по голосу. Вызывается внутри транзакции с уже прочитанными
 * документами опроса и голоса.
 *  - голос уже есть → already_voted (второй голос не пишется, счётчики не трогаем);
 *  - опроса нет / он в архиве / дата вне окна / вариант не из списка → reject;
 *  - иначе accept со свежими счётчиками (+1 к выбранному варианту).
 */
export function decideDailyPollVote(args: {
  poll: RecordValue | null;
  existingVoteOptionId: string | null;
  input: DailyPollVoteInput;
  nowMs: number;
}): DailyPollVoteDecision {
  const { poll, existingVoteOptionId, input, nowMs } = args;
  if (!poll) return { kind: 'reject', code: 'not-found', reason: 'daily_poll_not_found' };
  const counts = normalizeDailyPollCounts(poll);
  if (existingVoteOptionId) {
    return { kind: 'already_voted', optionId: existingVoteOptionId, counts, voteCount: sumCounts(counts) };
  }
  if (poll.status !== 'active') return { kind: 'reject', code: 'failed-precondition', reason: 'daily_poll_archived' };
  if (!isDailyPollDateKeyInWindow(input.dateKey, nowMs)) {
    return { kind: 'reject', code: 'failed-precondition', reason: 'daily_poll_not_today' };
  }
  const optionIds = dailyPollOptionIds(poll);
  if (optionIds.length < DAILY_POLL_MIN_OPTIONS || optionIds.length > DAILY_POLL_MAX_OPTIONS) {
    return { kind: 'reject', code: 'failed-precondition', reason: 'daily_poll_options_broken' };
  }
  if (!optionIds.includes(input.optionId)) {
    return { kind: 'reject', code: 'invalid-argument', reason: 'daily_poll_option_invalid' };
  }
  const next = { ...counts, [input.optionId]: (counts[input.optionId] ?? 0) + 1 };
  return { kind: 'accept', optionId: input.optionId, counts: next, voteCount: sumCounts(next) };
}
