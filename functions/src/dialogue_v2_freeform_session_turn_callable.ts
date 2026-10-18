import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac, randomBytes } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { withAiKillSwitch } from './ai_kill_switch';

import {
  parseDialogueV2FreeformSessionTurnShape,
  type DialogueV2FreeformSessionTurn,
} from '../../shared/dialogue_v2_freeform_session_contract';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  runDialogueV2FreeformProductionAuthorizationTransaction,
} from './dialogue_v2_freeform_production_adapter';
import {
  DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
  createDialogueV2FreeformSessionLedger,
  type DialogueV2FreeformServerTurnProducer,
  type DialogueV2FreeformSessionActor,
  type DialogueV2FreeformSessionLedgerRecord,
  type DialogueV2FreeformSessionTurnResult,
} from './dialogue_v2_freeform_session_ledger';
import {
  createDialogueV2FreeformServerTextProducer,
  type DialogueV2FreeformMemoryAwareServerTurnInput,
} from './dialogue_v2_freeform_text_provider';
import {
  createDialogueV2FreeformOpenAiTransport,
} from './dialogue_v2_freeform_openai_transport';
import {
  parseDialogueV2FreeformMemoryDraft,
  readDialogueV2FreeformMemoryWithActor,
  type DialogueV2FreeformMemory,
  type DialogueV2FreeformMemoryDraft,
  type DialogueV2FreeformMemoryReadEnvelope,
} from './dialogue_v2_freeform_memory';
import { DIALOGUE_V2_SESSION_HMAC_KEY } from './dialogue_v2_session_production_runtime';
import { resolveConfiguredDialogModel } from './openai_dialog_model_config';
import { recordDialogueV2Billing } from './dialogue_v2_usage_billing';
import { enforceCallerRateWindow } from './caller_rate_window';

/** PM-231 (A3): uid текущего хода для биллинга общего на модуль транспорта. */
const freeformBillingContext = new AsyncLocalStorage<Readonly<{ authUid: string }>>();

const runAuthorizedSessionTransaction =
  runDialogueV2FreeformProductionAuthorizationTransaction;
const buildFreeformSessionLedger = createDialogueV2FreeformSessionLedger;
const parseFreeformMemoryDraft = parseDialogueV2FreeformMemoryDraft;
const readAuthorizedFreeformMemoryWithActor =
  readDialogueV2FreeformMemoryWithActor;
const DIALOGUE_V2_FREEFORM_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const buildFreeformOpenAiTransport = createDialogueV2FreeformOpenAiTransport;
const resolveFreeformConfiguredDialogModel = resolveConfiguredDialogModel;
const freeformOpenAiTransport = buildFreeformOpenAiTransport({
  enabled: true,
  resolveApiKey: () => DIALOGUE_V2_FREEFORM_OPENAI_API_KEY.value(),
  resolveModel: () => resolveFreeformConfiguredDialogModel(
    admin.firestore(),
    process.env.OPENAI_DIALOG_MODEL,
  ),
  fetchImpl: (input, init) => fetch(input, init),
  // зачем: PM-231 (A3) — freeform-ход платил OpenAI без строки биллинга.
  // Сбой записи логируется внутри и ход не роняет.
  onUsage: async (usage) => {
    const context = freeformBillingContext.getStore();
    if (!context) {
      console.warn('[AI-BILLING] dialogue_v2 freeform usage without turn context', { model: usage.model });
    }
    await recordDialogueV2Billing({ mode: 'v2_freeform', usage, authUid: context?.authUid });
  },
});
const produceFreeformAssistant = createDialogueV2FreeformServerTextProducer({
  enabled: true,
  transport: freeformOpenAiTransport,
  nowMs: Date.now,
});
const REGION = 'us-central1';
const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const STABLE_ACCOUNT_ID_RE = /^(?=.{1,256}$)[^/\u0000-\u001f\u007f]+$/;
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const MAX_ASSISTANT_MESSAGE_BYTES = 3_072;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;

type TurnRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

