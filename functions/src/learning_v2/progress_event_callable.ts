import * as admin from 'firebase-admin';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';
import { deriveProgressAccountScopeHash, parseProgressEventRequest, ProgressEventRequest } from './progress_event';
import { applyProgressEvent } from './progress_event';
import { createFirestoreProgressEventStore, type FirestoreProgressEventStoreOptions } from './firestore_progress_event_store';
import type { ProgressEventStore } from './progress_event';
import type { ModeTemplateArtifactReader, ScoringPolicyCatalog } from './server_score_policy_evaluator';
import { createFirestoreModeTemplateResolver } from '../content_studio/firestore_authoring_store';

const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';
const AUTH_LINKS = 'auth_links';

type ProgressCallableEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Production progress writes always require App Check. A local opt-out is
 * accepted only for an explicitly requested Functions emulator running against
 * a Firebase demo project, which cannot address production resources.
 */
// зачем: App Check запломбирован владельцем 2026-08-17 («убрать отовсюду и
// больше никогда не вспоминать»). Резолвер раньше вычислял true везде, кроме
// демо-эмулятора; теперь возвращает false всегда. Функцию не удаляю — она
// экспортируется и вызывается из опций; удаление разошлось бы с тестами шире,
// чем нужно. Параметр сохранён ради совместимости сигнатуры.
// Полный запрет: CLAUDE.md «APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА».
export function resolveV2ProgressAppCheckEnforcement(
  _environment: ProgressCallableEnvironment = process.env,
): boolean {
  return false;
}

export const V2_PROGRESS_CALLABLE_OPTIONS = {
  region: 'us-central1',
  enforceAppCheck: resolveV2ProgressAppCheckEnforcement(),
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
} as const;

export type ProgressCallableAuth = {
  uid?: unknown;
};

export type ProgressCallableRequest = {
  data: unknown;
  auth?: ProgressCallableAuth | null;
  /** Populated and verified by the Firebase callable runtime when App Check is enforced. */
  app?: unknown;
};

export type ProgressAccountBinding = Readonly<{
  stableUid: string;
  accountGeneration: number;
}>;

export type ProgressEventAuthorizationResult = ProgressAccountBinding;
export type ProgressEventAuthorization = (authUid: string) => Promise<ProgressEventAuthorizationResult>;

export type ProgressEventAuthorizedRequest = {
  authUid: string;
  stableUid: string;
  accountGeneration: number;
  input: ProgressEventRequest;
};

export type ProgressEventHandler = (
  request: ProgressEventAuthorizedRequest,
) => Promise<unknown>;

export interface ProgressEventProductionDependencies {
  readonly db?: admin.firestore.Firestore;
  /** The immutable template reader is intentionally required to award stars. */
  readonly scoringTemplates?: ModeTemplateArtifactReader;
  /**
   * Result-to-stars policy after an activity-specific trusted evaluator has
   * derived the result. Presence here is explicit; production never installs
   * the client-result pilot catalog implicitly.
   */
  readonly scoringPolicies?: ScoringPolicyCatalog;
  /** Preferred production seam: derive the score from trusted server evidence. */
  readonly resolveServerScore?: FirestoreProgressEventStoreOptions['resolveServerScore'];
  /** Test seam; production defaults to the Firestore transactional store. */
  readonly createStore?: (options: FirestoreProgressEventStoreOptions) => ProgressEventStore;
}

/**
 * Server-only executor. Identity and account generation come from the
 * authorization result; request projection/candidate stars are never trusted.
 * Without an immutable template reader plus an explicitly injected trusted
 * scorer the store remains fail-closed and cannot award positive stars.
 */
