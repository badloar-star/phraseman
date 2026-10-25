// app_build_number.ts — номер сборки для журнала сбоев.
// зачем (жалобы 9/13, 25.10): у всех записей app_errors был buildNumber «unknown» — Constants.nativeBuildVersion пуст, и «человек
// не обновился» нельзя было отличить от «новая причина». expo-application в зависимостях нет, и за час до сборки нативную
// зависимость не добавляем (координатор) — берём номер из конфигурации сборки: ios.buildNumber / android.versionCode.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ConstantsLike = Readonly<{
  nativeBuildVersion?: string | null;
  expoConfig?: Readonly<{ ios?: Readonly<{ buildNumber?: string | null }> | null; android?: Readonly<{ versionCode?: number | null }> | null }> | null;
}>;

/** Номер сборки: родной (если есть) → из конфигурации платформы → 'unknown'. */
export function resolveAppBuildNumberV1(constants: ConstantsLike = Constants as unknown as ConstantsLike, platform: string = Platform.OS): string {
  const native = typeof constants.nativeBuildVersion === 'string' ? constants.nativeBuildVersion.trim() : '';
  if (native) return native;
  if (platform === 'ios') {
    const ios = constants.expoConfig?.ios?.buildNumber;
    if (typeof ios === 'string' && ios.trim()) return ios.trim();
  }
  if (platform === 'android') {
    const code = constants.expoConfig?.android?.versionCode;
    if (typeof code === 'number' && Number.isFinite(code)) return String(code);
  }
  return 'unknown';
}

export default function __RouteShim() { return null; }
