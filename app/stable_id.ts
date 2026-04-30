// stable_id.ts — Постоянный ID пользователя, переживающий переустановку приложения
//
// iOS:     expo-secure-store → Keychain → сохраняется после удаления приложения
//          (kSecAttrAccessibleAfterFirstUnlock — попадает в iCloud Keychain Backup,
//          доступен после первого unlock устройства; переезжает между устройствами
//          одного Apple ID, если у юзера включён iCloud Keychain).
// Android: expo-secure-store → EncryptedSharedPreferences (AES-256 + Android Keystore).
//          Auto Backup от Android НЕ копирует EncryptedSharedPreferences (ключ
//          Keystore device-bound). Поэтому для надёжности на Android stable_id
//          ДУБЛИРУЕТСЯ в plain AsyncStorage (RKStorage SQLite), который попадает
//          в Auto Backup согласно android/backup_rules.xml — это позволяет
//          восстановить ID при переустановке если у юзера включён Google Drive Backup.
//          stable_id — это просто UUID, не секрет: его утечка ничего не даёт без
//          линка через auth_links + Firebase Rules.
//
// В Expo Go нативного модуля SecureStore нет — не импортируем пакет на верхнем уровне,
// только ленивый require в dev build / production; иначе AsyncStorage.

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO } from './config';

const SECURE_KEY = 'phraseman_stable_uid';
const ASYNC_KEY = 'phraseman_stable_uid_cache';

/**
 * iOS Keychain Service (group/namespace для Keychain item).
 * Явно фиксируем имя, чтобы:
 *   1. При апгрейдах bundle id или Keychain access groups item не «перепрятался».
 *   2. Можно было управлять/мигрировать через скрипты восстановления.
 * НЕ передаваемое имя приводит к дефолтному expo.modules.securestore — оно тоже
 * стабильное, но зависит от версии expo-secure-store. Лучше пинить.
 */
const KEYCHAIN_SERVICE = 'phraseman.identity.stable_id';

type SecureStoreModule = typeof import('expo-secure-store');
let secureStoreCache: SecureStoreModule | null | false = false;
let cachedId: string | null = null;

function getSecureStore(): SecureStoreModule | null {
  if (IS_EXPO_GO) return null;
  if (secureStoreCache === false) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      secureStoreCache = require('expo-secure-store') as SecureStoreModule;
    } catch {
      secureStoreCache = null;
    }
  }
  return secureStoreCache || null;
}

/**
 * Опции SecureStore для stable_id:
 *   • keychainService — фиксированный namespace на iOS.
 *   • keychainAccessible: AFTER_FIRST_UNLOCK — стандарт для не-критичных long-lived
 *     identifiers. Item доступен после первого unlock устройства и:
 *       - НЕ привязан к конкретному устройству (без _THIS_DEVICE_ONLY) → попадает
 *         в iCloud Keychain backup, переезжает между iPhone/iPad одного Apple ID;
 *       - переживает удаление приложения (что нам и нужно).
 *
 * ВАЖНО: те же опции должны использоваться при getItemAsync / deleteItemAsync,
 * иначе iOS трактует item как «другой» (по keychainService) и вернёт null.
 */
function getSecureStoreOpts(SS: SecureStoreModule): import('expo-secure-store').SecureStoreOptions {
  return {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SS.AFTER_FIRST_UNLOCK,
  };
}