export function createProgressEventProductionHandler(
  dependencies: ProgressEventProductionDependencies = {},
): ProgressEventHandler {
  const db = dependencies.db ?? admin.firestore();
  const createStore = dependencies.createStore ?? createFirestoreProgressEventStore;
  const resolveModeTemplate = createFirestoreModeTemplateResolver(
    db,
    undefined,
    // Historical approved Episodes may still pin a deprecated immutable
    // template. Its exact body/hash remains valid for deterministic replay.
    { allowDeprecated: true },
  );
  const scoringTemplates: ModeTemplateArtifactReader = dependencies.scoringTemplates ?? {
    read: async (ref) => {
      const resolved = await resolveModeTemplate({
        templateId: ref.templateId,
        version: ref.version,
        contentHash: ref.contentHash,
      });
      return resolved?.body === undefined ? undefined : { body: resolved.body };
    },
  };
  return async ({ authUid, stableUid, accountGeneration, input }) => {
    if (!accountGeneration) throw new HttpsError('failed-precondition', 'account_generation_unavailable');
    const store = createStore({
      db,
      authUid,
      stableUid,
      accountGeneration,
      accountScopeHash: input.accountScopeHash,
      scoringTemplates,
      // A code-owned score table is not, by itself, proof of the learner's
      // answer. Production must inject a scorer/catalog only after the
      // activity outcome has been derived from trusted server evidence.
      // With no such dependency the store deliberately accepts only the
      // existing zero-star fail-closed path.
      scoringPolicies: dependencies.scoringPolicies,
      resolveServerScore: dependencies.resolveServerScore,
    });
    return applyProgressEvent(store, input);
  };
}

/** Compose the authenticated callable only at the deployment boundary. */
export function createProgressEventProductionCallable(
  dependencies: ProgressEventProductionDependencies = {},
  authorize: ProgressEventAuthorization = createProgressEventAuthorization(dependencies.db),
) {
  return createProgressEventCallable(createProgressEventProductionHandler(dependencies), authorize);
}

/** Firebase Auth UIDs are opaque, but must be non-empty and bounded. */
export function normalizeProgressAuthUid(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpsError('unauthenticated', 'authentication_required');
  }
  const uid = value.trim();
  if (!uid || uid.length > 128) {
    throw new HttpsError('unauthenticated', 'authentication_required');
  }
  return uid;
}

export function requireProgressAuth(request: ProgressCallableRequest): string {
  return normalizeProgressAuthUid(request.auth?.uid);
}

export function normalizeProgressStableUid(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  const stableUid = value.trim();
  if (
    !/^[A-Za-z0-9._-]{1,160}$/.test(stableUid) ||
    stableUid === '.' ||
    stableUid === '..'
  ) {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  return stableUid;
}

function normalizeProgressGeneration(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new HttpsError('failed-precondition', 'account_generation_unavailable');
  }
  return value as number;
}

export const INITIAL_ACCOUNT_GENERATION = 1;

/**
 * Заводит accountGeneration=1 первому обратившемуся аккаунту, у которого поля нет.
 *
 * зачем (инцидент 2026-08-24): поле читали пять серверных путей, но НЕ ПИСАЛ
 * НИКТО — ни регистрация, ни удаление аккаунта. На проде оно отсутствовало у
 * всех 1203 пользователей, поэтому progressSubmitEvent отвечал
 * `account_generation_unavailable`, клиент бесконечно клал событие обратно в
 * очередь, и серверный прогресс не работал ни у кого с самого начала
 * (0 принятых событий за всё время).
 *
 * Инициализация безопасна для смысла поля (счётчик пересозданий аккаунта):
 *  - транзакция пишет значение ТОЛЬКО когда его нет, существующее (в том числе
 *    поднятое будущим удалением/восстановлением) никогда не перезаписывается;
 *  - барьер удаления (tombstone) проверяется ДО инициализации, поэтому аккаунт
 *    «в процессе удаления» поля не получит;
 *  - гонка двух параллельных вызовов разрешается транзакцией: второй прочитает
 *    уже записанное значение.
 * Стоимость: одна запись на аккаунт за всю его жизнь.
 */
