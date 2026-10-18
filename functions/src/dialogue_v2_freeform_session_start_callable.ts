import { createHmac, randomBytes } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { withAiKillSwitch } from './ai_kill_switch';

import {
  parseDialogueV2FreeformSessionStartShape,
  type DialogueV2FreeformSessionStart,
} from '../../shared/dialogue_v2_freeform_session_contract';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  runDialogueV2FreeformProductionAuthorizationTransaction,
} from './dialogue_v2_freeform_production_adapter';
import {
  DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
  createDialogueV2FreeformSessionLedger,
  type DialogueV2FreeformSessionActor,
} from './dialogue_v2_freeform_session_ledger';
import { DIALOGUE_V2_SESSION_HMAC_KEY } from './dialogue_v2_session_production_runtime';
import { enforceCallerRateWindow } from './caller_rate_window';

const runAuthorizedSessionTransaction =
  runDialogueV2FreeformProductionAuthorizationTransaction;
const REGION = 'us-central1';
const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;

type StartRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

type StartResult = Readonly<{
  ok: true;
  sessionId: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformSessionStartDependencies = Readonly<{
  startAuthorizedSession(
    authUid: string,
    selection: DialogueV2FreeformSessionStart,
  ): Promise<Readonly<{ sessionId: string; expiresAtMs: number }>>;
}>;

export type DialogueV2FreeformAtomicSessionStartRuntime = Readonly<{
  db: FirebaseFirestore.Firestore;
  nowMs(): number;
  generateSessionId(): string;
  generateClaimToken(): string;
  bindOwner(input: Readonly<{
    namespace: string;
    actor: DialogueV2FreeformSessionActor;
  }>): string;
  digestTurnRequest(input: Readonly<{
    namespace: string;
    request: Readonly<{
      sessionId: string;
      turnId: string;
      studyTarget: 'en' | 'es' | 'fr' | 'de';
      userMessage: string;
    }>;
  }>): string;
  timestampFromMillis(millis: number): Readonly<{ toMillis(): number }>;
}>;

const SAFE_FAILED_PRECONDITION_MESSAGES = new Set([
  'dialogue_v2_freeform_identity_unavailable',
  'dialogue_v2_freeform_account_unavailable',
  'dialogue_v2_freeform_entitlement_unavailable',
]);

function exactSelection(value: unknown): DialogueV2FreeformSessionStart | null {
  if (value && typeof value === 'object' && nodeTypes.isProxy(value)) return null;
  return parseDialogueV2FreeformSessionStartShape(value);
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
    'dialogue_v2_freeform_session_start_unavailable',
  );
}

function exactSessionResult(value: unknown): Readonly<{
  sessionId: string;
  expiresAtMs: number;
}> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const sessionId = descriptors.sessionId;
    const expiresAtMs = descriptors.expiresAtMs;
    if (!sessionId?.enumerable || !('value' in sessionId)
      || !expiresAtMs?.enumerable || !('value' in expiresAtMs)
      || typeof sessionId.value !== 'string' || !SESSION_ID_RE.test(sessionId.value)
      || !Number.isSafeInteger(expiresAtMs.value) || Number(expiresAtMs.value) <= 0) {
      return null;
    }
    return Object.freeze({
      sessionId: sessionId.value,
      expiresAtMs: Number(expiresAtMs.value),
    });
  } catch {
    return null;
  }
}

