import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getDevDialogSend } from './dev_dialog_state';
import { devDialogSessionId } from './dev_dialog_send';

import {
  isDialogueV2PreparedBotVoiceToken,
  parseDialogueV2PreparedBotVoiceSelection,
  type DialogueV2PreparedBotVoiceSelection,
} from '../shared/dialogue_v2_prepared_bot_voice_selection_contract';
import {
  consumeDialogueV2StartTapAgeMs,
  registerDialogueV2Prestart,
  takeDialogueV2Prestart,
} from './dialogue_v2_session_prestart';

const FUNCTIONS_REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const SCENARIO_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;

export type DialogueV2TextTurnStudyTarget = 'en' | 'es' | 'fr' | 'de';

export {
  DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
} from '../shared/dialogue_v2_prepared_bot_voice_selection_contract';
export type {
  DialogueV2PreparedBotVoiceSelection,
} from '../shared/dialogue_v2_prepared_bot_voice_selection_contract';

export type DialogueV2TextTurnRequest = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2TextTurnStudyTarget;
  scenarioId: string;
  userMessage: string;
}>;

export type DialogueV2TextTurnResponse =
  | Readonly<{ ok: true; kind: 'silence'; replies: readonly []; replayed: boolean }>
  | Readonly<{
    ok: true;
    kind: 'reply';
    replies: readonly Readonly<{ personaId: string; text: string }>[];
    replayed: boolean;
    preparedBotVoiceSelection?: DialogueV2PreparedBotVoiceSelection;
    quota?: Readonly<{
      period: 'calendar_month';
      remaining: number | null;
      resetAtMs: number;
    }>;
  }>;

export type DialogueV2SessionStartRequest = Readonly<{
  studyTarget: DialogueV2TextTurnStudyTarget;
  scenarioId: string;
}>;

export type DialogueV2SessionStartResponse = Readonly<{
  ok: true;
  sessionId: string;
  expiresAtMs: number;
}>;

/** Callable errors may reveal internal account or provider state; keep UI errors neutral. */
export class DialogueV2TextTurnUnavailableError extends Error {
  constructor(message = 'dialogue_turn_unavailable') {
    super(message);
    this.name = 'DialogueV2TextTurnUnavailableError';
  }
}

/**
 * D123: тихий суточный потолок Plus (300 ответов/сутки на сервере). Отдельный
 * класс, чтобы экран показал спокойное «продолжим завтра», а не «нет связи»:
 * повтор тут не поможет, а мысль «сломался интернет» — ложная.
 */
export class DialogueV2PlusDailyCapError extends DialogueV2TextTurnUnavailableError {
  constructor() {
    super('plus_daily_cap');
    this.name = 'DialogueV2PlusDailyCapError';
  }
}

function isPlusDailyCapError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = String((error as { message?: unknown })?.message ?? '');
  return message.includes('plus_daily_cap') || (code.includes('resource-exhausted') && message.includes('plus_daily_cap'));
}

type PlainRecord = Record<string, unknown>;

