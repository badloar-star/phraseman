// Очередь неотправленных обобщённых отзывов. Паттерн — копия
// max_voice_feedback_outbox.ts: отзыв сначала ложится локально, сеть
// догоняет фоном; не дошёл — переживает перезапуск и досылается при
// следующем открытии экрана завершения (без фоновых таймеров).

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FeedbackEntryInput } from './feedback_client';
import { DebugLogger } from './debug-logger';

const OUTBOX_KEY_PREFIX = 'feedback_entries_outbox_v1';
const outboxQueues = new Map<string, Promise<void>>();
const outboxFlushQueues = new Map<string, Promise<void>>();

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

function withOutboxLock<T>(accountKey: string, operation: () => Promise<T>): Promise<T> {
  const key = storageKey(accountKey);
  const previous = outboxQueues.get(key) ?? Promise.resolve();
  const run = previous.then(operation);
  const tail = run.then(() => undefined, () => undefined);
  outboxQueues.set(key, tail);
  return run.finally(() => {
    if (outboxQueues.get(key) === tail) outboxQueues.delete(key);
  });
}

/** Serializes delivery workers without blocking durable queue mutations. */
function withFlushLock<T>(accountKey: string, operation: () => Promise<T>): Promise<T> {
  const key = storageKey(accountKey);
  const previous = outboxFlushQueues.get(key) ?? Promise.resolve();
  const run = previous.then(operation);
  const tail = run.then(() => undefined, () => undefined);
  outboxFlushQueues.set(key, tail);
  return run.finally(() => {
    if (outboxFlushQueues.get(key) === tail) outboxFlushQueues.delete(key);
  });
}

async function readAllUnlocked(accountKey: string, nowMs: number): Promise<PendingFeedbackEntry[]> {
  const key = storageKey(accountKey);
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try { await AsyncStorage.removeItem(key); } catch (e) {
      // best-effort privacy cleanup
      DebugLogger.error('feedback_outbox:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return [];
  }
  if (!Array.isArray(parsed)) {
    try { await AsyncStorage.removeItem(key); } catch (e) {
      // best-effort privacy cleanup
      DebugLogger.error('feedback_outbox:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return [];
  }
  const kept = parsed
    .filter(isPending)
    .filter((row) => {
      const ageMs = nowMs - row.queuedAtMs;
      return ageMs >= 0 && ageMs <= FEEDBACK_OUTBOX_TTL_MS;
    });

  // Raw free-form text must not remain on disk after its retention window.
  // Compact malformed/expired rows on every read, not only in memory.
  if (kept.length !== parsed.length) {
    try {
      if (kept.length === 0) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify(kept));
    } catch (e) {
      // Delivery can continue with the in-memory rows even if disk cleanup fails.
      DebugLogger.error('feedback_outbox:ageMs', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return kept;
}

async function writeAllUnlocked(accountKey: string, rows: PendingFeedbackEntry[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(storageKey(accountKey), JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

function isSamePendingEntry(left: PendingFeedbackEntry, right: PendingFeedbackEntry): boolean {
  return left.queuedAtMs === right.queuedAtMs
    && entryKey(left.input) === entryKey(right.input)
    && JSON.stringify(left.input) === JSON.stringify(right.input);
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
): Promise<boolean> {
  return withOutboxLock(accountKey, async () => {
    const rows = await readAllUnlocked(accountKey, nowMs);
    const withoutSame = rows.filter((row) => entryKey(row.input) !== entryKey(input));
    const next = [...withoutSame, { input, queuedAtMs: nowMs }];
    return writeAllUnlocked(accountKey, next.slice(-FEEDBACK_OUTBOX_MAX_ENTRIES));
  });
}

/** Убрать доставленный отзыв. */
export async function dequeueFeedbackEntry(
  accountKey: string,
  kind: FeedbackEntryInput['kind'],
  entityId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  await withOutboxLock(accountKey, async () => {
    const rows = await readAllUnlocked(accountKey, nowMs);
    await writeAllUnlocked(accountKey, rows.filter((row) => entryKey(row.input) !== `${kind}:${entityId}`));
  });
}

export async function listPendingFeedbackEntries(
  accountKey: string,
  nowMs: number = Date.now(),
): Promise<PendingFeedbackEntry[]> {
  return withOutboxLock(accountKey, () => readAllUnlocked(accountKey, nowMs));
}

/** Best-effort lifecycle cleanup; never sends or mutates a valid pending row. */
export async function purgeExpiredFeedbackOutbox(
  accountKey: string,
  nowMs: number = Date.now(),
): Promise<void> {
  await withOutboxLock(accountKey, async () => {
    await readAllUnlocked(accountKey, nowMs);
  });
}

/**
 * Досылка очереди: по одной записи, останавливаемся на первой же неудаче
 * (дешевле подождать следующего открытия экрана, чем перебирать заведомо
 * провальные вызовы).
 */
export async function flushFeedbackOutbox(
  accountKey: string,
  send: (input: FeedbackEntryInput) => Promise<{ ok?: boolean } | null>,
  nowMs: number = Date.now(),
): Promise<{ sent: number; left: number }> {
  return withFlushLock(accountKey, async () => {
    // Only storage snapshots/mutations take the outbox lock. Network calls stay
    // outside it so a newly submitted row can be persisted immediately.
    const rows = await withOutboxLock(accountKey, () => readAllUnlocked(accountKey, nowMs));
    let sent = 0;
    for (const row of rows) {
      try {
        const result = await send(row.input);
        if (result?.ok !== true) break;
        await withOutboxLock(accountKey, async () => {
          const current = await readAllUnlocked(accountKey, nowMs);
          await writeAllUnlocked(
            accountKey,
            current.filter((pending) => !isSamePendingEntry(pending, row)),
          );
        });
        sent += 1;
      } catch {
        break;
      }
    }
    const left = await withOutboxLock(
      accountKey,
      async () => (await readAllUnlocked(accountKey, nowMs)).length,
    );
    return { sent, left };
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
