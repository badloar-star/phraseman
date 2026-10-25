// dialogue_v2_freeform_translate_callable.ts — «Перевести» одну реплику ИИ свободного разговора по тапу.
// зачем (жалоба владельца 25.10; Ревизор по e00c839e0 — перевод в ответе хода ломал клиенты 2.0.1/2.0.2 со строгой проверкой
// ответа): перевод — отдельный вызов ТОЛЬКО по явной просьбе (тап), ход и его ответ не меняются, платим только за нажатые.
// Переводим не присланный текст, а реплику ИИ из журнала сессии, которая принадлежит вызывающему (подпись владельца) —
// функция не превращается в бесплатный переводчик чего угодно. Язык присылает клиент.
// Клиент зовёт её только при флаге «Пульта» dialogue_freeform_translate_enabled — флаг включают ПОСЛЕ выкладки.
import { AsyncLocalStorage } from 'node:async_hooks';
import { types as nodeTypes } from 'node:util';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { withAiKillSwitch } from './ai_kill_switch';
import { enforceCallerRateWindow } from './caller_rate_window';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { runDialogueV2FreeformProductionAuthorizationTransaction } from './dialogue_v2_freeform_production_adapter';
import { createDialogueV2FreeformOpenAiTransport } from './dialogue_v2_freeform_openai_transport';
import {
  createDialogueV2FreeformReplyTranslator,
  dialogueV2FreeformTranslationLanguage,
  type DialogueV2FreeformReplyTranslator,
  type DialogueV2FreeformTranslationStudyTarget,
} from './dialogue_v2_freeform_reply_translation';
import type { DialogueV2FreeformSessionActor } from './dialogue_v2_freeform_session_ledger';
import { dialogueV2FreeformSessionOwnerBinding } from './dialogue_v2_freeform_session_turn_callable';
import { DIALOGUE_V2_SESSION_HMAC_KEY } from './dialogue_v2_session_production_runtime';
import { resolveConfiguredDialogModel } from './openai_dialog_model_config';
import { recordDialogueV2Billing } from './dialogue_v2_usage_billing';

const LOG = '[DIALOGUE-V2-FREEFORM-TRANSLATE]';
const SESSIONS = 'dialogue_v2_freeform_sessions';
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
/** PM-231 (A3): uid вызывающего для биллинга — контекст вызова, не общая переменная (параллельные вызовы не путаются). */
const translateBillingContext = new AsyncLocalStorage<Readonly<{ authUid: string }>>();

export type DialogueV2FreeformTranslateInput = Readonly<{ sessionId: string; turnId: string; translateTo: string }>;

export type DialogueV2FreeformTranslateDependencies = Readonly<{
  /** Проверка доступа (Plus, личность) — та же транзакция, что у хода; бросает HttpsError отказа. */
  authorize(authUid: string): Promise<DialogueV2FreeformSessionActor>;
  readSession(sessionId: string): Promise<unknown>;
  ownerBinding(actor: DialogueV2FreeformSessionActor): string;
  translator: DialogueV2FreeformReplyTranslator;
  nowMs(): number;
  rateWindow?(authUid: string, rawRequest: unknown): Promise<void>;
}>;

function log(event: string, data: Readonly<Record<string, unknown>>): void {
  console.log(LOG, event, JSON.stringify(data));
}

function plain(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value as Record<string, unknown> : null;
}

/** Запрос: ровно три поля. */
export function parseDialogueV2FreeformTranslateInput(value: unknown): DialogueV2FreeformTranslateInput | null {
  const record = plain(value);
  if (!record) return null;
  const keys = Object.keys(record);
  if (keys.length !== 3 || !['sessionId', 'turnId', 'translateTo'].every((key) => keys.includes(key))) return null;
  const { sessionId, turnId, translateTo } = record;
  if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) return null;
  if (typeof turnId !== 'string' || !TURN_ID_RE.test(turnId)) return null;
  const lang = dialogueV2FreeformTranslationLanguage(translateTo);
  return lang ? Object.freeze({ sessionId, turnId, translateTo: lang }) : null;
}

function expiresAtMs(session: Record<string, unknown>): number {
  if (typeof session.expiresAtMs === 'number') return session.expiresAtMs;
  const expiresAt = session.expiresAt as { toMillis?: () => number } | undefined;
  return typeof expiresAt?.toMillis === 'function' ? expiresAt.toMillis() : 0;
}

function safeAuthorizationError(error: unknown): HttpsError | null {
  if (!(error instanceof HttpsError)) return null;
  if (error.code === 'permission-denied' && error.message === 'dialogue_v2_freeform_plus_required') {
    return new HttpsError('permission-denied', error.message);
  }
  return null;
}

function unavailable(): HttpsError {
  return new HttpsError('unavailable', 'dialogue_v2_freeform_translate_unavailable');
}

