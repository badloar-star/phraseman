import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getDevDialogFail, getDevDialogSend } from './dev_dialog_state';
import { isAiDailyCapError } from './ai_daily_cap_signal';

import {
  parseDialogueV2FreeformSessionStartShape,
  parseDialogueV2FreeformSessionTurnShape,
  type DialogueV2FreeformSessionStart,
  type DialogueV2FreeformSessionTurn,
} from '../shared/dialogue_v2_freeform_session_contract';

const FUNCTIONS_REGION = 'us-central1';
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;
const FREEFORM_STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);

export type DialogueV2FreeformSessionStartResponse = Readonly<{
  ok: true;
  sessionId: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformTurnResponse = Readonly<{
  ok: true;
  assistantMessage: string;
  sessionId: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformPreparedBotVoiceRequest = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: 'en' | 'es' | 'fr' | 'de';
}>;

export type DialogueV2FreeformPreparedBotVoiceTextOnlyResponse = Readonly<{
  selection: null;
}>;

/** Callable failures may include internal provider details; UI gets one neutral state. */
/** 'daily_cap' — сервер сказал «на сегодня всё» (общий дневной потолок ИИ или дневное окно); повтор бессмыслен до завтра. */
export type DialogueV2FreeformFailureReason = 'unavailable' | 'daily_cap';

export class DialogueV2FreeformUnavailableError extends Error {
  constructor(readonly reason: DialogueV2FreeformFailureReason = 'unavailable') {
    super('dialogue_v2_freeform_unavailable');
    this.name = 'DialogueV2FreeformUnavailableError';
  }
}

/** Ошибка старта/хода свободного разговора → наружу: причина «на сегодня всё» или обычное «недоступно». */
function freeformFailure(error: unknown): DialogueV2FreeformUnavailableError {
  return new DialogueV2FreeformUnavailableError(isAiDailyCapError(error) ? 'daily_cap' : 'unavailable');
}

type PlainRecord = Record<string, unknown>;

function exactPlainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    const snapshot: PlainRecord = Object.create(null) as PlainRecord;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function hasExactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function validAssistantMessage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  return normalized === value && normalized.length > 0 && !UNSAFE_TEXT_RE.test(value)
    && utf8ByteLength(value) <= 3_072;
}

function validStartResponse(value: unknown): DialogueV2FreeformSessionStartResponse | null {
  const response = exactPlainRecord(value);
  if (!response || !hasExactKeys(response, ['ok', 'sessionId', 'expiresAtMs'])
    || response.ok !== true || typeof response.sessionId !== 'string'
    || !SESSION_ID_RE.test(response.sessionId)
    || !Number.isSafeInteger(response.expiresAtMs) || Number(response.expiresAtMs) <= 0) return null;
  return Object.freeze({ ok: true, sessionId: response.sessionId, expiresAtMs: Number(response.expiresAtMs) });
}

function validTurnResponse(
  value: unknown,
  request: DialogueV2FreeformSessionTurn,
): DialogueV2FreeformTurnResponse | null {
  const response = exactPlainRecord(value);
  if (!response || !hasExactKeys(response, ['ok', 'assistantMessage', 'sessionId', 'expiresAtMs'])
    || response.ok !== true || response.sessionId !== request.sessionId
    || !validAssistantMessage(response.assistantMessage)
    || !Number.isSafeInteger(response.expiresAtMs) || Number(response.expiresAtMs) <= 0) return null;
  return Object.freeze({
    ok: true,
    assistantMessage: response.assistantMessage,
    sessionId: request.sessionId,
    expiresAtMs: Number(response.expiresAtMs),
  });
}

