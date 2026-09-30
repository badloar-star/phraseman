import {
  ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS,
  ACCOUNTS_V2_SRS_TIME_KEY,
  type JsonObject,
} from '../accounts_v2_contract';

/*
 * Account V2, Пакет 5 (ремонт №1) — перенос старой SRS-памяти свайпов.
 *
 * зачем (решение владельца 9, 2026-09-30): память интервальных повторений
 * карточек ПЕРЕНОСИТСЯ. Старая память — `progress.flashcards_swipe_memory_v1`
 * (app/flashcards_swipe.tsx → SwipeMemory): объект `trainingKey → CardMemory`,
 * где trainingKey = `${source.id}:${card.id}`, source.id — `saved:all`,
 * `custom:all`, `official:<pack>`, `community:<pack>`. В Account V2 SRS живёт
 * полем `srs` сущности карточки и сливается ядром по ВРЕМЕНИ правки
 * (`updatedAtMs`), поэтому время берётся из старой записи (`lastSeenAt`).
 * Нет времени — запись в HOLD, а не «сейчас»: выдуманное время перебило бы
 * настоящую, более свежую правку с телефона.
 * Чистые функции: без сети, Firestore и файлов.
 */

/** Поля CardMemory (app/flashcards_swipe.tsx). Другое поле — HOLD записи. */
export const SRS_MEMORY_FIELDS = Object.freeze([
  'correct', 'wrong', 'hints', 'seen', 'mastered', 'lastSeenAt', 'nextDueAt', 'ease',
] as const);
const MEMORY_FIELD_SET: ReadonlySet<string> = new Set(SRS_MEMORY_FIELDS);

export type TrainingSource = 'saved' | 'custom' | 'official' | 'community';
export type ParsedTrainingKey = Readonly<{ source: TrainingSource; cardId: string }> | null;

const TRAINING_KEY = /^(saved|custom):all:(.+)$/;
const PACK_TRAINING_KEY = /^(official|community):[^:]+:(.+)$/;

/** `saved:all:<id>` / `custom:all:<id>` / `official|community:<pack>:<id>`; иначе null. */
export function parseTrainingKey(key: string): ParsedTrainingKey {
  const own = TRAINING_KEY.exec(key);
  if (own !== null) return { source: own[1] as TrainingSource, cardId: own[2] };
  const pack = PACK_TRAINING_KEY.exec(key);
  if (pack !== null) return { source: pack[1] as TrainingSource, cardId: pack[2] };
  return null;
}

export type SrsRowResult =
  | Readonly<{ ok: true; srs: JsonObject; updatedAtMs: number }>
  | Readonly<{ ok: false; reason: 'malformed_value' | 'unknown_srs_field' | 'srs_time_missing' | 'srs_time_in_future'; field?: string }>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Время правки: целое > 0 (0 — значение по умолчанию CardMemory, то есть «времени нет»). */
export function validEditTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Время дальше допуска ядра (10 мин) от nowMs — ядро окончательно отклонило бы всю операцию карточки. */
export function editTimeInFuture(time: number, nowMs: number | undefined): boolean {
  return nowMs !== undefined && time > nowMs + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS;
}

/**
 * Одна запись CardMemory → значение поля `srs` карточки:
 * `{ updatedAtMs: lastSeenAt, ...известные числовые поля }`.
 */
export function srsFromMemoryRow(row: unknown, nowMs?: number): SrsRowResult {
  if (!isRecord(row)) return { ok: false, reason: 'malformed_value' };
  const out: Record<string, number> = {};
  for (const key of Object.keys(row).sort()) {
    if (!MEMORY_FIELD_SET.has(key)) return { ok: false, reason: 'unknown_srs_field', field: key };
    const value = row[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, reason: 'malformed_value', field: key };
    out[key] = value;
  }
  const time = row.lastSeenAt;
  if (!validEditTime(time)) return { ok: false, reason: 'srs_time_missing' };
  if (editTimeInFuture(time, nowMs)) return { ok: false, reason: 'srs_time_in_future' };
  return { ok: true, srs: { [ACCOUNTS_V2_SRS_TIME_KEY]: time, ...out }, updatedAtMs: time };
}