export async function getStableId(): Promise<string> {
  if (cachedId) return cachedId;

  const SecureStore = getSecureStore();
  const opts = SecureStore ? getSecureStoreOpts(SecureStore) : undefined;

  if (SecureStore && opts) {
    try {
      // Сначала пробуем с фиксированным keychainService.
      let stored = await SecureStore.getItemAsync(SECURE_KEY, opts);
      // Миграция со старого Keychain item (без keychainService): если новый ключ
      // пуст — попробуем старый, скопируем в новый и удалим старый.
      if (!stored) {
        try {
          const legacy = await SecureStore.getItemAsync(SECURE_KEY);
          if (legacy) {
            await SecureStore.setItemAsync(SECURE_KEY, legacy, opts).catch(() => {});
            await SecureStore.deleteItemAsync(SECURE_KEY).catch(() => {});
            stored = legacy;
          }
        } catch { /* ignore legacy migration errors */ }
      }
      if (stored) {
        cachedId = stored;
        await AsyncStorage.setItem(ASYNC_KEY, stored);
        return stored;
      }
    } catch {
      /* native / keystore issues → fall through */
    }
  }

  // Fallback: проверяем AsyncStorage (помогает при первом запуске после обновления / Expo Go;
  // на Android также критично — RKStorage переживает Auto Backup, а EncryptedSharedPreferences нет).
  try {
    const cached = await AsyncStorage.getItem(ASYNC_KEY);
    if (cached) {
      cachedId = cached;
      if (SecureStore && opts) {
        await SecureStore.setItemAsync(SECURE_KEY, cached, opts).catch(() => {});
      }
      return cached;
    }
  } catch {}

  // Создаём новый ID
  const newId = Crypto.randomUUID();
  cachedId = newId;

  if (SecureStore && opts) {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, newId, opts);
    } catch {
      /* only AsyncStorage below */
    }
  }
  await AsyncStorage.setItem(ASYNC_KEY, newId).catch(() => {});

  return newId;
}

/**
 * Принудительно установить stable_id (используется при device-switch / "сменить аккаунт"
 * через провайдер auth: пользователь логинится Google → находим его stable_id в auth_links →
 * подменяем локальный, чтобы syncToCloud / restoreFromCloud работали с правильным docId).
 *
 * ВАЖНО: вызов **только** из auth_provider.ts. Прочий код должен считать stable_id immutable.
 * После вызова обязательно очистить локальный AsyncStorage с прогрессом и сделать restoreFromCloud,
 * иначе данные старого аккаунта останутся в кеше.
 */
export async function setStableId(newId: string): Promise<void> {
  if (!newId || typeof newId !== 'string') {
    throw new Error('setStableId: newId must be non-empty string');
  }
  cachedId = newId;
  const SecureStore = getSecureStore();
  if (SecureStore) {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, newId, getSecureStoreOpts(SecureStore));
    } catch {
      /* SecureStore unavailable — продолжаем через AsyncStorage */
    }
  }
  await AsyncStorage.setItem(ASYNC_KEY, newId).catch(() => {});
}

/**
 * Сбросить in-memory кеш (force re-read из SecureStore/AsyncStorage при следующем getStableId).
 * Нужно после внешней правки SecureStore (например, тестов или recovery flow).
 */
export function _resetStableIdCache(): void {
  cachedId = null;
}

/**
 * Полностью очистить stable_id во всех слоях хранения и в памяти.
 *
 * Используется ТОЛЬКО во flow "Сменить аккаунт" (Variant 2):
 * после успешного синка прогресса в облако и signOut от Google/Firebase
 * мы стираем локальный stable_id, чтобы getStableId() при следующем
 * вызове сгенерировал НОВЫЙ UUID, и приложение оказалось в чистом
 * "анонимном новом юзере" состоянии.
 *
 * Не путать с _resetStableIdCache: тот лишь чистит in-memory кеш,
 * а stored value в SecureStore/AsyncStorage остаётся прежним.
 */
export async function clearStableId(): Promise<void> {
  cachedId = null;
  const SecureStore = getSecureStore();
  if (SecureStore) {
    const opts = getSecureStoreOpts(SecureStore);
    try {
      // Удаляем и новый (с keychainService) и legacy (без opts) на случай миграции.
      await SecureStore.deleteItemAsync(SECURE_KEY, opts);
    } catch {
      /* ignore */
    }
    try {
      await SecureStore.deleteItemAsync(SECURE_KEY);
    } catch {
      /* ignore */
    }
  }
  try {
    await AsyncStorage.removeItem(ASYNC_KEY);
  } catch {
    /* ignore */
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
