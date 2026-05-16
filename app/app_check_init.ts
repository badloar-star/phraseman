/**
 * App Check: Firebase Console providers (Play Integrity / App Attest / debug).
 * On iOS, RNFBAppCheckModule.sharedInstance() must run before FirebaseApp.configure();
 * see plugins/withIosFirebaseEarlyConfigure.js.
 */
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

let appCheckInitPromise: Promise<void> | null = null;

export async function initFirebaseAppCheckIfAvailable(): Promise<void> {
  if (appCheckInitPromise) return appCheckInitPromise;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  if (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG !== '1') return;

  appCheckInitPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const appCheck = require('@react-native-firebase/app-check').default;
      const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
      if (__DEV__) {
        provider.configure({
          android: { provider: 'debug' },
          apple: { provider: 'debug' },
        });
      } else {
        provider.configure({
          android: { provider: 'playIntegrity' },
          apple: { provider: 'appAttestWithDeviceCheckFallback' },
        });
      }
      await appCheck().initializeAppCheck({
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      appCheckInitPromise = null;
      // Native module may be unavailable before prebuild / pod install.
    }
  })();

  return appCheckInitPromise;
}
