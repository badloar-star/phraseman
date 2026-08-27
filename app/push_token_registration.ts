/**
 * push_token_registration.ts — регистрация Expo Push токена для СЕРВЕРНЫХ пушей.
 *
 * Зачем: локальные уведомления (notifications.ts) планируются только когда юзер
 * открывает приложение. Если он пропал на 3+ дня — сервер должен сам достучаться.
 * Для этого серверному cron (functions/src/re_engage_push.ts) нужен push-токен
 * юзера в его облачном документе users/{stableId}.
 *
 * Почему Expo Push, а не FCM напрямую: проект уже использует Expo Push API
 * (арена пишет expoPushToken в matchmaking_queue, сервер шлёт через exp.host).
 * Используем тот же канал — консистентно и без новой нативной зависимости.
 *
 * Доставка: Expo Push API под капотом доставляет через FCM (Android) / APNs (iOS)
 * даже в закрытое приложение. Это и есть «серверный push».
 *
 * Идемпотентно и best-effort: при любой ошибке тихо выходим, приложение не падает.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { DebugLogger } from './debug-logger';

/** Поле в users/{stableId}, куда пишется токен. Совпадает с тем, что читает cron. */
export const PUSH_TOKEN_FIELD = 'expoPushToken';

/** Локальный кэш последнего записанного токена — чтобы не писать в Firestore повторно. */
const PUSH_TOKEN_LOCAL_KEY = 'expo_push_token_last_written';

/** Таймаут на getExpoPushTokenAsync — expo-notifications может зависать на холодном старте. */
const PUSH_TOKEN_TIMEOUT_MS = 8_000;

function getFirestore(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

/**
 * permission-denied при записи пуш-токена — ожидаемый «шум» на холодном старте:
 * anon-auth / стабильный auth-линк ещё не подтверждены, и правила Firestore
 * временно запрещают запись в users/{stableId}. Регистрация токена работает по
 * принципу «выстрелил и забыл» (починится при следующем запуске), поэтому такую
 * ошибку глушим — не краснит дев-оверлей и не пишем её в лог. Прочие ошибки важны.
 */
function isFirestorePermissionDenied(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  if (code === 'firestore/permission-denied' || code === 'permission-denied') return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('permission-denied');
}

/** Promise с таймаутом: reject, если не успел за ms. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function getEasProjectId(): string | undefined {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
}

/**
 * Получить Expo push token, если разрешение уже выдано.
 * НЕ запрашивает разрешение сам (это делает вызывающая сторона осознанно).
 * Возвращает null, если нет разрешения / модуля / таймаут.
 */
export async function getExpoPushTokenIfPermitted(): Promise<string | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO) return null;
  try {
    const { getExpoPushTokenAsync, getPermissionsAsync } = await import('expo-notifications');
    const { status } = await getPermissionsAsync();
    if (status !== 'granted') return null;

    const easProjectId = getEasProjectId();
    const tokenData = await withTimeout(
      getExpoPushTokenAsync(easProjectId ? { projectId: easProjectId } : undefined),
      PUSH_TOKEN_TIMEOUT_MS,
      'getExpoPushTokenAsync',
    );
    return tokenData?.data || null;
  } catch {
    return null;
  }
}

/**
 * Зарегистрировать push-токен в облачном документе пользователя.
 *
 * Вызывать при старте приложения (после восстановления из облака и при включённых
 * уведомлениях). Пишет только если токен изменился с прошлого раза (экономит записи).
 *
 * @param lang — язык интерфейса, для локализованного серверного пуша.
 * @returns true, если токен записан/подтверждён; false при отсутствии токена/доступа.
 */
export async function registerPushTokenForServerPush(lang: string): Promise<boolean> {
  try {
    const db = getFirestore();
    if (!db) return false;

    const stableId = await ensureAnonUser();
    if (!stableId) return false;
    const linkOk = await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    if (!linkOk) return false;

    const token = await getExpoPushTokenIfPermitted();
    if (!token) return false;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Пропускаем запись, если этот же токен уже был записан (тот же юзер, lang, tz).
    const cacheKey = `${stableId}:${token}:${lang}:${timezone}`;
    const lastWritten = await AsyncStorage.getItem(PUSH_TOKEN_LOCAL_KEY);
    if (lastWritten === cacheKey) return true;

    // зачем: firebaseAuthUid — server-owned (firestore.rules
    // serverOwnedUserIdentityFields), его пишет authEnsureStableLink. Подмешивать
    // его сюда нельзя: при расхождении со серверным значением правило
    // hasNoServerIdentityWrites отклоняет ВЕСЬ set — и пуш-токен не регистрируется
    // вообще. Тот же класс бага, что ронял cloud_sync (permission-denied 26.08).
    await db.collection('users').doc(stableId).set(
      {
        [PUSH_TOKEN_FIELD]: token,
        pushTokenPlatform: Platform.OS,
        pushTokenLang: lang,
        pushTokenTimezone: timezone,
        pushTokenUpdatedAt: Date.now(),
      },
      { merge: true },
    );

    await AsyncStorage.setItem(PUSH_TOKEN_LOCAL_KEY, cacheKey);
    return true;
  } catch (error) {
    // Ожидаемый шум на холодном старте — тихо выходим, не краснит дев-оверлей.
    if (isFirestorePermissionDenied(error)) return false;
    DebugLogger.error('push_token_registration.ts:registerPushTokenForServerPush', error, 'warning');
    return false;
  }
}

