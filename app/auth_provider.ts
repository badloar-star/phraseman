// ════════════════════════════════════════════════════════════════════════════
// auth_provider.ts — Регистрация/вход через Google и Apple провайдеры.
//
// Архитектура identity (см. также CLAUDE.md инвариант "Единый идентификатор"):
//   1. stable_id (UUID) — primary key для users/*, leaderboard/*, league_groups/*.
//   2. Firebase Auth uid — анонимный токен для Firestore Rules (request.auth).
//   3. Provider link (Google/Apple) — якорь для восстановления stable_id
//      на новом устройстве. Хранится в auth_links/{providerUid}.
//
// Flow при login:
//   • Native sign-in (Google/Apple) → idToken → signInWithCredential.
//   • Получаем providerUid (sub из id token).
//   • Lookup auth_links/{providerUid}:
//       - есть и stable_id == local: просто update lastSignInAt.
//       - есть и stable_id != local: AUTO-MERGE по XP (выбираем тот у кого XP больше)
//         + swap локального stable_id если нужно + restoreFromCloud.
//       - нет: create auth_links → пишем linkedAuth в users/{stable_id}.
//
// Flow при logout / "Сменить аккаунт":
//   • signOut() — Firebase Auth выходит.
//   • signInWithProvider() — юзер выбирает другой Google/Apple аккаунт.
//   • Дальше та же логика lookup auth_links.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId, setStableId, clearStableId } from './stable_id';
import {
  ensureAnonUser,
  waitForAnonAuth,
  syncToCloud,
  restoreFromCloud,
  forceSyncToCloud,
  quiesceSyncBeforeStableIdSwap,
  wipeLocalAccountData,
  deleteCloudData,
  resetAnonAuthCacheForSignOut,
  ensureStableAuthLinkForStableIdDetailed,
  mergeStableAccountsViaServer,
  saveAccountSwitchEmergencyBackup,
  type StableAuthLinkMetadata,
  type StableAuthLinkEnsureResult,
} from './cloud_sync';
import { invalidatePremiumCache } from './premium_guard';
import { loadShardsFromCloud } from './shards_system';
import { logEvent, recordError } from './firebase';
import { logAppError } from './app_health';
import { emitAppEvent } from './events';
import { unlockedLessonsKey } from './target_storage_keys';
import { ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS } from './account_delete_timeout';

WebBrowser.maybeCompleteAuthSession();

/** Подстрока в `SignInResult.error` при нажатии Apple на Android без EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID. */
export const APPLE_ANDROID_MISSING_SERVICE_ID = 'apple_android_missing_service_id';

function readExpoExtraString(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const v = extra?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function scheduleReferralApplyAfterLink(): void {
  // Referral rewards are retired; keep auth/linking flows from touching the old cloud callables.
}

async function syncRevenueCatAfterAuthLink(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  await import('./revenuecat_init')
    .then((m) => m.initRevenueCat())
    .catch(() => {});
}

/**
 * Ставит на users/{localStableId} короткоживущую метку владения, ПОКА клиент ещё
 * анонимный (до signInWithCredential, который уничтожит анонимную сессию). Сервер
 * пишет метку под проверенным анонимным request.auth.uid. После входа серверный
 * merge поглощает этот локальный анонимный аккаунт только при наличии свежей метки
 * — что безопасно доказывает «то же устройство». Закрывает потерю анонимного
 * прогресса на 2-м устройстве (#11). Best-effort: ошибка не должна ломать вход.
 *
 * NB: вызывается ДО signInWithCredential. На этом этапе auth.currentUser — анонимный
 * пользователь (ensureAnonUser отработал на старте приложения).
 */
async function stampAnonOwnershipBeforeSignIn(localStableId: string): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || !localStableId) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'authStampAnonOwnership');
    await fn({ stableId: localStableId });
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] stampAnonOwnershipBeforeSignIn failed', e);
  }
}

// Премиум при свапе аккаунта НЕ копируется клиентом: это создавало дубль премиума
// (премиум уходящего аккаунта попадал в облако нового) и «вечный» премиум без
// rc_expiry_ms, который крон не гасил. Теперь премиум переносит серверный merge
// (mergeStableAccountsViaServer → mergeUserProgress) от «сильной» по entitlement
// стороны, а RevenueCat App User ID переустанавливается на canonical stable_id,
// поэтому магазин сам пришлёт событие на верный аккаунт.

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthProviderId = 'google' | 'apple';

export interface LinkedAuth {
  provider: AuthProviderId;
  providerUid: string;
  email: string | null;
  displayName: string | null;
  linkedAt: number;
  lastSignInAt: number;
  devicePlatform: 'ios' | 'android' | 'web';
}

export type SignInResult =
  | { result: 'linked_existing'; email: string | null; displayName: string | null }
  | { result: 'created_new'; email: string | null; displayName: string | null }
  | { result: 'merged_devices'; email: string | null; displayName: string | null; mergedFromStableId: string }
  | { result: 'cancelled' }
  | { result: 'error'; error: string };

function emitAuthProviderLinked(): void {
  try {
    emitAppEvent('auth_provider_linked');
  } catch {
    /* UI refresh is best-effort; auth result must still return. */
  }
}

// ── Lazy native modules ───────────────────────────────────────────────────────

const getAuth = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default();
  } catch {
    return null;
  }
};

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

const getGoogleSignin = () => {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
};

const getAppleAuth = () => {
  if (IS_EXPO_GO || Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-apple-authentication');
  } catch {
    return null;
  }
};

/** Services ID (Identifier) из Apple Developer → Sign in with Apple (для web/Android), тот же что в Firebase Auth → Apple. */
function getAppleAndroidServiceId(): string | null {
  const v =
    process.env.EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID?.trim() ||
    readExpoExtraString('EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID');
  return v || null;
}

/** Должен совпадать с Return URL у этого Services ID. По умолчанию — deep link приложения. */
function getAppleAndroidRedirectUri(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI?.trim() ||
    readExpoExtraString('EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI');
  if (fromEnv) return fromEnv;
  return Linking.createURL('apple-auth');
}

function getAppleAndroidAppCallbackUri(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_APPLE_ANDROID_APP_CALLBACK_URI?.trim() ||
    readExpoExtraString('EXPO_PUBLIC_APPLE_ANDROID_APP_CALLBACK_URI');
  if (fromEnv) return fromEnv;
  return Linking.createURL('apple-auth');
}

