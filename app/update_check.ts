// ════════════════════════════════════════════════════════════════════════════
// update_check.ts — Проверка наличия обновления в Google Play
// Сравнивает versionCode приложения с version.json на сервере.
// Вызывается при старте из _layout.tsx.
// ════════════════════════════════════════════════════════════════════════════

import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPDATE_CHECK_URL, STORE_URL_ANDROID } from './config';

interface VersionManifest {
  versionCode: number;
  message?: string;
}

// Показываем диалог обновления не чаще раза в сутки
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'update_check_last_shown';

function getCurrentVersionCode(): number {
  // Берём из app.json → android.versionCode через expo-constants
  const raw = (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode;
  return typeof raw === 'number' ? raw : 0;
}

async function shouldCheck(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (!raw) return true;
    const lastShown = parseInt(raw, 10);
    return Date.now() - lastShown >= CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function markChecked(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {}
}

export async function checkForUpdate(): Promise<void> {
  try {
    if (UPDATE_CHECK_URL.includes('YOUR_GITHUB_USERNAME')) return; // URL ещё не настроен

    const canCheck = await shouldCheck();
    if (!canCheck) return;

    const res = await fetch(UPDATE_CHECK_URL, { cache: 'no-store' });
    if (!res.ok) return;

    const manifest: VersionManifest = await res.json();
    const currentCode = getCurrentVersionCode();

    if (manifest.versionCode > currentCode) {
      await markChecked();

      const message = manifest.message
        ? `${manifest.message}\n\nОбновите приложение чтобы получить новые функции.`
        : 'Доступна новая версия Phraseman с улучшениями и новыми уроками.';

      Alert.alert(
        'Доступно обновление',
        message,
        [
          { text: 'Позже', style: 'cancel' },
          {
            text: 'Обновить',
            onPress: () => Linking.openURL(STORE_URL_ANDROID),
          },
        ],
        { cancelable: true }
      );
    }
  } catch {
    // Сетевые ошибки — тихо игнорируем
  }
}