type TurnPublicResult = Readonly<{
  ok: true;
  assistantMessage: string;
  sessionId: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformSessionTurnDependencies = Readonly<{
  runAuthorizedTurn(
    authUid: string,
    input: DialogueV2FreeformSessionTurn,
  ): Promise<DialogueV2FreeformSessionTurnResult>;
}>;

export type DialogueV2FreeformAtomicSessionTurnRuntime = Readonly<{
  db: FirebaseFirestore.Firestore;
  nowMs(): number;
  generateClaimToken(): string;
  bindOwner(input: Readonly<{
    namespace: string;
    actor: DialogueV2FreeformSessionActor;
  }>): string;
  digestTurnRequest(input: Readonly<{
    namespace: string;
    request: DialogueV2FreeformSessionTurn;
  }>): string;
  timestampFromMillis(millis: number): Readonly<{ toMillis(): number }>;
  readLanguageBranchMemoryWithActor(
    authUid: string,
    studyTarget: DialogueV2FreeformSessionTurn['studyTarget'],
  ): Promise<DialogueV2FreeformMemoryReadEnvelope>;
  produceAssistant(input: DialogueV2FreeformMemoryAwareServerTurnInput): Promise<unknown>;
}>;

export type DialogueV2FreeformMemoryAwareTurnProducerDependencies = Readonly<{
  authUid: string;
  expectedActor: DialogueV2FreeformSessionActor;
  readLanguageBranchMemoryWithActor(
    authUid: string,
    studyTarget: DialogueV2FreeformSessionTurn['studyTarget'],
  ): Promise<unknown>;
  revalidateCanonicalActor(): Promise<unknown>;
  produceAssistant(input: DialogueV2FreeformMemoryAwareServerTurnInput): Promise<unknown>;
}>;

const SAFE_FAILED_PRECONDITION_MESSAGES = new Set([
  'dialogue_v2_freeform_identity_unavailable',
  'dialogue_v2_freeform_account_unavailable',
  'dialogue_v2_freeform_entitlement_unavailable',
]);

function exactInput(value: unknown): DialogueV2FreeformSessionTurn | null {
  if (value && typeof value === 'object' && nodeTypes.isProxy(value)) return null;
  return parseDialogueV2FreeformSessionTurnShape(value);
}

function exactPlainRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function exactCanonicalActor(value: unknown): DialogueV2FreeformSessionActor | null {
  const actor = exactPlainRecord(value);
  if (!actor || Object.keys(actor).length !== 2
    || !Object.prototype.hasOwnProperty.call(actor, 'authUid')
    || !Object.prototype.hasOwnProperty.call(actor, 'stableAccountId')
    || typeof actor.authUid !== 'string' || !AUTH_UID_RE.test(actor.authUid)
    || typeof actor.stableAccountId !== 'string'
    || !STABLE_ACCOUNT_ID_RE.test(actor.stableAccountId)) return null;
  return Object.freeze({
    authUid: actor.authUid,
    stableAccountId: actor.stableAccountId,
  });
}

function exactMemoryDraftFromAuthoritativeRead(
  value: unknown,
  expectedStudyTarget: DialogueV2FreeformSessionTurn['studyTarget'],
): DialogueV2FreeformMemoryDraft | null {
  const memory = exactPlainRecord(value);
  const expectedKeys = [
    'schemaVersion', 'kind', 'studyTarget', 'revision', 'updatedAtMs',
    'learnerProfile', 'recurringPatterns', 'recentTopics',
  ];
  if (!memory
    || Object.keys(memory).length !== expectedKeys.length
    || !Object.keys(memory).every((key) => expectedKeys.includes(key))
    || memory.schemaVersion !== 1
    || memory.kind !== 'dialogue_v2_plus_freeform_memory'
    || memory.studyTarget !== expectedStudyTarget
    || !Number.isSafeInteger(memory.revision) || Number(memory.revision) <= 0
    || !Number.isSafeInteger(memory.updatedAtMs) || Number(memory.updatedAtMs) <= 0) {
    return null;
  }
  return parseFreeformMemoryDraft({
    learnerProfile: memory.learnerProfile,
    recurringPatterns: memory.recurringPatterns,
    recentTopics: memory.recentTopics,
  });
}

function exactMemoryReadEnvelope(
  value: unknown,
): DialogueV2FreeformMemoryReadEnvelope | null {
  const envelope = exactPlainRecord(value);
  if (!envelope || Object.keys(envelope).length !== 2
    || !Object.prototype.hasOwnProperty.call(envelope, 'actor')
    || !Object.prototype.hasOwnProperty.call(envelope, 'memory')) return null;
  const actor = exactCanonicalActor(envelope.actor);
  if (!actor || (envelope.memory !== null && typeof envelope.memory !== 'object')) {
    return null;
  }
  return Object.freeze({
    actor,
    memory: envelope.memory as DialogueV2FreeformMemory | null,
  });
}

export function createDialogueV2FreeformMemoryAwareTurnProducer(
  dependencies: DialogueV2FreeformMemoryAwareTurnProducerDependencies,
): DialogueV2FreeformServerTurnProducer {
  const authUid = dependencies.authUid;
  const expectedActor = exactCanonicalActor(dependencies.expectedActor);
  const readMemoryWithActor = dependencies.readLanguageBranchMemoryWithActor;
  const revalidateActor = dependencies.revalidateCanonicalActor;
  const produceAssistant = dependencies.produceAssistant;
  return async (input) => {
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)
      || !expectedActor || expectedActor.authUid !== authUid
      || typeof readMemoryWithActor !== 'function'
      || typeof revalidateActor !== 'function'
      || typeof produceAssistant !== 'function') {
      throw new Error('dialogue_v2_freeform_memory_unavailable');
    }
    let rawEnvelope: unknown;
    try {
      rawEnvelope = await readMemoryWithActor(authUid, input.studyTarget);
    } catch {
      throw new Error('dialogue_v2_freeform_memory_unavailable');
    }
    const envelope = exactMemoryReadEnvelope(rawEnvelope);
    if (!envelope || !sameActor(expectedActor, envelope.actor)) {
      throw new Error('dialogue_v2_freeform_memory_unavailable');
    }
    let languageBranchMemory: DialogueV2FreeformMemoryDraft | null = null;
    if (envelope.memory !== null) {
      languageBranchMemory = exactMemoryDraftFromAuthoritativeRead(
        envelope.memory,
        input.studyTarget,
      );
      if (!languageBranchMemory) {
        throw new Error('dialogue_v2_freeform_memory_unavailable');
      }
    }
    let currentActor: DialogueV2FreeformSessionActor | null;
    try {
      currentActor = exactCanonicalActor(await revalidateActor());
    } catch {
      throw new Error('dialogue_v2_freeform_memory_unavailable');
    }
    if (!currentActor || !sameActor(expectedActor, currentActor)) {
      throw new Error('dialogue_v2_freeform_memory_unavailable');
    }
    return produceAssistant(Object.freeze({
      ...input,
      languageBranchMemory,
    }));
  };
}

