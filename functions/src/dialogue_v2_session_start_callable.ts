import { types as nodeTypes } from 'node:util';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  loadDialogueV2CompletionReleaseCandidate,
  type DialogueV2CompletionReleaseRepository,
} from './dialogue_v2_completion_release_source';
import { authorizeDialogueV2ServerPacket } from './dialogue_v2_server_authorization';
import {
  DIALOGUE_V2_SESSION_HMAC_KEY,
  createProductionDialogueV2SessionLedger,
} from './dialogue_v2_session_production_runtime';
import type { DialogueV2SessionActor } from './dialogue_v2_session_ledger';
import { enforceRateLimit } from './premium_dialog';
import {
  DIALOGUE_V2_WARM_RESPONSE,
  isDialogueV2WarmRequest,
  logDialogueV2Warm,
  type DialogueV2WarmResponse,
} from './dialogue_v2_warm';
import { aiGloballyDisabled } from './remote_gates';

const REGION = 'us-central1';
const SCENARIO_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;

type StartSelection = Readonly<{
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
}>;

type StartDependencies = Readonly<{
  resolveStableAccountId(authUid: string): Promise<string>;
  acquireStartPermit(authUid: string, stableAccountId: string): Promise<void>;
  resolveRelease(): Promise<unknown | null>;
  createSession(
    actor: DialogueV2SessionActor,
    selection: StartSelection,
  ): Promise<Readonly<{ sessionId: string; expiresAtMs: number }>>;
}>;

type StartRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

function exactSelection(value: unknown): StartSelection | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 2 || keys.some((key) => key !== 'studyTarget' && key !== 'scenarioId')) {
      return null;
    }
    const target = descriptors.studyTarget;
    const scenario = descriptors.scenarioId;
    if (!target?.enumerable || !('value' in target)
      || !scenario?.enumerable || !('value' in scenario)
      || typeof target.value !== 'string'
      || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(target.value)
      || typeof scenario.value !== 'string'
      || !SCENARIO_ID_RE.test(scenario.value)) return null;
    return Object.freeze({
      studyTarget: target.value as DialogueV2StudyTarget,
      scenarioId: scenario.value,
    });
  } catch {
    return null;
  }
}

function releaseRepository(
  db: FirebaseFirestore.Firestore,
): DialogueV2CompletionReleaseRepository {
  return Object.freeze({
    readDocument: async (documentPath: string) => {
      const snapshot = await db.doc(documentPath).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    readCollection: async (collectionPath: string) => {
      const snapshot = await db.collection(collectionPath).get();
      return snapshot.docs.map((document) => Object.freeze({
        id: document.id,
        data: document.data(),
      }));
    },
  });
}

/**
 * зачем (PM-252 п.4, ревью сервера 04.10): у старта сессии диалога было 7 отказов и 0 логов — «сессия
 * недоступна» не отличалась по причине. Пишем стадию и код ошибки; без текстов и uid.
 */
function logStartRefusal(stage: string, error?: unknown, extra: Record<string, unknown> = {}): void {
  console.warn('[DIALOGUE-V2-START] refused', JSON.stringify({
    stage,
    ...extra,
    ...(error === undefined ? {} : {
      error: String((error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error).slice(0, 160),
    }),
  }));
}

export function createDialogueV2SessionStartHandler(
  dependencies: StartDependencies,
): (request: StartRequest) => Promise<Readonly<{
  ok: true;
  sessionId: string;
  expiresAtMs: number;
}> | DialogueV2WarmResponse> {
  return async (request) => {
    // зачем (владелец 01.10): прогрев — мгновенный ответ до любых чтений и проверок;
    // принимается только точная форма { warm: true }, ничего не создаёт.
    if (isDialogueV2WarmRequest(request.data)) {
      logDialogueV2Warm('sessionStart');
      return DIALOGUE_V2_WARM_RESPONSE;
    }
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)) {
      logStartRefusal('auth_required');
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    const selection = exactSelection(request.data);
    if (!selection) {
      logStartRefusal('request_invalid', undefined, {
        keys: request.data && typeof request.data === 'object' ? Object.keys(request.data as object).slice(0, 8) : typeof request.data,
      });
      throw new HttpsError('invalid-argument', 'dialogue_v2_session_request_invalid');
    }

    let stableAccountId: string;
    try {
      stableAccountId = await dependencies.resolveStableAccountId(authUid);
      if (typeof stableAccountId !== 'string' || stableAccountId.length < 1) {
        throw new Error('identity_invalid');
      }
    } catch (error) {
      logStartRefusal('identity', error, selection);
      throw new HttpsError('unavailable', 'dialogue_v2_session_unavailable');
    }

    try {
      await dependencies.acquireStartPermit(authUid, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError && error.code === 'resource-exhausted') {
        logStartRefusal('start_rate_limited', error, selection);
        throw new HttpsError(
          'resource-exhausted',
          'dialogue_v2_session_start_rate_limited',
        );
      }
      logStartRefusal('start_permit', error, selection);
      throw new HttpsError('unavailable', 'dialogue_v2_session_unavailable');
    }

    let release: unknown | null;
    try {
      release = await dependencies.resolveRelease();
    } catch (error) {
      logStartRefusal('release_read', error, selection);
      release = null;
    }
    const packet = release
      ? authorizeDialogueV2ServerPacket(selection, release)
      : null;
    if (!packet) {
      logStartRefusal(release ? 'scenario_not_in_release' : 'release_missing', undefined, selection);
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_session_release_unavailable',
      );
    }

    try {
      const session = await dependencies.createSession(
        Object.freeze({ authUid, stableAccountId }),
        selection,
      );
      return Object.freeze({ ok: true as const, ...session });
    } catch (error) {
      logStartRefusal('create_session', error, selection);
      throw new HttpsError('unavailable', 'dialogue_v2_session_unavailable');
    }
  };
}

function productionDependencies(): StartDependencies {
  const database = (): FirebaseFirestore.Firestore => admin.firestore();
  return Object.freeze({
    resolveStableAccountId: (authUid: string) => (
      resolveStableUidForAuth(database(), authUid)
    ),
    acquireStartPermit: (authUid: string, stableAccountId: string) => (
      enforceRateLimit(authUid, stableAccountId)
    ),
    resolveRelease: async () => {
      const db = database();
      if (await aiGloballyDisabled(db)) return null;
      return loadDialogueV2CompletionReleaseCandidate(releaseRepository(db));
    },
    createSession: (actor: DialogueV2SessionActor, selection: StartSelection) => (
      createProductionDialogueV2SessionLedger(database()).createSession(actor, selection)
    ),
  });
}

export const DIALOGUE_V2_SESSION_START_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
  minInstances: 0,
  maxInstances: 20,
  // зачем (владелец 17.10): вход, старт приложения, Пик и диалоги — полное ядро (белый список к setGlobalOptions cpu gcf_gen1):
  // при доле ядра ответ замедлялся на 30–100 % (замер Cloud Monitoring 17.10), владелец заметил долгую загрузку Пика.
  cpu: 1,
  secrets: [DIALOGUE_V2_SESSION_HMAC_KEY],
});

export const dialogueV2SessionStart = onCall(
  DIALOGUE_V2_SESSION_START_OPTIONS,
  createDialogueV2SessionStartHandler(productionDependencies()),
);
