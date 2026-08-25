// Очередь неотправленных обобщённых отзывов. Паттерн — копия
// max_voice_feedback_outbox.ts: отзыв сначала ложится локально, сеть
// догоняет фоном; не дошёл — переживает перезапуск и досылается при
// следующем открытии экрана завершения (без фоновых таймеров).

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FeedbackEntryInput } from './feedback_client';

const OUTBOX_KEY_PREFIX = 'feedback_entries_outbox_v1';

/** Дольше суток отзыв неинтересен: впечатление остыло, контекст ушёл. */
export const FEEDBACK_OUTBOX_TTL_MS = 24 * 60 * 60 * 1_000;
/** Больше десяти — значит что-то системно сломано, копить смысла нет. */
export const FEEDBACK_OUTBOX_MAX_ENTRIES = 10;

export interface PendingFeedbackEntry {
  input: FeedbackEntryInput;
  queuedAtMs: number;
}

function storageKey(accountKey: string): string {
  if (!accountKey || Array.from(accountKey).length > 256) {
    throw new Error('feedback_account_invalid');
  }
  return `${OUTBOX_KEY_PREFIX}:${encodeURIComponent(accountKey)}`;
}

function isPending(value: unknown): value is PendingFeedbackEntry {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const input = row.input as Record<string, unknown> | undefined;
  if (!input || typeof input !== 'object') return false;
  if (typeof input.kind !== 'string' || input.kind === '') return false;
  if (typeof input.entityId !== 'string' || input.entityId === '') return false;
  if (typeof input.message !== 'string') return false;
  if (typeof input.rating !== 'number' || !Number.isFinite(input.rating)) return false;
  return typeof row.queuedAtMs === 'number' && Number.isFinite(row.queuedAtMs);
}

function entryKey(input: FeedbackEntryInput): string {
  return `${input.kind}:${input.entityId}`;
}

async function readAll(accountKey: string, nowMs: number): Promise<PendingFeedbackEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPending).filter((row) => nowMs - row.queuedAtMs <= FEEDBACK_OUTBOX_TTL_MS);
  } catch {
    return [];
  }
}

async function writeAll(accountKey: string, rows: PendingFeedbackEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(accountKey), JSON.stringify(rows));
  } catch {
    // Нет места на диске — отзыв просто не переживёт перезапуск.
  }
}

/**
 * Положить отзыв в очередь. Один отзыв на (kind, entityId): повторная
 * отправка заменяет прежнюю запись — та же логика, что и на сервере с
 * детерминированным id документа.
 */
export async function enqueueFeedbackEntry(
  accountKey: string,
  input: FeedbackEntryInput,
  nowMs: number = Date.now(),
): Promise<void> {
  const rows = await readAll(accountKey, nowMs);
  const withoutSame = rows.filter((row) => entryKey(row.input) !== entryKey(input));
  const next = [...withoutSame, { input, queuedAtMs: nowMs }];
  await writeAll(accountKey, next.slice(-FEEDBACK_OUTBOX_MAX_ENTRIES));
}

/** Убрать доставленный отзыв. */
export async function dequeueFeedbackEntry(
  accountKey: string,
  kind: FeedbackEntryInput['kind'],
  entityId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  const rows = await readAll(accountKey, nowMs);
  await writeAll(accountKey, rows.filter((row) => entryKey(row.input) !== `${kind}:${entityId}`));
}

export async function listPendingFeedbackEntries(
  accountKey: string,
  nowMs: number = Date.now(),
): Promise<PendingFeedbackEntry[]> {
  return readAll(accountKey, nowMs);
}

/**
 * Досылка очереди: по одной записи, останавливаемся на первой же неудаче
 * (дешевле подождать следующего открытия экрана, чем перебирать заведомо
 * провальные вызовы).
 */
export async function flushFeedbackOutbox(
  accountKey: string,
  send: (input: FeedbackEntryInput) => Promise<unknown>,
  nowMs: number = Date.now(),
): Promise<{ sent: number; left: number }> {
  const rows = await readAll(accountKey, nowMs);
  let sent = 0;
  for (const row of rows) {
    try {
      await send(row.input);
      await dequeueFeedbackEntry(accountKey, row.input.kind, row.input.entityId, nowMs);
      sent += 1;
    } catch {
      break;
    }
  }
  return { sent, left: rows.length - sent };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