function safeAuthorizationError(error: unknown): HttpsError | null {
  if (!(error instanceof HttpsError)) return null;
  if (error.code === 'permission-denied'
    && error.message === 'dialogue_v2_freeform_plus_required') {
    return new HttpsError('permission-denied', error.message);
  }
  if (error.code === 'failed-precondition'
    && SAFE_FAILED_PRECONDITION_MESSAGES.has(error.message)) {
    return new HttpsError('failed-precondition', error.message);
  }
  return null;
}

function unavailable(): HttpsError {
  return new HttpsError(
    'unavailable',
    'dialogue_v2_freeform_session_turn_unavailable',
  );
}

function canonicalAssistantMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!normalized || normalized !== value || UNSAFE_TEXT_RE.test(normalized)) return null;
  return Buffer.byteLength(normalized, 'utf8') <= MAX_ASSISTANT_MESSAGE_BYTES
    ? normalized
    : null;
}

function exactTurnResult(value: unknown): DialogueV2FreeformSessionTurnResult | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const expected = [
      'ok', 'kind', 'sessionId', 'turnId', 'assistantMessage', 'expiresAtMs',
    ];
    if (keys.some((key) => typeof key !== 'string')
      || keys.length !== expected.length
      || !keys.every((key) => expected.includes(String(key)))) return null;
    const record = value as Partial<DialogueV2FreeformSessionTurnResult>;
    const assistantMessage = canonicalAssistantMessage(record.assistantMessage);
    if (record.ok !== true || (record.kind !== 'new' && record.kind !== 'replay')
      || typeof record.sessionId !== 'string' || !SESSION_ID_RE.test(record.sessionId)
      || typeof record.turnId !== 'string'
      || !assistantMessage
      || !Number.isSafeInteger(record.expiresAtMs) || Number(record.expiresAtMs) <= 0) {
      return null;
    }
    return Object.freeze({
      ok: true,
      kind: record.kind,
      sessionId: record.sessionId,
      turnId: record.turnId,
      assistantMessage,
      expiresAtMs: Number(record.expiresAtMs),
    });
  } catch {
    return null;
  }
}

