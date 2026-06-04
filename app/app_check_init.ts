/**
 * App Check: Firebase Console providers (Play Integrity / App Attest / debug).
 * On iOS, RNFBAppCheckModule.sharedInstance() must run before FirebaseApp.configure();
 * see plugins/withIosFirebaseEarlyConfigure.js.
 */
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO, IS_STORE_RELEASE } from './config';

let appCheckInitPromise: Promise<boolean> | null = null;

const APP_CHECK_TOKEN_TIMEOUT_MS = 3500;

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

export async function initFirebaseAppCheckIfAvailable(): Promise<boolean> {
  if (appCheckInitPromise) return appCheckInitPromise;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    setAppCheckAutoRefreshEnabled(false);
    return false;
  }

  const debugToken = String(process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN || '').trim();
  const useDebugProvider =
    !IS_STORE_RELEASE &&
    (process.env.EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG === '1' || debugToken.length > 0);

  // Internal/preview release builds are not installed from the stores, so real
  // attestation can produce invalid tokens. Use debug explicitly there; store
  // builds use Play Integrity / App Attest.
  if (!IS_STORE_RELEASE && !useDebugProvider) {
    setAppCheckAutoRefreshEnabled(false);
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
        appCheckInitPromise = null;
        setAppCheckAutoRefreshEnabled(false);
        return false;
      }
      setAppCheckAutoRefreshEnabled(true);
      return true;
    } catch {
      appCheckInitPromise = null;
      setAppCheckAutoRefreshEnabled(false);
      // Native module may be unavailable before prebuild / pod install.
      return false;
    }
  })();

  return appCheckInitPromise;
}