function parseAppleOAuthRedirectUrl(url: string): { idToken?: string; error?: string; state?: string; userJson?: string } {
  try {
    const hashIdx = url.indexOf('#');
    if (hashIdx >= 0) {
      const frag = new URLSearchParams(url.slice(hashIdx + 1));
      const idToken = frag.get('id_token') ?? undefined;
      const error = frag.get('error') ?? undefined;
      const state = frag.get('state') ?? undefined;
      const userJson = frag.get('user') ?? undefined;
      if (idToken || error || state) return { idToken, error, state, userJson };
    }
    const qIdx = url.indexOf('?');
    if (qIdx >= 0) {
      const q = new URLSearchParams(url.slice(qIdx + 1));
      return {
        idToken: q.get('id_token') ?? undefined,
        error: q.get('error') ?? undefined,
        state: q.get('state') ?? undefined,
        userJson: q.get('user') ?? undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return {};
}

// ── Configuration ─────────────────────────────────────────────────────────────

let _googleConfigured = false;

function configureGoogleSignin(): boolean {
  if (_googleConfigured) return true;
  const mod = getGoogleSignin();
  if (!mod) {
    if (__DEV__) console.warn('[auth_provider] configureGoogleSignin: module not available');
    return false;
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    if (__DEV__) {
      console.warn('[auth_provider] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID не установлен. Google Sign-In не будет работать.');
    }
    return false;
  }
  try {
    mod.GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
    _googleConfigured = true;
    if (__DEV__) console.log('[auth_provider] GoogleSignin configured (webClientId set)');
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] GoogleSignin.configure failed', e);
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Доступен ли Apple Sign-In на текущем устройстве.
 * • iOS: нативный Sign in with Apple (доступность с iOS / симулятор — см. isAvailableAsync).
 * • Android: кнопка видна при облачной сборке; OAuth в Custom Tabs требует
 *   EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID и return URL в Apple Developer (см. getAppleAndroidRedirectUri).
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return false;
  if (Platform.OS === 'ios') {
    const mod = getAppleAuth();
    if (!mod) return false;
    try {
      return await mod.isAvailableAsync();
    } catch {
      return false;
    }
  }
  if (Platform.OS === 'android') {
    return !!getAppleAndroidServiceId();
  }
  return false;
}

/**
 * Доступен ли Google Sign-In на текущем устройстве.
 * Требует EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID и установленный Google Play Services (Android).
 */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  const mod = getGoogleSignin();
  if (!mod) return false;
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) return false;
  if (Platform.OS === 'android') {
    try {
      configureGoogleSignin();
      const has = await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      return !!has;
    } catch {
      return false;
    }
  }
  return true;
}

/** Чтение users/{stableId} не должно блокировать настройки бесконечно при «зависшем» клиенте Firestore. */
const LINKED_AUTH_FIRESTORE_TIMEOUT_MS = 12_000;

/**
 * Пост-транзакционный restore/sync прогресса (полная склейка облака) может быть тяжелее
 * одного link-lookup, поэтому даём ему больше времени — но НЕ бесконечность. Без этого
 * таймаута оборванная сеть сразу после выбора аккаунта вешала весь вход (H-ENTER):
 * await restoreFromCloud/syncToCloud не разрешался → onboarding блокировал даже «Позже».
 */
const SIGNIN_CLOUD_SYNC_TIMEOUT_MS = 20_000;

const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';
const ACCOUNT_DELETE_PENDING_AUTH_TTL_MS = ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS + 60_000;

interface AccountDeletePendingAuthLock {
  providerUid: string;
  stableId: string | null;
  createdAt: number;
  expiresAt: number;
}

function cleanAccountDeleteLockId(raw: string | null | undefined): string | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return v.length > 0 ? v : null;
}

async function markAccountDeletePendingAuth(providerUidRaw: string | null | undefined, stableIdRaw: string | null | undefined): Promise<void> {
  const providerUid = cleanAccountDeleteLockId(providerUidRaw);
  if (!providerUid) return;
  const now = Date.now();
  const lock: AccountDeletePendingAuthLock = {
    providerUid,
    stableId: cleanAccountDeleteLockId(stableIdRaw),
    createdAt: now,
    expiresAt: now + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
  };
  try {
    await AsyncStorage.setItem(ACCOUNT_DELETE_PENDING_AUTH_KEY, JSON.stringify(lock));
    logAuthEvent('auth_account_delete_pending_lock_set', { ttlMs: ACCOUNT_DELETE_PENDING_AUTH_TTL_MS });
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] account delete pending lock set failed', e);
  }
}

async function clearAccountDeletePendingAuth(providerUidRaw?: string | null): Promise<void> {
  try {
    const expectedProviderUid = cleanAccountDeleteLockId(providerUidRaw ?? null);
    if (expectedProviderUid) {
      const raw = await AsyncStorage.getItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AccountDeletePendingAuthLock>;
      if (parsed.providerUid !== expectedProviderUid) return;
    }
    await AsyncStorage.removeItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] account delete pending lock clear failed', e);
  }
}

async function readAccountDeletePendingAuth(providerUidRaw: string): Promise<AccountDeletePendingAuthLock | null> {
  const providerUid = cleanAccountDeleteLockId(providerUidRaw);
  if (!providerUid) return null;
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountDeletePendingAuthLock>;
    const createdAt = Number(parsed.createdAt);
    const expiresAt = Number(parsed.expiresAt);
    if (
      parsed.providerUid !== providerUid ||
      !Number.isFinite(createdAt) ||
      !Number.isFinite(expiresAt)
    ) {
      return null;
    }
    if (expiresAt <= Date.now()) {
      await AsyncStorage.removeItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
      return null;
    }
    return {
      providerUid,
      stableId: cleanAccountDeleteLockId(parsed.stableId ?? null),
      createdAt,
      expiresAt,
    };
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] account delete pending lock read failed', e);
    await AsyncStorage.removeItem(ACCOUNT_DELETE_PENDING_AUTH_KEY).catch(() => {});
    return null;
  }
}

function coerceFirebaseMetaTime(raw: unknown, defaultTime: number): number {
  if (raw == null) return defaultTime;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw);
  const n = Number(s);
  if (Number.isFinite(n) && n > 1e11) return n;
  const d = Date.parse(s);
  if (Number.isFinite(d)) return d;
  return defaultTime;
}

/** Запасной источник, если Firestore медленный/упал: локальная сессия уже знает Google/Apple. */
function getLinkedAuthFromCurrentUser(): LinkedAuth | null {
  const auth = getAuth();
  const u = auth?.currentUser;
  if (!u || u.isAnonymous) return null;
  const providers = u.providerData ?? [];
  let authProv: AuthProviderId | null = null;
  let providerUid = '';
  for (const p of providers) {
    if (p.providerId === 'google.com') {
      authProv = 'google';
      providerUid = p.uid || u.uid;
      break;
    }
    if (p.providerId === 'apple.com') {
      authProv = 'apple';
      providerUid = p.uid || u.uid;
      break;
    }
  }
  if (!authProv || !providerUid) return null;
  const now = Date.now();
  const meta = u.metadata;
  const lastSignInAt = coerceFirebaseMetaTime(meta?.lastSignInTime, now);
  const linkedAt = coerceFirebaseMetaTime(meta?.creationTime, lastSignInAt);
  const devicePlatform: LinkedAuth['devicePlatform'] =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  return {
    provider: authProv,
    providerUid,
    email: u.email ?? null,
    displayName: null,
    linkedAt,
    lastSignInAt,
    devicePlatform,
  };
}

/**
 * Текущая привязка к провайдеру для залогиненного юзера.
 * Returns null если юзер ещё анонимный.
 */
export async function getLinkedAuthInfo(): Promise<LinkedAuth | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  const db = getFirestore();
  if (!db) return null;
  const fromAuth = (): LinkedAuth | null => getLinkedAuthFromCurrentUser();
  try {
    const stableId = await getStableId();
    const doc = await withTimeout<FirebaseFirestoreTypes.DocumentSnapshot>(
      db.collection('users').doc(stableId).get(),
      LINKED_AUTH_FIRESTORE_TIMEOUT_MS,
      'linked_auth_users_doc',
    ).catch((e: unknown) => {
      if (__DEV__) console.warn('[auth_provider] getLinkedAuthInfo Firestore timeout/error -> auth backup', e);
      return null;
    });
    if (doc == null) return fromAuth();
    if (!doc.exists) return fromAuth();
    const linked = doc.data()?.linkedAuth as LinkedAuth | undefined;
    if (linked?.provider) return { ...linked, displayName: null };
    return fromAuth();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] getLinkedAuthInfo failed', e);
    return fromAuth();
  }
}

