// Очередь неотправленных отзывов о звонке с MAX.
//
// зачем (владелец 2026-08-23): «исправь почему не отправляется». Корневая
// причина — серверная функция submitMaxVoiceFeedback написана в тот же день и
// ещё не выкачена в прод, поэтому вызов падает и экран показывает «Не
// отправилось». Деплой это чинит, но отзыв всё равно теряется при любой
// временной беде: нет сети, самолётный режим, холодный старт функции.
//
// Поэтому отзыв сначала ложится в локальную очередь и только потом уходит в
// сеть. Не дошёл — переживёт перезапуск приложения и будет дослан при
// следующем открытии экрана разбора. Человек написал один раз — этого хватит.
//
// Экономия Firestore: очередь НЕ опрашивает сервер. Досылка происходит только
// когда пользователь и так открыл экран разбора, и только если в очереди
// что-то есть — фоновых таймеров и лишних вызовов нет.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { VoiceFeedbackInput } from './max_voice_feedback_client';
import { DebugLogger } from './debug-logger';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
} from './account_generation';

const OUTBOX_KEY_PREFIX = 'max_voice_feedback_outbox_v1';

/** Дольше суток отзыв неинтересен: впечатление остыло, контекст ушёл. */
export const FEEDBACK_OUTBOX_TTL_MS = 24 * 60 * 60 * 1_000;
/** Больше десяти — значит что-то системно сломано, копить смысла нет. */
export const FEEDBACK_OUTBOX_MAX_ENTRIES = 10;

export interface PendingVoiceFeedback {
  /** Durable owner proof forwarded unchanged to the server callable. */
  expectedStableUid: string;
  input: VoiceFeedbackInput;
  queuedAtMs: number;
}

function storageKey(accountKey: string): string {
  if (!accountKey || Array.from(accountKey).length > 256) {
    throw new Error('max_feedback_account_invalid');
  }
  return `${OUTBOX_KEY_PREFIX}:${encodeURIComponent(accountKey)}`;
}

function parsePending(value: unknown, accountKey: string): PendingVoiceFeedback | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const input = row.input as Record<string, unknown> | undefined;
  if (!input || typeof input !== 'object') return null;
  if (typeof input.sessionId !== 'string' || input.sessionId === '') return null;
  if (typeof input.message !== 'string') return null;
  if (typeof input.rating !== 'number' || !Number.isFinite(input.rating)) return null;
  if (typeof row.queuedAtMs !== 'number' || !Number.isFinite(row.queuedAtMs)) return null;
  // A storage namespace is not ownership proof: after logout/login its key can
  // be observed beside another active identity. Legacy rows without the
  // explicit owner are therefore dropped rather than adopted by account B.
  if (typeof row.expectedStableUid !== 'string') return null;
  const expectedStableUid = row.expectedStableUid;
  if (expectedStableUid !== accountKey) return null;
  return {
    expectedStableUid,
    input: input as unknown as VoiceFeedbackInput,
    queuedAtMs: row.queuedAtMs,
  };
}

async function readAll(accountKey: string, nowMs: number): Promise<PendingVoiceFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Битые и протухшие записи отбрасываем молча: очередь — вспомогательная
    // вещь, ронять из-за неё экран разбора нельзя.
    return parsed
      .map((row) => parsePending(row, accountKey))
      .filter((row): row is PendingVoiceFeedback => row !== null)
      .filter((row) => nowMs - row.queuedAtMs <= FEEDBACK_OUTBOX_TTL_MS);
  } catch {
    return [];
  }
}

async function writeAll(accountKey: string, rows: PendingVoiceFeedback[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(accountKey), JSON.stringify(rows));
  } catch (e) {
      // Нет места на диске — отзыв просто не переживёт перезапуск. Это хуже, чем // сохранить, но лучше, чем упасть в лицо пользователю.
      DebugLogger.error('max_voice_feedback_outbox:writeAll', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * Положить отзыв в очередь. Один отзыв на звонок: повторная отправка по тому
 * же sessionId заменяет прежнюю запись, а не копит дубликаты (та же логика,
 * что и на сервере с детерминированным id документа).
 */
export async function enqueueVoiceFeedback(
  accountKey: string,
  input: VoiceFeedbackInput,
  nowMs: number = Date.now(),
  inheritedLease?: AccountTransitionLockLease,
): Promise<PendingVoiceFeedback> {
  const accountToken = captureAccountGeneration();
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, accountKey)) {
      throw new Error('max_feedback_generation_stale');
    }
    const rows = await readAll(accountKey, nowMs);
    const withoutSameSession = rows.filter((row) => row.input.sessionId !== input.sessionId);
    const envelope: PendingVoiceFeedback = { expectedStableUid: accountKey, input, queuedAtMs: nowMs };
    const next = [...withoutSameSession, envelope];
    // Переполнение режем с головы: свежий отзыв ценнее суточной давности.
    await writeAll(accountKey, next.slice(-FEEDBACK_OUTBOX_MAX_ENTRIES));
    return envelope;
  }, inheritedLease);
}

/** Убрать доставленный отзыв. */
export async function dequeueVoiceFeedback(
  accountKey: string,
  sessionId: string,
  nowMs: number = Date.now(),
  inheritedLease?: AccountTransitionLockLease,
): Promise<void> {
  const accountToken = captureAccountGeneration();
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return;
    const rows = await readAll(accountKey, nowMs);
    await writeAll(accountKey, rows.filter((row) => row.input.sessionId !== sessionId));
  }, inheritedLease);
}

export async function listPendingVoiceFeedback(
  accountKey: string,
  nowMs: number = Date.now(),
  inheritedLease?: AccountTransitionLockLease,
): Promise<PendingVoiceFeedback[]> {
  const accountToken = captureAccountGeneration();
  return withAccountTransitionLock(async () => (
    isCurrentAccountGeneration(accountToken, accountKey) ? readAll(accountKey, nowMs) : []
  ), inheritedLease);
}

/**
 * Досылка очереди: по одной записи, останавливаемся на первой же неудаче.
 *
 * Останов важен: если функция недоступна (не выкачена, нет сети), перебор
 * остатка — это очередь заведомо провальных вызовов. Дешевле подождать
 * следующего открытия экрана.
 */
export async function flushVoiceFeedbackOutbox(
  accountKey: string,
  send: (input: VoiceFeedbackInput, expectedStableUid: string) => Promise<unknown>,
  nowMs: number = Date.now(),
): Promise<{ sent: number; left: number }> {
  const accountToken = captureAccountGeneration();
  const rows = await withAccountTransitionLock(async () => (
    isCurrentAccountGeneration(accountToken, accountKey) ? readAll(accountKey, nowMs) : []
  ));
  let sent = 0;
  for (const row of rows) {
    if (!isCurrentAccountGeneration(accountToken, accountKey)) break;
    try {
      // The server call is idempotent by sessionId and must not hold the global
      // account lock. Only the owner-checked local dequeue is serialized.
      await send(row.input, row.expectedStableUid);
      const committed = await withAccountTransitionLock(async (lease) => {
        if (!isCurrentAccountGeneration(accountToken, accountKey)) return false;
        await dequeueVoiceFeedback(accountKey, row.input.sessionId, nowMs, lease);
        return true;
      });
      if (!committed) break;
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
