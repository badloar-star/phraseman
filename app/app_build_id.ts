// Единый числовой ID сборки для акций, привязанных к релизу.
// Android: expo android.versionCode. iOS: ios.buildNumber (строка → число).
// Перед релизом с бонусом выровняйте buildNumber (iOS) = versionCode (Android).
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getAppReleaseBuildId(): number {
  if (Platform.OS === 'android') {
    const v = (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode;
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  if (Platform.OS === 'ios') {
    const bn =
      (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)?.buildNumber
      ?? (Constants as { nativeBuildVersion?: string }).nativeBuildVersion
      ?? '0';
    const n = parseInt(String(bn), 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
