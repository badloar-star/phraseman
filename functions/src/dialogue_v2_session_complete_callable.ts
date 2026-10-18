import { createHmac, randomBytes } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { assertDialogueStudyLanguage } from './dialogue_ai_language_contract';
import {
  loadDialogueV2CompletionReleaseCandidate,
  type DialogueV2CompletionReleaseRepository,
} from './dialogue_v2_completion_release_source';
import {
  DialogueV2SessionCompletionError,
  createDialogueV2SessionCompletionReleaseSnapshot,
  executeDialogueV2SessionCompletion,
  type DialogueV2SessionCompletionEnvelope,
  type DialogueV2SessionCompletionReleaseSnapshot,
} from './dialogue_v2_session_completion_core';
import {
  claimDialogueV2SessionTerminal,
  completeDialogueV2SessionTerminal,
  DialogueV2SessionTerminalError,
  releaseDialogueV2SessionTerminalClaim,
  stageDialogueV2SessionTerminalAssessment,
  type DialogueV2SessionTerminalMemoryReceipt,
} from './dialogue_v2_session_terminal_store';
import { authorizeDialogueV2ServerPacket } from './dialogue_v2_server_authorization';
import { DIALOGUE_V2_SESSION_HMAC_KEY } from './dialogue_v2_session_production_runtime';
import {
  applyDialogueV2MemoryCommand,
  prepareDialogueV2CompletionMemory,
  type DialogueV2PreparedCompletionMemory,
} from './dialogue_v2_memory_writer';
import {
  ALLOWED_DIALOG_MODELS,
  modelSupportsJsonObject,
  resolveConfiguredDialogModel,
} from './openai_dialog_model_config';
import {
  recordDialogueV2Billing,
  reportDialogueV2Usage,
  type DialogueV2UsageReporter,
} from './dialogue_v2_usage_billing';
import { resolvePremiumAccess } from './premium_status';
import { aiGloballyDisabled } from './remote_gates';
import { enforceCallerRateWindow } from './caller_rate_window';

import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
const REGION = 'us-central1';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const PROVIDER_DEADLINE_MS = 20_000;
const SESSION_ID_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const SCENARIO_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGUAGES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const COMPLETION_CONTROL_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const DIALOGUE_V2_MEMORY_ID_SECRET = defineSecret('DIALOGUE_V2_MEMORY_ID_SECRET');

type CompletionSelection = Readonly<{
  sessionId: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  interfaceLang: string;
}>;

type CallableRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

type ClaimResult = Readonly<{
  kind: 'new' | 'resume' | 'replay';
  session: unknown;
  assessmentRaw?: string;
  releaseSnapshot?: DialogueV2SessionCompletionReleaseSnapshot;
  memoryReceipt?: DialogueV2SessionTerminalMemoryReceipt;
  claimContext?: unknown;
}>;

type BuiltCompletion = Readonly<{
  completion: DialogueV2SessionCompletionEnvelope | unknown;
  assessmentRaw: string;
  releaseSnapshot: DialogueV2SessionCompletionReleaseSnapshot;
}>;

type HandlerDependencies = Readonly<{
  claimTerminal(input: Readonly<{
    authUid: string;
    selection: CompletionSelection;
  }>): Promise<ClaimResult>;
  buildCompletion(input: Readonly<{
    authUid: string;
    selection: CompletionSelection;
    session: unknown;
    assessmentRaw?: string;
    releaseSnapshot?: DialogueV2SessionCompletionReleaseSnapshot;
  }>): Promise<BuiltCompletion>;
  stageAssessment(input: Readonly<{
    claim: ClaimResult;
    assessmentRaw: string;
    releaseSnapshot: DialogueV2SessionCompletionReleaseSnapshot;
  }>): Promise<void>;
  prepareMemory(input: Readonly<{
    authUid: string;
    studyTarget: DialogueV2StudyTarget;
    scenarioId: string;
    completion: unknown;
    releaseSnapshot: DialogueV2SessionCompletionReleaseSnapshot;
  }>): Promise<Readonly<{
    prepared: DialogueV2PreparedCompletionMemory | unknown;
    memoryReceipt: DialogueV2SessionTerminalMemoryReceipt;
  }>>;
  publishCompletion(input: Readonly<{
    claim: ClaimResult;
    selection: CompletionSelection;
    assessmentRaw: string;
    releaseSnapshot: DialogueV2SessionCompletionReleaseSnapshot;
    memoryReceipt: DialogueV2SessionTerminalMemoryReceipt;
    prepared: DialogueV2PreparedCompletionMemory | unknown;
  }>): Promise<void>;
  releaseClaim(input: Readonly<{ claim: ClaimResult; selection: CompletionSelection }>): Promise<void>;
}>;