function validPreparedBotVoiceRequest(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceRequest | null {
  const request = exactPlainRecord(value);
  if (!request || !hasExactKeys(request, ['sessionId', 'turnId', 'studyTarget'])
    || typeof request.sessionId !== 'string' || !SESSION_ID_RE.test(request.sessionId)
    || typeof request.turnId !== 'string' || !TURN_ID_RE.test(request.turnId)
    || typeof request.studyTarget !== 'string' || !FREEFORM_STUDY_TARGETS.has(request.studyTarget)) {
    return null;
  }
  return Object.freeze({
    sessionId: request.sessionId,
    turnId: request.turnId,
    studyTarget: request.studyTarget as DialogueV2FreeformPreparedBotVoiceRequest['studyTarget'],
  });
}

function validPreparedBotVoiceTextOnlyResponse(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceTextOnlyResponse | null {
  const response = exactPlainRecord(value);
  if (!response || !hasExactKeys(response, ['selection']) || response.selection !== null) return null;
  return Object.freeze({ selection: null });
}

export async function startDialogueV2FreeformSession(
  selection: DialogueV2FreeformSessionStart,
): Promise<DialogueV2FreeformSessionStartResponse | null> {
  const request = parseDialogueV2FreeformSessionStartShape(selection);
  if (!request) return null;
  // зачем (координатор 12.10, съёмка R1 dialogs-045/046, gap-011): с подставным ходом (dev_dialog_send) свободный разговор не
  // создаёт сессию на проде; dev_dialog_fail — «не удалось продолжить». В стор-сборке геттеры null.
  if (getDevDialogFail()) {
    console.warn(`[DEV-STATE] freeform: старт подменён отказом reason=${getDevDialogFail()}`); // guard-ok: dev-ветка
    throw new DialogueV2FreeformUnavailableError();
  }
  if (getDevDialogSend()) {
    console.warn('[DEV-STATE] freeform: сессия без сервера (dev_dialog_send)'); // guard-ok: dev-ветка
    return { ok: true, sessionId: `d2fs_dev${'0'.repeat(32)}`, expiresAtMs: Date.now() + 3_600_000 };
  }
  const startedAt = Date.now();
  try {
    const callable = httpsCallable<DialogueV2FreeformSessionStart, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformSessionStart',
    );
    return validStartResponse((await callable(request)).data);
  } catch (error) {
    logFreeformFailure('start', startedAt, error);
    throw freeformFailure(error);
  }
}

/**
 * зачем (аудит «пропала сеть», Авторизация 13.10): здесь стояли немые `catch {}` — код ошибки сервера (unavailable, deadline-exceeded,
 * resource-exhausted…) терялся, в журнале не было ничего. Причина пишется до превращения в «недоступно»; поведение прежнее.
 */
function logFreeformFailure(stage: 'start' | 'turn' | 'voice', startedAt: number, error: unknown): void {
  const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'unknown';
  const message = error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160);
  console.warn(`[DIALOG-NET] freeform:${stage} → недоступно ${JSON.stringify({ code, message, ms: Date.now() - startedAt })}`);
}

export async function sendDialogueV2FreeformTurn(
  selection: DialogueV2FreeformSessionTurn,
): Promise<DialogueV2FreeformTurnResponse | null> {
  const request = parseDialogueV2FreeformSessionTurnShape(selection);
  if (!request) return null;
  if (getDevDialogFail()) {
    console.warn(`[DEV-STATE] freeform: реплика подменена отказом reason=${getDevDialogFail()}`); // guard-ok: dev-ветка
    throw new DialogueV2FreeformUnavailableError();
  }
  if (getDevDialogSend()) {
    await new Promise<void>((resolve) => { setTimeout(resolve, 900); });
    console.warn('[DEV-STATE] freeform: ответ без сервера (dev_dialog_send)'); // guard-ok: dev-ветка
    return { ok: true, assistantMessage: 'Sure! Ask me anything about it. (dev)', sessionId: request.sessionId, expiresAtMs: Date.now() + 3_600_000 };
  }
  const startedAt = Date.now();
  try {
    const callable = httpsCallable<DialogueV2FreeformSessionTurn, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformSessionTurn',
    );
    return validTurnResponse((await callable(request)).data, request);
  } catch (error) {
    logFreeformFailure('turn', startedAt, error);
    throw freeformFailure(error);
  }
}

/**
 * The current public Stage 4 contract intentionally returns only text-only.
 * This client never transports reply text, asset references, or scenario data.
 */
export async function requestDialogueV2FreeformPreparedBotVoice(
  selection: DialogueV2FreeformPreparedBotVoiceRequest,
): Promise<DialogueV2FreeformPreparedBotVoiceTextOnlyResponse | null> {
  const request = validPreparedBotVoiceRequest(selection);
  if (!request) return null;
  const startedAt = Date.now();
  try {
    const callable = httpsCallable<DialogueV2FreeformPreparedBotVoiceRequest, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformPreparedBotVoiceResolve',
    );
    return validPreparedBotVoiceTextOnlyResponse((await callable(request)).data);
  } catch (error) {
    logFreeformFailure('voice', startedAt, error);
    throw new DialogueV2FreeformUnavailableError();
  }
}
