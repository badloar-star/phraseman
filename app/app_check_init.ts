/**
 * App Check: Firebase Console providers (Play Integrity / App Attest / debug).
 * On iOS, RNFBAppCheckModule.sharedInstance() must run before FirebaseApp.configure();
 * see plugins/withIosFirebaseEarlyConfigure.js.
 */
import {
  APP_CHECK_REAL_ATTESTATION_ENABLED,
  CLOUD_SYNC_ENABLED,
  IS_EXPO_GO,
} from './config';

let appCheckInitPromise: Promise<boolean> | null = null;
let appCheckReady = false;
let appCheckLastFailureAtMs = 0;

const APP_CHECK_TOKEN_TIMEOUT_MS = 3500;
const APP_CHECK_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('app_check_token_timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

function isJwtLikeToken(value: unknown): boolean {
  return typeof value === 'string' && value.split('.').length === 3 && value.length > 80;
}

function tokenStringFromResult(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const token = (value as { token?: unknown }).token;
  return typeof token === 'string' ? token : null;
}

function setAppCheckAutoRefreshEnabled(enabled: boolean): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheck = require('@react-native-firebase/app-check').default;
    appCheck().setTokenAutoRefreshEnabled(enabled);
  } catch {
    // Native module may be unavailable before prebuild / pod install.
  }
}

async function verifyAppCheckCanMintJwt(appCheck: any): Promise<boolean> {
  try {
    const first = await withTimeout(appCheck().getToken(false), APP_CHECK_TOKEN_TIMEOUT_MS);
    if (isJwtLikeToken(tokenStringFromResult(first))) return true;
    const refreshed = await withTimeout(appCheck().getToken(true), APP_CHECK_TOKEN_TIMEOUT_MS);
    return isJwtLikeToken(tokenStringFromResult(refreshed));
  } catch {
    return false;
  }
}

export async function initFirebaseAppCheckIfAvailable(
  options: { forceRetry?: boolean } = {},
): Promise<boolean> {
  if (appCheckReady) return true;
  if (appCheckInitPromise) return appCheckInitPromise;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    setAppCheckAutoRefreshEnabled(false);
    return false;
  }

  const debugToken = String(process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN || '').trim();
  const useDebugProvider =
    !APP_CHECK_REAL_ATTESTATION_ENABLED &&
    (process.env.EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG === '1' || debugToken.length > 0);

  // Internal/preview builds use debug only when explicitly configured. Builds
  // explicitly marked for real attestation use Play Integrity / App Attest.
  if (!APP_CHECK_REAL_ATTESTATION_ENABLED && !useDebugProvider) {
    setAppCheckAutoRefreshEnabled(false);
    return false;
  }
  if (
    !options.forceRetry &&
    appCheckLastFailureAtMs > 0 &&
    Date.now() - appCheckLastFailureAtMs < APP_CHECK_FAILURE_COOLDOWN_MS
  ) {
    return false;
  }

  appCheckInitPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const appCheck = require('@react-native-firebase/app-check').default;
      const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
      if (useDebugProvider) {
        provider.configure({
          android: { provider: 'debug', ...(debugToken ? { debugToken } : {}) },
          apple: { provider: 'debug', ...(debugToken ? { debugToken } : {}) },
        });
      } else {
        provider.configure({
          android: { provider: 'playIntegrity' },
          apple: { provider: 'appAttestWithDeviceCheckFallback' },
        });
      }
      await appCheck().initializeAppCheck({
        provider,
        isTokenAutoRefreshEnabled: false,
      });
      const hasJwt = await verifyAppCheckCanMintJwt(appCheck);
      if (!hasJwt) {
        appCheckLastFailureAtMs = Date.now();
        appCheckInitPromise = null;
        setAppCheckAutoRefreshEnabled(false);
        return false;
      }
      appCheckReady = true;
      appCheckLastFailureAtMs = 0;
      setAppCheckAutoRefreshEnabled(true);
      return true;
    } catch {
      appCheckLastFailureAtMs = Date.now();
      appCheckInitPromise = null;
      setAppCheckAutoRefreshEnabled(false);
      // Native module may be unavailable before prebuild / pod install.
      return false;
    }
  })();

  return appCheckInitPromise;
}
