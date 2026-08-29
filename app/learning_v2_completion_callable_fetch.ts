import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
import { detachBoundedWalletJson } from '../modules/learning-v2/contracts/wallet';
import { fetch as expoFetch } from 'expo/fetch';
import {
  captureAccountGeneration,
  isCapturedAccountGenerationToken,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import {
  isCurrentBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from './interactive_network_quiet';
import { isFirebaseAppCheckReady } from './app_check_init';
import {
  COMPLETION_CREDENTIAL_MIN_TTL_MS,
  LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID,
} from './learning_v2_completion_transport_policy';
import { DebugLogger } from './debug-logger';

const CALLABLE_NAMES = new Set([
  'getLearningV2AccountBinding',
  'submitLearningV2RequiredSessionCompletion',
  'resolveLearningV2WalletRewardReceipt',
]);
const ID = /^[a-z][a-z0-9-]{2,62}$/;
const TOKEN = /^[A-Za-z0-9._~-]{40,8192}$/;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_STREAM_CHUNKS = 8_192;
const MAX_JWT_PAYLOAD_CHARS = 8_192;
const MAX_AUTH_TOKEN_TTL_MS = 2 * 60 * 60 * 1_000;
const MAX_APP_CHECK_TOKEN_TTL_MS = 8 * 24 * 60 * 60 * 1_000;
const CALLABLE_ERROR_STATUSES = new Set([
  'OK',
  'CANCELLED',
  'UNKNOWN',
  'INVALID_ARGUMENT',
  'DEADLINE_EXCEEDED',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'PERMISSION_DENIED',
  'RESOURCE_EXHAUSTED',
  'FAILED_PRECONDITION',
  'ABORTED',
  'OUT_OF_RANGE',
  'UNIMPLEMENTED',
  'INTERNAL',
  'UNAVAILABLE',
  'DATA_LOSS',
  'UNAUTHENTICATED',
]);
export { COMPLETION_CREDENTIAL_MIN_TTL_MS, LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID };
type CompletionCredentialSnapshot = Readonly<{
  projectId: string;
  stableId: string;
  accountGeneration: number;
  authUid: string;
  authToken: string;
  authExpiresAtMs: number;
  appCheckToken: string;
  appCheckExpiresAtMs: number;
  epoch: number;
}>;

declare const COMPLETION_CREDENTIAL_HANDLE: unique symbol;
export type CompletionCredentialHandle = Readonly<{
  [COMPLETION_CREDENTIAL_HANDLE]: true;
}>;

let credentialEpoch = 1;
let activeCredentialHandle: CompletionCredentialHandle | null = null;
let credentialsByHandle = new WeakMap<object, CompletionCredentialSnapshot>();
const MAX_CONCURRENT_CREDENTIAL_WARMS = 8;
const credentialWarmFlights = new Map<string, symbol>();

declare const COMPLETION_CALLABLE_BODY: unique symbol;
export type CompletionCallableBody = Readonly<{ [COMPLETION_CALLABLE_BODY]: true }>;
declare const COMPLETION_CALLABLE_REQUEST: unique symbol;
export type CompletionCallableRequest = Readonly<{ [COMPLETION_CALLABLE_REQUEST]: true }>;

type DetachedCompletionCallableRequest = Readonly<{
  name: 'getLearningV2AccountBinding' | 'submitLearningV2RequiredSessionCompletion' |
    'resolveLearningV2WalletRewardReceipt';
  credentialHandle: CompletionCredentialHandle;
  body: CompletionCallableBody;
  lease: BackgroundNetworkLease;
}>;

type CompletionCallableName = DetachedCompletionCallableRequest['name'];
const bodyJsonByHandle = new WeakMap<object, Readonly<{
  name: CompletionCallableName;
  encoded: string;
}>>();
const requestByHandle = new WeakMap<object, DetachedCompletionCallableRequest>();

export class CompletionCallableProtocolError extends Error {
  readonly status: string;
  readonly details: unknown;
  constructor(status: string, message: string, details?: unknown) {
    super(message);
    this.name = 'CompletionCallableProtocolError';
    this.status = status;
    this.details = details;
    Object.freeze(this);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === 'string' && keys.includes(key));
};

const ownDataValue = (value: unknown, key: string): unknown => {
  if (!isRecord(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
};

const currentFirebaseAuthUid = (): string | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default;
    const uid = auth()?.currentUser?.uid;
    return typeof uid === 'string' && uid.length > 0 && uid.length <= 256 ? uid : null;
  } catch {
    return null;
  }
};

const pinnedFirebaseProjectIsCurrent = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    return getApp()?.options?.projectId === LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID;
  } catch {
    return false;
  }
};

