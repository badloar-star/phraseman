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
/**
 * Потолки вызовов: сервер — старт 20 с, ход 30 с (timeoutSeconds), плюс запас на сеть.
 * зачем (координатор 24.10, «вечные •••»): без своего потолка клиент ждал нативные минуты; теперь по потолку вызов падает
 * deadline-exceeded, экран гасит «•••» и показывает плашку с «Повторить».
 */
export const DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS = 22_000;
export const DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS = 32_000;
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
  /** Перевод ответа на язык интерфейса (решение координатора 25.10: та же генерация, без второго вызова); старый сервер — нет поля. */
  assistantTranslation?: string;
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
// 'ai_consent_required' — сервер не нашёл согласия на ИИ: экран снова показывает окно согласия (шлюз), а не «недоступно».
// 'network' — нет связи или вызов не дождался ответа (коды unavailable / deadline-exceeded): макет u31 C18, а не «сервис недоступен».
// 'plus_required' — сервер не видит Plus у записи (permission-denied + dialogue_v2_freeform_plus_required): повтор ответит тем же,
// экран ведёт на экран Plus, а не пишет «сервис недоступен» (владелец 25.10: клиент считал Plus, сервер — нет).
export type DialogueV2FreeformFailureReason = 'unavailable' | 'daily_cap' | 'ai_consent_required' | 'network' | 'plus_required';

export class DialogueV2FreeformUnavailableError extends Error {
  constructor(readonly reason: DialogueV2FreeformFailureReason = 'unavailable') {
    super('dialogue_v2_freeform_unavailable');
    this.name = 'DialogueV2FreeformUnavailableError';
  }
}

/** Ошибка старта/хода свободного разговора → наружу: причина «на сегодня всё» или обычное «недоступно». */
function freeformFailure(error: unknown): DialogueV2FreeformUnavailableError {
  if (isFreeformPlusRequiredError(error)) return new DialogueV2FreeformUnavailableError('plus_required');
  if (isAiConsentRequiredError(error)) return new DialogueV2FreeformUnavailableError('ai_consent_required');
  if (isAiDailyCapError(error)) return new DialogueV2FreeformUnavailableError('daily_cap');
  return new DialogueV2FreeformUnavailableError(isFreeformNetworkError(error) ? 'network' : 'unavailable');
}

/** Нет связи / ответ не дождались: коды вызова Firebase unavailable и deadline-exceeded (в том числе с префиксом functions/). */
function isFreeformNetworkError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
  return /(^|\/)(unavailable|deadline-exceeded)$/.test(code);
}

/** Отказ сервера «нет согласия на ИИ» — по коду/сообщению ошибки вызова (failed-precondition 'ai_consent_required'). */
/**
 * Сервер отказал «нужен Plus»: код permission-denied (в том числе с префиксом functions/) и сообщение сервера
 * dialogue_v2_freeform_plus_required (functions/src/dialogue_v2_freeform_production_adapter.ts). Только этот отказ, а не любой
 * permission-denied — иначе чужой отказ увёл бы на экран Plus человека, у которого Plus есть.
 */
export function isFreeformPlusRequiredError(error: unknown): boolean {
  const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown };
  const code = typeof row.code === 'string' ? row.code : '';
  return /(^|\/)permission-denied$/.test(code)
    && String(row.message ?? '').includes('dialogue_v2_freeform_plus_required');
}

export function isAiConsentRequiredError(error: unknown): boolean {
  const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown; details?: unknown };
  const details = row.details && typeof row.details === 'object' ? (row.details as { reason?: unknown }).reason : undefined;
  return `${String(row.code ?? '')} ${String(row.message ?? '')} ${String(details ?? '')}`.includes('ai_consent_required');
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
  // зачем (жалоба владельца 25.10 «нет кнопки Перевести»; решение координатора): необязательное поле перевода — новый сервер его шлёт,
  // старый нет; битый перевод не роняет ход, а просто не показывается (кнопки нет, [DIALOG-BUBBLE] reason=no_translation).
  const withTranslation = response !== null && 'assistantTranslation' in response;
  if (!response || !hasExactKeys(response, withTranslation
    ? ['ok', 'assistantMessage', 'sessionId', 'expiresAtMs', 'assistantTranslation']
    : ['ok', 'assistantMessage', 'sessionId', 'expiresAtMs'])
    || response.ok !== true || response.sessionId !== request.sessionId
    || !validAssistantMessage(response.assistantMessage)
    || !Number.isSafeInteger(response.expiresAtMs) || Number(response.expiresAtMs) <= 0) return null;
  const translation = withTranslation && validAssistantMessage(response.assistantTranslation) ? response.assistantTranslation : null;
  if (withTranslation && translation === null) {
    console.warn('[DIALOG-BUBBLE] freeform: перевод ответа отброшен — не прошёл проверку текста', JSON.stringify({ type: typeof response.assistantTranslation }));
  }
  return Object.freeze({
    ok: true,
    assistantMessage: response.assistantMessage,
    sessionId: request.sessionId,
    expiresAtMs: Number(response.expiresAtMs),
    ...(translation ? { assistantTranslation: translation } : {}),
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
      { timeout: DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS },
    );
    return validStartResponse((await callable(request)).data);
  } catch (error) {
    logFreeformFailure('start', startedAt, error);
    const failure = freeformFailure(error);
    if (failure.reason === 'plus_required') {
      // зачем (координатор 25.10, Б2): сервер не видит Plus — фоном перечитать доступ и записать, совпало ли (за флагом, без ожидания)
      void import('./plus_server_recheck')
        .then((m) => m.recheckPlusAfterServerRefusal('dialogue_v2_freeform_start'))
        .catch((e: unknown) => console.warn(`[PLUS-RECHECK] import failed reason=${e instanceof Error ? e.message : String(e)}`));
    }
    throw failure;
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
  console.log('[FREEFORM-HANG] turn:send', JSON.stringify({ turnId: request.turnId, studyTarget: request.studyTarget, length: request.userMessage.length, timeoutMs: DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS }));
  try {
    const callable = httpsCallable<DialogueV2FreeformSessionTurn, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformSessionTurn',
      { timeout: DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS },
    );
    const response = validTurnResponse((await callable(request)).data, request);
    console.log('[FREEFORM-HANG] turn:response', JSON.stringify({ turnId: request.turnId, ms: Date.now() - startedAt, valid: response !== null }));
    return response;
  } catch (error) {
    const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'unknown';
    console.warn('[FREEFORM-HANG] turn:failed', JSON.stringify({
      turnId: request.turnId, ms: Date.now() - startedAt, code,
      timedOut: code.includes('deadline-exceeded') || Date.now() - startedAt >= DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS,
      reason: (error instanceof Error ? error.message : String(error)).slice(0, 120),
    }));
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