function exactSelection(value: unknown): CompletionSelection | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const expected = ['sessionId', 'studyTarget', 'scenarioId', 'interfaceLang'];
    if (keys.length !== expected.length
      || keys.some((key) => typeof key !== 'string' || !expected.includes(key))) return null;
    const snapshot = Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => (
      descriptor.enumerable && 'value' in descriptor ? [key, descriptor.value] : [key, undefined]
    )));
    if (typeof snapshot.sessionId !== 'string' || !SESSION_ID_RE.test(snapshot.sessionId)
      || typeof snapshot.studyTarget !== 'string' || !STUDY_TARGETS.has(snapshot.studyTarget)
      || typeof snapshot.scenarioId !== 'string' || !SCENARIO_ID_RE.test(snapshot.scenarioId)
      || typeof snapshot.interfaceLang !== 'string' || !INTERFACE_LANGUAGES.has(snapshot.interfaceLang)) return null;
    return Object.freeze({
      sessionId: snapshot.sessionId,
      studyTarget: snapshot.studyTarget as DialogueV2StudyTarget,
      scenarioId: snapshot.scenarioId,
      interfaceLang: snapshot.interfaceLang,
    });
  } catch {
    return null;
  }
}

export function createDialogueV2SessionCompleteHandler(
  dependencies: HandlerDependencies,
): (request: CallableRequest) => Promise<Readonly<Record<string, unknown>>> {
  return async (request) => {
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string') throw new HttpsError('unauthenticated', 'auth_required');
    const selection = exactSelection(request.data);
    if (!selection) throw new HttpsError('invalid-argument', 'dialogue_v2_completion_request_invalid');
    // зачем (координатор 18.10, защита от накрутки счёта): разбор итога (OpenAI) без потолка — окно на uid и на IP.
    await enforceCallerRateWindow({ scope: 'dlg_complete', authUid, rawRequest: (request as { rawRequest?: unknown }).rawRequest, maxPerUid: 60, maxPerIp: 300 });
    // зачем (баг 02.10, «Дизайн»: итог диалога у Free — dialogue_v2_completion_unavailable,
    // в прод-логе пусто): этап, на котором сломалось завершение, обязан попасть в лог.
    let stage = 'claim';
    // зачем (баг 02.10: итог шёл 30,4 с и падал по тайм-ауту функции): время каждого этапа в лог.
    const startedAtMs = Date.now();
    let stageStartedAtMs = startedAtMs;
    const stageMs: Record<string, number> = {};
    const enterStage = (next: string): string => {
      const now = Date.now();
      stageMs[stage] = now - stageStartedAtMs;
      stageStartedAtMs = now;
      return next;
    };
    try {
      const claim = await dependencies.claimTerminal({ authUid, selection });
      let built: BuiltCompletion;
      stage = enterStage(`build:${claim.kind}`);
      try {
        built = await dependencies.buildCompletion({
          authUid,
          selection,
          session: claim.session,
          ...(claim.kind !== 'new' ? { assessmentRaw: claim.assessmentRaw } : {}),
          ...(claim.kind !== 'new' ? { releaseSnapshot: claim.releaseSnapshot } : {}),
        });
      } catch (error) {
        if (claim.kind === 'new') {
          await dependencies.releaseClaim({ claim, selection }).catch(swallowed('dialogue_v2_session_complete_callable:releaseClaim', undefined));
        }
        throw error;
      }
      if (claim.kind === 'replay') {
        if (!claim.memoryReceipt) throw new HttpsError('unavailable', 'dialogue_v2_completion_unavailable');
        return Object.freeze({
          ok: true,
          v2Completion: built.completion,
          v2Memory: claim.memoryReceipt,
          replayed: true,
        });
      }
      if (claim.kind === 'new') {
        stage = enterStage('stage_assessment');
        await dependencies.stageAssessment({
          claim,
          assessmentRaw: built.assessmentRaw,
          releaseSnapshot: built.releaseSnapshot,
        });
      }
      stage = enterStage('prepare_memory');
      const preparedMemory = await dependencies.prepareMemory({
        authUid,
        studyTarget: selection.studyTarget,
        scenarioId: selection.scenarioId,
        completion: built.completion,
        releaseSnapshot: built.releaseSnapshot,
      });
      stage = enterStage('publish');
      await dependencies.publishCompletion({
        claim,
        selection,
        assessmentRaw: built.assessmentRaw,
        releaseSnapshot: built.releaseSnapshot,
        memoryReceipt: preparedMemory.memoryReceipt,
        prepared: preparedMemory.prepared,
      });
      stageMs[stage] = Date.now() - stageStartedAtMs;
      console.log('[DIALOGUE-V2-COMPLETE] ok', JSON.stringify({
        scenarioId: selection.scenarioId, totalMs: Date.now() - startedAtMs, stageMs,
      }));
      return Object.freeze({
        ok: true,
        v2Completion: built.completion,
        v2Memory: preparedMemory.memoryReceipt,
        replayed: false,
      });
    } catch (error) {
      const failure = error as { name?: unknown; code?: unknown; message?: unknown } | null;
      stageMs[stage] = Date.now() - stageStartedAtMs;
      console.warn('[DIALOGUE-V2-COMPLETE] failed', JSON.stringify({
        stage,
        totalMs: Date.now() - startedAtMs,
        stageMs,
        scenarioId: selection.scenarioId,
        studyTarget: selection.studyTarget,
        name: typeof failure?.name === 'string' ? failure.name : null,
        code: typeof failure?.code === 'string' ? failure.code : null,
        message: typeof failure?.message === 'string' ? failure.message.slice(0, 200) : String(error).slice(0, 200),
      }));
      if (error instanceof HttpsError) throw error;
      if (error instanceof DialogueV2SessionTerminalError) {
        if (error.code === 'access_denied') {
          throw new HttpsError('permission-denied', 'dialogue_v2_session_access_denied');
        }
        if (error.code === 'completion_in_progress') {
          throw new HttpsError('aborted', 'dialogue_v2_completion_in_progress');
        }
        if (error.code === 'session_expired') {
          throw new HttpsError('failed-precondition', 'dialogue_v2_session_expired');
        }
      }
      if (error instanceof DialogueV2SessionCompletionError
        && error.code === 'request_invalid') {
        throw new HttpsError('invalid-argument', 'dialogue_v2_completion_request_invalid');
      }
      throw new HttpsError('unavailable', 'dialogue_v2_completion_unavailable');
    }
  };
}

