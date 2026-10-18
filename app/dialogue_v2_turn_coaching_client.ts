import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  isDialogueV2PreparedBotVoiceToken,
  parseDialogueV2PreparedBotVoiceSelection,
  type DialogueV2PreparedBotVoiceSelection,
} from '../shared/dialogue_v2_prepared_bot_voice_selection_contract';
import { getDevDialogFail, getDevDialogMood, getDevDialogSend, isDevDialogBetter, isDevDialogEnd } from './dev_dialog_state';
import { resolveDevDialogSend } from './dev_dialog_send';
import { readAiDialogMonthlyQuota } from './ai_dialog_daily_quota';
import { captureAccountGeneration } from './account_generation';
import { parseAiDialogQuotaObservation, type AiDialogQuotaObservation } from './ai_dialog_daily_quota';
import { DialogueV2TextTurnUnavailableError, type DialogueV2TextTurnStudyTarget } from './dialogue_v2_turn_client';
import { isAiDailyCapError } from './ai_daily_cap_signal';

// зачем (владелец 2026-09-30, D112): клиент 2.0 шлёт ход V2 с языком интерфейса и получает
// вместе с репликой разбор: перевод, «Почему так», «Лучше так», подсказку, настроение
// собеседника и признак «собеседник закрыл сцену». Отдельный файл, а не правка
// dialogue_v2_turn_client.ts: там идёт параллельная работа D123, а старый транспорт
// обязан остаться прежним для экранов, которые разбор не показывают.
// Отказы сервера разбираются по причине (сеть / сервис / частота / месячная квота /
// пауза раздела), чтобы экран показал правильную плашку, а не одну «нет связи».

const FUNCTIONS_REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGS = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const SCENARIO_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
/** Подсказка подставного хода (dev_dialog_send): текст для окна «Подсказка» на кадре dialogs-017. */
export const DEV_DIALOG_HINT_TEXT = 'Try greeting first, then ask one simple question. (dev)';
/** Перевод и «Почему так» подставной реплики (dev_dialog_send): кадры dialogs-015/019/020. */
export const DEV_DIALOG_REPLY_TRANSLATION = 'Понял! Расскажи чуть подробнее. (dev)';
export const DEV_DIALOG_REPLY_TRANSLATION_END = 'Было приятно поговорить — до скорого! (dev)';
export const DEV_DIALOG_REPLY_EXPLANATION = '«Tell me a bit more» — мягкая просьба продолжить: собеседник показывает, что слушает. (dev)';
const OBJECTIVE_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:[_:-][a-z0-9]+)*$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;
const MOODS = new Set(['happy', 'smile', 'neutral', 'sad', 'angry']);

export type DialogueV2CoachingMood = 'happy' | 'smile' | 'neutral' | 'sad' | 'angry';

export type DialogueV2TurnCoaching = Readonly<{
  replyTranslations: readonly string[] | null;
  replyExplanations: readonly string[] | null;
  betterPhrasing: string | null;
  hint: string | null;
  mood: DialogueV2CoachingMood | null;
  activeObjectiveId: string | null;
  dialogueEnded: boolean;
}>;

export type DialogueV2CoachedTurnRequest = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2TextTurnStudyTarget;
  scenarioId: string;
  userMessage: string;
  interfaceLang: string;
}>;

export type DialogueV2CoachedTurnQuota = Readonly<{
  remaining: number | null;
  resetAtMs: number;
  /** Есть только в свежем ответе (не при повторе хода). */
  quotaVersion: number | null;
}>;

export type DialogueV2CoachedTurnResponse =
  | Readonly<{ kind: 'silence'; replayed: boolean }>
  | Readonly<{
    kind: 'reply';
    replies: readonly Readonly<{ personaId: string; text: string }>[];
    replayed: boolean;
    preparedBotVoiceSelection: DialogueV2PreparedBotVoiceSelection | null;
    quota: DialogueV2CoachedTurnQuota | null;
    /** null — повтор уже принятого хода: разбор сервер не хранит. */
    coaching: DialogueV2TurnCoaching | null;
  }>;

export type DialogueV2TurnFailureReason =
  | 'network'
  | 'service'
  | 'rate_limited'
  | 'plus_daily_cap'
  | 'quota_exhausted'
  | 'paused';