export function createDialogueV2FreeformTranslateHandler(
  dependencies: DialogueV2FreeformTranslateDependencies,
): (request: Readonly<{ auth?: Readonly<{ uid?: unknown }>; data?: unknown; rawRequest?: unknown }>) => Promise<Readonly<{ ok: true; translation: string }>> {
  return async (request) => {
    const startedAtMs = dependencies.nowMs();
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)) {
      log('refused', { stage: 'auth_required' });
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    const input = parseDialogueV2FreeformTranslateInput(request.data);
    if (!input) {
      log('refused', { stage: 'request_invalid' });
      throw new HttpsError('invalid-argument', 'dialogue_v2_freeform_translate_request_invalid');
    }
    await dependencies.rateWindow?.(authUid, request.rawRequest);

    let actor: DialogueV2FreeformSessionActor;
    try {
      actor = await dependencies.authorize(authUid);
    } catch (error) {
      const safe = safeAuthorizationError(error);
      log('refused', { stage: safe ? 'plus_required' : 'authorization', error: String((error as { message?: unknown })?.message ?? error).slice(0, 120) });
      throw safe ?? unavailable();
    }

    let session: Record<string, unknown> | null;
    try {
      session = plain(await dependencies.readSession(input.sessionId));
    } catch (error) {
      log('refused', { stage: 'session_read_failed', error: String((error as { code?: unknown })?.code ?? (error as Error)?.message ?? error).slice(0, 120) });
      throw unavailable();
    }
    // зачем: чужая, несуществующая и истёкшая сессия выглядят одинаково — без подсказки, что сессия существует.
    if (!session || session.ownerBinding !== dependencies.ownerBinding(actor)) {
      log('refused', { stage: session ? 'not_owner' : 'session_missing' });
      throw new HttpsError('not-found', 'dialogue_v2_freeform_translate_not_found');
    }
    if (expiresAtMs(session) <= dependencies.nowMs()) {
      log('refused', { stage: 'session_expired' });
      throw new HttpsError('not-found', 'dialogue_v2_freeform_translate_not_found');
    }
    const studyTarget = typeof session.studyTarget === 'string' && STUDY_TARGETS.has(session.studyTarget)
      ? session.studyTarget as DialogueV2FreeformTranslationStudyTarget
      : null;
    const turn = Array.isArray(session.turns)
      ? session.turns.map(plain).find((candidate) => candidate?.turnId === input.turnId) ?? null
      : null;
    const assistantMessage = typeof turn?.assistantMessage === 'string' ? turn.assistantMessage.trim() : '';
    if (!studyTarget || !assistantMessage) {
      log('refused', { stage: studyTarget ? 'turn_missing' : 'session_target_invalid' });
      throw new HttpsError('not-found', 'dialogue_v2_freeform_translate_not_found');
    }

    const translation = await dependencies.translator({ translateTo: input.translateTo, studyTarget, assistantMessage });
    if (!translation) {
      log('refused', { stage: 'translation_unavailable', ms: dependencies.nowMs() - startedAtMs });
      throw unavailable();
    }
    log('served', { lang: input.translateTo, studyTarget, chars: translation.length, ms: dependencies.nowMs() - startedAtMs });
    return Object.freeze({ ok: true as const, translation });
  };
}

function productionDependencies(): DialogueV2FreeformTranslateDependencies {
  const db = (): FirebaseFirestore.Firestore => admin.firestore();
  const transport = createDialogueV2FreeformOpenAiTransport({
    enabled: true,
    resolveApiKey: () => OPENAI_API_KEY.value(),
    resolveModel: () => resolveConfiguredDialogModel(admin.firestore(), process.env.OPENAI_DIALOG_MODEL),
    fetchImpl: (input, init) => fetch(input, init),
    timeoutMs: 10_000,
    // PM-231 (A3): перевод — платный вызов, строка биллинга с uid вызывающего.
    onUsage: async (usage) => {
      const context = translateBillingContext.getStore();
      if (!context) console.warn('[AI-BILLING] dialogue_v2 freeform translation usage without call context', { model: usage.model });
      await recordDialogueV2Billing({ mode: 'v2_freeform', usage, authUid: context?.authUid });
    },
  });
  const translator = createDialogueV2FreeformReplyTranslator({
    translate: (instruction, message) => transport(Object.freeze({
      policyVersion: 'dialogue_v2_freeform_tutor_v1' as const,
      studyTarget: 'en' as const,
      systemInstruction: instruction,
      conversation: Object.freeze([Object.freeze({ role: 'user' as const, content: message })]),
      languageBranchMemory: null,
      maxOutputBytes: 3_072 as const,
    })),
    nowMs: Date.now,
  });
  return Object.freeze({
    authorize: (authUid: string) => runDialogueV2FreeformProductionAuthorizationTransaction(
      Object.freeze({ db: db(), nowMs: Date.now }),
      authUid,
      async (actor) => actor,
    ),
    readSession: async (sessionId: string) => (await db().collection(SESSIONS).doc(sessionId).get()).data() ?? null, // guard-ok: точечное чтение одного документа по id
    ownerBinding: dialogueV2FreeformSessionOwnerBinding,
    translator,
    nowMs: Date.now,
    // зачем (координатор 18.10, защита от накрутки счёта): платный вызов — окно на uid и на IP, как у хода.
    rateWindow: (authUid: string, rawRequest: unknown) => enforceCallerRateWindow({ scope: 'ff_translate', authUid, rawRequest, maxPerUid: 120, maxPerIp: 600 }),
  });
}

function productionHandler(): ReturnType<typeof createDialogueV2FreeformTranslateHandler> {
  const handler = createDialogueV2FreeformTranslateHandler(productionDependencies());
  return (request) => translateBillingContext.run(
    Object.freeze({ authUid: String(request.auth?.uid ?? '') }),
    () => handler(request),
  );
}

export const DIALOGUE_V2_FREEFORM_TRANSLATE_OPTIONS = Object.freeze({
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
  minInstances: 0,
  maxInstances: 10,
  cpu: 1,
  secrets: [OPENAI_API_KEY, DIALOGUE_V2_SESSION_HMAC_KEY],
});

// зачем (Q102): аварийный стоп ИИ «Пульта» закрывает и перевод.
export const dialogueV2FreeformTranslate = onCall(
  DIALOGUE_V2_FREEFORM_TRANSLATE_OPTIONS,
  withAiKillSwitch('dialogueV2FreeformTranslate', productionHandler()),
);