// зачем (PM-252 п.4): отказы хода свободного диалога были немыми — стадия и код, без текстов и uid.
function logFreeformTurnRefusal(stage: string, error?: unknown): void {
  console.warn('[DIALOGUE-V2-FREEFORM-TURN] refused', JSON.stringify({
    stage,
    ...(error === undefined ? {} : {
      error: String((error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error).slice(0, 160),
    }),
  }));
}

export function createDialogueV2FreeformSessionTurnHandler(
  dependencies: DialogueV2FreeformSessionTurnDependencies,
): (request: TurnRequest) => Promise<TurnPublicResult> {
  return async (request) => {
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)) {
      logFreeformTurnRefusal('auth_required');
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    const input = exactInput(request.data);
    if (!input) {
      logFreeformTurnRefusal('request_invalid');
      throw new HttpsError(
        'invalid-argument',
        'dialogue_v2_freeform_session_turn_request_invalid',
      );
    }
    // зачем (координатор 18.10, защита от накрутки счёта): у хода свободного разговора (платит OpenAI) не было потолка вовсе — окно на uid и на IP.
    await enforceCallerRateWindow({ scope: 'ff_turn', authUid, rawRequest: (request as { rawRequest?: unknown }).rawRequest, maxPerUid: 120, maxPerIp: 600 });

    let rawResult: unknown;
    try {
      rawResult = await dependencies.runAuthorizedTurn(authUid, input);
    } catch (error) {
      const safe = safeAuthorizationError(error);
      logFreeformTurnRefusal(safe ? 'authorization' : 'turn_failed', error);
      if (safe) throw safe;
      throw unavailable();
    }
    const result = exactTurnResult(rawResult);
    if (!result || result.sessionId !== input.sessionId || result.turnId !== input.turnId) {
      logFreeformTurnRefusal(result ? 'turn_result_mismatch' : 'turn_result_invalid');
      throw unavailable();
    }
    return Object.freeze({
      ok: true,
      assistantMessage: result.assistantMessage,
      sessionId: result.sessionId,
      expiresAtMs: result.expiresAtMs,
    });
  };
}

function sameActor(
  left: DialogueV2FreeformSessionActor,
  right: DialogueV2FreeformSessionActor,
): boolean {
  return left.authUid === right.authUid && left.stableAccountId === right.stableAccountId;
}

