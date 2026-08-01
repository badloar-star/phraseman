import {
  APP_CHECK_REAL_ATTESTATION_ENABLED,
  CLOUD_SYNC_ENABLED,
  IS_EXPO_GO,
} from './config';

export type SecondaryRecoveryProvider = 'google' | 'apple';

export type SecondaryRecoveryNativeCredential = Readonly<{
  idToken: string;
  email: string | null;
  displayName: string | null;
  appleNonce?: string;
}>;

export type SecondaryRecoveryCredentialResult =
  | SecondaryRecoveryNativeCredential
  | Readonly<{ cancelled: true }>;

export type SecondaryRecoveryCredentialAcquirer = (
  provider: SecondaryRecoveryProvider,
) => Promise<SecondaryRecoveryCredentialResult>;

export type SecondaryRecoveryCallable = (
  data: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

export type SecondaryRecoveryCallableName =
  | 'authRequestRecoveryCode'
  | 'authConfirmRecoveryCode'
  | 'authRequestCleanInstallRecoveryCode'
  | 'authConfirmCleanInstallRecoveryCode'
  | 'authIssueRecoveryHandoffToken';

export type SecondaryRecoveryCallableFactory = (
  functions: unknown,
  name: SecondaryRecoveryCallableName,
) => SecondaryRecoveryCallable;

export type SecondaryRecoveryRequestResult = Readonly<{
  maskedEmail: string;
  expiresInSec: number;
  provider: SecondaryRecoveryProvider;
}>;

export type SecondaryRecoveryConfirmResult = Readonly<{
  stableId: string;
  recoveryEventId: string;
  handoffEligibleUntil: number;
}>;

export type SecondaryRecoveryHandoffTokenResult = Readonly<{
  customToken: string;
  stableId: string;
  handoffAcknowledgeUntil: number;
}>;

export type SecondaryCleanInstallRequestResult = Readonly<{
  challengeId: string;
  expiresInSec: number;
  retryAfterSec: number;
}>;

export type SecondaryAuthRecoverySession = Readonly<{
  authUid: string;
  provider: SecondaryRecoveryProvider;
  functions: unknown;
  requestCode: (stableId: string) => Promise<SecondaryRecoveryRequestResult>;
  confirmCode: (stableId: string, code: string) => Promise<SecondaryRecoveryConfirmResult>;
  requestCleanInstallCode: (
    email: string,
    clientRequestId: string,
  ) => Promise<SecondaryCleanInstallRequestResult>;
  confirmCleanInstallCode: (
    challengeId: string,
    code: string,
    clientRequestId: string,
  ) => Promise<SecondaryRecoveryConfirmResult>;
  issueHandoffToken: (
    recoveryEventId: string,
    requestId: string,
  ) => Promise<SecondaryRecoveryHandoffTokenResult>;
  cleanup: () => Promise<void>;
}>;

export type SecondaryAuthRecoveryStartResult =
  | Readonly<{ result: 'ready'; session: SecondaryAuthRecoverySession }>
  | Readonly<{ result: 'cancelled' }>;

export const SECONDARY_AUTH_RECOVERY_APP_NAME = 'phraseman-auth-recovery-secondary';
export const SECONDARY_AUTH_RECOVERY_DATABASE_URL =
  'https://phraseman-auth-recovery-unused.invalid';

const APP_CHECK_TOKEN_TIMEOUT_MS = 5_000;

function defaultCallableFactory(
  functions: unknown,
  name: SecondaryRecoveryCallableName,
): SecondaryRecoveryCallable {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(functions, name);
}

function errorWithCode(code: string, cause?: unknown): Error {
  const error = new Error(code);
  if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

function currentUid(auth: any): string | null {
  const uid = auth?.currentUser?.uid;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

function assertDefaultUidUnchanged(defaultAuth: any, expectedUid: string | null): void {
  if (currentUid(defaultAuth) !== expectedUid) throw errorWithCode('default_auth_session_changed');
}

function requiredStringOption(options: Record<string, unknown>, key: string): string {
  const value = options[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw errorWithCode(`secondary_firebase_option_missing_${key}`);
  }
  return value.trim();
}

function copySecondaryFirebaseOptions(defaultOptions: unknown): Record<string, unknown> {
  if (!defaultOptions || typeof defaultOptions !== 'object') {
    throw errorWithCode('secondary_firebase_options_unavailable');
  }
  const source = defaultOptions as Record<string, unknown>;
  requiredStringOption(source, 'apiKey');
  requiredStringOption(source, 'appId');
  requiredStringOption(source, 'projectId');
  requiredStringOption(source, 'messagingSenderId');
  requiredStringOption(source, 'storageBucket');
  return {
    ...source,
    // Recovery never uses Realtime Database. A non-routable reserved TLD keeps a
    // secondary app from inheriting or accidentally contacting the production DB.
    databaseURL: SECONDARY_AUTH_RECOVERY_DATABASE_URL,
  };
}

function isJwtLikeToken(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 80
    && value.length <= 8_192
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(errorWithCode('secondary_app_check_timeout')), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timeout !== undefined) clearTimeout(timeout);
  });
}

