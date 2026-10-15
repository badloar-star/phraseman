// ════════════════════════════════════════════════════════════════════════════
// update_check.ts — Проверка наличия обновления
// Сравнивает versionCode приложения с version.json на сервере.
// Вызывается при старте из _layout.tsx.
//
// version.json формат:
// {
//   "versionCode": 27,
//   "message": "Что нового в этой версии"
// }
// ════════════════════════════════════════════════════════════════════════════

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { UPDATE_CHECK_URL, STORE_URL_IOS, STORE_URL_ANDROID } from './config';
import { DebugLogger } from './debug-logger';

interface PlatformVersionManifest {
  versionCode?: number;
  message?: string;
}

interface VersionManifest extends PlatformVersionManifest {
  ios?: PlatformVersionManifest;
  android?: PlatformVersionManifest;
}

export interface UpdateInfo {
  available: true;
  storeUrl: string;
  message?: string;
}

// Показываем модальник не чаще раза в сутки
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'update_check_last_shown';

function getCurrentVersionCode(): number {
  if (Platform.OS === 'ios') {
    const raw =
      (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)?.buildNumber
      ?? (Constants as { nativeBuildVersion?: string }).nativeBuildVersion
      ?? '0';
    const parsed = parseInt(String(raw), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const raw = (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode;
  return typeof raw === 'number' ? raw : 0;
}

function toVersionCode(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getManifestTarget(manifest: VersionManifest): PlatformVersionManifest | null {
  const platformManifest =
    Platform.OS === 'ios'
      ? manifest.ios
      : Platform.OS === 'android'
        ? manifest.android
        : undefined;

  const platformVersionCode = toVersionCode(platformManifest?.versionCode);
  if (platformVersionCode != null) {
    return {
      versionCode: platformVersionCode,
      message: platformManifest?.message ?? manifest.message,
    };
  }

  const legacyVersionCode = toVersionCode(manifest.versionCode);
  if (legacyVersionCode != null) {
    return {
      versionCode: legacyVersionCode,
      message: manifest.message,
    };
  }

  return null;
}

async function shouldShow(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (!raw) return true;
    return Date.now() - parseInt(raw, 10) >= CHECK_INTERVAL_MS;
  } catch (error) {
    console.warn('[UPDATE-CHECK] shouldShow: метка не прочитана — проверяем', error instanceof Error ? error.message : String(error)); // guard-ok: немой catch запрещён
    return true;
  }
}

export async function markUpdateSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch (e) {
      DebugLogger.error('update_check:markUpdateSeen', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// Возвращает UpdateInfo если есть новая версия и прошли сутки, иначе null.
// AppContent в _layout.tsx показывает UpdateModal на основе этого результата.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    // В dev-сборке versionCode недоступен → пропускаем проверку
    if (__DEV__) return null;

    const url = typeof UPDATE_CHECK_URL === 'string' ? UPDATE_CHECK_URL.trim() : '';
    if (!url || url.includes('YOUR_GITHUB_USERNAME')) return null;

    const canShow = await shouldShow();
    if (!canShow) return null;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const manifest: VersionManifest = await res.json();
    const target = getManifestTarget(manifest);
    if (target?.versionCode == null) return null;

    const currentCode = getCurrentVersionCode();

    if (target.versionCode > currentCode) {
      const storeUrl = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
      // зачем (R58 #4, аудит кнопок 15.10): markUpdateSeen нигде не вызывался — метка интервала не ставилась, и окно
      // обновления всплывало на КАЖДОМ холодном старте. Найденное обновление запускает интервал (не чаще раза в сутки).
      await markUpdateSeen();
      console.log(`[UPDATE-CHECK] show target=${target.versionCode} current=${currentCode} — следующий показ не раньше чем через ${CHECK_INTERVAL_MS} мс`); // guard-ok: итог проверки
      return { available: true, storeUrl, message: target.message };
    }

    return null;
  } catch (error) {
    console.warn('[UPDATE-CHECK] check failed — окно не показываем', error instanceof Error ? error.message : String(error)); // guard-ok: немой catch запрещён
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
