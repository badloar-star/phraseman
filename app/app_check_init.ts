/**
 * App Check: после привязки app в Firebase Console (Debug token / Play Integrity / DeviceCheck)
 * можно включить enforceAppCheck в functions/src/referral.ts (CALLABLE_BASE).
 */
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';

export async function initFirebaseAppCheckIfAvailable(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheck = require('@react-native-firebase/app-check').default;
    if (__DEV__) {
      const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
      provider.configure({
        android: { provider: 'debug' },
        apple: { provider: 'debug' },
      });
      await appCheck().activate(provider, true);
    } else {
      await appCheck().activate();
    }
  } catch {
    // Нет нативного модуля до prebuild / pod install
  }
}