async function initializeSecondaryAppCheck(app: unknown): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    throw errorWithCode('secondary_app_check_unavailable');
  }

  const debugToken = String(process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN || '').trim();
  const useDebugProvider =
    !APP_CHECK_REAL_ATTESTATION_ENABLED
    && (process.env.EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG === '1' || debugToken.length > 0);
  if (!APP_CHECK_REAL_ATTESTATION_ENABLED && !useDebugProvider) {
    throw errorWithCode('secondary_app_check_unavailable');
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheckModule = require('@react-native-firebase/app-check');
    const provider = new appCheckModule.ReactNativeFirebaseAppCheckProvider();
    provider.configure(useDebugProvider ? {
      android: { provider: 'debug', ...(debugToken ? { debugToken } : {}) },
      apple: { provider: 'debug', ...(debugToken ? { debugToken } : {}) },
    } : {
      android: { provider: 'playIntegrity' },
      apple: { provider: 'appAttestWithDeviceCheckFallback' },
    });
    const appCheck = await appCheckModule.initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: false,
    });
    let result = await withTimeout(
      Promise.resolve(appCheckModule.getToken(appCheck, false)),
      APP_CHECK_TOKEN_TIMEOUT_MS,
    );
    if (!isJwtLikeToken(result?.token)) {
      result = await withTimeout(
        Promise.resolve(appCheckModule.getToken(appCheck, true)),
        APP_CHECK_TOKEN_TIMEOUT_MS,
      );
    }
    if (!isJwtLikeToken(result?.token)) throw errorWithCode('secondary_app_check_unavailable');
    appCheckModule.setTokenAutoRefreshEnabled(appCheck, true);
  } catch (error) {
    if ((error as Error)?.message === 'secondary_app_check_unavailable') throw error;
    throw errorWithCode('secondary_app_check_unavailable', error);
  }
}

async function cleanupFirebaseApp(app: any): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { deleteApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth, signOut } = require('@react-native-firebase/auth');
  let firstFailure: unknown;
  try {
    await signOut(getAuth(app));
  } catch (error) {
    firstFailure = error;
  }
  try {
    await deleteApp(app);
  } catch (error) {
    if (firstFailure === undefined) firstFailure = error;
  }
  if (firstFailure !== undefined) throw errorWithCode('secondary_auth_cleanup_failed', firstFailure);
}

function findSecondaryApp(getApps: () => any[]): any | null {
  return getApps().find(app => app?.name === SECONDARY_AUTH_RECOVERY_APP_NAME) ?? null;
}

function makeIdempotentCleanup(
  app: any,
  defaultAuth: any,
  expectedDefaultUid: string | null,
): () => Promise<void> {
  let cleanupPromise: Promise<void> | null = null;
  return () => {
    if (!cleanupPromise) {
      cleanupPromise = (async () => {
        await cleanupFirebaseApp(app);
        assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);
      })();
    }
    return cleanupPromise;
  };
}