async function ensureAccountGeneration(
  db: admin.firestore.Firestore,
  stableUid: string,
  existing: unknown,
): Promise<number> {
  if (Number.isSafeInteger(existing) && (existing as number) >= 1) return existing as number;
  const userRef = db.collection('users').doc(stableUid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.data()?.accountGeneration ?? snap.data()?.generation;
    if (Number.isSafeInteger(current) && (current as number) >= 1) return current as number;
    tx.set(userRef, { accountGeneration: INITIAL_ACCOUNT_GENERATION }, { merge: true });
    return INITIAL_ACCOUNT_GENERATION;
  });
}

/** Read a strict server-owned auth anchor, generation, and deletion barrier. */
export async function readProgressAccountBinding(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<ProgressAccountBinding> {
  const normalizedAuthUid = normalizeProgressAuthUid(authUid);
  const authLinkSnapshot = await db.collection(AUTH_LINKS).doc(normalizedAuthUid).get();
  if (!authLinkSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'progress_identity_anchor_missing');
  }
  const stableUid = normalizeProgressStableUid(authLinkSnapshot.data()?.stable_id);
  const [userSnap, tombstoneSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get(),
    db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid).get(),
  ]);
  if (tombstoneSnap.exists) throw new HttpsError('failed-precondition', 'account_delete_pending');
  const data = userSnap.data() ?? {};
  // accountGeneration is the V2 spelling; generation is accepted only as a legacy server field.
  const accountGeneration = normalizeProgressGeneration(
    await ensureAccountGeneration(db, stableUid, data.accountGeneration ?? data.generation),
  );
  return Object.freeze({ stableUid, accountGeneration });
}

/**
 * Default identity seam. It reads the canonical auth anchor without trusting a
 * client-provided stable_id and disables link repair: progress submission must
 * not mutate identity as a side effect of an attempt.
 */
export function createProgressEventAuthorization(
  db: admin.firestore.Firestore = admin.firestore(),
): ProgressEventAuthorization {
  return async (authUid) => readProgressAccountBinding(db, authUid);
}

/**
 * Testable handler seam. The parser runs before authorization's downstream
 * executor, and the executor receives server-derived identity only.
 */
export function createProgressEventHandler(
  authorize: ProgressEventAuthorization,
  execute: ProgressEventHandler,
): (request: ProgressCallableRequest) => Promise<unknown> {
  return async (request) => {
    const authUid = requireProgressAuth(request);
    let input: ProgressEventRequest;
    try {
      input = parseProgressEventRequest(request.data);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        'invalid-argument',
        error instanceof Error ? error.message : 'v2_progress_event_request_invalid',
      );
    }
    const result = await authorize(authUid);
    if (typeof result === 'string') {
      throw new HttpsError('failed-precondition', 'account_generation_unavailable');
    }
    const binding = {
      stableUid: normalizeProgressStableUid(result?.stableUid),
      accountGeneration: normalizeProgressGeneration(result?.accountGeneration),
    };
    const expectedScope = deriveProgressAccountScopeHash(binding.stableUid, binding.accountGeneration);
    if (input.accountScopeHash !== expectedScope) {
      throw new HttpsError('failed-precondition', 'account_generation_mismatch');
    }
    return execute({ authUid, ...binding, input });
  };
}

/**
 * Callable factory kept out of index.ts until trusted activity outcome
 * verification and the account-scoped mobile outbox are both wired. This
 * prevents an endpoint that merely trusts client resultCode from being
 * deployed accidentally while emulator/contract tests exercise the real
 * App Check and transaction boundaries.
 */
export function createProgressEventCallable(
  execute: ProgressEventHandler,
  authorize: ProgressEventAuthorization = createProgressEventAuthorization(),
) {
  const handler = createProgressEventHandler(authorize, execute);
  return onCall(V2_PROGRESS_CALLABLE_OPTIONS, async (request: CallableRequest<unknown>) =>
    handler(request),
  );
}
