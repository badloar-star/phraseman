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
import {
  isInteractiveNetworkDeferredError,
  registerInteractiveNetworkQuietParticipant,
  withBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from './interactive_network_quiet';
import { DebugLogger } from './debug-logger';

let appCheckInitPromise: Promise<boolean> | null = null;
let appCheckReady = false;
let appCheckLastFailureAtMs = 0;

const APP_CHECK_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

// зачем (владелец, 2026-09-14: «вход зависает на сплеше иногда на минуту»):
// аттестация Play Integrity / App Attest ходит в сеть Google/Apple и НЕ имела
// здесь ни одного потолка времени. В стор-сборке APP_CHECK_REAL_ATTESTATION_ENABLED
// = true, поэтому это реальный прод-путь, а не теория: initFirebaseAppCheckIfAvailable
// стоит на старте (cloud_sync.ensureAnonAuthReady, completeAuthRecoveryHandoffViaServer)
// и его зависание держало первый кадр. Значение 5 с взято из уже работающего
// образца — auth_recovery_secondary.APP_CHECK_TOKEN_TIMEOUT_MS.
// Отдельно важно: quiesce участника interactive_network_quiet ниже делает
// `await appCheckInitPromise` — без потолка вис и он вместе с инициализацией.
const APP_CHECK_INIT_TIMEOUT_MS = 5_000;
const APP_CHECK_TOKEN_TIMEOUT_MS = 5_000;

/** Потолок ожидания для нативного промиса App Check. Таймер снимается всегда. */
function withAppCheckTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`app_check_timeout:${label}`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
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

async function setAppCheckAutoRefreshEnabled(enabled: boolean): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheck = require('@react-native-firebase/app-check').default;
    await Promise.resolve(appCheck().setTokenAutoRefreshEnabled(enabled));
  } catch (e) {
      // Native module may be unavailable before prebuild / pod install.
      DebugLogger.error('app_check_init:appCheck', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

registerInteractiveNetworkQuietParticipant('firebase.app_check_refresh', {
  quiesce: async () => {
    await setAppCheckAutoRefreshEnabled(false);
    // A mint admitted before SESSION_INTENT remains part of the fence until its
    // raw native promise settles. A caller timeout must never hide it.
    if (appCheckInitPromise) await appCheckInitPromise;
  },
  // Proactive native refresh stays disabled for the lifetime of the app.
  // On-demand token acquisition belongs to a tracked network operation.
  resume: () => undefined,
});

export function isFirebaseAppCheckReady(): boolean {
  return appCheckReady;
}

async function verifyAppCheckCanMintJwt(
  appCheck: any,
  lease: BackgroundNetworkLease,
): Promise<boolean> {
  try {
    lease.assertCurrent();
    const first = await withAppCheckTimeout(
      Promise.resolve(appCheck().getToken(false)),
      APP_CHECK_TOKEN_TIMEOUT_MS,
      'get_token',
    );
    lease.assertCurrent();
    if (isJwtLikeToken(tokenStringFromResult(first))) return true;
    lease.assertCurrent();
    const refreshed = await withAppCheckTimeout(
      Promise.resolve(appCheck().getToken(true)),
      APP_CHECK_TOKEN_TIMEOUT_MS,
      'get_token_refresh',
    );
    lease.assertCurrent();
    return isJwtLikeToken(tokenStringFromResult(refreshed));
  } catch (error) {
    if (isInteractiveNetworkDeferredError(error)) throw error;
    // зачем: запрет немого catch — молчаливый false здесь неотличим от
    // «аттестация честно отказала», и именно так дефект живёт месяцами.
    // Пишем причину всегда; сам возврат false остаётся прежним поведением.
    DebugLogger.error(
      'app_check_init:verify_mint',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return false;
  }
}

export async function initFirebaseAppCheckIfAvailable(
  options: { forceRetry?: boolean } = {},
): Promise<boolean> {
  if (appCheckReady) return true;
  if (appCheckInitPromise) return appCheckInitPromise;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    void setAppCheckAutoRefreshEnabled(false);
    return false;
  }

  const debugToken = String(process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN || '').trim();
  const useDebugProvider =
    !APP_CHECK_REAL_ATTESTATION_ENABLED &&
    (process.env.EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG === '1' || debugToken.length > 0);

  // Internal/preview builds use debug only when explicitly configured. Builds
  // explicitly marked for real attestation use Play Integrity / App Attest.
  if (!APP_CHECK_REAL_ATTESTATION_ENABLED && !useDebugProvider) {
    void setAppCheckAutoRefreshEnabled(false);
    return false;
  }
  if (
    !options.forceRetry &&
    appCheckLastFailureAtMs > 0 &&
    Date.now() - appCheckLastFailureAtMs < APP_CHECK_FAILURE_COOLDOWN_MS
  ) {
    return false;
  }

  const initAttempt = withBackgroundNetworkLease('firebase.app_check_init', async (lease) => {
    try {
      lease.assertCurrent();
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
      lease.assertCurrent();
      await withAppCheckTimeout(
        Promise.resolve(appCheck().initializeAppCheck({
          provider,
          isTokenAutoRefreshEnabled: false,
        })),
        APP_CHECK_INIT_TIMEOUT_MS,
        'initialize',
      );
      lease.assertCurrent();
      const hasJwt = await verifyAppCheckCanMintJwt(appCheck, lease);
      if (!hasJwt) {
        appCheckLastFailureAtMs = Date.now();
        appCheckInitPromise = null;
        await setAppCheckAutoRefreshEnabled(false);
        return false;
      }
      lease.assertCurrent();
      appCheckReady = true;
      appCheckLastFailureAtMs = 0;
      await setAppCheckAutoRefreshEnabled(false);
      return true;
    } catch (error) {
      if (!isInteractiveNetworkDeferredError(error)) {
        appCheckLastFailureAtMs = Date.now();
      }
      appCheckInitPromise = null;
      await setAppCheckAutoRefreshEnabled(false);
      // Native module may be unavailable before prebuild / pod install.
      // зачем: запрет немого catch — сюда же приходит app_check_timeout:*,
      // и без записи «аттестация не уложилась в потолок» неотличимо от
      // «нативный модуль отсутствует». Обе причины важны при разборе старта.
      DebugLogger.error(
        'app_check_init:init_attempt',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
      return false;
    }
  });
  appCheckInitPromise = initAttempt.catch(async (error) => {
    if (!isInteractiveNetworkDeferredError(error)) {
      appCheckLastFailureAtMs = Date.now();
    }
    appCheckInitPromise = null;
    await setAppCheckAutoRefreshEnabled(false);
    return false;
  });

  return appCheckInitPromise;
}