function releaseRepository(db: FirebaseFirestore.Firestore): DialogueV2CompletionReleaseRepository {
  return Object.freeze({
    readDocument: async (path: string) => {
      const snapshot = await db.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    readCollection: async (path: string) => {
      const snapshot = await db.collection(path).get();
      return snapshot.docs.map((document) => Object.freeze({ id: document.id, data: document.data() }));
    },
  });
}

export async function resolveDialogueV2CompletionReleaseSnapshot(
  storedRelease: unknown,
  selection: Pick<CompletionSelection, 'studyTarget' | 'scenarioId'>,
  loadCurrentAuthorizedPacket: () => Promise<unknown | null>,
): Promise<DialogueV2SessionCompletionReleaseSnapshot | null> {
  let releaseSnapshot = createDialogueV2SessionCompletionReleaseSnapshot(storedRelease);
  if (!releaseSnapshot) {
    releaseSnapshot = createDialogueV2SessionCompletionReleaseSnapshot(
      await loadCurrentAuthorizedPacket(),
    );
  }
  return releaseSnapshot
    && releaseSnapshot.studyTarget === selection.studyTarget
    && releaseSnapshot.scenarioId === selection.scenarioId
    ? releaseSnapshot
    : null;
}

function sessionSecret(): string {
  const secret = String(DIALOGUE_V2_SESSION_HMAC_KEY.value() || '').trim();
  if (secret.length < 32 || secret.length > 512) throw new Error('session_secret_unavailable');
  return secret;
}

function ownerBinding(secret: string, authUid: string, stableAccountId: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update('dialogue-v2-owner.v1');
  hmac.update('\u0000');
  hmac.update(authUid);
  hmac.update('\u0000');
  hmac.update(stableAccountId);
  return hmac.digest('hex');
}

function providerContent(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length < 1) return null;
  const choice = choices[0] as Record<string, unknown> | null;
  const message = choice?.message as Record<string, unknown> | null;
  const content = message?.content;
  return typeof content === 'string' && content.length > 0 && content.length <= 5_000
    ? content
    : null;
}