/**
 * Native sign-in raw output. Internal use only.
 */
interface NativeAuthCredential {
  idToken: string;
  email: string | null;
  displayName: string | null;
  // For Apple: nonce-based credential. For Google: idToken is enough.
  appleNonce?: string;
}

/**
 * Watchdog: native Google sign-in flow ОБЯЗАН вернуть результат за разумное время
 * (тапнул аккаунт в picker\'е → токен максимум за 30 секунд). Если промис висит
 * дольше — это баг native-модуля / битая Activity / отозванный consent с автокансел.
 * Без таймаута UI-loader спинит вечно, кнопка disable\'d, и юзер думает «приложение
 * сломалось» (см. сценарий «после удаления аккаунта залогиниться через Google
 * не получается, ничего не происходит»). Лучше явная ошибка с инструкцией.
 */
const GOOGLE_SIGNIN_TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_${label}_${ms}ms`)), ms);
    p.then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); },
    );
  });
}

async function runGoogleNativeSignIn(): Promise<NativeAuthCredential | { cancelled: true }> {
  if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: start');
  const mod = getGoogleSignin();
  if (!mod) throw new Error('google_signin_module_unavailable');
  if (!configureGoogleSignin()) throw new Error('google_signin_not_configured');

  if (Platform.OS === 'android') {
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: hasPlayServices...');
    try {
      await withTimeout(
        mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }),
        15_000,
        'play_services',
      );
    } catch (e: any) {
      if (__DEV__) console.warn('[auth_provider] hasPlayServices failed', e);
      throw new Error(`play_services_${e?.code ?? e?.message ?? 'unknown'}`);
    }
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: hasPlayServices OK');
  }

  let res: any;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      if (__DEV__) console.log(`[auth_provider] runGoogleNativeSignIn: GoogleSignin.signIn() attempt=${attempt}`);
      res = await withTimeout(mod.GoogleSignin.signIn(), GOOGLE_SIGNIN_TIMEOUT_MS, 'native_signin');
      if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: GoogleSignin.signIn returned', JSON.stringify({
        type: res?.type,
        hasData: !!(res?.data ?? res),
      }));
      break;
    } catch (e: any) {
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5' || e?.code === '12501') {
        if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: cancelled by user (error code)');
        return { cancelled: true };
      }
      const isTimeout = e?.message?.startsWith('timeout_native_signin');
      if (isTimeout && attempt === 0) {
        if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: timeout on attempt 0, signOut + retry');
        try { await mod.GoogleSignin.signOut(); } catch { /* ignore */ }
        continue;
      }
      if (isTimeout) {
        // Второй таймаут подряд — нативный picker завис, лечится повторным тапом.
        if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: timeout on attempt 1, treating as cancelled');
        return { cancelled: true };
      }
      if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: signIn threw', e);
      throw e;
    }
  }

  // v13+ возвращает { type: 'success', data: {...} } / { type: 'cancelled' }; v12 — плоский объект.
  const data = res?.data ?? res;
  if (res?.type === 'cancelled') {
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: cancelled (type field)');
    return { cancelled: true };
  }
  if (!data) {
    if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: no data in response');
    return { cancelled: true };
  }

  const idToken: string | null = data.idToken ?? null;
  if (!idToken) {
    if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: NO ID TOKEN in response. Likely SHA-1 / webClientId mismatch in Firebase console.');
    throw new Error('google_signin_no_id_token');
  }

  const user = data.user ?? data;
  if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: success, email=', user?.email);
  return {
    idToken,
    email: user?.email ?? null,
    displayName: user?.name ?? user?.displayName ?? null,
  };
}

async function runAppleNativeSignIn(): Promise<NativeAuthCredential | { cancelled: true }> {
  const mod = getAppleAuth();
  if (!mod) throw new Error('apple_auth_module_unavailable');

  // Без nonce: меньше расхождений с проверкой JWT в Firebase (nonce mismatch / 17094).
  // Достаточно identityToken для AppleAuthProvider.credential(idToken).
  let credential: any;
  try {
    credential = await mod.signInAsync({
      requestedScopes: [mod.AppleAuthenticationScope.FULL_NAME, mod.AppleAuthenticationScope.EMAIL],
    });
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') {
      return { cancelled: true };
    }
    throw e;
  }

  const idToken: string | null = credential?.identityToken ?? null;
  if (!idToken) throw new Error('apple_signin_no_id_token');

  const fullName = credential?.fullName;
  const display =
    fullName && (fullName.givenName || fullName.familyName)
      ? `${fullName.givenName ?? ''} ${fullName.familyName ?? ''}`.trim() || null
      : null;

  return {
    idToken,
    email: credential?.email ?? null,
    displayName: display,
  };
}

const APPLE_OAUTH_TIMEOUT_MS = 120_000;

/**
 * Sign in with Apple на Android: Apple ID в браузере → id_token в redirect fragment → Firebase.
 * Требует EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID и тот же return URL в Apple Developer + Firebase (Apple provider).
 */
async function runAppleAndroidOAuthSignIn(): Promise<NativeAuthCredential | { cancelled: true }> {
  const serviceId = getAppleAndroidServiceId();
  if (!serviceId) {
    throw new Error(APPLE_ANDROID_MISSING_SERVICE_ID);
  }

  const redirectUri = getAppleAndroidRedirectUri();
  const appCallbackUri = getAppleAndroidAppCallbackUri();
  const rawBytes = await Crypto.getRandomBytesAsync(16);
  const rawNonce = Array.from(rawBytes, b => b.toString(16).padStart(2, '0')).join('');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  const stateBytes = await Crypto.getRandomBytesAsync(16);
  const oauthState = Array.from(stateBytes, b => b.toString(16).padStart(2, '0')).join('');

  const params = new URLSearchParams({
    client_id: serviceId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'name email',
    response_mode: 'fragment',
    state: oauthState,
    nonce: hashedNonce,
  });
  const authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

  const session = await withTimeout(
    WebBrowser.openAuthSessionAsync(authUrl, appCallbackUri),
    APPLE_OAUTH_TIMEOUT_MS,
    'apple_oauth_session',
  );

  if (session.type === 'cancel' || session.type === 'dismiss') {
    return { cancelled: true };
  }
  if (session.type !== 'success' || !session.url) {
    throw new Error(`apple_oauth_${session.type}`);
  }

  const parsed = parseAppleOAuthRedirectUrl(session.url);
  if (parsed.state && parsed.state !== oauthState) {
    throw new Error('apple_oauth_state_mismatch');
  }
  if (parsed.error) {
    const err = parsed.error;
    if (err === 'user_cancelled_authorize' || err === 'access_denied') {
      return { cancelled: true };
    }
    throw new Error(`apple_oauth_${err}`);
  }

  const idToken = parsed.idToken;
  if (!idToken) throw new Error('apple_signin_no_id_token');

  let email: string | null = null;
  let displayName: string | null = null;
  try {
    const parts = idToken.split('.');
    if (parts[1]) {
      const pad = '='.repeat((4 - (parts[1].length % 4)) % 4);
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/') + pad;
      const json = typeof atob === 'function' ? atob(b64) : '';
      const payload = JSON.parse(json) as { email?: string };
      if (typeof payload.email === 'string') email = payload.email;
    }
  } catch {
    /* ignore JWT parse */
  }
  if (parsed.userJson) {
    try {
      const userObj = JSON.parse(decodeURIComponent(parsed.userJson)) as {
        name?: { firstName?: string; lastName?: string };
      };
      const n = userObj?.name;
      if (n && (n.firstName || n.lastName)) {
        displayName = `${n.firstName ?? ''} ${n.lastName ?? ''}`.trim() || null;
      }
    } catch {
      /* ignore */
    }
  }

  return {
    idToken,
    email,
    displayName,
    appleNonce: rawNonce,
  };
}

/** Crashlytics: прод-диагностика sign-in без logcat */
// Внешние/ожидаемые сбои входа — НЕ баги кода: нет сети, юзер закрыл окно
// Google/Apple, проблема Google Play Services, таймаут сервера, выключенный
// cloud-sync. Их шлём как 'warning' (остаются в Crashlytics, но НЕ как Critical-
// алерт в App Health/Telegram). Реальные баги логики (auth_link/transaction/swap)
// остаются 'critical'.
const EXPECTED_AUTH_FAILURE_STAGES = new Set(['native', 'firebase', 'config']);

function captureAuthSignInFailure(provider: AuthProviderId, stage: string, detail: string): void {
  try {
    const d = detail.replace(/\s+/g, ' ').slice(0, 280);
    recordError(new Error(`auth_signin:${provider}:${stage}:${d}`), 'auth_signin');
    const severity = EXPECTED_AUTH_FAILURE_STAGES.has(stage) ? 'warning' : 'critical';
    void logAppError('auth:signin_failure', new Error(d), {
      feature: 'auth',
      severity,
      writeToFirestore: severity === 'critical',
      tags: { provider, stage },
    });
  } catch {
    /* ignore */
  }
}

/**
 * Главная точка входа: запустить native sign-in flow + связать с stable_id.
 * Возвращает один из SignInResult вариантов.
 */
export async function signInWithProvider(provider: AuthProviderId): Promise<SignInResult> {
  if (__DEV__) console.log(`[auth_provider] signInWithProvider(${provider}): start`);
  if (!CLOUD_SYNC_ENABLED) {
    if (__DEV__) console.warn('[auth_provider] signInWithProvider: CLOUD_SYNC_ENABLED=false');
    captureAuthSignInFailure(provider, 'config', 'cloud_sync_disabled');
    return { result: 'error', error: 'cloud_sync_disabled' };
  }
  const auth = getAuth();
  const db = getFirestore();
  if (!auth || !db) {
    if (__DEV__) console.warn('[auth_provider] signInWithProvider: firebase unavailable', { auth: !!auth, db: !!db });
    captureAuthSignInFailure(provider, 'config', 'firebase_unavailable');
    return { result: 'error', error: 'firebase_unavailable' };
  }

  // 1. Native / OAuth sign-in
  let cred: NativeAuthCredential | { cancelled: true };
  try {
    if (provider === 'google') {
      cred = await runGoogleNativeSignIn();
    } else if (Platform.OS === 'android') {
      cred = await runAppleAndroidOAuthSignIn();
    } else {
      cred = await runAppleNativeSignIn();
    }
  } catch (e: any) {
    if (__DEV__) console.warn('[auth_provider] native sign-in failed', e);
    const code = e?.code ? String(e.code) : '';
    const msg = e?.message ? String(e.message) : 'unknown';
    const detail = code ? `${code}:${msg}` : msg;
    logAuthEvent('auth_signin_error', { provider, stage: 'native', error: detail.slice(0, 80) });
    const errStr = `native_${detail}`.slice(0, 120);
    if (errStr.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
      return { result: 'error', error: errStr };
    }
    captureAuthSignInFailure(provider, 'native', errStr);
    return { result: 'error', error: errStr };
  }
  if ('cancelled' in cred) {
    logAuthEvent('auth_signin_cancelled', { provider });
    return { result: 'cancelled' };
  }

  // 1a. Хвост A (холодный старт Android): дождаться готовности анонимной Firebase-сессии
  // ДО линковки. Без этого на холодном старте auth.currentUser ещё null → linkWithCredential
  // невозможен (uid не сохранится), а ensureStableAuthLink падал «local_stable_link_failed».
  // waitForAnonAuth поллит до 20с; если так и не поднялась — продолжаем (ниже всё равно
  // есть деградация к signInWithCredential), но в типичном случае это закрывает гонку.
  try {
    const anonReady = await waitForAnonAuth(20_000);
    if (!anonReady) {
      // Явно пробуем поднять анонимную сессию, прежде чем входить.
      await ensureAnonUser();
      await waitForAnonAuth(5_000);
    }
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] waitForAnonAuth before link failed', e);
  }

  // 1b. ДО входа (пока ещё анонимны) ставим метку владения локальным анонимным
  // аккаунтом — иначе серверный merge не сможет безопасно поглотить его, если вход
  // всё же пойдёт по ветке signInWithCredential (анонимная сессия будет уничтожена). См. #11.
  const preSignInStableId = await getStableId();
  await stampAnonOwnershipBeforeSignIn(preSignInStableId);

  // 2. Связать credential с аккаунтом через Firebase.
  //
  // КОРЕНЬ потери привязки (исправление 2026-06-29): раньше тут безусловно звался
  // auth.signInWithCredential(credential). Этот метод УНИЧТОЖАЕТ текущую анонимную
  // сессию и переключает на отдельный provider-uid — то есть каждый вход Google/Apple
  // делал пользователя «новым» с точки зрения Firebase, а stable_id/auth_links/серверный
  // merge были компенсацией за разорванную связь. Firebase прямо требует обратного:
  // для апгрейда анонима — currentUser.linkWithCredential(credential), который СОХРАНЯЕТ
  // тот же uid (и все данные под ним). См. firebase.google.com/docs/auth/*/account-linking.
  //
  // Стратегия: если currentUser анонимный — сначала linkWithCredential (uid не меняется,
  // привязка не рвётся). Если у этого Google/Apple уже есть отдельный аккаунт
  // (auth/credential-already-in-use) или линк невозможен — деградируем к
  // signInWithCredential (прежнее поведение); серверный merge по auth_links/anon_merge_claim
  // доберёт остальное. Контракт и обработка ошибок сохранены 1:1.
  // (далее по тексту «degrade to sign-in» = именно этот безопасный путь деградации.)
  let firebaseProviderUid: string;
  let firebaseEmail: string | null = cred.email;
  let linkedInPlace = false; // true → анонимный uid сохранён (link), merge не нужен
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authMod = require('@react-native-firebase/auth');
    const credential =
      provider === 'google'
        ? authMod.default.GoogleAuthProvider.credential(cred.idToken)
        : cred.appleNonce
          ? authMod.default.AppleAuthProvider.credential(cred.idToken, cred.appleNonce)
          : authMod.default.AppleAuthProvider.credential(cred.idToken);

    const anonUser = auth.currentUser;
    const canTryLink = Boolean(anonUser?.isAnonymous && typeof anonUser?.linkWithCredential === 'function');

    let userCredential: any = null;
    if (canTryLink) {
      try {
        userCredential = await withTimeout<any>(
          anonUser.linkWithCredential(credential),
          LINKED_AUTH_FIRESTORE_TIMEOUT_MS,
          'link_credential',
        );
        linkedInPlace = true;
        logAuthEvent('auth_signin_linked_in_place', { provider });
      } catch (linkErr: any) {
        const linkCode = String(linkErr?.code ?? '');
        // Эти коды = «у этого провайдера уже есть отдельный аккаунт» либо «линк уже есть» —
        // нормальная развилка, не баг: деградируем к signInWithCredential + серверный merge.
        const EXPECTED_LINK_CONFLICT = new Set([
          'auth/credential-already-in-use',
          'auth/email-already-in-use',
          'auth/provider-already-linked',
          'auth/account-exists-with-different-credential',
        ]);
        if (!EXPECTED_LINK_CONFLICT.has(linkCode)) {
          // Неожиданная ошибка линковки — логируем, но всё равно пробуем sign-in,
          // чтобы не рвать вход (поведение не хуже прежнего безусловного sign-in).
          if (__DEV__) console.warn('[auth_provider] linkWithCredential unexpected error → degrade to signIn', linkErr);
          logAuthEvent('auth_signin_link_degraded', { provider, error: linkCode.slice(0, 60) || 'unknown' });
        }
        // Apple: при конфликте credential может быть одноразовым — у нас всё равно есть
        // свежий credential из этого же sign-in, переиспользуем его для signInWithCredential.
        userCredential = await withTimeout<any>(
          auth.signInWithCredential(credential),
          LINKED_AUTH_FIRESTORE_TIMEOUT_MS,
          'signin_credential',
        );
      }
    } else {
      userCredential = await withTimeout<any>(
        auth.signInWithCredential(credential),
        LINKED_AUTH_FIRESTORE_TIMEOUT_MS,
        'signin_credential',
      );
    }

    const fbUser = userCredential?.user ?? auth.currentUser;
    firebaseProviderUid = fbUser?.uid ?? '';
    if (!firebaseEmail) firebaseEmail = fbUser?.email ?? null;
    if (!firebaseProviderUid) throw new Error('firebase_no_uid');
  } catch (e: any) {
    if (__DEV__) console.warn('[auth_provider] firebase sign-in/link failed', e);
    const code = e?.code ? String(e.code) : '';
    const msg = e?.message ? String(e.message) : 'unknown';
    const detail = code ? `${code}:${msg}` : msg;
    logAuthEvent('auth_signin_error', { provider, stage: 'firebase', error: detail.slice(0, 80) });
    const errStr = `firebase_${detail}`.slice(0, 120);
    captureAuthSignInFailure(provider, 'firebase', errStr);
    return { result: 'error', error: errStr };
  }

  const pendingDelete = await readAccountDeletePendingAuth(firebaseProviderUid);
  if (pendingDelete) {
    const ageMs = Math.max(0, Date.now() - pendingDelete.createdAt);
    logAuthEvent('auth_signin_blocked_account_delete_pending', { provider, ageMs });
    try {
      await signOutCurrentProvider();
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] account-delete-pending signOut failed', e);
      try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
    }
    try {
      await ensureAnonUser();
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] account-delete-pending ensureAnonUser failed', e);
    }
    return { result: 'error', error: 'account_delete_pending' };
  }

  // 3. Lookup auth_links → link OR auto-merge by XP
  const localStableId = await getStableId();
  const now = Date.now();
  const devicePlatform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const providerDisplayName: string | null = null;

  const linkRef = db.collection('auth_links').doc(firebaseProviderUid);

  let remoteStableId: string | null = null;
  let linkLookupCompleted = false;
  let linkLookupFound = false;
  try {
    const linkSnap = await withTimeout<any>(linkRef.get(), LINKED_AUTH_FIRESTORE_TIMEOUT_MS, 'link_lookup');
    linkLookupCompleted = true;
    linkLookupFound = Boolean(linkSnap.exists);
    const linkedStableId = linkSnap.exists ? linkSnap.data()?.stable_id : null;
    if (typeof linkedStableId === 'string' && linkedStableId.trim() && linkedStableId !== localStableId) {
      remoteStableId = linkedStableId.trim();
    }
  } catch {
    remoteStableId = null;
  }

  type Outcome =
    | { kind: 'linked_existing' }
    | { kind: 'created_new' }
    | { kind: 'merged_keep_local'; mergedFromStableId: string }
    | { kind: 'merged_swap_to_remote'; remoteStableId: string; mergedFromStableId: string };

  let outcome: Outcome;
  const authLinkMetadata: StableAuthLinkMetadata = {
    provider,
    email: firebaseEmail,
    displayName: providerDisplayName,
    lastSignInAt: now,
    devicePlatform,
  };

  // Стадия auth_link часто падала «local_stable_link_failed» на ХОЛОДНОМ старте
  // Android: anon-auth/сеть/App Check ещё не поднялись, waitForFirebaseAuthUid
  // (≈1.4с) истекает → ensureStableAuthLinkForStableId возвращает false → весь
  // вход прерывался с Critical-алертом. Операция идемпотентна и самолечится —
  // не сдаёмся с первой попытки, ретраим с нарастающей паузой.
  const ensureStableAuthLinkWithRetry = async (stableId: string): Promise<StableAuthLinkEnsureResult | null> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await ensureStableAuthLinkForStableIdDetailed(stableId, authLinkMetadata);
      if (result.ok && result.stableUid) return result;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
    return null;
  };

  if (remoteStableId) {
    // Provider is already linked to another stable_id. This is the normal
    // returning-user/new-device path. Do not try to relink the local anonymous
    // stable_id first: authEnsureStableLink correctly rejects that as
    // stable_id_mismatch because auth_links/{providerUid} points to remoteStableId.
    const linkedRemote = await ensureStableAuthLinkWithRetry(remoteStableId);
    if (!linkedRemote?.stableUid) {
      captureAuthSignInFailure(provider, 'auth_link', 'remote_stable_link_failed');
      return { result: 'error', error: 'auth_link_failed' };
    }
    outcome = {
      kind: 'merged_swap_to_remote',
      remoteStableId: linkedRemote.stableUid,
      mergedFromStableId: localStableId,
    };
  } else {
    const linkedLocal = await ensureStableAuthLinkWithRetry(localStableId);
    if (!linkedLocal?.stableUid) {
      captureAuthSignInFailure(provider, 'auth_link', 'local_stable_link_failed');
      return { result: 'error', error: 'auth_link_failed' };
    }
    if (linkedLocal.stableUid !== localStableId) {
      outcome = {
        kind: 'merged_swap_to_remote',
        remoteStableId: linkedLocal.stableUid,
        mergedFromStableId: localStableId,
      };
    } else {
      // source === 'firestore_fallback' раньше РВАЛО вход ('auth_link_unverified' +
      // Critical-алерт). Но этот источник = серверный callable был недоступен, поэтому
      // клиент САМ записал якорь users/{stableId}.firebaseAuthUid И мост
      // auth_links/{authUid} напрямую в Firestore (cloud_sync.ts, «Хвост B»). Привязка
      // ФАКТИЧЕСКИ сделана — это деградация транспорта, а не провал входа. Пользователь
      // видел «Не получилось войти», хотя всё записано. Теперь: не рвём вход, логируем
      // warning-событие (без ложного Critical) и идём обычным путём
      // created_new/linked_existing.
      if (linkedLocal.source === 'firestore_fallback') {
        if (__DEV__) console.warn('[auth_provider] stable link via direct Firestore write (callable unavailable) — continuing sign-in');
        logAuthEvent('auth_signin_link_direct_write', { provider, stage: 'auth_link' });
      }
      outcome = {
        kind: linkLookupCompleted && !linkLookupFound ? 'created_new' : 'linked_existing',
      };
    }
  }

  // 4. Post-link: handle stable_id swap if needed
  if (outcome.kind === 'merged_swap_to_remote') {
    try {
      // Сразу синкаем текущий локальный прогресс в облако
      // (на случай если local чуть-чуть свежее — после swap данные не пропадут).
      // syncToCloud у нас пишет в users/{currentLocalStableId} — это корректно ДО swap.
      // Здесь нельзя оставлять обычный debounce: дальше мы меняем stable_id и чистим локальные
      // progress-ключи, поэтому свежий локальный прогресс должен быть отправлен прямо сейчас.
      await withTimeout(syncToCloud({ forceNow: true }), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_presync');

      // СЛИЯНИЕ НА СЕРВЕРЕ (Admin SDK, best-of-field). Заменяет старую клиентскую
      // склейку, которая (а) теряла прогресс проигравшей стороны и (б) копировала
      // локальный премиум на чужой аккаунт (дубль). Сервер сливает progress/shards
      // корректно и переносит премиум-блок целиком от «сильной» стороны.
      //
      // Merge удаётся, только когда сервер может доказать владение ОБОИМИ аккаунтами
      // (XP-merge ветка: и local, и remote привязаны к этому auth uid). В ветке
      // «провайдер уже привязан к remote» (returning user / новое устройство) локальный
      // анонимный аккаунт НЕ принадлежит новому uid — merge тогда вернёт null. Это НЕ
      // ошибка: деградируем до простого свапа на remote (прежнее поведение), а не рвём
      // вход. canonicalStableId = победитель слияния, иначе сам remote.
      const merge = await mergeStableAccountsViaServer(outcome.mergedFromStableId, outcome.remoteStableId);
      const canonicalStableId = merge?.ok && merge.canonicalStableId
        ? merge.canonicalStableId
        : outcome.remoteStableId;

      // Хвост D: погасить фоновый/отложенный sync ДО смены stable_id, иначе debounce-sync
      // со старым прогрессом запишется в users/{новый canonical} и затрёт слитый аккаунт.
      await quiesceSyncBeforeStableIdSwap();

      // Подменяем stable_id локально на канонический результат (слияние или remote).
      await setStableId(canonicalStableId);

      // Премиум-кэш (premium_guard, TTL 5 мин) держит решение ПРЕДЫДУЩЕГО аккаунта.
      // Без сброса до 5 минут после свапа в UI виден чужой премиум-статус.
      invalidatePremiumCache();

      // Чистим локальные account/progress-ключи, чтобы restoreFromCloud записал данные нового аккаунта.
      // wipeLocalAccountData() держит единый список cloud + local-only target buckets (lesson runtime,
      // daily task session, flashcards marketplace/cache state) для English legacy и French.
      await wipeLocalAccountData();

      // Гарантируем Firebase Auth state ready (после signInWithCredential anon → google)
      await ensureAnonUser();

      // stable_id уже поменялся: RevenueCat должен смотреть на новый canonical id
      // до того, как PremiumContext перечитает entitlement.
      await syncRevenueCatAfterAuthLink();

      // Тащим прогресс с canonical stable_id
      await withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_restore');

      // КРИТИЧНО: шарды лежат в users/{uid}.shards (отдельно от SYNC_KEYS),
      // и после свапа stable_id локальный баланс соответствует СТАРОМУ аккаунту.
      // Без этого вызова первый же addShards/spendShards перезапишет правильный
      // облачный баланс мусором с прежнего stable_id.
      await loadShardsFromCloud().catch(() => {});

      // Если в облаке тоже автоген/пусто — попробуем дать человеческий ник из Google.
      await markOnboardedAfterSignIn();

      logAuthEvent('auth_signin_merged', {
        provider,
        from: outcome.mergedFromStableId.slice(0, 8),
        to: canonicalStableId.slice(0, 8),
      });
      scheduleReferralApplyAfterLink();
      emitAuthProviderLinked();
      return {
        result: 'merged_devices',
        email: firebaseEmail,
        displayName: providerDisplayName,
        mergedFromStableId: outcome.mergedFromStableId,
      };
    } catch (e: any) {
      if (__DEV__) console.warn('[auth_provider] post-merge swap failed', e);
      logAuthEvent('auth_signin_error', { provider, stage: 'swap', error: String(e?.message ?? e).slice(0, 80) });
      const errStr = `swap_${e?.message ?? 'unknown'}`.slice(0, 80);
      captureAuthSignInFailure(provider, 'swap', errStr);
      return { result: 'error', error: errStr };
    }
  }

  if (outcome.kind === 'merged_keep_local') {
    // Local выиграл по XP/владению. РАНЬШЕ тут НЕ звался серверный merge (только в
    // merged_swap_to_remote) → premium/VIP/admin-grant/intro из REMOTE-аккаунта молча
    // терялись: store-премиум спасал RC restore, но VIP-реферал/админ-грант (живут
    // только в Firestore progress) пропадали (аудит платёжки 2026-06-21, P1).
    // Зовём серверный merge (remote → local): Admin SDK сольёт прогресс best-of-field
    // и перенесёт премиум/VIP-блок от «сильной» стороны в canonical. Если remote чужой
    // (нет свежего anon_merge_claim) — сервер вернёт null, деградируем к прежнему
    // поведению (просто local), вход не рвём.
    try {
      const localStableId = await getStableId();
      const merge = await mergeStableAccountsViaServer(outcome.mergedFromStableId, localStableId);
      const canonicalStableId = merge?.ok && merge.canonicalStableId ? merge.canonicalStableId : localStableId;
      if (merge?.ok && canonicalStableId !== localStableId) {
        // Сервер выбрал canonical ≠ local (remote оказался сильнее и принадлежит нам):
        // подменяем stable_id и тянем слитый прогресс, как в swap-ветке.
        // Хвост D: гасим фоновый sync перед сменой stable_id (см. swap-ветку выше).
        await quiesceSyncBeforeStableIdSwap();
        await setStableId(canonicalStableId);
        invalidatePremiumCache();
        await wipeLocalAccountData();
        await ensureAnonUser();
        await syncRevenueCatAfterAuthLink();
        await withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'keeplocal_restore');
        await loadShardsFromCloud().catch(() => {});
      } else if (merge?.ok) {
        // canonical == local: премиум/VIP-блок remote слит в наш local-док сервером.
        // Инвалидируем кэш и тянем слитое состояние в AsyncStorage (иначе VIP не виден).
        invalidatePremiumCache();
        await withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'keeplocal_restore_same').catch(() => {});
      }
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] merged_keep_local server-merge failed', e);
      // Не валим вход — деградируем к прежнему поведению ниже.
    }
    // Local выиграл → попробуем подставить человеческий ник из Google если локальный — автоген,
    // ПОТОМ синкаем (чтобы новый ник тоже ушёл в облако одним пакетом).
    await markOnboardedAfterSignIn();
    await syncRevenueCatAfterAuthLink();
    syncToCloud().catch(() => {});
    logAuthEvent('auth_signin_merged_keep_local', {
      provider,
      replaced: outcome.mergedFromStableId.slice(0, 8),
    });
    scheduleReferralApplyAfterLink();
    emitAuthProviderLinked();
    return {
      result: 'merged_devices',
      email: firebaseEmail,
      displayName: providerDisplayName,
      mergedFromStableId: outcome.mergedFromStableId,
    };
  }

  if (outcome.kind === 'linked_existing') {
    // КРИТИЧЕСКИ ВАЖНО: после переустановки приложения с allowBackup=true Keychain
    // восстанавливает stable_id, а локальный AsyncStorage пустой. Если сразу вызвать
    // syncToCloud — он перезапишет users/{stable_id}.progress null\'ами и затрёт прогресс.
    // Поэтому сначала тащим cloud → local. Если local имеет существенный прогресс —
    // тогда можно sync. Иначе — пропускаем sync, чтобы не пере-затереть облако null\'ами.
    try {
      await withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'linked_restore');
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] linked_existing restoreFromCloud failed', e);
    }
    // Шарды отдельным каналом (users/{uid}.shards): подтягиваем под актуальный stable_id.
    await loadShardsFromCloud().catch(() => {});
    // Если в облаке/локально оказался автоген — попробуем подставить displayName из Google.
    await markOnboardedAfterSignIn();
    await syncRevenueCatAfterAuthLink();
    if (await hasMeaningfulLocalProgress()) {
      syncToCloud().catch(() => {});
    } else if (__DEV__) {
      console.warn('[auth_provider] linked_existing: skipping syncToCloud — local AsyncStorage пустой, cloud не перезаписываем');
    }
    logAuthEvent('auth_signin_linked', { provider });
    scheduleReferralApplyAfterLink();
    emitAuthProviderLinked();
    return { result: 'linked_existing', email: firebaseEmail, displayName: providerDisplayName };
  }

  // outcome.kind === 'created_new'
  // Тот же подход: сначала restore, потом sync только если local не пустой.
  try {
    await withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'created_restore');
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] created_new restoreFromCloud failed', e);
  }
  // Шарды: для нового аккаунта в облаке их ещё нет — функция просто вернётся,
  // но лучше явный вызов для симметрии и на случай pre-seeding из бэкенда.
  await loadShardsFromCloud().catch(() => {});
  await markOnboardedAfterSignIn();
  await syncRevenueCatAfterAuthLink();
  if (await hasMeaningfulLocalProgress()) {
    syncToCloud().catch(() => {});
  } else if (__DEV__) {
    console.warn('[auth_provider] created_new: skipping syncToCloud — local AsyncStorage пустой');
  }
  logAuthEvent('auth_signin_created', { provider });
  scheduleReferralApplyAfterLink();
  emitAuthProviderLinked();
  return { result: 'created_new', email: firebaseEmail, displayName: providerDisplayName };
}

async function markOnboardedAfterSignIn(): Promise<void> {
  try {
    const userName = (await AsyncStorage.getItem('user_name'))?.trim();
    if (!userName) return;
    const cur = await AsyncStorage.getItem('onboarding_done');
    if (cur !== '1') {
      await AsyncStorage.setItem('onboarding_done', '1');
    }
  } catch {
    /* ignore */
  }
}

async function hasMeaningfulLocalProgress(): Promise<boolean> {
  try {
    const [[, xp], [, streak], [, englishLessons], [, frenchLessons], [, name]] = await AsyncStorage.multiGet([
      'user_total_xp',
      'streak_count',
      unlockedLessonsKey('en'),
      unlockedLessonsKey('fr'),
      'user_name',
    ]);
    if (xp && parseInt(xp, 10) > 0) return true;
    if (streak && parseInt(streak, 10) > 0) return true;
    for (const lessons of [englishLessons, frenchLessons]) {
      if (!lessons) continue;
      try {
        const arr = JSON.parse(lessons);
        if (Array.isArray(arr) && arr.length > 0) return true;
      } catch { /* ignore parse errors */ }
    }
    if (name && name.trim().length > 0) return true;
    return false;
  } catch {
    // При ошибке чтения AsyncStorage лучше быть безопасным — не пушить.
    return false;
  }
}

/**
 * Полный flow "Сменить аккаунт" по схеме Variant 2 (clean device on switch).
 *
 * Шаги:
 *   1. forceSyncToCloud() — пробуем записать текущий прогресс в users/{stable_id}.
 *      Если нет интернета / Firestore недоступен — сохраняем аварийную локальную копию и продолжаем switch.
 *   2. signOutCurrentProvider() — Google revoke + Firebase Auth signOut.
 *   3. wipeLocalAccountData() — стираем все account-level ключи AsyncStorage.
 *      Сохраняем только device-level настройки (язык интерфейса, тема, шрифт).
 *   4. clearStableId() — стираем UUID из SecureStore + AsyncStorage + памяти.
 *   5. ensureAnonUser() — создаст новую анонимную Firebase Auth сессию,
 *      а getStableId() при следующем вызове сгенерит свежий UUID.
 *
 * Результат: устройство в чистом "первый запуск" состоянии. Юзер может
 * выбрать другой Google/Apple — в логике signInWithProvider он попадёт
 * в ветку 'created_new' (если новый аккаунт) или 'merged_swap_to_remote'
 * (если у нового аккаунта есть прогресс — он подтянется через restoreFromCloud).
 *
 * Гарантия: текущий прогресс никогда не "перетекает" на чужой Google,
 * а старый аккаунт остаётся целым в облаке (доступен по любому устройству
 * через свой Google).
 */
export type SignOutSwitchResult =
  | { ok: true; synced: boolean }
  | { ok: false; reason: 'unknown'; detail?: string };

export async function signOutAndWipeForAccountSwitch(): Promise<SignOutSwitchResult> {
  if (!CLOUD_SYNC_ENABLED) {
    // В Expo Go / без облака просто чистим локально — ничего терять не можем.
    try {
      await wipeLocalAccountData();
      await clearStableId();
      logAuthEvent('auth_signout_wipe', { mode: 'no_cloud' });
      return { ok: true, synced: true };
    } catch (e: any) {
      return { ok: false, reason: 'unknown', detail: String(e?.message ?? e).slice(0, 80) };
    }
  }
  try {
    // 1. Гарантируем что весь локальный прогресс ушёл в облако.
    const synced = await forceSyncToCloud();
    if (!synced) {
      logAuthEvent('auth_signout_wipe_sync_failed_continue', { stage: 'sync' });
      await saveAccountSwitchEmergencyBackup('force_sync_failed_before_account_switch');
    }
    // 2. Выходим из Google и Firebase Auth.
    await signOutCurrentProvider();
    // 3. Сносим локальный прогресс.
    await wipeLocalAccountData();
    // 4. Сносим stable_id (новый сгенерируется в ensureAnonUser ниже).
    await clearStableId();
    // 5. Поднимаем чистую анонимную Firebase сессию + новый stable_id.
    await ensureAnonUser();
    logAuthEvent('auth_signout_wipe', { mode: 'switch' });
    return { ok: true, synced };
  } catch (e: any) {
    if (__DEV__) console.warn('[auth_provider] signOutAndWipeForAccountSwitch failed', e);
    logAuthEvent('auth_signout_wipe_failed', { stage: 'unknown', error: String(e?.message ?? e).slice(0, 80) });
    return { ok: false, reason: 'unknown', detail: String(e?.message ?? e).slice(0, 80) };
  }
}

/**
 * Полный flow "Удалить аккаунт".
 *
 * Чем отличается от signOutAndWipeForAccountSwitch:
 *   • не делает forceSyncToCloud (мы не сохраняем прогресс — мы его удаляем).
 *   • явно сносит users/{stable_id} + leaderboard entry на сервере.
 *   • явно сбрасывает stable_id во ВСЕХ слоях (Keychain/SecureStore + AsyncStorage
 *     + in-memory cache) — без этого следующий getStableId() возвращал старый UUID,
 *     auth_links/{providerUid} продолжал указывать на тот UUID и логин через
 *     Google после удаления аккаунта вис в "loading" навсегда.
 *
 * Шаги:
 *   1. deleteCloudData() calls accountDeleteMine on the backend. The Cloud Function
 *      removes users/{stable_id}, subcollections, public/social docs, indexes,
 *      auth_links, analytics/error records and the Firebase Auth user.
 *   2. Это удаление запускается, но НЕ ожидается синхронно: ждать ответа сервера
 *      нельзя — раньше при медленном/упавшем бэкенде Google-вход после удаления
 *      висел в "loading" навсегда. Поэтому локальный wipe идёт сразу, а серверное
 *      удаление продолжается в фоне; его исход логируется событиями
 *      auth_account_delete_cloud_late_success / _failed (по ним сервер дочищает
 *      «зависшие» удаления). Возвращаемый cloudDeleted всегда false — фон ещё идёт,
 *      мы не утверждаем, что облако уже стёрто.
 *   3. wipeLocalAccountData() + AsyncStorage.clear() remove local cache.
 *   4. clearStableId() removes the UUID from SecureStore + AsyncStorage + memory.
 *   5. ensureAnonUser() creates a clean anonymous session with a new stable_id.
 *
 * После этого вход через Google = поведение "первый запуск на новом устройстве":
 * созданный ранее auth_links/{providerUid} будет починен (см. signInWithProvider).
 */
export type DeleteAccountResult =
  | { ok: true; cloudDeleted: boolean }
  | { ok: false; reason: string };

export async function deleteAccountAndWipe(): Promise<DeleteAccountResult> {
  const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;
  const pendingDeleteStableId = await getStableId().catch(() => null);
  const cloudDeletePromise = deleteCloudData();
  void cloudDeletePromise
    .then(() => logAuthEvent('auth_account_delete_cloud_late_success'))
    .catch((e) => {
      if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: server delete failed in background', e);
      logAuthEvent('auth_account_delete_cloud_late_failed');
    });

  // The server-side callable deletes Firestore data, linked auth records and the
  // Firebase Auth user. It runs in the background; local state is removed
  // immediately so the user is not left trapped in the same account.
  try {
    await signOutCurrentProvider();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: signOut failed', e);
    try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
  }

  // 3. Сносим локальный прогресс (account-level ключи).
  try {
    await wipeLocalAccountData();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: wipe failed', e);
  }
  // 4. На всякий случай добиваем AsyncStorage.clear() (чтобы не осталось
  //    мелких ключей, не входящих в SYNC_KEYS).
  try {
    await AsyncStorage.clear();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: AsyncStorage.clear failed', e);
  }

  // 5. Сносим stable_id во всех слоях. КРИТИЧНО: без этого на следующем входе
  //    через Google getStableId() вернёт КЭШИРОВАННЫЙ старый UUID, и весь flow
  //    залипнет (см. шапку функции).
  try {
    await clearStableId();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: clearStableId failed', e);
  }
  await markAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId);
  void cloudDeletePromise
    .then(() => clearAccountDeletePendingAuth(pendingDeleteProviderUid))
    .catch(() => {});

  // 6. Поднимаем чистую анонимную Firebase сессию + сгенерится новый stable_id
  //    при первом getStableId(). ensureAnonUser в конце — best-effort, не валим
  //    весь flow если нет сети.
  if (CLOUD_SYNC_ENABLED) {
    try {
      try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
      await ensureAnonUser();
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: ensureAnonUser failed', e);
    }
  }

  logAuthEvent('auth_account_deleted', { cloudDeleted: 0 });
  return { ok: true, cloudDeleted: false };
}

/**
 * Выход из Firebase Auth (без удаления аккаунта).
 * stable_id и progress сохраняются. Re-login через signInWithProvider подтянет linkedAuth.
 *
 * @deprecated для UI flow "Сменить аккаунт" — используй signOutAndWipeForAccountSwitch().
 * Эта функция оставлена для совместимости с тестовыми кнопками и редкими случаями
 * когда нужен ТОЛЬКО Firebase signOut без очистки прогресса.
 */
export async function signOutCurrentProvider(): Promise<void> {
  if (__DEV__) console.log('[auth_provider] signOutCurrentProvider: start');
  // Сбрасываем PostHog-идентичность, чтобы события следующего юзера не приписались прошлому
  // (no-op, если PostHog выключен).
  void import('./posthog_client').then(({ resetPostHog }) => resetPostHog()).catch(() => {});
  if (!CLOUD_SYNC_ENABLED) return;
  // Google: revoke session чтобы при следующем signIn показался picker аккаунтов
  try {
    const g = getGoogleSignin();
    if (g) {
      configureGoogleSignin();
      try { await g.GoogleSignin.signOut(); } catch (e) {
        if (__DEV__) console.warn('[auth_provider] google signOut threw', e);
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] google signOut failed', e);
  }
  // Сбрасываем JS-флаг "конфигурация выполнена". Это страховка: если internal
  // state native-модуля как-то поедет (револизация consent, очистка кеша Play
  // Services и т.д.), следующий runGoogleNativeSignIn() заново вызовет configure()
  // и не повиснет на пустом native picker\'е.
  _googleConfigured = false;
  // Firebase Auth signOut — после этого ensureAnonUser() при следующем sync создаст
  // новую анонимную сессию (либо подхватится из linkedAuth при signIn).
  try {
    const auth = getAuth();
    if (auth?.currentUser) {
      await auth.signOut();
    }
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] firebase signOut failed', e);
  }
  // КРИТИЧНО: сбросить кеш _anonAuthReady в cloud_sync. Без этого следующий
  // ensureAnonUser() сразу возвращает старый resolved Promise, и signInAnonymously
  // никогда не вызывается заново — а currentUser уже null. Любые последующие
  // Firestore writes падают с PERMISSION_DENIED до перезапуска приложения.
  try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
  logAuthEvent('auth_signout');
}

// ── Storage keys ──────────────────────────────────────────────────────────────

/** Ключ AsyncStorage для отметки что регистрационная модалка после урока 1 уже показана. */
export const AUTH_PROMPT_SHOWN_KEY = 'auth_prompt_shown_v1';

/** Ключ AsyncStorage для отметки что онбординг-шаг с auth уже пройден (skip или sign-in). */
export const AUTH_ONBOARDING_DONE_KEY = 'auth_onboarding_done_v1';

// ── Helpers (used in Phase 3) ─────────────────────────────────────────────────

/** Sanity check + telemetry. */
export function logAuthEvent(name: string, params?: Record<string, string | number>) {
  try {
    logEvent(name, params);
  } catch {
    // ignore
  }
}

// Re-exports чтобы Phase 3 / 4 могли в одном импорте получить всё.
export { getStableId, setStableId, ensureAnonUser, syncToCloud, restoreFromCloud };

// Required by Expo Router — not a screen
export default {};
