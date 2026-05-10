/**
 * App Check: связка с Firebase Console (Play Integrity / App Attest / debug).
 * На iOS сначала вызывается RNFBAppCheckModule.sharedInstance() в AppDelegate —
 * см. plugins/withIosFirebaseEarlyConfigure.js.
 *
 * Production: явные провайдеры (не голый activate()), см. rnfirebase.io/app-check .
 */
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';

export async function initFirebaseAppCheckIfAvailable(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
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
    await appCheck().activate(provider, true);
  } catch {
    // Нет нативного модуля до prebuild / pod install
  }
}