/** Отказ хода с причиной. Наследник старой ошибки — прежние проверки `instanceof` работают. */
export class DialogueV2TurnFailureError extends DialogueV2TextTurnUnavailableError {
  constructor(
    readonly reason: DialogueV2TurnFailureReason,
    readonly quotaObservation: AiDialogQuotaObservation | null = null,
  ) {
    super(`dialogue_turn_${reason}`);
    this.name = 'DialogueV2TurnFailureError';
  }
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
  } catch (error: unknown) {
    console.warn('[DIALOGUE-V2] coached:record → unreadable value', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function hasExactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function safeRequest(value: DialogueV2CoachedTurnRequest): DialogueV2CoachedTurnRequest | null {
  if (!/^d2s_[A-Za-z0-9_-]{32,96}$/.test(value.sessionId)
    || !/^d2t_[A-Za-z0-9_-]{16,80}$/.test(value.turnId)
    || !STUDY_TARGETS.has(value.studyTarget)
    || !SCENARIO_ID_RE.test(value.scenarioId)
    || !INTERFACE_LANGS.has(value.interfaceLang)
    || value.userMessage !== value.userMessage.trim()
    || value.userMessage.length < 1 || value.userMessage.length > 2_000
    || CONTROL_RE.test(value.userMessage)) return null;
  return Object.freeze({ ...value });
}

function learnerText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value === value.trim() && value.length >= 1
    && value.length <= maxLength && !CONTROL_RE.test(value) ? value : null;
}

function alignedTexts(value: unknown, count: number, maxLength: number): readonly string[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  const texts = value.map((item) => learnerText(item, maxLength));
  return texts.every((text): text is string => text !== null) ? Object.freeze(texts) : null;
}

/** Разбор проверяется поле за полем: битое поле → null, реплика при этом не теряется. */
export function parseDialogueV2TurnCoaching(value: unknown, replyCount: number): DialogueV2TurnCoaching | null {
  const raw = plainRecord(value);
  if (!raw || !hasExactKeys(raw, [
    'replyTranslations', 'replyExplanations', 'betterPhrasing', 'hint', 'mood', 'activeObjectiveId', 'dialogueEnded',
  ])) return null;
  return Object.freeze({
    replyTranslations: alignedTexts(raw.replyTranslations, replyCount, 800),
    replyExplanations: alignedTexts(raw.replyExplanations, replyCount, 600),
    betterPhrasing: learnerText(raw.betterPhrasing, 400),
    hint: learnerText(raw.hint, 300),
    mood: typeof raw.mood === 'string' && MOODS.has(raw.mood) ? raw.mood as DialogueV2CoachingMood : null,
    activeObjectiveId: typeof raw.activeObjectiveId === 'string' && OBJECTIVE_ID_RE.test(raw.activeObjectiveId)
      ? raw.activeObjectiveId
      : null,
    dialogueEnded: raw.dialogueEnded === true,
  });
}

function safeReply(value: unknown): Readonly<{ personaId: string; text: string }> | null {
  const reply = plainRecord(value);
  if (!reply || !hasExactKeys(reply, ['personaId', 'text'])
    || !isDialogueV2PreparedBotVoiceToken(reply.personaId)) return null;
  const text = learnerText(reply.text, 800);
  return text ? Object.freeze({ personaId: reply.personaId as string, text }) : null;
}

function safeQuota(value: unknown): DialogueV2CoachedTurnQuota | null {
  const quota = plainRecord(value);
  if (!quota || quota.period !== 'calendar_month') return null;
  const keys = Object.keys(quota);
  if (!keys.every((key) => ['period', 'remaining', 'resetAtMs', 'quotaVersion'].includes(key))) return null;
  const { remaining, resetAtMs, quotaVersion } = quota;
  if ((remaining !== null && (!Number.isSafeInteger(remaining) || (remaining as number) < 0))
    || !Number.isSafeInteger(resetAtMs) || (resetAtMs as number) <= 0
    || (quotaVersion !== undefined && (!Number.isSafeInteger(quotaVersion) || (quotaVersion as number) < 1))) return null;
  return Object.freeze({
    remaining: remaining as number | null,
    resetAtMs: resetAtMs as number,
    quotaVersion: quotaVersion === undefined ? null : quotaVersion as number,
  });
}

/** Ответ проверяется целиком; экспорт — для теста. */
export function parseDialogueV2CoachedTurnResponse(
  value: unknown,
  request: DialogueV2CoachedTurnRequest,
): DialogueV2CoachedTurnResponse | null {
  const response = plainRecord(value);
  if (!response || response.ok !== true || typeof response.replayed !== 'boolean') return null;
  if (response.kind === 'silence') {
    return Array.isArray(response.replies) && response.replies.length === 0
      ? Object.freeze({ kind: 'silence', replayed: response.replayed })
      : null;
  }
  if (response.kind !== 'reply' || !Array.isArray(response.replies)
    || response.replies.length < 1 || response.replies.length > 2) return null;
  const allowed = ['ok', 'kind', 'replies', 'replayed', 'quota', 'coaching', 'preparedBotVoiceSelection'];
  if (!Object.keys(response).every((key) => allowed.includes(key))) return null;
  const replies = response.replies.map(safeReply);
  if (replies.some((reply) => reply === null)) return null;
  const safeReplies = Object.freeze(replies as Readonly<{ personaId: string; text: string }>[]);
  const quota = response.quota === undefined ? null : safeQuota(response.quota);
  if (response.quota !== undefined && !quota) return null;
  const coaching = response.coaching === undefined ? null : parseDialogueV2TurnCoaching(response.coaching, safeReplies.length);
  if (response.coaching !== undefined && !coaching) {
    console.warn('[DIALOGUE-V2] coached:parse → coaching block rejected, reply kept', { scenarioId: request.scenarioId });
  }
  const selection = response.preparedBotVoiceSelection === undefined
    ? null
    : parseDialogueV2PreparedBotVoiceSelection(response.preparedBotVoiceSelection);
  const selectedReply = selection ? safeReplies[selection.replyIndex] : undefined;
  const acceptedSelection = selection
    && selection.sessionId === request.sessionId
    && selection.turnId === request.turnId
    && selection.studyTarget === request.studyTarget
    && selection.scenarioId === request.scenarioId
    && selectedReply?.personaId === selection.personaId
    ? selection
    : null;
  return Object.freeze({
    kind: 'reply',
    replies: safeReplies,
    replayed: response.replayed,
    preparedBotVoiceSelection: acceptedSelection,
    quota,
    coaching,
  });
}

function errorText(error: unknown): Readonly<{ code: string; message: string }> {
  const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown };
  return Object.freeze({
    code: String(row.code ?? '').slice(0, 80),
    message: String(row.message ?? error ?? '').slice(0, 160),
  });
}