// зачем (PM-252 п.4): у старта свободного диалога отказы были немыми — пишем стадию и код, без текстов и uid.
function logFreeformStartRefusal(stage: string, error?: unknown): void {
  console.warn('[DIALOGUE-V2-FREEFORM-START] refused', JSON.stringify({
    stage,
    ...(error === undefined ? {} : {
      error: String((error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error).slice(0, 160),
    }),
  }));
}

export function createDialogueV2FreeformSessionStartHandler(
  dependencies: DialogueV2FreeformSessionStartDependencies,
): (request: StartRequest) => Promise<StartResult> {
  return async (request) => {
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)) {
      logFreeformStartRefusal('auth_required');
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    const selection = exactSelection(request.data);
    if (!selection) {
      logFreeformStartRefusal('request_invalid');
      throw new HttpsError(
        'invalid-argument',
        'dialogue_v2_freeform_session_start_request_invalid',
      );
    }
    // зачем (координатор 18.10, защита от накрутки счёта): старт свободного разговора без потолка — окно на uid и на IP.
    await enforceCallerRateWindow({ scope: 'ff_start', authUid, rawRequest: (request as { rawRequest?: unknown }).rawRequest, maxPerUid: 60, maxPerIp: 300 });

    let created: unknown;
    try {
      created = await dependencies.startAuthorizedSession(authUid, selection);
    } catch (error) {
      const safe = safeAuthorizationError(error);
      logFreeformStartRefusal(safe ? 'authorization' : 'start_failed', error);
      if (safe) throw safe;
      throw unavailable();
    }
    const session = exactSessionResult(created);
    if (!session) {
      logFreeformStartRefusal('session_result_invalid');
      throw unavailable();
    }
    return Object.freeze({
      ok: true as const,
      sessionId: session.sessionId,
      expiresAtMs: session.expiresAtMs,
    });
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

export function createDialogueV2FreeformAtomicSessionStarter(
  runtime: DialogueV2FreeformAtomicSessionStartRuntime,
): DialogueV2FreeformSessionStartDependencies['startAuthorizedSession'] {
  return (authUid, selection) => (
    runAuthorizedSessionTransaction(
      Object.freeze({ db: runtime.db, nowMs: runtime.nowMs }),
      authUid,
      async (actor, authorizedNowMs, createStartRepository) => {
        const ledger = createDialogueV2FreeformSessionLedger({
          repository: createStartRepository({
            db: runtime.db,
            nowMs: () => authorizedNowMs,
            bindOwner: runtime.bindOwner,
            timestampFromMillis: runtime.timestampFromMillis,
          }),
          nowMs: () => authorizedNowMs,
          generateSessionId: runtime.generateSessionId,
          generateClaimToken: runtime.generateClaimToken,
          bindOwner: runtime.bindOwner,
          digestTurnRequest: runtime.digestTurnRequest,
        });
        return ledger.createSession(actor, selection);
      },
    )
  );
}

function productionDependencies(): DialogueV2FreeformSessionStartDependencies {
  const database = (): FirebaseFirestore.Firestore => admin.firestore();
  return Object.freeze({
    startAuthorizedSession: async (
      authUid: string,
      selection: DialogueV2FreeformSessionStart,
    ) => {
      const db = database();
      const bindOwner = (input: Readonly<{
        namespace: string;
        actor: DialogueV2FreeformSessionActor;
      }>): string => digest(input.namespace, [
        input.actor.authUid,
        input.actor.stableAccountId,
      ]);
      return createDialogueV2FreeformAtomicSessionStarter({
        db,
        nowMs: Date.now,
        generateSessionId: () => `d2fs_${randomBytes(24).toString('base64url')}`,
        generateClaimToken: () => `d2fc_${randomBytes(24).toString('base64url')}`,
        bindOwner,
        digestTurnRequest: ({ request }) => digest(
          DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
          [request.sessionId, request.turnId, request.studyTarget, request.userMessage],
        ),
        timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
      })(authUid, selection);
    },
  });
}

export const DIALOGUE_V2_FREEFORM_SESSION_START_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
  minInstances: 0,
  maxInstances: 20,
  secrets: [DIALOGUE_V2_SESSION_HMAC_KEY],
});

// зачем (Q102): аварийный стоп ИИ «Пульта» закрывает и свободный разговор.
export const dialogueV2FreeformSessionStart = onCall(
  DIALOGUE_V2_FREEFORM_SESSION_START_OPTIONS,
  withAiKillSwitch('dialogueV2FreeformSessionStart', createDialogueV2FreeformSessionStartHandler(productionDependencies())),
);