export type DialogueV2CompletionProviderRuntime = Readonly<{
  nowMs(): number;
  resolveApiKey(): string;
  resolveModel(): Promise<string>;
  fetchImpl(input: string, init?: RequestInit): Promise<Pick<Response, 'ok' | 'json'>>;
  /** PM-231 (A3): отчёт о токенах оплаченного ответа (только числа и модель). */
  onUsage?: DialogueV2UsageReporter;
}>;

function safeCompletionTranscript(value: unknown): readonly Readonly<{
  messageId?: string;
  role: 'user' | 'assistant';
  content: string;
}>[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length < 1 || value.length > 24) return null;
  let userCount = 0;
  let assistantCountSinceUser = 0;
  const messageIds = new Set<string>();
  const turns: Readonly<{ messageId?: string; role: 'user' | 'assistant'; content: string }>[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const turn = item as Record<string, unknown>;
    const role = turn.role;
    const content = turn.content;
    if ((role !== 'user' && role !== 'assistant')
      || typeof content !== 'string' || content !== content.trim()
      || content.length < 1 || content.length > 3_072
      || COMPLETION_CONTROL_RE.test(content)) return null;
    if (role === 'user') {
      if (Object.keys(turn).length !== 3
        || typeof turn.messageId !== 'string'
        || !/^d2t_[A-Za-z0-9_-]{16,80}$/.test(turn.messageId)
        || messageIds.has(turn.messageId)) return null;
      messageIds.add(turn.messageId);
      userCount += 1;
      assistantCountSinceUser = 0;
      if (userCount > 8) return null;
      turns.push(Object.freeze({ messageId: turn.messageId, role, content }));
    } else {
      if (Object.keys(turn).length !== 2 || userCount < 1 || assistantCountSinceUser >= 2) return null;
      assistantCountSinceUser += 1;
      turns.push(Object.freeze({ role, content }));
    }
  }
  return Buffer.byteLength(JSON.stringify(turns), 'utf8') <= 12 * 1_024
    ? Object.freeze(turns)
    : null;
}