/** Причина отказа по коду и сообщению callable. Экспорт — для теста. */
export function classifyDialogueV2TurnFailure(error: unknown): DialogueV2TurnFailureReason {
  const { code, message } = errorText(error);
  if (message.includes('dialog_free_limit')) return 'quota_exhausted';
  if (message.includes('plus_daily_cap')) return 'plus_daily_cap';
  // зачем (координатор 18.10): общий дневной потолок ИИ и дневные окна uid/IP — «на сегодня всё», ввод закрыт, без повтора.
  if (isAiDailyCapError(error)) return 'plus_daily_cap';
  if (message.includes('dialog_rate_limited') || code.includes('resource-exhausted')) return 'rate_limited';
  if (message.includes('dialogue_v2_turn_release_unavailable') || message.includes('ai_globally_disabled')) return 'paused';
  if (message.includes('dialogue_v2_turn_unavailable') || message.includes('dialogue_v2_session_')
    || message.includes('dialogue_v2_turn_')) return 'service';
  return 'network';
}

export async function sendDialogueV2CoachedTextTurn(
  selection: DialogueV2CoachedTurnRequest,
): Promise<DialogueV2CoachedTurnResponse> {
  const request = safeRequest(selection);
  if (!request) {
    console.warn('[DIALOGUE-V2] coached:send → request rejected locally', { scenarioId: selection.scenarioId });
    throw new DialogueV2TurnFailureError('service');
  }
  // зачем (координатор 12.10, R1 «нет пути»): dev-отказ сервера для съёмки — до сети и без списаний; в стор-сборке getDevDialogFail() = null.
  const devFail = getDevDialogFail();
  if (devFail) {
    console.log(`[DEV-STATE] dialogs: ход подменён отказом reason=${devFail} scenarioId=${request.scenarioId}`); // guard-ok: dev-ветка
    throw new DialogueV2TurnFailureError(devFail);
  }
  // зачем (координатор 12.10, dev_dialog_send): Сверка снимает «N/30» без ИИ на проде — ход подменяется ДО сети с
  // задержкой как у живого ответа; в стор-сборке getDevDialogSend() = null.
  const devSend = getDevDialogSend();
  if (devSend) {
    const outcome = await resolveDevDialogSend(devSend, {
      readQuota: () => readAiDialogMonthlyQuota(request.studyTarget, captureAccountGeneration().stableId),
      wait: (ms) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }),
      nowMs: () => Date.now(),
    });
    if (outcome.kind === 'fail') throw new DialogueV2TurnFailureError(outcome.reason);
    // зачем (Макеты 12.10, dialogs-037/021): dev_dialog_end — подставной ход завершает диалог; dev_dialog_better — в разборе «Лучше так».
    const devEnd = isDevDialogEnd();
    const devBetter = isDevDialogBetter();
    const devMood = getDevDialogMood();
    console.log(`[DEV-STATE] dialogs: подставной ход ${JSON.stringify({ end: devEnd, better: devBetter, mood: devMood })}`); // guard-ok: dev-ветка
    return {
      kind: 'reply',
      replies: [{ personaId: 'dev', text: devEnd ? 'Great talking to you — see you soon! (dev)' : 'Got it! Tell me a bit more. (dev)' }],
      replayed: false,
      preparedBotVoiceSelection: null,
      quota: { remaining: outcome.remaining, resetAtMs: outcome.resetAtMs, quotaVersion: 1 },
      // зачем (координатор 12.10, dialogs-023): dev_dialog_mood применялся только к настоящему ответу сервера (ниже) и при подставном ходе терялся —
      // кадр «Настроение собеседника упало» был недостижим. В dev при заданном настроении отдаём минимальный разбор, где есть только оно.
      // зачем (координатор 12.10, dialogs-017 «Подсказка — окно»): кнопка подсказки в карточке цели рисуется только когда после хода пришёл `hint`, а подставной ход его не нёс —
      // кадр был недостижим. Теперь подставной ход всегда отдаёт разбор с подсказкой (только dev: в стор-сборке getDevDialogSend() = null); остальные поля разбора прежние.
      // зачем (chain21 Сверки 13.10, dialogs-015/019/020 step_target_not_found): кнопки «Перевод» и «Почему так» у реплики
      // рисуются только при переводе/объяснении в разборе, а подставной ход их не нёс — кадры были недостижимы. Теперь по одному
      // на единственную реплику (только dev: в стор-сборке getDevDialogSend() = null).
      coaching: {
        replyTranslations: [devEnd ? DEV_DIALOG_REPLY_TRANSLATION_END : DEV_DIALOG_REPLY_TRANSLATION],
        replyExplanations: [DEV_DIALOG_REPLY_EXPLANATION],
        betterPhrasing: devBetter ? 'I would like a table for two, please.' : null, hint: DEV_DIALOG_HINT_TEXT,
        // зачем (Макеты dialogs-019, разбор 13.10): у настоящего ответа сервера настроение собеседника есть всегда и в шапке стоит «😊 Доволен», а подставной ход
        // оставлял mood пустым — шапка рисовала запасное «Диалог». Без явного dev_dialog_mood подставной ход отдаёт 'smile' («Доволен»), как в образце.
        mood: devMood ?? 'smile', activeObjectiveId: null, dialogueEnded: devEnd,
      },
    };
  }
  const startedAt = Date.now();
  let data: unknown;
  try {
    const callable = httpsCallable<DialogueV2CoachedTurnRequest, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2TextTurn',
    );
    data = (await callable(request)).data;
  } catch (error: unknown) {
    const reason = classifyDialogueV2TurnFailure(error);
    const { code, message } = errorText(error);
    const details = (error as { details?: unknown } | null)?.details;
    console.warn('[DIALOGUE-V2] coached:send → callable failed', {
      reason, code, message, ms: Date.now() - startedAt, scenarioId: request.scenarioId,
    });
    throw new DialogueV2TurnFailureError(
      reason,
      reason === 'quota_exhausted' ? parseAiDialogQuotaObservation(details) : null,
    );
  }
  const parsed = parseDialogueV2CoachedTurnResponse(data, request);
  if (!parsed) {
    console.warn('[DIALOGUE-V2] coached:send → response rejected by validator', {
      scenarioId: request.scenarioId, ms: Date.now() - startedAt,
    });
    throw new DialogueV2TurnFailureError('service');
  }
  // зачем (R1 «нет пути»): dev-настроение поверх настоящего ответа (разбор хода остаётся серверным); в стор-сборке null.
  const devMood = getDevDialogMood();
  if (devMood && parsed.kind === 'reply' && parsed.coaching) {
    console.log(`[DEV-STATE] dialogs: настроение подменено ${String(parsed.coaching.mood)} → ${devMood}`); // guard-ok: dev-ветка
    return { ...parsed, coaching: { ...parsed.coaching, mood: devMood } };
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[DIALOGUE-V2] coached:send → ok', {
      kind: parsed.kind,
      replayed: parsed.replayed,
      hasCoaching: parsed.kind === 'reply' ? parsed.coaching !== null : false,
      remaining: parsed.kind === 'reply' ? parsed.quota?.remaining ?? null : null,
      ms: Date.now() - startedAt,
    });
  }
  return parsed;
}
