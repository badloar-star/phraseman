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

interface VersionManifest {
  versionCode: number;
  message?: string;
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
  const raw = (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode;
  return typeof raw === 'number' ? raw : 0;
}

async function shouldShow(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (!raw) return true;
    return Date.now() - parseInt(raw, 10) >= CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export async function markUpdateSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {}
}

// Возвращает UpdateInfo если есть новая версия и прошли сутки, иначе null.
// AppContent в _layout.tsx показывает UpdateModal на основе этого результата.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const url = typeof UPDATE_CHECK_URL === 'string' ? UPDATE_CHECK_URL.trim() : '';
    if (!url || url.includes('YOUR_GITHUB_USERNAME')) return null;

    const canShow = await shouldShow();
    if (!canShow) return null;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const manifest: VersionManifest = await res.json();
    const currentCode = getCurrentVersionCode();

    if (manifest.versionCode > currentCode) {
      const storeUrl = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
      return { available: true, storeUrl, message: manifest.message };
    }

    return null;
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
