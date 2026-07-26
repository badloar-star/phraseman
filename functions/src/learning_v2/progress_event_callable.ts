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
import { PILOT_SCORING_POLICY_CATALOG } from './server_score_policy_catalog';
import type { ModeTemplateArtifactReader, ScoringPolicyCatalog } from './server_score_policy_evaluator';

const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';
const AUTH_LINKS = 'auth_links';

type ProgressCallableEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Production progress writes always require App Check. A local opt-out is
 * accepted only for an explicitly requested Functions emulator running against
 * a Firebase demo project, which cannot address production resources.
 */
export function resolveV2ProgressAppCheckEnforcement(
  environment: ProgressCallableEnvironment = process.env,
): boolean {
  const isExplicitDemoEmulator = environment.FUNCTIONS_EMULATOR === 'true'
    && environment.GCLOUD_PROJECT?.startsWith('demo-') === true
    && environment.V2_PROGRESS_ALLOW_INSECURE_APP_CHECK_EMULATOR === 'true';
  return !isExplicitDemoEmulator;
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
  readonly scoringPolicies?: ScoringPolicyCatalog;
  readonly resolveServerScore?: FirestoreProgressEventStoreOptions['resolveServerScore'];
  /** Test seam; production defaults to the Firestore transactional store. */
  readonly createStore?: (options: FirestoreProgressEventStoreOptions) => ProgressEventStore;
}

/**
 * Server-only executor. Identity and account generation come from the
 * authorization result; request projection/candidate stars are never trusted.
 * Without an immutable template reader (or an explicitly code-owned scorer)
 * the store remains fail-closed and cannot award positive stars.
 */
export function createProgressEventProductionHandler(
  dependencies: ProgressEventProductionDependencies = {},
): ProgressEventHandler {
  const db = dependencies.db ?? admin.firestore();
  const createStore = dependencies.createStore ?? createFirestoreProgressEventStore;
  return async ({ authUid, stableUid, accountGeneration, input }) => {
    if (!accountGeneration) throw new HttpsError('failed-precondition', 'account_generation_unavailable');
    const store = createStore({
      db,
      authUid,
      stableUid,
      accountGeneration,
      accountScopeHash: input.accountScopeHash,
      scoringTemplates: dependencies.scoringTemplates,
      scoringPolicies: dependencies.scoringPolicies ?? PILOT_SCORING_POLICY_CATALOG,
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
  const accountGeneration = normalizeProgressGeneration(data.accountGeneration ?? data.generation);
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
 * Callable factory kept out of index.ts until the transactional store is wired.
 * This prevents an unconfigured endpoint from being deployed accidentally while
 * allowing emulator and contract tests to exercise the real App Check options.
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