const jwtPayload = (token: string): Record<string, unknown> | null => {
  if (!TOKEN.test(token)) return null;
  const parts = token.split('.');
  const encoded = parts.length === 3 ? parts[1] : null;
  if (!encoded || encoded.length > MAX_JWT_PAYLOAD_CHARS ||
    !/^[A-Za-z0-9_-]+$/.test(encoded) || typeof atob !== 'function') return null;
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (encoded.length % 4)) % 4);
    const binary = atob(padded);
    if (binary.length > MAX_JWT_PAYLOAD_CHARS) return null;
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const detached = detachBoundedWalletJson(
      decoded,
      'learning_v2_completion_credential_invalid',
    );
    return isRecord(detached) ? detached : null;
  } catch {
    return null;
  }
};

const jwtExpirationMs = (payload: Record<string, unknown>): number | null => {
  const exp = ownDataValue(payload, 'exp');
  return Number.isSafeInteger(exp) && (exp as number) > 0 &&
    (exp as number) <= Math.floor(Number.MAX_SAFE_INTEGER / 1_000)
    ? (exp as number) * 1_000 : null;
};

const deepFreezeJson = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreezeJson(child);
  return value;
};

export const materializeLearningV2CompletionCallableBody = (
  name: CompletionCallableName,
  canonicalDataJson: string,
): CompletionCallableBody => {
  if (!CALLABLE_NAMES.has(name) || typeof canonicalDataJson !== 'string' ||
    canonicalDataJson.length > MAX_REQUEST_BYTES) {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      JSON.parse(canonicalDataJson),
      'learning_v2_completion_callable_request_invalid',
    );
    if (canonicalJsonV1(detached) !== canonicalDataJson) {
      throw new Error('learning_v2_completion_callable_request_invalid');
    }
  } catch {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  if (name === 'getLearningV2AccountBinding' && canonicalDataJson !== '{}') {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  const encoded = canonicalJsonV1({ data: detached });
  if (encoded.length > MAX_REQUEST_BYTES || utf8ByteLengthV1(encoded) > MAX_REQUEST_BYTES) {
    throw new Error('learning_v2_completion_callable_request_overflow');
  }
  const handle = Object.freeze({}) as CompletionCallableBody;
  bodyJsonByHandle.set(handle, Object.freeze({ name, encoded }));
  return handle;
};

export const materializeLearningV2CompletionCallableRequest = (
  name: CompletionCallableName,
  credentialHandle: CompletionCredentialHandle,
  body: CompletionCallableBody,
  lease: BackgroundNetworkLease,
): CompletionCallableRequest => {
  const bodyRecord = bodyJsonByHandle.get(body);
  if (!CALLABLE_NAMES.has(name) || !bodyRecord || bodyRecord.name !== name ||
    resolveCurrentLearningV2CompletionCredentialHandle(credentialHandle) === null ||
    !isCurrentBackgroundNetworkLease(lease)) {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  const detached = Object.freeze({
    name,
    credentialHandle,
    body,
    lease,
  }) as DetachedCompletionCallableRequest;
  const handle = Object.freeze({}) as CompletionCallableRequest;
  requestByHandle.set(handle, detached);
  return handle;
};

const completionCredentialSnapshotIsUsable = (
  snapshot: CompletionCredentialSnapshot,
  nowMs: number,
): boolean =>
  pinnedFirebaseProjectIsCurrent() && ID.test(snapshot.projectId) &&
  snapshot.projectId === LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID &&
  typeof snapshot.stableId === 'string' && snapshot.stableId.length > 0 && snapshot.stableId.length <= 256 &&
  typeof snapshot.authUid === 'string' && snapshot.authUid.length > 0 && snapshot.authUid.length <= 256 &&
  currentFirebaseAuthUid() === snapshot.authUid &&
  Number.isSafeInteger(snapshot.accountGeneration) && snapshot.accountGeneration >= 0 &&
  Number.isSafeInteger(snapshot.epoch) && snapshot.epoch >= 1 &&
  TOKEN.test(snapshot.authToken) && TOKEN.test(snapshot.appCheckToken) &&
  Number.isSafeInteger(nowMs) &&
  Number.isSafeInteger(snapshot.authExpiresAtMs) &&
  Number.isSafeInteger(snapshot.appCheckExpiresAtMs) &&
  snapshot.authExpiresAtMs - nowMs >= COMPLETION_CREDENTIAL_MIN_TTL_MS &&
  snapshot.appCheckExpiresAtMs - nowMs >= COMPLETION_CREDENTIAL_MIN_TTL_MS;

export const clearLearningV2CompletionCredentialCache = (): void => {
  activeCredentialHandle = null;
  credentialsByHandle = new WeakMap<object, CompletionCredentialSnapshot>();
  credentialEpoch = credentialEpoch >= Number.MAX_SAFE_INTEGER ? 1 : credentialEpoch + 1;
};

/**
 * Invalidates only the exact pair that produced a rejected request. A late
 * UNAUTHENTICATED response must never erase a newer credential refresh.
 */
export const clearLearningV2CompletionCredentialHandleIfCurrent = (
  handle: CompletionCredentialHandle,
): boolean => {
  if (handle !== activeCredentialHandle || !credentialsByHandle.has(handle)) return false;
  clearLearningV2CompletionCredentialCache();
  return true;
};

const publishLearningV2CompletionCredentialPair = (
  account: AccountGenerationToken,
  authUid: string,
  authToken: string,
  authExpiresAtMs: number,
  appCheckToken: string,
  appCheckExpiresAtMs: number,
): CompletionCredentialHandle | null => {
  if (!isCapturedAccountGenerationToken(account) ||
    account.phase !== 'active' || !account.stableId ||
    !isCurrentAccountGeneration(account, account.stableId) ||
    account.stableId.length > 256 || currentFirebaseAuthUid() !== authUid ||
    typeof authUid !== 'string' || authUid.length === 0 || authUid.length > 256 ||
    typeof authToken !== 'string' ||
    !TOKEN.test(authToken) || typeof appCheckToken !== 'string' ||
    !TOKEN.test(appCheckToken) || !Number.isSafeInteger(authExpiresAtMs) ||
    authExpiresAtMs <= 0 || !Number.isSafeInteger(appCheckExpiresAtMs) ||
    appCheckExpiresAtMs <= 0) return null;
  const handle = Object.freeze({}) as CompletionCredentialHandle;
  credentialsByHandle.set(handle, Object.freeze({
    projectId: LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID,
    stableId: account.stableId,
    accountGeneration: account.generation,
    authUid,
    authToken,
    authExpiresAtMs,
    appCheckToken,
    appCheckExpiresAtMs,
    epoch: credentialEpoch,
  }));
  activeCredentialHandle = handle;
  return handle;
};

export type CompletionCredentialWarmDisposition =
  | 'published'
  | 'unavailable'
  | 'stale'
  | 'in_flight'
  | 'capacity_exhausted';

const credentialWarmFenceIsCurrent = (
  account: AccountGenerationToken,
  lease: BackgroundNetworkLease,
  authUid: string,
  expectedCredentialEpoch: number,
): boolean => {
  lease.assertCurrent();
  if (!isCapturedAccountGenerationToken(account) || account.phase !== 'active' ||
    !account.stableId || !isCurrentAccountGeneration(account, account.stableId) ||
    !pinnedFirebaseProjectIsCurrent() || credentialEpoch !== expectedCredentialEpoch) return false;
  return currentFirebaseAuthUid() === authUid;
};

/**
 * Cache-preferred, not cache-only: RNFirebase may refresh/mint when its cached
 * token is missing or expired. The caller must own a real background network
 * lease, and both non-cancellable native promises remain inside that lease
 * until their actual settlement. Tokens never leave this module or RAM.
 */
export const attemptWarmLearningV2CompletionCredentialsCachePreferred = async (
  account: AccountGenerationToken,
  lease: BackgroundNetworkLease,
): Promise<CompletionCredentialWarmDisposition> => {
  if (!isCapturedAccountGenerationToken(account) || account.phase !== 'active' ||
    !account.stableId || account.stableId.length > 256 ||
    !isCurrentAccountGeneration(account, account.stableId) ||
    !isCurrentBackgroundNetworkLease(lease) || !pinnedFirebaseProjectIsCurrent() ||
    !isFirebaseAppCheckReady()) return 'unavailable';
  let authModule: any;
  let appCheckModule: any;
  let capturedUser: object;
  let authUid: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    authModule = require('@react-native-firebase/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    appCheckModule = require('@react-native-firebase/app-check').default;
    const candidate = authModule.default()?.currentUser;
    const uid = candidate?.uid;
    if (!candidate || typeof candidate !== 'object' || typeof uid !== 'string' ||
      uid.length === 0 || uid.length > 256 || typeof authModule.getIdTokenResult !== 'function' ||
      typeof appCheckModule !== 'function') return 'unavailable';
    capturedUser = candidate;
    authUid = uid;
  } catch {
    return 'unavailable';
  }

  const warmKey = `${account.generation}:${account.stableId}:${authUid}`;
  if (credentialWarmFlights.has(warmKey)) return 'in_flight';
  if (credentialWarmFlights.size >= MAX_CONCURRENT_CREDENTIAL_WARMS) return 'capacity_exhausted';
  const warmTicket = Symbol(warmKey);
  const expectedCredentialEpoch = credentialEpoch;
  credentialWarmFlights.set(warmKey, warmTicket);
  try {
    lease.assertCurrent();
    let authResult: unknown;
    try {
      authResult = await authModule.getIdTokenResult(capturedUser, false);
    } catch {
      lease.assertCurrent();
      return credentialWarmFenceIsCurrent(account, lease, authUid, expectedCredentialEpoch)
        ? 'unavailable' : 'stale';
    }
    if (!credentialWarmFenceIsCurrent(account, lease, authUid, expectedCredentialEpoch)) return 'stale';
    const authToken = ownDataValue(authResult, 'token');
    const authExpirationTime = ownDataValue(authResult, 'expirationTime');
    if (typeof authToken !== 'string' || typeof authExpirationTime !== 'string' ||
      authExpirationTime.length > 64) return 'unavailable';
    const authPayload = jwtPayload(authToken);
    const authJwtExpiresAtMs = authPayload ? jwtExpirationMs(authPayload) : null;
    const authExpirationFromSdk = Date.parse(authExpirationTime);
    if (!authPayload || authJwtExpiresAtMs === null || !Number.isSafeInteger(authExpirationFromSdk) ||
      Math.abs(authExpirationFromSdk - authJwtExpiresAtMs) > 1_000 ||
      ownDataValue(authPayload, 'aud') !== LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID ||
      ownDataValue(authPayload, 'iss') !==
        `https://securetoken.google.com/${LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID}` ||
      ownDataValue(authPayload, 'sub') !== authUid) return 'unavailable';
    const authCheckedAtMs = Date.now();
    if (!Number.isSafeInteger(authCheckedAtMs) ||
      authExpirationFromSdk - authCheckedAtMs < COMPLETION_CREDENTIAL_MIN_TTL_MS ||
      authExpirationFromSdk - authCheckedAtMs > MAX_AUTH_TOKEN_TTL_MS) return 'unavailable';

    lease.assertCurrent();
    let appCheckResult: unknown;
    try {
      appCheckResult = await appCheckModule().getToken(false);
    } catch {
      lease.assertCurrent();
      return credentialWarmFenceIsCurrent(account, lease, authUid, expectedCredentialEpoch)
        ? 'unavailable' : 'stale';
    }
    if (!credentialWarmFenceIsCurrent(account, lease, authUid, expectedCredentialEpoch)) return 'stale';
    const appCheckToken = ownDataValue(appCheckResult, 'token');
    if (typeof appCheckToken !== 'string') return 'unavailable';
    const appCheckPayload = jwtPayload(appCheckToken);
    const appCheckExpiresAtMs = appCheckPayload ? jwtExpirationMs(appCheckPayload) : null;
    const nowMs = Date.now();
    if (!appCheckPayload || appCheckExpiresAtMs === null || !Number.isSafeInteger(nowMs) ||
      authExpirationFromSdk - nowMs < COMPLETION_CREDENTIAL_MIN_TTL_MS ||
      appCheckExpiresAtMs - nowMs < COMPLETION_CREDENTIAL_MIN_TTL_MS ||
      authExpirationFromSdk - nowMs > MAX_AUTH_TOKEN_TTL_MS ||
      appCheckExpiresAtMs - nowMs > MAX_APP_CHECK_TOKEN_TTL_MS) return 'unavailable';
    if (!credentialWarmFenceIsCurrent(account, lease, authUid, expectedCredentialEpoch)) return 'stale';
    const published = publishLearningV2CompletionCredentialPair(
      account,
      authUid,
      authToken,
      authExpirationFromSdk,
      appCheckToken,
      appCheckExpiresAtMs,
    );
    return published && peekLearningV2CompletionCredentialHandle(account) === published
      ? 'published' : 'stale';
  } finally {
    if (credentialWarmFlights.get(warmKey) === warmTicket) credentialWarmFlights.delete(warmKey);
  }
};

export const peekLearningV2CompletionCredentialHandle = (
  account: AccountGenerationToken,
): CompletionCredentialHandle | null => {
  if (!isCapturedAccountGenerationToken(account) ||
    account.phase !== 'active' || !account.stableId ||
    !isCurrentAccountGeneration(account, account.stableId)) return null;
  const handle = activeCredentialHandle;
  const snapshot = handle ? credentialsByHandle.get(handle) : null;
  return snapshot && snapshot.epoch === credentialEpoch &&
    snapshot.stableId === account.stableId &&
    snapshot.accountGeneration === account.generation &&
    completionCredentialSnapshotIsUsable(snapshot, Date.now()) ? handle : null;
};

const resolveCurrentLearningV2CompletionCredentialHandle = (
  handle: CompletionCredentialHandle,
): CompletionCredentialSnapshot | null => {
  if (handle !== activeCredentialHandle) return null;
  const snapshot = credentialsByHandle.get(handle);
  const account = captureAccountGeneration();
  if (!snapshot || snapshot.epoch !== credentialEpoch || account.phase !== 'active' ||
    !account.stableId || !isCurrentAccountGeneration(account, account.stableId) ||
    snapshot.stableId !== account.stableId ||
    snapshot.accountGeneration !== account.generation ||
    currentFirebaseAuthUid() !== snapshot.authUid) return null;
  return snapshot;
};

export const learningV2CompletionCredentialCacheState = (): Readonly<{
  epoch: number;
  hasCredentialPair: boolean;
  account: AccountGenerationToken;
}> => {
  const active = activeCredentialHandle
    ? resolveCurrentLearningV2CompletionCredentialHandle(activeCredentialHandle) : null;
  return Object.freeze({
    epoch: credentialEpoch,
    hasCredentialPair: active !== null && completionCredentialSnapshotIsUsable(active, Date.now()),
    account: captureAccountGeneration(),
  });
};

subscribeAccountGeneration(() => clearLearningV2CompletionCredentialCache());

const readResponseTextBounded = async (
  response: Response,
  controller: AbortController,
): Promise<string> => {
  const declared = response.headers.get('content-length');
  const lengthError = declared !== null &&
    (!/^\d{1,9}$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)
    ? new Error('learning_v2_completion_callable_response_overflow')
    : null;
  const contentType = response.headers.get('content-type');
  const contentTypeError = typeof contentType !== 'string' ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType.trim())
    ? new Error('learning_v2_completion_callable_response_invalid')
    : null;
  const forcedError = lengthError ?? contentTypeError;
  const reader = response.body?.getReader?.();
  if (!reader) {
    const unsupported = new Error('learning_v2_completion_callable_transport_unsupported');
    controller.abort(lengthError ?? contentTypeError ?? unsupported);
    return await new Promise<never>(() => {});
  }
  const output = new Uint8Array(MAX_RESPONSE_BYTES);
  let bytes = 0;
  let reads = 0;
  try {
    if (forcedError) {
      controller.abort(forcedError);
      throw forcedError;
    }
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        return new TextDecoder('utf-8', { fatal: true }).decode(output.subarray(0, bytes));
      }
      reads += 1;
      if (!(next.value instanceof Uint8Array) || reads > MAX_STREAM_CHUNKS ||
        bytes + next.value.byteLength > MAX_RESPONSE_BYTES) {
        throw new Error('learning_v2_completion_callable_response_overflow');
      }
      output.set(next.value, bytes);
      bytes += next.value.byteLength;
    }
  } catch (error) {
    controller.abort(error);
    // Abort acknowledgement is not transport settlement. Keep reading until
    // the stream reaches a real terminal state. A broken abort-ignoring source
    // is allowed only bounded drain work and then deliberately keeps this lease
    // unresolved instead of falsely declaring the session network-quiet.
    let drainReads = 0;
    for (;;) {
      try {
        const tail = await reader.read();
        if (tail.done) break;
        drainReads += 1;
        if (drainReads > MAX_STREAM_CHUNKS) await new Promise<never>(() => {});
      } catch {
        break;
      }
    }
    throw error;
  } finally {
    try { reader.releaseLock(); } catch (e) {
      // already terminal
      DebugLogger.error('learning_v2_completion_callable_fetch:tail', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
};

export const callLearningV2CompletionFunctionViaFetch = async (
  requestHandle: CompletionCallableRequest,
): Promise<unknown> => {
  const request = requestByHandle.get(requestHandle);
  if (!request || !isCurrentBackgroundNetworkLease(request.lease)) {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  request.lease.assertCurrent();
  const credentials = resolveCurrentLearningV2CompletionCredentialHandle(request.credentialHandle);
  if (!credentials || !completionCredentialSnapshotIsUsable(credentials, Date.now()) ||
    request.lease.signal.aborted) {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  const body = bodyJsonByHandle.get(request.body);
  if (!body || body.name !== request.name) {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  if (request.lease.signal.aborted ||
    resolveCurrentLearningV2CompletionCredentialHandle(request.credentialHandle) !== credentials) {
    throw new Error('learning_v2_completion_callable_request_invalid');
  }
  const controller = new AbortController();
  const abortFromUpstream = () => controller.abort(request.lease.signal.reason);
  request.lease.signal.addEventListener('abort', abortFromUpstream, { once: true });
  let raw: string;
  let responseOk = false;
  try {
    const url = `https://us-central1-${LEARNING_V2_COMPLETION_FIREBASE_PROJECT_ID}` +
      `.cloudfunctions.net/${request.name}`;
    const response = await expoFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.authToken}`,
        'X-Firebase-AppCheck': credentials.appCheckToken,
      },
      body: body.encoded,
      signal: controller.signal,
      redirect: 'error',
      credentials: 'omit',
    });
    responseOk = response.ok;
    raw = await readResponseTextBounded(response, controller);
  } finally {
    request.lease.signal.removeEventListener('abort', abortFromUpstream);
  }
  if (request.lease.signal.aborted || controller.signal.aborted) {
    throw new Error('learning_v2_completion_callable_aborted');
  }
  request.lease.assertCurrent();
  if (resolveCurrentLearningV2CompletionCredentialHandle(request.credentialHandle) !== credentials) {
    throw new Error('learning_v2_completion_callable_aborted');
  }
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch {
    throw new Error('learning_v2_completion_callable_response_invalid');
  }
  try {
    decoded = detachBoundedWalletJson(
      decoded,
      'learning_v2_completion_callable_response_invalid',
    );
  } catch {
    throw new Error('learning_v2_completion_callable_response_invalid');
  }
  deepFreezeJson(decoded);
  if (!isRecord(decoded)) throw new Error('learning_v2_completion_callable_response_invalid');
  if ('error' in decoded) {
    if (!exactKeys(decoded, ['error']) || !isRecord(decoded.error) ||
      !exactKeys(decoded.error, ['status', 'message', ...(decoded.error.details === undefined ? [] : ['details'])]) ||
      typeof decoded.error.status !== 'string' || !CALLABLE_ERROR_STATUSES.has(decoded.error.status) ||
      typeof decoded.error.message !== 'string' || decoded.error.message.length > 1_024) {
      throw new Error('learning_v2_completion_callable_response_invalid');
    }
    throw new CompletionCallableProtocolError(
      decoded.error.status,
      decoded.error.message,
      decoded.error.details,
    );
  }
  if (!responseOk || !exactKeys(decoded, ['result'])) {
    throw new Error('learning_v2_completion_callable_response_invalid');
  }
  return decoded.result;
};