function buildFirebaseCredential(
  provider: SecondaryRecoveryProvider,
  nativeCredential: SecondaryRecoveryNativeCredential,
): unknown {
  const idToken = typeof nativeCredential.idToken === 'string'
    ? nativeCredential.idToken.trim()
    : '';
  if (!idToken) throw errorWithCode('secondary_provider_token_unavailable');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authModule = require('@react-native-firebase/auth').default;
  if (provider === 'google') return authModule.GoogleAuthProvider.credential(idToken);
  const nonce = typeof nativeCredential.appleNonce === 'string'
    ? nativeCredential.appleNonce.trim()
    : '';
  if (!nonce) throw errorWithCode('secondary_apple_nonce_unavailable');
  return authModule.AppleAuthProvider.credential(idToken, nonce);
}

function validateProviderClaims(
  provider: SecondaryRecoveryProvider,
  claims: unknown,
): void {
  const claimMap = claims && typeof claims === 'object'
    ? claims as Record<string, unknown>
    : {};
  const firebase = claimMap.firebase && typeof claimMap.firebase === 'object'
    ? claimMap.firebase as Record<string, unknown>
    : {};
  const expectedProvider = provider === 'google' ? 'google.com' : 'apple.com';
  if (firebase.sign_in_provider !== expectedProvider) {
    throw errorWithCode('secondary_provider_claim_mismatch');
  }
  if (claimMap.email_verified !== true) {
    throw errorWithCode('secondary_email_not_verified');
  }
}

function callableData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw errorWithCode('secondary_recovery_response_invalid');
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw errorWithCode('secondary_recovery_response_invalid');
  }
  return data as Record<string, unknown>;
}

function assertExactResponseKeys(
  data: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const keys = Object.keys(data);
  if (keys.length !== allowed.length || keys.some(key => !allowed.includes(key))) {
    throw errorWithCode('secondary_recovery_response_invalid');
  }
}

function requiredResponseString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw errorWithCode('secondary_recovery_response_invalid');
  }
  return value.trim();
}

function requiredResponseNumber(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw errorWithCode('secondary_recovery_response_invalid');
  }
  return value;
}

function requiredNonNegativeResponseNumber(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw errorWithCode('secondary_recovery_response_invalid');
  }
  return value;
}

function requiredInput(value: unknown, code: string, maxLength = 180): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > maxLength) throw errorWithCode(code);
  return normalized;
}

function requiredOpaqueIdentifier(
  value: unknown,
  requiredCode: string,
  invalidCode: string,
): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw errorWithCode(requiredCode);
  if (normalized.length > 160 || normalized.includes('/')) throw errorWithCode(invalidCode);
  return normalized;
}