/** Пользовательский выбор для СЕРВЕРНЫХ пушей: false = этот тип не слать. */
// `league` covers league-only notifications. Tournament pushes are owner-locked off.
export type ServerPushPrefs = { streak: boolean; offers: boolean; league: boolean; maxLessons: boolean };

/** Локальный кэш последних записанных префов — чтобы не писать в Firestore повторно. */
const PUSH_PREFS_LOCAL_KEY = 'server_push_prefs_last_written';

/**
 * Зеркалит выбор юзера «какие уведомления получать» в users/{stableId}.pushPrefs.
 * Серверные кроны (re_engage_push) читают это поле перед отправкой.
 * зачем: раздел уведомлений даёт выбор по типам; без зеркала сервер слал бы
 * streak-пуши юзеру, который выключил «Серия под угрозой». Пишем ТОЛЬКО при
 * реальном изменении (кэш) — Firebase-экономия: 1 write на смену настройки.
 */
export async function updateServerPushPrefs(prefs: ServerPushPrefs): Promise<void> {
  try {
    const db = getFirestore();
    if (!db) return;

    const stableId = await ensureAnonUser();
    if (!stableId) return;
    const linkOk = await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    if (!linkOk) return;

    const cacheKey = `${stableId}:${prefs.streak ? 1 : 0}${prefs.offers ? 1 : 0}${prefs.league ? 1 : 0}${prefs.maxLessons ? 1 : 0}`;
    const lastWritten = await AsyncStorage.getItem(PUSH_PREFS_LOCAL_KEY);
    if (lastWritten === cacheKey) return;

    await db.collection('users').doc(stableId).set(
      // зачем (2026-08-23): lessons читает maxLessonReminderCron. Без зеркала
      // человек, выключивший «Уроки с MAX», продолжал бы получать напоминания.
      { pushPrefs: { streak: prefs.streak, offers: prefs.offers, league: prefs.league, lessons: prefs.maxLessons } },
      { merge: true },
    );
    await AsyncStorage.setItem(PUSH_PREFS_LOCAL_KEY, cacheKey);
  } catch (error) {
    if (isFirestorePermissionDenied(error)) return;
    DebugLogger.error('push_token_registration.ts:updateServerPushPrefs', error, 'warning');
  }
}

/**
 * Удалить токен из облака (например, при выходе/смене аккаунта или отключении
 * уведомлений) — чтобы сервер перестал слать пуши на чужой/недействительный токен.
 */
export async function clearPushTokenForServerPush(): Promise<void> {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const stableId = await ensureAnonUser();
    if (!stableId) return;
    const linkOk = await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    if (!linkOk) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firestoreModule = require('@react-native-firebase/firestore');
    const firestoreFn = firestoreModule.default ?? firestoreModule;
    const db = firestoreFn();
    const FieldValue = firestoreFn.FieldValue ?? firestoreFn.firestore?.FieldValue;
    const deleteValue = FieldValue?.delete ? FieldValue.delete() : null;

    if (deleteValue !== null) {
      await db.collection('users').doc(stableId).set(
        { [PUSH_TOKEN_FIELD]: deleteValue },
        { merge: true },
      );
    } else {
      // Fallback: обнуляем поле вместо удаления
      await db.collection('users').doc(stableId).set(
        { [PUSH_TOKEN_FIELD]: null },
        { merge: true },
      );
    }
    await AsyncStorage.removeItem(PUSH_TOKEN_LOCAL_KEY);
  } catch (error) {
    // Тот же ожидаемый шум — глушим только permission-denied.
    if (isFirestorePermissionDenied(error)) return;
    DebugLogger.error('push_token_registration.ts:clearPushTokenForServerPush', error, 'warning');
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