export function createDialogueV2CompletionAssessmentGenerator(
  runtime: DialogueV2CompletionProviderRuntime,
) {
  return async (input: Readonly<{
    systemPrompt: string;
    transcript: readonly Readonly<{ messageId?: string; role: 'user' | 'assistant'; content: string }>[];
    expiresAtMs: number;
  }>): Promise<string> => {
    // зачем (dialogs-041, Сверка: «Итог пока недоступен» через 20 054 мс): немой catch ниже превращал любую причину в одно
    // «provider_failed» — срок модели, ошибку провайдера и протухший контекст было не различить. Шаги и код ответа — в лог.
    const generatorStartedAtMs = Date.now();
    let modelForLog: string | null = null;
    let httpStatusForLog: number | null = null;
    try {
      const nowMs = runtime.nowMs();
      const transcript = safeCompletionTranscript(input.transcript);
      if (!Number.isSafeInteger(input.expiresAtMs) || !Number.isSafeInteger(nowMs)
        || nowMs >= input.expiresAtMs
        || input.expiresAtMs - nowMs > 24 * 60 * 60 * 1_000
        || typeof input.systemPrompt !== 'string' || input.systemPrompt.length < 1
        || input.systemPrompt.length > 8_000 || !transcript) {
        throw new Error('completion_context_invalid');
      }
      const abort = new AbortController();
      let rejectDeadline: ((reason?: unknown) => void) | null = null;
      const deadlineFailure = new Error('completion_provider_deadline');
      const deadlinePromise = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
      const timer = setTimeout(() => {
        abort.abort();
        rejectDeadline?.(deadlineFailure);
      }, PROVIDER_DEADLINE_MS);
      const beforeDeadline = <T>(operation: Promise<T>): Promise<T> => Promise.race([operation, deadlinePromise]);
      try {
        const apiKey = String(runtime.resolveApiKey() || '').trim();
        const model = await beforeDeadline(runtime.resolveModel());
        modelForLog = typeof model === 'string' ? model.slice(0, 60) : null;
        if (!apiKey || apiKey.length > 300 || !(ALLOWED_DIALOG_MODELS as readonly string[]).includes(model)) {
          throw new Error('completion_provider_unavailable');
        }
        const egressNowMs = runtime.nowMs();
        if (!Number.isSafeInteger(egressNowMs)
          || egressNowMs >= input.expiresAtMs
          || input.expiresAtMs - egressNowMs > 24 * 60 * 60 * 1_000) {
          throw new Error('completion_context_expired');
        }
        const response = await beforeDeadline(runtime.fetchImpl(OPENAI_CHAT_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            max_tokens: 900,
            temperature: 0.3,
            messages: [
              { role: 'system', content: input.systemPrompt },
              ...transcript.map((turn) => ({
                role: turn.role,
                content: turn.role === 'user'
                  ? JSON.stringify({ messageId: turn.messageId, text: turn.content })
                  : turn.content,
              })),
            ],
            ...(modelSupportsJsonObject(model) ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: abort.signal,
        }));
        // зачем: тип fetchImpl — Pick<'ok'|'json'> (тесты подменяют без status); код статуса нужен только для журнала,
        // поэтому читаем его без расширения типа, иначе predeploy tsc роняет выкладку (12.10, deploy accountDelete*).
        const rawStatus = (response as { status?: unknown }).status;
        httpStatusForLog = typeof rawStatus === 'number' ? rawStatus : null;
        if (!response.ok) throw new Error('completion_provider_failed');
        const payload = await beforeDeadline(response.json());
        // зачем: PM-231 (A3) — итог занятия платил OpenAI без строки биллинга; отчёт не бросает.
        await reportDialogueV2Usage(runtime.onUsage, payload, model, 'v2_complete');
        const content = providerContent(payload);
        if (!content) throw new Error('completion_provider_failed');
        return content;
      } finally {
        clearTimeout(timer);
        abort.abort();
      }
    } catch (error) {
      console.warn('[DIALOGUE-V2-COMPLETE] provider_failed', JSON.stringify({
        reason: error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120),
        name: error instanceof Error ? error.name : null,
        elapsedMs: Date.now() - generatorStartedAtMs,
        deadlineMs: PROVIDER_DEADLINE_MS,
        model: modelForLog,
        httpStatus: httpStatusForLog,
        turns: Array.isArray(input.transcript) ? input.transcript.length : null,
        systemPromptChars: typeof input.systemPrompt === 'string' ? input.systemPrompt.length : null,
        maxTokens: 900,
      }));
      throw new Error('dialogue_v2_completion_provider_failed');
    }
  };
}

// зачем (ускорение итога 02.10, прод-лог stageMs: claim 3,7 с, build 6,9 с, prepare_memory 2,5 с):
// шаг памяти заново искал аккаунт и проверял Plus. Аккаунт известен с шага claim, а проверку Plus
// запускаем там же — она идёт параллельно с ожиданием модели. Живёт 90 с на один итог; сбой
// ранней проверки не мешает — шаг памяти проверит Plus сам, как раньше.
const COMPLETION_IDENTITY_TTL_MS = 90_000;
type CompletionIdentity = Readonly<{ stableAccountId: string; premium: Promise<boolean>; expiresAtMs: number }>;
const completionIdentityByAuthUid = new Map<string, CompletionIdentity>();