function plainRecord(value: unknown): PlainRecord | null {
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
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function safeRequest(value: unknown): DialogueV2TextTurnRequest | null {
  const request = plainRecord(value);
  if (!request || !hasExactKeys(request, ['sessionId', 'turnId', 'studyTarget', 'scenarioId', 'userMessage'])) return null;
  if (typeof request.sessionId !== 'string' || !/^d2s_[A-Za-z0-9_-]{32,96}$/.test(request.sessionId)
    || typeof request.turnId !== 'string' || !/^d2t_[A-Za-z0-9_-]{16,80}$/.test(request.turnId)
    || typeof request.studyTarget !== 'string' || !STUDY_TARGETS.has(request.studyTarget)
    || typeof request.scenarioId !== 'string' || !SCENARIO_ID_RE.test(request.scenarioId)
    || typeof request.userMessage !== 'string' || request.userMessage !== request.userMessage.trim()
    || request.userMessage.length < 1 || request.userMessage.length > 2_000
    || CONTROL_RE.test(request.userMessage)) return null;
  return Object.freeze({
    sessionId: request.sessionId,
    turnId: request.turnId,
    studyTarget: request.studyTarget as DialogueV2TextTurnStudyTarget,
    scenarioId: request.scenarioId,
    userMessage: request.userMessage,
  });
}

function safeStartRequest(value: unknown): DialogueV2SessionStartRequest | null {
  const request = plainRecord(value);
  if (!request || !hasExactKeys(request, ['studyTarget', 'scenarioId'])
    || typeof request.studyTarget !== 'string' || !STUDY_TARGETS.has(request.studyTarget)
    || typeof request.scenarioId !== 'string' || !SCENARIO_ID_RE.test(request.scenarioId)) return null;
  return Object.freeze({ studyTarget: request.studyTarget as DialogueV2TextTurnStudyTarget, scenarioId: request.scenarioId });
}

function safeReply(value: unknown): Readonly<{ personaId: string; text: string }> | null {
  const reply = plainRecord(value);
  if (!reply || !hasExactKeys(reply, ['personaId', 'text'])
    || !isDialogueV2PreparedBotVoiceToken(reply.personaId)
    || typeof reply.text !== 'string' || reply.text !== reply.text.trim()
    || reply.text.length < 1 || reply.text.length > 800 || CONTROL_RE.test(reply.text)) return null;
  return Object.freeze({ personaId: reply.personaId, text: reply.text });
}

function safeQuota(value: unknown) {
  const quota = plainRecord(value);
  const remaining = quota?.remaining;
  const resetAtMs = quota?.resetAtMs;
  if (!quota || !hasExactKeys(quota, ['period', 'remaining', 'resetAtMs'])
    || quota.period !== 'calendar_month'
    || (remaining !== null && (!Number.isSafeInteger(remaining) || (remaining as number) < 0))
    || !Number.isSafeInteger(resetAtMs) || (resetAtMs as number) <= 0) return null;
  return Object.freeze({ period: 'calendar_month' as const, remaining: remaining as number | null, resetAtMs: resetAtMs as number });
}

function safeReplyResponse(
  value: PlainRecord,
  request: DialogueV2TextTurnRequest,
): DialogueV2TextTurnResponse | null {
  const hasPreparedSelection = Object.prototype.hasOwnProperty.call(value, 'preparedBotVoiceSelection');
  const expected = value.replayed === true
    ? ['ok', 'kind', 'replies', 'replayed', ...(hasPreparedSelection ? ['preparedBotVoiceSelection'] : [])]
    : ['ok', 'kind', 'replies', 'replayed', 'quota', ...(hasPreparedSelection ? ['preparedBotVoiceSelection'] : [])];
  if (!hasExactKeys(value, expected)
    || value.ok !== true || value.kind !== 'reply' || typeof value.replayed !== 'boolean' || !Array.isArray(value.replies)
    || Object.getPrototypeOf(value.replies) !== Array.prototype
    || value.replies.length < 1 || value.replies.length > 2) return null;
  const quota = value.replayed ? undefined : safeQuota(value.quota);
  if (!value.replayed && !quota) return null;
  const preparedBotVoiceSelection = hasPreparedSelection
    ? parseDialogueV2PreparedBotVoiceSelection(value.preparedBotVoiceSelection)
    : null;
  const replies = value.replies.map(safeReply);
  if (replies.some((reply) => reply === null)) return null;
  let acceptedPreparedBotVoiceSelection: DialogueV2PreparedBotVoiceSelection | null = null;
  if (preparedBotVoiceSelection) {
    const selectedReply = replies[preparedBotVoiceSelection.replyIndex];
    if (preparedBotVoiceSelection.sessionId === request.sessionId
      && preparedBotVoiceSelection.turnId === request.turnId
      && preparedBotVoiceSelection.studyTarget === request.studyTarget
      && preparedBotVoiceSelection.scenarioId === request.scenarioId
      && selectedReply
      && selectedReply.personaId === preparedBotVoiceSelection.personaId) {
      acceptedPreparedBotVoiceSelection = preparedBotVoiceSelection;
    }
  }
  return Object.freeze({
    ok: true,
    kind: 'reply',
    replies: Object.freeze(replies as Readonly<{ personaId: string; text: string }>[]),
    replayed: value.replayed,
    ...(acceptedPreparedBotVoiceSelection
      ? { preparedBotVoiceSelection: acceptedPreparedBotVoiceSelection }
      : {}),
    ...(quota ? { quota } : {}),
  });
}

function safeResponse(
  value: unknown,
  request: DialogueV2TextTurnRequest,
): DialogueV2TextTurnResponse | null {
  const response = plainRecord(value);
  if (!response || response.ok !== true || typeof response.kind !== 'string' || typeof response.replayed !== 'boolean') return null;
  if (response.kind === 'silence') {
    if (!hasExactKeys(response, ['ok', 'kind', 'replies', 'replayed']) || !Array.isArray(response.replies)
      || Object.getPrototypeOf(response.replies) !== Array.prototype || response.replies.length !== 0) return null;
    return Object.freeze({ ok: true, kind: 'silence', replies: Object.freeze([] as []), replayed: response.replayed });
  }
  return response.kind === 'reply' ? safeReplyResponse(response, request) : null;
}

function safeStartResponse(value: unknown): DialogueV2SessionStartResponse | null {
  const response = plainRecord(value);
  if (!response || !hasExactKeys(response, ['ok', 'sessionId', 'expiresAtMs']) || response.ok !== true
    || typeof response.sessionId !== 'string' || !/^d2s_[A-Za-z0-9_-]{32,96}$/.test(response.sessionId)
    || !Number.isSafeInteger(response.expiresAtMs) || (response.expiresAtMs as number) <= 0) return null;
  return Object.freeze({ ok: true, sessionId: response.sessionId, expiresAtMs: response.expiresAtMs as number });
}

/**
 * Старт серверной сессии для экрана диалога. Если на этот язык:сцену уже идёт/готов
 * фоновый старт (prestartDialogueV2TextSession, при открытии брифинга), берём его —
 * экран получает сессию без второго сетевого круга. Иначе — обычный сетевой старт.
 * Лог [DIALOGUE-V2] start timing: сколько ждали готовности (от вызова и от тапа «Начать»).
 */
export async function startDialogueV2TextSession(selection: DialogueV2SessionStartRequest): Promise<DialogueV2SessionStartResponse | null> {
  const request = safeStartRequest(selection);
  if (!request) {
    console.warn('[DIALOGUE-V2] start timing', JSON.stringify({ event: 'request_invalid' }));
    return null;
  }
  const calledAt = Date.now();
  const prestarted = takeDialogueV2Prestart(request, calledAt);
  let source: 'prestart_ready' | 'prestart_pending' | 'network' | 'network_after_prestart_failed' = 'network';
  let session: DialogueV2SessionStartResponse | null = null;
  if (prestarted) {
    session = await prestarted.promise;
    source = prestarted.state === 'ready' ? 'prestart_ready' : 'prestart_pending';
    if (!session) source = 'network_after_prestart_failed';
  }
  if (!session) {
    try {
      session = await requestDialogueV2TextSessionFromNetwork(request);
    } catch (error) {
      console.warn('[DIALOGUE-V2] start timing', JSON.stringify({
        scenarioId: request.scenarioId, source, ready: false, failed: true, sinceCallMs: Date.now() - calledAt,
      }));
      throw error;
    }
  }
  const readyAt = Date.now();
  // зачем (владелец 01.10, задача «замер»): «тап → готовность первого хода» до/после прогрева.
  console.log('[DIALOGUE-V2] start timing', JSON.stringify({
    scenarioId: request.scenarioId,
    source,
    ready: Boolean(session),
    sinceCallMs: readyAt - calledAt,
    sinceTapMs: consumeDialogueV2StartTapAgeMs(request, readyAt),
  }));
  return session;
}

/**
 * Фоновый старт сессии, пока человек читает брифинг (до «Начать»). Ничего не тратит:
 * энергия — на «Начать», квота — сервером на первом ходе ученика. Повтор для той же
 * сцены, пока прежний жив, не шлёт второй запрос. Никогда не бросает.
 */
export function prestartDialogueV2TextSession(selection: DialogueV2SessionStartRequest): void {
  const request = safeStartRequest(selection);
  if (!request) {
    console.warn('[DIALOGUE-V2] prestart', JSON.stringify({ event: 'request_invalid' }));
    return;
  }
  registerDialogueV2Prestart(request, () => requestDialogueV2TextSessionFromNetwork(request), Date.now());
}

/** Потолок одного вызова старта: сервер — 20 с, плюс запас на сеть. */
export const DIALOGUE_V2_SESSION_START_TIMEOUT_MS = 22_000;

async function requestDialogueV2TextSessionFromNetwork(request: DialogueV2SessionStartRequest): Promise<DialogueV2SessionStartResponse | null> {
  // зачем (координатор 12.10, dev_dialog_send): при подставном ходе и старт не идёт в сеть — иначе в прод пишется
  // документ сессии. Здесь же ловится и предстарт с брифинга. В стор-сборке getDevDialogSend() = null.
  if (getDevDialogSend()) {
    const session = { ok: true as const, sessionId: devDialogSessionId(Date.now()), expiresAtMs: Date.now() + 30 * 60_000 };
    console.log(`[DEV-STATE] dialogs: старт сессии подменён (без сети) scenarioId=${request.scenarioId}`); // guard-ok: dev-ветка
    return session;
  }
  try {
    // зачем (аудит «пропала сеть», Авторизация 13.10): без своего потолка вызов ждал нативные ~60–70 с, и тихие повторы старта
    // растягивались до минут. Сервер работает до 20 с (timeoutSeconds: 20) — ждём чуть дольше, дальше обычный тихий повтор.
    const callable = httpsCallable<DialogueV2SessionStartRequest, unknown>(getFunctions(getApp(), FUNCTIONS_REGION), 'dialogueV2SessionStart', { timeout: DIALOGUE_V2_SESSION_START_TIMEOUT_MS });
    return safeStartResponse((await callable(request)).data);
  } catch (error) {
    // Немой catch запрещён: код отказа виден в логе, наружу — нейтральная ошибка.
    console.warn('[DIALOGUE-V2] start:catch', JSON.stringify({
      code: String((error as { code?: unknown })?.code ?? '').slice(0, 60),
      reason: String((error as { message?: unknown })?.message ?? error).slice(0, 120),
    }));
    throw new DialogueV2TextTurnUnavailableError();
  }
}

/**
 * Sends one bounded learner text message. Server-side content and access
 * authority are deliberately absent from this request and response validator.
 */
export async function sendDialogueV2TextTurn(
  selection: DialogueV2TextTurnRequest,
): Promise<DialogueV2TextTurnResponse | null> {
  const request = safeRequest(selection);
  if (!request) return null;

  try {
    const callable = httpsCallable<DialogueV2TextTurnRequest, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2TextTurn',
    );
    const response = await callable(request);
    return safeResponse(response.data, request);
  } catch (error) {
    // Немой catch запрещён: код и сообщение отказа видны в логе, наружу — нейтральная ошибка.
    console.warn('[DIALOGUE-V2-TURN] send:catch', JSON.stringify({
      code: String((error as { code?: unknown })?.code ?? '').slice(0, 60),
      reason: String((error as { message?: unknown })?.message ?? error).slice(0, 120),
    }));
    if (isPlusDailyCapError(error)) throw new DialogueV2PlusDailyCapError();
    throw new DialogueV2TextTurnUnavailableError();
  }
}
