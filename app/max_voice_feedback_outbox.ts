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

const OUTBOX_KEY_PREFIX = 'max_voice_feedback_outbox_v1';

/** Дольше суток отзыв неинтересен: впечатление остыло, контекст ушёл. */
export const FEEDBACK_OUTBOX_TTL_MS = 24 * 60 * 60 * 1_000;
/** Больше десяти — значит что-то системно сломано, копить смысла нет. */
export const FEEDBACK_OUTBOX_MAX_ENTRIES = 10;

export interface PendingVoiceFeedback {
  input: VoiceFeedbackInput;
  queuedAtMs: number;
}

function storageKey(accountKey: string): string {
  if (!accountKey || Array.from(accountKey).length > 256) {
    throw new Error('max_feedback_account_invalid');
  }
  return `${OUTBOX_KEY_PREFIX}:${encodeURIComponent(accountKey)}`;
}

function isPending(value: unknown): value is PendingVoiceFeedback {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const input = row.input as Record<string, unknown> | undefined;
  if (!input || typeof input !== 'object') return false;
  if (typeof input.sessionId !== 'string' || input.sessionId === '') return false;
  if (typeof input.message !== 'string') return false;
  if (typeof input.rating !== 'number' || !Number.isFinite(input.rating)) return false;
  return typeof row.queuedAtMs === 'number' && Number.isFinite(row.queuedAtMs);
}

async function readAll(accountKey: string, nowMs: number): Promise<PendingVoiceFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Битые и протухшие записи отбрасываем молча: очередь — вспомогательная
    // вещь, ронять из-за неё экран разбора нельзя.
    return parsed.filter(isPending).filter((row) => nowMs - row.queuedAtMs <= FEEDBACK_OUTBOX_TTL_MS);
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
): Promise<void> {
  const rows = await readAll(accountKey, nowMs);
  const withoutSameSession = rows.filter((row) => row.input.sessionId !== input.sessionId);
  const next = [...withoutSameSession, { input, queuedAtMs: nowMs }];
  // Переполнение режем с головы: свежий отзыв ценнее суточной давности.
  await writeAll(accountKey, next.slice(-FEEDBACK_OUTBOX_MAX_ENTRIES));
}

/** Убрать доставленный отзыв. */
export async function dequeueVoiceFeedback(
  accountKey: string,
  sessionId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  const rows = await readAll(accountKey, nowMs);
  await writeAll(accountKey, rows.filter((row) => row.input.sessionId !== sessionId));
}

export async function listPendingVoiceFeedback(
  accountKey: string,
  nowMs: number = Date.now(),
): Promise<PendingVoiceFeedback[]> {
  return readAll(accountKey, nowMs);
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
  send: (input: VoiceFeedbackInput) => Promise<unknown>,
  nowMs: number = Date.now(),
): Promise<{ sent: number; left: number }> {
  const rows = await readAll(accountKey, nowMs);
  let sent = 0;
  for (const row of rows) {
    try {
      await send(row.input);
      await dequeueVoiceFeedback(accountKey, row.input.sessionId, nowMs);
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