function rememberCompletionIdentity(db: FirebaseFirestore.Firestore, authUid: string, stableAccountId: string): void {
  const nowMs = Date.now();
  for (const [key, value] of completionIdentityByAuthUid) {
    if (value.expiresAtMs <= nowMs) completionIdentityByAuthUid.delete(key);
  }
  const premium = resolvePremiumAccess(db, stableAccountId, nowMs, authUid);
  premium.catch((error: unknown) => {
    console.warn('[DIALOGUE-V2-COMPLETE] early_premium_failed', String(error).slice(0, 200));
  });
  completionIdentityByAuthUid.set(authUid, Object.freeze({
    stableAccountId, premium, expiresAtMs: nowMs + COMPLETION_IDENTITY_TTL_MS,
  }));
}

function recalledCompletionIdentity(authUid: string): CompletionIdentity | null {
  const value = completionIdentityByAuthUid.get(authUid);
  return value && value.expiresAtMs > Date.now() ? value : null;
}

function productionDependencies(): HandlerDependencies {
  return Object.freeze({
    claimTerminal: async ({ authUid, selection }) => {
      const db = admin.firestore();
      const stableAccountId = await resolveStableUidForAuth(db, authUid);
      rememberCompletionIdentity(db, authUid, stableAccountId);
      const claimToken = `d2c_${randomBytes(24).toString('base64url')}`;
      const terminalClaim = Object.freeze({
        sessionId: selection.sessionId,
        ownerBinding: ownerBinding(sessionSecret(), authUid, stableAccountId),
        studyTarget: selection.studyTarget,
        scenarioId: selection.scenarioId,
        interfaceLang: selection.interfaceLang,
        nowMs: Date.now(),
        claimToken,
      });
      const result = await claimDialogueV2SessionTerminal({
        db,
        timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
      }, terminalClaim);
      return Object.freeze({ ...result, claimContext: terminalClaim });
    },
    buildCompletion: async ({ authUid, selection, session, assessmentRaw, releaseSnapshot: storedRelease }) => {
      const db = admin.firestore();
      if (!assessmentRaw && await aiGloballyDisabled(db)) throw new Error('completion_disabled');
      const releaseSnapshot = await resolveDialogueV2CompletionReleaseSnapshot(
        storedRelease,
        selection,
        async () => {
        const release = await loadDialogueV2CompletionReleaseCandidate(releaseRepository(db));
          return authorizeDialogueV2ServerPacket(selection, release);
        },
      );
      if (!releaseSnapshot) {
        throw new DialogueV2SessionCompletionError('release_unavailable');
      }
      let generatedRaw = assessmentRaw ?? '';
      const completion = await executeDialogueV2SessionCompletion({ auth: { uid: authUid }, data: selection }, {
        nowMs: () => Date.now(),
        sessionOwnerSecret: sessionSecret(),
        resolveStableAccountId: (uid) => resolveStableUidForAuth(db, uid),
        resolveReleasedPacket: async () => releaseSnapshot,
        readSession: async () => session,
        generateAssessment: assessmentRaw
          ? async () => assessmentRaw
          : async (input) => {
            generatedRaw = await createDialogueV2CompletionAssessmentGenerator({
              nowMs: () => Date.now(),
              resolveApiKey: () => String(
                OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '',
              ).trim(),
              resolveModel: () => resolveConfiguredDialogModel(
                db,
                process.env.OPENAI_DIALOG_MODEL,
              ),
              fetchImpl: (url, init) => fetch(url, init),
              onUsage: (usage) => recordDialogueV2Billing({ mode: 'v2_complete', usage, authUid }, db),
            })(input);
            return generatedRaw;
          },
        assertStudyLanguage: (text, studyTarget) => assertDialogueStudyLanguage({
          text, studyTarget, feature: 'premium_dialog_review',
        }),
      });
      if (!generatedRaw) throw new DialogueV2SessionCompletionError('completion_invalid');
      return Object.freeze({ completion, assessmentRaw: generatedRaw, releaseSnapshot });
    },
    stageAssessment: async ({ claim, assessmentRaw, releaseSnapshot }) => {
      const context = claim.claimContext as Parameters<typeof stageDialogueV2SessionTerminalAssessment>[1] | undefined;
      if (!context) throw new Error('completion_claim_missing');
      await stageDialogueV2SessionTerminalAssessment({
        db: admin.firestore(),
        timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
      }, { ...context, nowMs: Date.now(), assessmentRaw, releaseSnapshot });
    },
    prepareMemory: async ({ authUid, studyTarget, scenarioId, completion, releaseSnapshot }) => {
      const db = admin.firestore();
      const prepared = await prepareDialogueV2CompletionMemory({
        authUid, studyTarget, scenarioId, completion, releaseSnapshot,
      }, {
        identifierSecret: DIALOGUE_V2_MEMORY_ID_SECRET.value(),
        resolveStableAccountId: async (uid) => (
          recalledCompletionIdentity(uid)?.stableAccountId ?? resolveStableUidForAuth(db, uid)
        ),
        resolvePremiumAccess: async (stableId, uid) => {
          const remembered = recalledCompletionIdentity(uid);
          if (remembered && remembered.stableAccountId === stableId) {
            try {
              return await remembered.premium;
            } catch (error) {
              console.warn('[DIALOGUE-V2-COMPLETE] early_premium_retry', String(error).slice(0, 200));
            }
          }
          return resolvePremiumAccess(db, stableId, Date.now(), uid);
        },
        resolveApprovedLanguagePack: async () => null,
      });
      return Object.freeze({
        prepared,
        memoryReceipt: Object.freeze({
          sharedMemoryStored: true as const,
          scenarioCheckpointStored: prepared.receipt.scenarioCheckpointStored,
        }),
      });
    },
    publishCompletion: async ({ claim, assessmentRaw, releaseSnapshot, memoryReceipt, prepared }) => {
      const context = claim.claimContext as Parameters<typeof completeDialogueV2SessionTerminal>[1] | undefined;
      const preparedMemory = prepared as DialogueV2PreparedCompletionMemory | undefined;
      if (!context || !preparedMemory) throw new Error('completion_claim_missing');
      const db = admin.firestore();
      await completeDialogueV2SessionTerminal({
        db,
        timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
      }, {
        ...context,
        nowMs: Date.now(),
        assessmentRaw,
        releaseSnapshot,
        memoryReceipt,
        publishMemory: (transaction) => applyDialogueV2MemoryCommand({
          get: async (path) => {
            const snapshot = await transaction.get(db.doc(path));
            return snapshot.exists ? { exists: true, data: snapshot.data() } : { exists: false };
          },
          set: (path, value) => {
            transaction.set(db.doc(path), value as FirebaseFirestore.DocumentData);
          },
        }, preparedMemory.authUid, preparedMemory.stableAccountId, preparedMemory.command),
      });
    },
    releaseClaim: async ({ claim }) => {
      const context = claim.claimContext as Parameters<typeof releaseDialogueV2SessionTerminalClaim>[1] | undefined;
      if (!context) return;
      await releaseDialogueV2SessionTerminalClaim({
        db: admin.firestore(),
        timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
      }, context);
    },
  });
}

export const DIALOGUE_V2_SESSION_COMPLETE_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  // зачем (баг 02.10, прод: «maximum request timeout» на 30 с): обрыв функции посреди итога
  // оставлял блокировку итога, и «Повторить» получало completion_in_progress. Запас до 60 с;
  // ожидание модели по-прежнему ограничено PROVIDER_DEADLINE_MS.
  timeoutSeconds: 60,
  memory: '512MiB' as const,
  minInstances: 0,
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, DIALOGUE_V2_SESSION_HMAC_KEY, DIALOGUE_V2_MEMORY_ID_SECRET],
});

export const dialogueV2SessionComplete = onCall(
  DIALOGUE_V2_SESSION_COMPLETE_OPTIONS,
  createDialogueV2SessionCompleteHandler(productionDependencies()),
);