async function startSecondaryAuthRecoverySessionInternal(
  provider: SecondaryRecoveryProvider,
  acquireCredential: SecondaryRecoveryCredentialAcquirer,
  callableFactory: SecondaryRecoveryCallableFactory,
): Promise<SecondaryAuthRecoveryStartResult> {
  if (provider !== 'google' && provider !== 'apple') {
    throw errorWithCode('secondary_provider_unsupported');
  }
  if (typeof acquireCredential !== 'function') {
    throw errorWithCode('secondary_credential_acquirer_unavailable');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp, getApps, initializeApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth, getIdTokenResult, signInWithCredential } = require('@react-native-firebase/auth');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions } = require('@react-native-firebase/functions');

  const defaultApp = getApp();
  const defaultAuth = getAuth(defaultApp);
  const expectedDefaultUid = currentUid(defaultAuth);
  const options = copySecondaryFirebaseOptions(defaultApp?.options);
  assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);

  const staleApp = findSecondaryApp(getApps);
  if (staleApp) {
    await cleanupFirebaseApp(staleApp);
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);
  }

  let secondaryApp: any = null;
  let cleanup: (() => Promise<void>) | null = null;
  try {
    secondaryApp = await initializeApp(options, SECONDARY_AUTH_RECOVERY_APP_NAME);
    cleanup = makeIdempotentCleanup(secondaryApp, defaultAuth, expectedDefaultUid);
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);

    await initializeSecondaryAppCheck(secondaryApp);
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);

    const nativeCredential = await acquireCredential(provider);
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);
    if ('cancelled' in nativeCredential) {
      await cleanup();
      return { result: 'cancelled' };
    }

    const secondaryAuth = getAuth(secondaryApp);
    const firebaseCredential = buildFirebaseCredential(provider, nativeCredential);
    const userCredential = await signInWithCredential(secondaryAuth, firebaseCredential);
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);

    const authUid = currentUid({ currentUser: userCredential?.user });
    if (!authUid || currentUid(secondaryAuth) !== authUid) {
      throw errorWithCode('secondary_auth_uid_mismatch');
    }
    const tokenResult = await getIdTokenResult(userCredential.user, true);
    validateProviderClaims(provider, tokenResult?.claims);
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);

    const functions = getFunctions(secondaryApp, 'us-central1');
    if (!functions) throw errorWithCode('secondary_functions_unavailable');
    assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);

    const callableCache = new Map<string, SecondaryRecoveryCallable>();
    let sessionClosed = false;
    let activeCallSettled: Promise<void> | null = null;
    let settleActiveCall: (() => void) | null = null;

    const getCallable = (
      name: SecondaryRecoveryCallableName,
    ): SecondaryRecoveryCallable => {
      const cached = callableCache.get(name);
      if (cached) return cached;
      const callable = callableFactory(functions, name);
      if (typeof callable !== 'function') throw errorWithCode('secondary_callable_unavailable');
      callableCache.set(name, callable);
      return callable;
    };

    const assertSecondaryIdentity = async (): Promise<void> => {
      assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);
      const currentUser = secondaryAuth?.currentUser;
      if (currentUid(secondaryAuth) !== authUid || currentUid({ currentUser }) !== authUid) {
        throw errorWithCode('secondary_auth_session_changed');
      }
      let refreshedClaims: unknown;
      try {
        refreshedClaims = (await getIdTokenResult(currentUser, false))?.claims;
        validateProviderClaims(provider, refreshedClaims);
      } catch (error) {
        if ((error as Error)?.message === 'default_auth_session_changed') throw error;
        throw errorWithCode('secondary_auth_session_changed', error);
      }
      if (currentUid(secondaryAuth) !== authUid) {
        throw errorWithCode('secondary_auth_session_changed');
      }
      assertDefaultUidUnchanged(defaultAuth, expectedDefaultUid);
    };

    const runGuarded = async <T>(operation: () => Promise<T>): Promise<T> => {
      if (sessionClosed) throw errorWithCode('recovery_session_closed');
      if (activeCallSettled) throw errorWithCode('recovery_session_call_in_progress');
      activeCallSettled = new Promise<void>(resolve => {
        settleActiveCall = resolve;
      });
      try {
        await assertSecondaryIdentity();
        const value = await operation();
        await assertSecondaryIdentity();
        return value;
      } finally {
        settleActiveCall?.();
        settleActiveCall = null;
        activeCallSettled = null;
      }
    };

    const requestCode = async (stableIdInput: string): Promise<SecondaryRecoveryRequestResult> => {
      const stableId = requiredInput(stableIdInput, 'secondary_stable_id_required', 160);
      return runGuarded(async () => {
        const data = callableData(await getCallable('authRequestRecoveryCode')({ stableId }));
        if (data.ok !== true) throw errorWithCode('secondary_recovery_response_invalid');
        const responseProvider = requiredResponseString(data, 'provider');
        if (responseProvider !== provider) throw errorWithCode('secondary_recovery_response_invalid');
        return {
          maskedEmail: requiredResponseString(data, 'maskedEmail'),
          expiresInSec: requiredResponseNumber(data, 'expiresInSec'),
          provider,
        };
      });
    };

    const confirmCode = async (
      stableIdInput: string,
      codeInput: string,
    ): Promise<SecondaryRecoveryConfirmResult> => {
      const stableId = requiredInput(stableIdInput, 'secondary_stable_id_required', 160);
      const code = String(codeInput ?? '').trim();
      if (!/^\d{6}$/.test(code)) throw errorWithCode('secondary_recovery_code_invalid');
      return runGuarded(async () => {
        const data = callableData(await getCallable('authConfirmRecoveryCode')({ stableId, code }));
        if (data.ok !== true || requiredResponseString(data, 'stableId') !== stableId) {
          throw errorWithCode('secondary_recovery_response_invalid');
        }
        return {
          stableId,
          recoveryEventId: requiredResponseString(data, 'recoveryEventId'),
          handoffEligibleUntil: requiredResponseNumber(data, 'handoffEligibleUntil'),
        };
      });
    };

    const requestCleanInstallCode = async (
      emailInput: string,
      clientRequestIdInput: string,
    ): Promise<SecondaryCleanInstallRequestResult> => {
      const email = String(emailInput ?? '').normalize('NFKC').trim().toLowerCase();
      if (!email || email.length > 320 || !email.includes('@')) {
        throw errorWithCode('secondary_clean_recovery_email_invalid');
      }
      const clientRequestId = requiredOpaqueIdentifier(
        clientRequestIdInput,
        'secondary_recovery_request_id_required',
        'secondary_recovery_request_id_invalid',
      );
      return runGuarded(async () => {
        const data = callableData(await getCallable('authRequestCleanInstallRecoveryCode')({
          email,
          clientRequestId,
        }));
        assertExactResponseKeys(data, ['ok', 'challengeId', 'expiresInSec', 'retryAfterSec']);
        if (data.ok !== true) throw errorWithCode('secondary_recovery_response_invalid');
        const challengeId = requiredResponseString(data, 'challengeId');
        if (!/^[A-Za-z0-9_-]{24,160}$/.test(challengeId)) {
          throw errorWithCode('secondary_recovery_response_invalid');
        }
        return {
          challengeId,
          expiresInSec: requiredResponseNumber(data, 'expiresInSec'),
          retryAfterSec: requiredNonNegativeResponseNumber(data, 'retryAfterSec'),
        };
      });
    };

    const confirmCleanInstallCode = async (
      challengeIdInput: string,
      codeInput: string,
      clientRequestIdInput: string,
    ): Promise<SecondaryRecoveryConfirmResult> => {
      const challengeId = requiredOpaqueIdentifier(
        challengeIdInput,
        'secondary_clean_recovery_challenge_required',
        'secondary_clean_recovery_challenge_invalid',
      );
      if (!/^[A-Za-z0-9_-]{24,160}$/.test(challengeId)) {
        throw errorWithCode('secondary_clean_recovery_challenge_invalid');
      }
      const code = String(codeInput ?? '').trim();
      if (!/^\d{6}$/.test(code)) throw errorWithCode('secondary_recovery_code_invalid');
      const clientRequestId = requiredOpaqueIdentifier(
        clientRequestIdInput,
        'secondary_recovery_request_id_required',
        'secondary_recovery_request_id_invalid',
      );
      return runGuarded(async () => {
        const data = callableData(await getCallable('authConfirmCleanInstallRecoveryCode')({
          challengeId,
          code,
          clientRequestId,
        }));
        assertExactResponseKeys(data, [
          'ok',
          'stableId',
          'recoveryEventId',
          'handoffEligibleUntil',
        ]);
        if (data.ok !== true) throw errorWithCode('secondary_recovery_response_invalid');
        return {
          stableId: requiredResponseString(data, 'stableId'),
          recoveryEventId: requiredResponseString(data, 'recoveryEventId'),
          handoffEligibleUntil: requiredResponseNumber(data, 'handoffEligibleUntil'),
        };
      });
    };

    const issueHandoffToken = async (
      recoveryEventIdInput: string,
      requestIdInput: string,
    ): Promise<SecondaryRecoveryHandoffTokenResult> => {
      const recoveryEventId = requiredOpaqueIdentifier(
        recoveryEventIdInput,
        'secondary_recovery_event_id_required',
        'secondary_recovery_event_id_invalid',
      );
      const requestId = requiredOpaqueIdentifier(
        requestIdInput,
        'secondary_recovery_request_id_required',
        'secondary_recovery_request_id_invalid',
      );
      return runGuarded(async () => {
        const data = callableData(await getCallable('authIssueRecoveryHandoffToken')({
          recoveryEventId,
          requestId,
        }));
        if (
          data.ok !== true
          || requiredResponseString(data, 'recoveryEventId') !== recoveryEventId
        ) {
          throw errorWithCode('secondary_recovery_response_invalid');
        }
        const customToken = data.customToken;
        if (!isJwtLikeToken(customToken)) throw errorWithCode('secondary_recovery_response_invalid');
        return {
          customToken,
          stableId: requiredResponseString(data, 'stableId'),
          handoffAcknowledgeUntil: requiredResponseNumber(data, 'handoffAcknowledgeUntil'),
        };
      });
    };

    const physicalCleanup = cleanup;
    let guardedCleanupPromise: Promise<void> | null = null;
    const guardedCleanup = (): Promise<void> => {
      sessionClosed = true;
      if (!guardedCleanupPromise) {
        guardedCleanupPromise = (async () => {
          const pendingCall = activeCallSettled;
          if (pendingCall) await pendingCall;
          await physicalCleanup();
        })();
      }
      return guardedCleanupPromise;
    };

    return {
      result: 'ready',
      session: {
        authUid,
        provider,
        functions,
        requestCode,
        confirmCode,
        requestCleanInstallCode,
        confirmCleanInstallCode,
        issueHandoffToken,
        cleanup: guardedCleanup,
      },
    };
  } catch (error) {
    if (!cleanup) {
      const partialApp = secondaryApp ?? findSecondaryApp(getApps);
      if (partialApp) cleanup = makeIdempotentCleanup(partialApp, defaultAuth, expectedDefaultUid);
    }
    if (cleanup) {
      try {
        await cleanup();
      } catch (cleanupError) {
        if (
          (error as Error)?.message === 'default_auth_session_changed'
          && (cleanupError as Error)?.message === 'default_auth_session_changed'
        ) {
          throw error;
        }
        throw errorWithCode('secondary_auth_cleanup_failed', { error, cleanupError });
      }
    }
    throw error;
  }
}

