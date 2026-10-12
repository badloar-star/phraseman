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
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
    const linkOk = await ensureStableAuthLinkForStableId(stableId).catch(noteSwallowedAs('push_token_registration:promise_1', false));
    if (!linkOk) return false;

    const token = await getExpoPushTokenIfPermitted();
    if (!token) return false;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Пропускаем запись, если этот же токен уже был записан (тот же юзер, lang, tz).
    const cacheKey = `${stableId}:${token}:${lang}:${timezone}`;
    const lastWritten = await AsyncStorage.getItem(PUSH_TOKEN_LOCAL_KEY);
    // зачем (координатор 12.10, диагностика): какой язык пушей уходит на сервер и был ли он уже записан (без токена и uid).
    const lastLang = typeof lastWritten === 'string' ? lastWritten.split(':').slice(-2, -1)[0] ?? null : null;
    console.log('[PUSH-LANG]', JSON.stringify({ step: 'register', lang, lastLang, cacheHit: lastWritten === cacheKey }));
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
// Retired tournament pushes remain owner-locked off.
// Удалённый тип напоминаний больше не синхронизируем с сервером.
export type ServerPushPrefs = { streak: boolean; offers: boolean; league: boolean };

/** Локальный кэш последних записанных префов — чтобы не писать в Firestore повторно. */
const PUSH_PREFS_LOCAL_KEY = 'server_push_prefs_last_written';

/**
 * Зеркалит выбор юзера «какие уведомления получать» в users/{stableId}.pushPrefs.
 * Серверные кроны (re_engage_push) читают это поле перед отправкой.
 * зачем: раздел уведомлений даёт выбор по типам; без зеркала сервер слал бы
 * streak-пуши юзеру, который выключил «Серия под угрозой». Пишем ТОЛЬКО при
 * реальном изменении (кэш) — Firebase-экономия: 1 write на смену настройки.
 */
// зачем (E-1, R1_SETTINGS_OPTIMISTIC_UI, координатор 12.10): быстрые переключения тумблеров запускали параллельные записи до
// того, как обновится кэш-ключ, — лишние записи в Firestore и риск, что поздний ответ старой записи победит новую. Теперь
// пишем ОДИН раз через 1,5 с после последнего тапа, последнее значение побеждает, записи идут строго по очереди.
export const PUSH_PREFS_WRITE_DEBOUNCE_MS = 1_500;
let pendingPushPrefs: ServerPushPrefs | null = null;
let pendingPushPrefsTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPushPrefsTaps = 0;
let pendingPushPrefsWaiters: Array<() => void> = [];
let pushPrefsWriteChain: Promise<void> = Promise.resolve();

function pushPrefsLog(step: string, data: Record<string, unknown>): void {
  console.log(`[PUSH-PREFS] ${step}`, JSON.stringify(data)); // guard-ok: каждый шаг записи настроек пушей называет причину
}

function flushPendingPushPrefs(): void {
  pendingPushPrefsTimer = null;
  const prefs = pendingPushPrefs;
  const taps = pendingPushPrefsTaps;
  const waiters = pendingPushPrefsWaiters;
  pendingPushPrefs = null;
  pendingPushPrefsTaps = 0;
  pendingPushPrefsWaiters = [];
  if (!prefs) {
    waiters.forEach((resolve) => resolve());
    return;
  }
  pushPrefsLog('flush', { taps, streak: prefs.streak, offers: prefs.offers, league: prefs.league });
  pushPrefsWriteChain = pushPrefsWriteChain
    .then(() => writeServerPushPrefsNow(prefs))
    .finally(() => waiters.forEach((resolve) => resolve()));
}

/**
 * Записать выбор пушей в облако (best-effort). Склеивает быстрые переключения: одна запись через 1,5 с после последнего вызова.
 * Промис завершается после этой записи (или пропуска) — интерфейс его не ждёт.
 */
export function updateServerPushPrefs(prefs: ServerPushPrefs): Promise<void> {
  pendingPushPrefs = { streak: prefs.streak, offers: prefs.offers, league: prefs.league };
  pendingPushPrefsTaps += 1;
  if (pendingPushPrefsTimer) clearTimeout(pendingPushPrefsTimer);
  pendingPushPrefsTimer = setTimeout(flushPendingPushPrefs, PUSH_PREFS_WRITE_DEBOUNCE_MS);
  return new Promise<void>((resolve) => { pendingPushPrefsWaiters.push(resolve); });
}

/** Только для тестов: записать отложенное сразу и дождаться очереди записей. */
export async function flushServerPushPrefsForTests(): Promise<void> {
  if (pendingPushPrefsTimer) {
    clearTimeout(pendingPushPrefsTimer);
    flushPendingPushPrefs();
  }
  await pushPrefsWriteChain;
}

async function writeServerPushPrefsNow(prefs: ServerPushPrefs): Promise<void> {
  const startedAt = Date.now();
  try {
    const db = getFirestore();
    if (!db) {
      pushPrefsLog('skip', { reason: 'no_firestore' });
      return;
    }

    const stableId = await ensureAnonUser();
    if (!stableId) {
      pushPrefsLog('skip', { reason: 'no_stable_id' });
      return;
    }
    const linkOk = await ensureStableAuthLinkForStableId(stableId).catch(noteSwallowedAs('push_token_registration:promise_2', false));
    if (!linkOk) {
      pushPrefsLog('skip', { reason: 'auth_link_not_ready' });
      return;
    }

    // зачем: league (тумблер «События Шпиля») входит в ключ — иначе его смена не дошла бы до сервера.
    const cacheKey = `${stableId}:${prefs.streak ? 1 : 0}${prefs.offers ? 1 : 0}${prefs.league ? 1 : 0}`;
    const lastWritten = await AsyncStorage.getItem(PUSH_PREFS_LOCAL_KEY);
    if (lastWritten === cacheKey) {
      pushPrefsLog('skip', { reason: 'unchanged' });
      return;
    }

    // Поле `lessons` больше не пишем: этот тип напоминания удалён.
    await db.collection('users').doc(stableId).set(
      { pushPrefs: { streak: prefs.streak, offers: prefs.offers, league: prefs.league } },
      { merge: true },
    );
    await AsyncStorage.setItem(PUSH_PREFS_LOCAL_KEY, cacheKey);
    pushPrefsLog('written', { ms: Date.now() - startedAt });
  } catch (error) {
    pushPrefsLog('failed', { ms: Date.now() - startedAt, message: error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160) });
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
    const linkOk = await ensureStableAuthLinkForStableId(stableId).catch(noteSwallowedAs('push_token_registration:promise_3', false));
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