export function createDialogueV2FreeformAtomicSessionTurner(
  runtime: DialogueV2FreeformAtomicSessionTurnRuntime,
): DialogueV2FreeformSessionTurnDependencies['runAuthorizedTurn'] {
  return async (authUid, input) => {
    const actor = await runAuthorizedSessionTransaction(
      Object.freeze({ db: runtime.db, nowMs: runtime.nowMs }),
      authUid,
      async (canonicalActor) => canonicalActor,
    );
    const repository = Object.freeze({
      createIfAbsent: async () => {
        throw new Error('dialogue_v2_freeform_turn_create_forbidden');
      },
      mutate: async (
        sessionId: string,
        transition: (stored: unknown) => DialogueV2FreeformSessionLedgerRecord,
      ) => runAuthorizedSessionTransaction(
        Object.freeze({ db: runtime.db, nowMs: runtime.nowMs }),
        authUid,
        async (currentActor, authorizedNowMs, _createStartRepository, createTurnRepository) => {
          if (!sameActor(actor, currentActor)) {
            throw new HttpsError(
              'failed-precondition',
              'dialogue_v2_freeform_identity_unavailable',
            );
          }
          return createTurnRepository({
            db: runtime.db,
            nowMs: () => authorizedNowMs,
            bindOwner: runtime.bindOwner,
            timestampFromMillis: runtime.timestampFromMillis,
          }).mutate(sessionId, transition);
        },
      ),
    });
    const ledger = buildFreeformSessionLedger({
      repository,
      nowMs: runtime.nowMs,
      generateSessionId: () => {
        throw new Error('dialogue_v2_freeform_turn_create_forbidden');
      },
      generateClaimToken: runtime.generateClaimToken,
      bindOwner: runtime.bindOwner,
      digestTurnRequest: runtime.digestTurnRequest,
    });
    return ledger.runTurn(
      actor,
      input,
      createDialogueV2FreeformMemoryAwareTurnProducer({
        authUid,
        expectedActor: actor,
        readLanguageBranchMemoryWithActor: runtime.readLanguageBranchMemoryWithActor,
        revalidateCanonicalActor: () => runAuthorizedSessionTransaction(
          Object.freeze({ db: runtime.db, nowMs: runtime.nowMs }),
          authUid,
          async (canonicalActor) => canonicalActor,
        ),
        produceAssistant: runtime.produceAssistant,
      }),
    );
  };
}

function secretKey(): string {
  const value = String(
    DIALOGUE_V2_SESSION_HMAC_KEY.value()
      || process.env.DIALOGUE_V2_SESSION_HMAC_KEY
      || '',
  );
  if (value.length < 32 || value.length > 512) {
    throw new Error('dialogue_v2_freeform_session_secret_unavailable');
  }
  return value;
}

function digest(namespace: string, fields: readonly string[]): string {
  const hmac = createHmac('sha256', secretKey());
  hmac.update(namespace);
  for (const field of fields) {
    hmac.update('\u0000');
    hmac.update(field);
  }
  return hmac.digest('hex');
}

function productionDependencies(): DialogueV2FreeformSessionTurnDependencies {
  const database = (): FirebaseFirestore.Firestore => admin.firestore();
  return Object.freeze({
    runAuthorizedTurn: async (
      authUid: string,
      input: DialogueV2FreeformSessionTurn,
    ) => {
      const db = database();
      const bindOwner = (bindingInput: Readonly<{
        namespace: string;
        actor: DialogueV2FreeformSessionActor;
      }>): string => digest(bindingInput.namespace, [
        bindingInput.actor.authUid,
        bindingInput.actor.stableAccountId,
      ]);
      const turner = createDialogueV2FreeformAtomicSessionTurner({
        db,
        nowMs: Date.now,
        generateClaimToken: () => `d2fc_${randomBytes(24).toString('base64url')}`,
        bindOwner,
        digestTurnRequest: ({ request }) => digest(
          DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
          [request.sessionId, request.turnId, request.studyTarget, request.userMessage],
        ),
        timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
        readLanguageBranchMemoryWithActor: (readerAuthUid, studyTarget) => (
          readAuthorizedFreeformMemoryWithActor({
            db,
            nowMs: Date.now,
            timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
          }, readerAuthUid, studyTarget)
        ),
        produceAssistant: produceFreeformAssistant,
      });
      // PM-231 (A3): транспорт общий на модуль и не знает uid — отдаём его через
      // контекст асинхронного вызова только на время этого хода.
      return freeformBillingContext.run(
        Object.freeze({ authUid }),
        () => turner(authUid, input),
      );
    },
  });
}

export const DIALOGUE_V2_FREEFORM_SESSION_TURN_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB' as const,
  minInstances: 0,
  maxInstances: 20,
  secrets: [DIALOGUE_V2_FREEFORM_OPENAI_API_KEY, DIALOGUE_V2_SESSION_HMAC_KEY],
});

// зачем (Q102): аварийный стоп ИИ «Пульта» закрывает и свободный разговор.
export const dialogueV2FreeformSessionTurn = onCall(
  DIALOGUE_V2_FREEFORM_SESSION_TURN_OPTIONS,
  withAiKillSwitch('dialogueV2FreeformSessionTurn', createDialogueV2FreeformSessionTurnHandler(productionDependencies())),
);