let secondaryRecoverySessionReserved = false;

export async function startSecondaryAuthRecoverySession(
  provider: SecondaryRecoveryProvider,
  acquireCredential: SecondaryRecoveryCredentialAcquirer,
  callableFactory: SecondaryRecoveryCallableFactory = defaultCallableFactory,
): Promise<SecondaryAuthRecoveryStartResult> {
  if (secondaryRecoverySessionReserved) {
    throw errorWithCode('recovery_session_in_progress');
  }
  secondaryRecoverySessionReserved = true;
  try {
    if (typeof callableFactory !== 'function') throw errorWithCode('secondary_callable_factory_unavailable');
    const result = await startSecondaryAuthRecoverySessionInternal(
      provider,
      acquireCredential,
      callableFactory,
    );
    if (result.result === 'cancelled') {
      secondaryRecoverySessionReserved = false;
      return result;
    }
    const cleanupSession = result.session.cleanup;
    let releasePromise: Promise<void> | null = null;
    const cleanup = () => {
      if (!releasePromise) {
        releasePromise = cleanupSession().finally(() => {
          secondaryRecoverySessionReserved = false;
        });
      }
      return releasePromise;
    };
    return {
      result: 'ready',
      session: { ...result.session, cleanup },
    };
  } catch (error) {
    secondaryRecoverySessionReserved = false;
    throw error;
  }
}
