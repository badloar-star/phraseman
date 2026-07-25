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
  syncToCloud,
  restoreFromCloud,
  restoreFromCloudDetailed,
  forceSyncToCloud,
  quiesceSyncBeforeStableIdSwap,
  quiesceCloudSyncForAccountTransition,
  wipeLocalAccountData,
  startCloudDeletionEnqueue,
  resetAnonAuthCacheForSignOut,
  ensureStableAuthLinkForStableIdDetailed,
  mergeStableAccountsViaServer,
  saveAccountSwitchEmergencyBackup,
  type StableAuthLinkMetadata,
  type StableAuthLinkEnsureResult,
} from './cloud_sync';
import {
  ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
  cleanAccountDeleteLockId,
  createAccountDeleteOperationId,
  inspectAccountDeletePendingAuth,
  persistAccountDeletePendingAuthLock,
  readAccountDeletePendingAuthRaw,
  restoreAccountDeletePendingAuthMirror,
  type AccountDeletePendingAuthLock,
} from './account_delete_quarantine';
import { hasMeaningfulLocalAccountData } from './local_account_data';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  waitForRestoreApplicationIdleWithDeadline,
} from './account_generation';
import {
  beginPremiumAccountTransition, invalidatePremiumCache,
  waitForPremiumAccountWorkIdle,
} from './premium_guard';
import {
  forceSyncShardsToCloud,
  loadShardsFromCloud,
  preparePendingShardDeltasForAccountSwitch,
} from './shards_system';
import {
  hasQuarantinedShardDeltaQueue,
  readShardDeltaQueue,
} from './shards_delta_queue';
import { restoreAccountSwitchEmergencyBackupIfSafe } from './account_switch_backup_restore';
import { clearPendingAuthLink, recordPendingAuthLink } from './pending_auth_link';
import { logEvent, recordError } from './firebase';
import { logAppError } from './app_health';
import { emitAppEvent } from './events';

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

async function syncRevenueCatAfterAuthLink(isCurrent: () => boolean = () => true): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  await import('./revenuecat_init')
    .then((m) => m.syncRevenueCatIdentity(isCurrent))
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
  | { result: 'linked_pending'; email: string | null; displayName: string | null }
  | { result: 'cancelled' }
  | { result: 'error'; error: string };

export type SignInWithProviderOptions = Readonly<{
  /**
   * Startup recovery must authenticate the provider already bound to the current
   * persisted stable id. A different provider account is rejected without
   * rotating stable_id or clearing local progress.
   */
  requireCurrentStableIdOwnership?: boolean;
}>;

function emitAuthProviderLinked(): void {
  try {
    emitAppEvent('auth_provider_linked');
  } catch {
    /* UI refresh is best-effort; auth result must still return. */
  }
}

async function beginEntitlementSafeAccountTransition(): Promise<void> {
  invalidateAccountGeneration();
  beginPremiumAccountTransition();
  await waitForPremiumAccountWorkIdle();
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
 * Проверяет только наличие встроенного модуля и Web Client ID. На Android
 * Play Services проверяются после нажатия (с системным диалогом обновления) в
 * runGoogleNativeSignIn: временный сбой preflight не должен убирать все точки входа.
 */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  const mod = getGoogleSignin();
  if (!mod) return false;
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) return false;
  return true;
}

/** Чтение users/{stableId} не должно блокировать настройки бесконечно при «зависшем» клиенте Firestore. */
const LINKED_AUTH_FIRESTORE_TIMEOUT_MS = 12_000;
// This client read is only a latency hint. The callable below is authoritative
// and independently resolves an existing provider anchor.
// 1.5с не хватало на холодном старте (Redmi/Android 10): lookup обрывался →
// уходили в локальную ветку и показывали «Нужен прежний аккаунт» даже при
// правильно выбранном аккаунте. 5с — всё ещё короткая подсказка: серверный
// callable авторитетен и сам разрулит anchor при любом исходе hint'а.
const AUTH_LINK_HINT_TIMEOUT_MS = 5_000;

/**
 * Транзиентные failure-классы стадии auth_link — их ретраим (холодный старт,
 * сеть, App Check). stable_id_mismatch сюда НЕ входит: это детерминированный
 * отказ сервера (защита владения аккаунтом), ретрай бессмысленен.
 */
const AUTH_LINK_TRANSIENT_FAILURES = new Set(['identity_unavailable', 'transport_unavailable', 'app_check_unavailable']);
/**
 * Паузы между ретраями auth_link (мс). Всего ≤3 попыток (начальная + 2 ретрая):
 * нарочно ограничено, чтобы не стэкать серийные 12-секундные дедлайны callable
 * (см. контракт в tests/auth_provider_stable_link.test.ts). Транзиентный сбой
 * почти всегда лечится уже второй попыткой.
 */
const AUTH_LINK_RETRY_BACKOFF_MS = [700, 1500];

/**
 * Пост-транзакционный restore/sync прогресса (полная склейка облака) может быть тяжелее
 * одного link-lookup, поэтому даём ему больше времени — но НЕ бесконечность. Без этого
 * таймаута оборванная сеть сразу после выбора аккаунта вешала весь вход (H-ENTER):
 * await restoreFromCloud/syncToCloud не разрешался → onboarding блокировал даже «Позже».
 */
const SIGNIN_CLOUD_SYNC_TIMEOUT_MS = 20_000;
const ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS = 1_500;

/**
 * Best-effort долив аварийной копии «Сменить аккаунт» после restoreFromCloud.
 * Внутри проверяется совпадение stableId и доливаются только отсутствующие
 * ключи, поэтому вызов безопасен на любом пути входа. Вход не валим никогда.
 */
async function tryRestoreAccountSwitchBackup(
  stage: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  try {
    const res = await restoreAccountSwitchEmergencyBackupIfSafe(isCurrent);
    if (res.status === 'restored') {
      logAuthEvent('auth_switch_backup_restored', { stage, keys: res.restoredKeys });
    }
  } catch {
    // восстановление — best effort
  }
}

const REMOTE_ACCOUNT_DELETED_NOTICE_KEY = 'remote_account_deleted_notice_v1';
let localAccountDeletionInProgress = false;

export function isLocalAccountDeletionInProgress(): boolean {
  return localAccountDeletionInProgress;
}

async function persistAccountDeletePendingAuth(
  providerUidRaw: string | null | undefined,
  stableIdRaw: string | null | undefined,
  source: AccountDeletePendingAuthLock['source'] = 'local',
): Promise<AccountDeletePendingAuthLock | null> {
  const providerUid = cleanAccountDeleteLockId(providerUidRaw);
  if (!providerUid) return null;
  const now = Date.now();
  const lock: AccountDeletePendingAuthLock = {
    operationId: createAccountDeleteOperationId(providerUid, cleanAccountDeleteLockId(stableIdRaw), now),
    providerUid,
    stableId: cleanAccountDeleteLockId(stableIdRaw),
    source,
    phase: 'prepared',
    createdAt: now,
    expiresAt: now + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
  };
  const persisted = await persistAccountDeletePendingAuthLock(lock);
  if (!persisted) return null;
  logAuthEvent('auth_account_delete_pending_lock_set', { ttlMs: ACCOUNT_DELETE_PENDING_AUTH_TTL_MS });
  return lock;
}

async function readAccountDeletePendingAuth(providerUidRaw: string): Promise<AccountDeletePendingAuthLock | null> {
  const providerUid = cleanAccountDeleteLockId(providerUidRaw);
  try {
    const raw = await readAccountDeletePendingAuthRaw();
    if (!raw) return null;
    const inspection = inspectAccountDeletePendingAuth(raw);
    if (inspection.status === 'malformed') {
      throw new Error('account_delete_guard_corrupt');
    }
    if (inspection.status !== 'active' && inspection.status !== 'expired') return null;
    if (
      inspection.lock.phase === 'local_cleared'
      && providerUid
      && inspection.lock.providerUid !== providerUid
    ) {
      return null;
    }
    return inspection.lock;
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] account delete pending lock read failed', e);
    throw new Error('account_delete_guard_unavailable');
  }
}

async function completePreparedAccountDeleteLocalExit(
  pendingDelete: AccountDeletePendingAuthLock,
  firebaseSignedOut: boolean,
): Promise<boolean> {
  let localExitVerified = true;
  try {
    await wipeLocalAccountData();
  } catch (e) {
    localExitVerified = false;
    if (__DEV__) console.warn('[auth_provider] pending account delete: local wipe failed', e);
  }
  try {
    await AsyncStorage.clear();
  } catch (e) {
    localExitVerified = false;
    if (__DEV__) console.warn('[auth_provider] pending account delete: AsyncStorage.clear failed', e);
  }
  try {
    await restoreAccountDeletePendingAuthMirror(pendingDelete);
  } catch (e) {
    localExitVerified = false;
    if (__DEV__) console.warn('[auth_provider] pending account delete: mirror restore failed', e);
  }
  try {
    await clearStableId();
    await clearPendingAuthLink();
  } catch (e) {
    localExitVerified = false;
    if (__DEV__) console.warn('[auth_provider] pending account delete: stable id clear failed', e);
  }
  if (!firebaseSignedOut || !localExitVerified) return false;

  const localClearedLock: AccountDeletePendingAuthLock = {
    ...pendingDelete,
    phase: 'local_cleared',
  };
  return persistAccountDeletePendingAuthLock(localClearedLock);
}

async function handleAccountDeletePendingAuth(
  provider: AuthProviderId,
  pendingDelete: AccountDeletePendingAuthLock,
): Promise<SignInResult> {
  const ageMs = Math.max(0, Date.now() - pendingDelete.createdAt);
  logAuthEvent('auth_signin_blocked_account_delete_pending', { provider, ageMs });
  const enqueueOperation = startCloudDeletionEnqueue(pendingDelete.stableId);
  void enqueueOperation.acknowledgment
    .then((ack) => {
      logAuthEvent('auth_account_delete_enqueue_retry', { provider, status: ack.status });
    })
    .catch((e) => {
      if (__DEV__) console.warn('[auth_provider] account-delete-pending enqueue retry failed', e);
      logAuthEvent('auth_account_delete_enqueue_retry_failed', { provider });
    });
  await enqueueOperation.dispatchSettled;

  try {
    await signOutCurrentProvider();
  } catch {
    logAuthEvent('auth_account_delete_pending_signout_failed', { provider });
    return { result: 'error', error: 'account_delete_pending' };
  }

  if (pendingDelete.phase === 'prepared') {
    const localExitComplete = await completePreparedAccountDeleteLocalExit(pendingDelete, true);
    if (!localExitComplete) {
      logAuthEvent('auth_account_delete_pending_phase_update_failed', { provider });
      return { result: 'error', error: 'account_delete_pending' };
    }
  }
  const rotatedStableId = await ensureAnonUser().catch(() => null);
  if (!rotatedStableId || rotatedStableId === pendingDelete.stableId) {
    logAuthEvent('auth_account_delete_pending_rotation_failed', { provider });
    return { result: 'error', error: 'account_delete_pending' };
  }
  beginAccountGeneration(rotatedStableId);
  logAuthEvent('auth_account_delete_pending_identity_rotated');
  return { result: 'error', error: 'account_delete_pending' };
}

export async function resumePendingAccountDeleteLocalExit(): Promise<boolean> {
  let pendingDelete: AccountDeletePendingAuthLock | null;
  try {
    const raw = await readAccountDeletePendingAuthRaw();
    const inspection = inspectAccountDeletePendingAuth(raw);
    if (inspection.status === 'empty') return true;
    if (inspection.status === 'malformed') return false;
    pendingDelete = inspection.lock;
  } catch {
    return false;
  }
  if (!pendingDelete) return false;
  if (pendingDelete.phase === 'local_cleared') {
    return true;
  }

  const auth = getAuth();
  if (!auth) return false;
  if (!auth.currentUser) {
    const authReady = await new Promise<boolean>((resolve) => {
      if (typeof auth.onAuthStateChanged !== 'function') {
        resolve(false);
        return;
      }
      let settled = false;
      let unsubscribe: (() => void) | undefined;
      const finish = (ready: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe?.();
        resolve(ready);
      };
      const timer = setTimeout(() => finish(false), 2_500);
      unsubscribe = auth.onAuthStateChanged(() => finish(true));
    });
    if (!authReady) return false;
  }

  await beginEntitlementSafeAccountTransition();
  await Promise.all([
    waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
    quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
  ]);

  let firebaseSignedOut = auth?.currentUser == null;
  let completionAcknowledgment: ReturnType<typeof startCloudDeletionEnqueue>['acknowledgment'] | null = null;
  if (pendingDelete.source === 'local' && auth?.currentUser?.isAnonymous === false) {
    const enqueueOperation = startCloudDeletionEnqueue(pendingDelete.stableId);
    completionAcknowledgment = enqueueOperation.acknowledgment;
    void completionAcknowledgment.catch(() => {});
    await enqueueOperation.dispatchSettled;
  }
  if (auth?.currentUser) {
    try {
      await signOutCurrentProvider();
      firebaseSignedOut = true;
    } catch {
      firebaseSignedOut = false;
    }
  }
  const localExitComplete = await completePreparedAccountDeleteLocalExit(pendingDelete, firebaseSignedOut);
  if (localExitComplete && completionAcknowledgment) {
    void completionAcknowledgment.catch(() => {});
  }
  return localExitComplete;
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
  // Required for every Apple credential; kept only in this in-memory attempt.
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
let googleNativeSignInInFlight: Promise<any> | null = null;

type ProviderCredentialModeReservation = {
  readonly mode: 'signin' | 'recovery';
  readonly provider: AuthProviderId;
  operationSettled: boolean;
  googleNativePending: boolean;
};

let providerCredentialModeReservation: ProviderCredentialModeReservation | null = null;

function createProviderCredentialModeReservation(
  mode: ProviderCredentialModeReservation['mode'],
  provider: AuthProviderId,
): ProviderCredentialModeReservation {
  return { mode, provider, operationSettled: false, googleNativePending: false };
}

function releaseProviderCredentialModeReservationIfSettled(
  reservation: ProviderCredentialModeReservation,
): void {
  if (
    providerCredentialModeReservation === reservation
    && reservation.operationSettled
    && !reservation.googleNativePending
  ) {
    providerCredentialModeReservation = null;
  }
}

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
  try {
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: GoogleSignin.signIn()');
    if (!googleNativeSignInInFlight) {
      const nativeReservation = providerCredentialModeReservation;
      if (!nativeReservation) throw new Error('google_signin_reservation_missing');
      const nativeTask = mod.GoogleSignin.signIn();
      googleNativeSignInInFlight = nativeTask;
      nativeReservation.googleNativePending = true;
      const settleNativeTask = () => {
        if (googleNativeSignInInFlight === nativeTask) googleNativeSignInInFlight = null;
        nativeReservation.googleNativePending = false;
        releaseProviderCredentialModeReservationIfSettled(nativeReservation);
      };
      nativeTask.then(
        settleNativeTask,
        settleNativeTask,
      );
    }
    const nativeTask = googleNativeSignInInFlight;
    if (!nativeTask) throw new Error('google_signin_native_task_missing');
    res = await withTimeout(nativeTask, GOOGLE_SIGNIN_TIMEOUT_MS, 'native_signin');
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: GoogleSignin.signIn returned', JSON.stringify({
      type: res?.type,
      hasData: !!(res?.data ?? res),
    }));
  } catch (e: any) {
    if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5' || e?.code === '12501') {
      if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: cancelled by user (error code)');
      return { cancelled: true };
    }
    if (e?.message?.startsWith('timeout_native_signin')) {
      // Native sign-in cannot be cancelled. Retrying here can overlap the still
      // running picker. Keep that promise so a retry can await it instead of
      // opening a second picker, and surface a real error instead of pretending
      // the user cancelled.
      if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: timed out; native call remains reusable');
      throw new Error('google_signin_timeout');
    }
    if (__DEV__) console.warn('[auth_provider] runGoogleNativeSignIn: signIn threw', e);
    throw e;
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

const APPLE_SIGN_IN_NONCE_BYTES = 32;

async function createAppleSignInNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const rawBytes = await Crypto.getRandomBytesAsync(APPLE_SIGN_IN_NONCE_BYTES);
  if (!(rawBytes instanceof Uint8Array) || rawBytes.length !== APPLE_SIGN_IN_NONCE_BYTES) {
    throw new Error('apple_signin_nonce_unavailable');
  }
  const rawNonce = Array.from(
    rawBytes,
    byte => byte.toString(16).padStart(2, '0'),
  ).join('');
  if (!rawNonce) throw new Error('apple_signin_nonce_unavailable');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  if (!hashedNonce) throw new Error('apple_signin_nonce_hash_unavailable');
  return { rawNonce, hashedNonce };
}

async function runAppleNativeSignIn(): Promise<NativeAuthCredential | { cancelled: true }> {
  const mod = getAppleAuth();
  if (!mod) throw new Error('apple_auth_module_unavailable');

  // Apple receives only SHA256(rawNonce). Firebase receives the matching raw
  // value later and verifies it against the ID token, preventing token replay.
  const { rawNonce, hashedNonce } = await createAppleSignInNonce();
  let credential: any;
  try {
    credential = await mod.signInAsync({
      requestedScopes: [mod.AppleAuthenticationScope.FULL_NAME, mod.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
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
    appleNonce: rawNonce,
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
    // Apple does not support requesting only id_token. Keeping this flow
    // scope-less allows fragment mode, which the HTTPS bridge forwards back to
    // the Android custom scheme without requiring a server-side POST handler.
    response_type: 'code id_token',
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
  if (parsed.state !== oauthState) {
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
    // logAppError плавает в фоне: try/catch вокруг НЕ ловит async-reject плавающего
    // промиса → любой внутренний сбой логгера становился uncaught «(in promise)»
    // поверх исходной ошибки входа. Диагностика не должна ухудшать исходный путь.
    void logAppError('auth:signin_failure', new Error(d), {
      feature: 'auth',
      severity,
      writeToFirestore: severity === 'critical',
      tags: { provider, stage },
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * Главная точка входа: запустить native sign-in flow + связать с stable_id.
 * Возвращает один из SignInResult вариантов.
 */
async function rejectRecoveryProviderMismatch(
  provider: AuthProviderId,
  reason: 'linked_to_different_stable_id' | 'stable_owner_mismatch',
): Promise<SignInResult> {
  logAuthEvent('auth_recovery_provider_mismatch', { provider, reason });
  // The selected provider did not prove ownership of the persisted stable id.
  // Return to anonymous auth while preserving both stable_id and AsyncStorage.
  try {
    await signOutCurrentProvider();
  } catch {
    logAuthEvent('auth_recovery_provider_mismatch_signout_failed', { provider, reason });
    return { result: 'error', error: 'recovery_signout_failed' };
  }
  await ensureAnonUser().catch(() => null);
  return { result: 'error', error: 'recovery_provider_mismatch' };
}

/**
 * Acquires only the native provider proof used to bootstrap the isolated recovery
 * Firebase app. This path must never touch default Auth, Firestore, stable_id, or sync.
 */
export async function acquireAuthRecoveryNativeCredential(
  provider: AuthProviderId,
): Promise<NativeAuthCredential | { cancelled: true }> {
  const occupied = providerCredentialModeReservation;
  if (occupied) {
    if (occupied.mode === 'signin') {
      throw new Error(`auth_recovery_credential_blocked_signin_${occupied.provider}`);
    }
    throw new Error(`auth_recovery_credential_in_progress_${occupied.provider}`);
  }

  const reservation = createProviderCredentialModeReservation('recovery', provider);
  providerCredentialModeReservation = reservation;
  try {
    if (provider === 'google') return await runGoogleNativeSignIn();
    if (Platform.OS === 'android') return await runAppleAndroidOAuthSignIn();
    return await runAppleNativeSignIn();
  } finally {
    reservation.operationSettled = true;
    releaseProviderCredentialModeReservationIfSettled(reservation);
  }
}

export async function signInWithProvider(
  provider: AuthProviderId,
  options: SignInWithProviderOptions = {},
): Promise<SignInResult> {
  if (providerCredentialModeReservation?.mode === 'recovery') {
    return {
      result: 'error',
      error: `auth_signin_in_progress_recovery_${providerCredentialModeReservation.provider}`,
    };
  }
  if (providerCredentialModeReservation?.mode === 'signin' && !providerSignInInFlight) {
    return {
      result: 'error',
      error: `auth_signin_still_running_${providerCredentialModeReservation.provider}`,
    };
  }
  if (providerSignInInFlight) {
    if (
      providerSignInInFlight.provider !== provider
      || providerSignInInFlight.requireCurrentStableIdOwnership !== Boolean(options.requireCurrentStableIdOwnership)
    ) {
      return { result: 'error', error: `auth_signin_in_progress_${providerSignInInFlight.provider}` };
    }
    if (Date.now() - providerSignInInFlight.startedAt >= PROVIDER_SIGN_IN_STALE_MS) {
      return { result: 'error', error: `auth_signin_still_running_${provider}` };
    }
    return providerSignInInFlight.task;
  }
  const reservation = createProviderCredentialModeReservation('signin', provider);
  providerCredentialModeReservation = reservation;
  const task = runSignInWithProvider(provider, options);
  providerSignInInFlight = {
    provider,
    task,
    startedAt: Date.now(),
    requireCurrentStableIdOwnership: Boolean(options.requireCurrentStableIdOwnership),
  };
  try {
    return await task;
  } finally {
    if (providerSignInInFlight?.task === task) providerSignInInFlight = null;
    reservation.operationSettled = true;
    releaseProviderCredentialModeReservationIfSettled(reservation);
  }
}

const PROVIDER_SIGN_IN_STALE_MS = 45_000;
let providerSignInInFlight: {
  provider: AuthProviderId;
  task: Promise<SignInResult>;
  startedAt: number;
  requireCurrentStableIdOwnership: boolean;
} | null = null;

async function runSignInWithProvider(
  provider: AuthProviderId,
  options: SignInWithProviderOptions,
): Promise<SignInResult> {
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

  let pendingDeleteBeforeCredential: AccountDeletePendingAuthLock | null;
  try {
    pendingDeleteBeforeCredential = await readAccountDeletePendingAuth(auth.currentUser?.uid ?? '');
  } catch {
    captureAuthSignInFailure(provider, 'guard', 'account_delete_guard_unavailable');
    return { result: 'error', error: 'account_delete_guard_unavailable' };
  }
  if (
    pendingDeleteBeforeCredential
    && (
      pendingDeleteBeforeCredential.phase === 'prepared'
      || auth.currentUser?.isAnonymous === false
    )
  ) {
    return handleAccountDeletePendingAuth(provider, pendingDeleteBeforeCredential);
  }

  // A pending guard on an anonymous session may belong to the provider selected
  // in the picker. Do not generate/bind any stable identity until the credential
  // reveals that provider uid and the mandatory post-credential check runs.
  const deferIdentityPreparation = pendingDeleteBeforeCredential?.phase === 'prepared';
  const anonPreparation = deferIdentityPreparation
    ? Promise.resolve(null)
    : ensureAnonUser().catch(() => null);

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

  await anonPreparation;
  const preProviderStableId = deferIdentityPreparation ? '' : await getStableId();

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
  let firebaseUserForTokenRefresh: any = null;
  let firebaseEmail: string | null = cred.email;
  let firebaseDisplayName: string | null = cred.displayName;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authMod = require('@react-native-firebase/auth');
    let credential: any;
    if (provider === 'google') {
      credential = authMod.default.GoogleAuthProvider.credential(cred.idToken);
    } else {
      if (!cred.appleNonce) throw new Error('apple_signin_nonce_unavailable');
      credential = authMod.default.AppleAuthProvider.credential(cred.idToken, cred.appleNonce);
    }

    const anonUser = auth.currentUser;
    // Apple authorization codes are one-time credentials. If linkWithCredential
    // reports a conflict, reusing the same Apple credential for sign-in produces
    // "Duplicate credential received". Apple therefore uses the safe server-link
    // path directly; Google can still preserve the anonymous uid in place.
    const canTryLink = Boolean(
      !deferIdentityPreparation &&
      provider !== 'apple' &&
      anonUser?.isAnonymous &&
      typeof anonUser?.linkWithCredential === 'function'
    );

    let userCredential: any = null;
    if (canTryLink) {
      try {
        // Firebase credential mutations are not cancellable. A Promise.race timeout
        // here used to start signInWithCredential while the timed-out link could
        // still complete in the background, racing two identity mutations.
        userCredential = await anonUser.linkWithCredential(credential);
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
        if (!deferIdentityPreparation) {
          await stampAnonOwnershipBeforeSignIn(preProviderStableId);
        }
        userCredential = await auth.signInWithCredential(credential);
      }
    } else {
      if (!deferIdentityPreparation) {
        await stampAnonOwnershipBeforeSignIn(preProviderStableId);
      }
      userCredential = await auth.signInWithCredential(credential);
    }

    const fbUser = userCredential?.user ?? auth.currentUser;
    firebaseUserForTokenRefresh = fbUser;
    firebaseProviderUid = fbUser?.uid ?? '';
    if (!firebaseEmail) firebaseEmail = fbUser?.email ?? null;
    if (!firebaseDisplayName) firebaseDisplayName = fbUser?.displayName ?? null;
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

  let pendingDelete: AccountDeletePendingAuthLock | null;
  try {
    pendingDelete = await readAccountDeletePendingAuth(firebaseProviderUid);
  } catch {
    captureAuthSignInFailure(provider, 'guard', 'account_delete_guard_unavailable');
    return { result: 'error', error: 'account_delete_guard_unavailable' };
  }
  if (pendingDelete) {
    return handleAccountDeletePendingAuth(provider, pendingDelete);
  }

  if (typeof firebaseUserForTokenRefresh?.getIdToken === 'function') {
    // linkWithCredential may leave the cached callable token carrying the old
    // anonymous sign_in_provider claim. Force refresh before authEnsureStableLink.
    await firebaseUserForTokenRefresh.getIdToken(true);
  }

  // 3. Lookup auth_links → link OR auto-merge by XP
  let localStableId = await getStableId();
  const now = Date.now();
  const devicePlatform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const providerDisplayName = firebaseDisplayName;

  const linkRef = db.collection('auth_links').doc(firebaseProviderUid);

  let remoteStableId: string | null = null;
  let linkLookupCompleted = false;
  let linkLookupFound = false;
  try {
    const linkSnap = await withTimeout<any>(linkRef.get(), AUTH_LINK_HINT_TIMEOUT_MS, 'link_lookup');
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
  // Android: anon-auth/сеть/App Check ещё не поднялись → первый вызов callable
  // обрывался и весь вход прерывался с Critical-алертом. Операция идемпотентна
  // и самолечится — ретраим транзиентные failure-классы с нарастающей паузой
  // (AUTH_LINK_TRANSIENT_FAILURES / AUTH_LINK_RETRY_BACKOFF_MS). Транзиентный
  // сбой почти всегда лечится уже второй попыткой; детерминированный
  // stable_id_mismatch не ретраим — его разруливают ветки ниже (recovery/rotation).
  const ensureStableAuthLinkWithRetry = async (stableId: string): Promise<StableAuthLinkEnsureResult> => {
    let result = await ensureStableAuthLinkForStableIdDetailed(stableId, authLinkMetadata);
    for (let retry = 0; retry < AUTH_LINK_RETRY_BACKOFF_MS.length; retry += 1) {
      if (result.ok || !result.failure || !AUTH_LINK_TRANSIENT_FAILURES.has(result.failure)) break;
      await new Promise<void>((resolve) => setTimeout(resolve, AUTH_LINK_RETRY_BACKOFF_MS[retry]));
      result = await ensureStableAuthLinkForStableIdDetailed(stableId, authLinkMetadata);
    }
    return result;
  };

  if (remoteStableId) {
    if (options.requireCurrentStableIdOwnership) {
      return rejectRecoveryProviderMismatch(provider, 'linked_to_different_stable_id');
    }
    // Provider is already linked to another stable_id. This is the normal
    // returning-user/new-device path. Do not try to relink the local anonymous
    // stable_id first: authEnsureStableLink correctly rejects that as
    // stable_id_mismatch because auth_links/{providerUid} points to remoteStableId.
    const linkedRemote = await ensureStableAuthLinkWithRetry(remoteStableId);
    if (!linkedRemote.ok || !linkedRemote.stableUid) {
      // failure-класс в репорт: app_check/transport/identity — иначе по «*_failed»
      // не отличить сломанный App Check от сети (инцидент 2026-07-21).
      captureAuthSignInFailure(provider, 'auth_link', `remote_stable_link_failed:${linkedRemote.failure ?? 'unknown'}`);
      return { result: 'error', error: 'auth_link_failed' };
    }
    outcome = {
      kind: 'merged_swap_to_remote',
      remoteStableId: linkedRemote.stableUid,
      mergedFromStableId: localStableId,
    };
  } else {
    let linkedLocal = await ensureStableAuthLinkWithRetry(localStableId);
    if (!linkedLocal.ok && linkedLocal.failure === 'stable_id_mismatch') {
      if (options.requireCurrentStableIdOwnership) {
        return rejectRecoveryProviderMismatch(provider, 'stable_owner_mismatch');
      }
      // A previous interrupted provider switch can leave local progress under a
      // stable id owned by an obsolete anonymous Firebase uid. That identity
      // cannot be reclaimed safely, so rotate only the anchor and keep the local
      // progress. This restores league/social access without merging foreign data.
      try {
        await quiesceSyncBeforeStableIdSwap();
        await beginEntitlementSafeAccountTransition();
        await clearStableId();
        localStableId = await getStableId();
        beginAccountGeneration(localStableId);
        linkedLocal = await ensureStableAuthLinkWithRetry(localStableId);
        if (linkedLocal.ok) logAuthEvent('auth_signin_stale_identity_rotated', { provider });
      } catch (e) {
        if (__DEV__) console.warn('[auth_provider] stale stable id rotation failed', e);
      }
    }
    if (!linkedLocal.ok || !linkedLocal.stableUid) {
      captureAuthSignInFailure(provider, 'auth_link', `local_stable_link_failed:${linkedLocal.failure ?? 'unknown'}`);
      // Тихий deferred link: провайдер-вход УЖЕ состоялся (Firebase-сессия жива
      // и переживёт рестарт), упала только фоновая серверная привязка по
      // ТРАНЗИЕНТНОЙ причине. Вместо ошибки-тупика журналируем намерение и
      // впускаем юзера: boot-restore зовёт тот же ensure с тем же stableId на
      // каждом запуске и сойдётся сам, а processPendingAuthLink дожимает в фоне.
      // mismatch сюда не доходит (защитные ветки выше), swap не требуется —
      // stableId остаётся локальным, чужой/облачный прогресс не показывается.
      if (linkedLocal.failure && AUTH_LINK_TRANSIENT_FAILURES.has(linkedLocal.failure)) {
        await recordPendingAuthLink({
          provider,
          email: firebaseEmail,
          displayName: providerDisplayName,
          stableId: localStableId,
          failure: linkedLocal.failure,
        });
        logAuthEvent('auth_signin_deferred_pending', { provider, failure: linkedLocal.failure });
        emitAuthProviderLinked();
        return { result: 'linked_pending', email: firebaseEmail, displayName: providerDisplayName };
      }
      return { result: 'error', error: 'auth_link_failed' };
    }
    if (options.requireCurrentStableIdOwnership && linkedLocal.stableUid !== preProviderStableId) {
      return rejectRecoveryProviderMismatch(provider, 'linked_to_different_stable_id');
    }
    if (linkedLocal.stableUid !== localStableId) {
      outcome = {
        kind: 'merged_swap_to_remote',
        remoteStableId: linkedLocal.stableUid,
        mergedFromStableId: localStableId,
      };
    } else {
      outcome = {
        kind: linkLookupCompleted && !linkLookupFound ? 'created_new' : 'linked_existing',
      };
    }
  }

  // Любой успешный outcome снимает отложенную привязку — она больше не нужна.
  void clearPendingAuthLink();

  // 4. Post-link: handle stable_id swap if needed
  if (outcome.kind === 'merged_swap_to_remote') {
    try {
      const preserveLocalProgress = await hasMeaningfulLocalAccountData();
      // Сразу синкаем текущий локальный прогресс в облако
      // (на случай если local чуть-чуть свежее — после swap данные не пропадут).
      // syncToCloud у нас пишет в users/{currentLocalStableId} — это корректно ДО swap.
      // Здесь нельзя оставлять обычный debounce: дальше мы меняем stable_id и чистим локальные
      // progress-ключи, поэтому свежий локальный прогресс должен быть отправлен прямо сейчас.
      if (preserveLocalProgress) {
        await withTimeout(syncToCloud({ forceNow: true }), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_presync');
      }

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
      const merge = preserveLocalProgress
        ? await mergeStableAccountsViaServer(outcome.mergedFromStableId, outcome.remoteStableId)
        : null;
      const canonicalStableId = merge?.ok && merge.canonicalStableId
        ? merge.canonicalStableId
        : outcome.remoteStableId;

      // Хвост D: погасить фоновый/отложенный sync ДО смены stable_id, иначе debounce-sync
      // со старым прогрессом запишется в users/{новый canonical} и затрёт слитый аккаунт.
      await quiesceSyncBeforeStableIdSwap();

      // Clear account A while its id is still active, then install server-canonical B.
      // This prevents account A AsyncStorage from being observed under account B.
      await beginEntitlementSafeAccountTransition();
      await wipeLocalAccountData();
      await setStableId(canonicalStableId);
      beginAccountGeneration(canonicalStableId);

      // Премиум-кэш (premium_guard, TTL 5 мин) держит решение ПРЕДЫДУЩЕГО аккаунта.
      // Без сброса до 5 минут после свапа в UI виден чужой премиум-статус.
      invalidatePremiumCache();

      // Гарантируем Firebase Auth state ready (после signInWithCredential anon → google)
      await ensureAnonUser();

      // stable_id уже поменялся: RevenueCat должен смотреть на новый canonical id
      // до того, как PremiumContext перечитает entitlement.
      const revenueCatSync = syncRevenueCatAfterAuthLink();

      // Тащим прогресс с canonical stable_id
      await Promise.all([
        revenueCatSync,
        withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_restore'),
      ]);

      // КРИТИЧНО: шарды лежат в users/{uid}.shards (отдельно от SYNC_KEYS),
      // и после свапа stable_id локальный баланс соответствует СТАРОМУ аккаунту.
      // Без этого вызова первый же addShards/spendShards перезапишет правильный
      // облачный баланс мусором с прежнего stable_id.
      await loadShardsFromCloud().catch(() => {});
      await tryRestoreAccountSwitchBackup('swap_restore');

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
        await beginEntitlementSafeAccountTransition();
        await wipeLocalAccountData();
        await setStableId(canonicalStableId);
        beginAccountGeneration(canonicalStableId);
        invalidatePremiumCache();
        await ensureAnonUser();
        await syncRevenueCatAfterAuthLink();
        await withTimeout(restoreFromCloud(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'keeplocal_restore');
        await loadShardsFromCloud().catch(() => {});
        await tryRestoreAccountSwitchBackup('keeplocal_restore');
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
    scheduleSameStablePostAuthRefresh('linked_restore');
    logAuthEvent('auth_signin_linked', { provider });
    scheduleReferralApplyAfterLink();
    emitAuthProviderLinked();
    return { result: 'linked_existing', email: firebaseEmail, displayName: providerDisplayName };
  }

  // outcome.kind === 'created_new'
  // Тот же подход: сначала restore, потом sync только если local не пустой.
  scheduleSameStablePostAuthRefresh('created_restore');
  logAuthEvent('auth_signin_created', { provider });
  scheduleReferralApplyAfterLink();
  emitAuthProviderLinked();
  return { result: 'created_new', email: firebaseEmail, displayName: providerDisplayName };
}

function scheduleSameStablePostAuthRefresh(stage: 'linked_restore' | 'created_restore'): void {
  void (async () => {
    const stableId = await getStableId().catch(() => null);
    beginAccountGeneration(stableId);
    const generation = captureAccountGeneration();
    const isCurrent = () => isCurrentAccountGeneration(generation, stableId);
    let restoreResult: 'restored' | 'not_found' | 'failed' = 'failed';
    try {
      restoreResult = await withTimeout(restoreFromCloudDetailed(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, stage);
    } catch (e) {
      if (__DEV__) console.warn(`[auth_provider] ${stage} restoreFromCloud failed`, e);
    }
    if (!isCurrent()) return;
    await loadShardsFromCloud(isCurrent).catch(() => {});
    if (!isCurrent()) return;
    await tryRestoreAccountSwitchBackup(stage, isCurrent);
    if (!isCurrent()) return;
    await markOnboardedAfterSignIn(isCurrent);
    if (!isCurrent()) return;
    await syncRevenueCatAfterAuthLink(isCurrent);
    if (!isCurrent()) return;
    if (restoreResult !== 'failed' && await hasMeaningfulLocalAccountData()) {
      if (!isCurrent()) return;
      await syncToCloud({ forceNow: true }).catch(() => {});
    } else if (__DEV__) {
      console.warn(`[auth_provider] ${stage}: skipping syncToCloud — local AsyncStorage empty`);
    }
    if (!isCurrent()) return;
    if (restoreResult === 'restored') emitAppEvent('cloud_profile_hydrated');
  })().catch((e) => {
    if (__DEV__) console.warn(`[auth_provider] ${stage} background refresh failed`, e);
  });
}

async function markOnboardedAfterSignIn(isCurrent: () => boolean = () => true): Promise<void> {
  try {
    const userName = (await AsyncStorage.getItem('user_name'))?.trim();
    if (!userName) return;
    const cur = await AsyncStorage.getItem('onboarding_done');
    if (cur !== '1') {
      if (!isCurrent()) return;
      await AsyncStorage.setItem('onboarding_done', '1');
    }
  } catch {
    /* ignore */
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
  | { ok: false; reason: 'sync_failed' }
  | { ok: false; reason: 'pending_shard_spend' }
  | { ok: false; reason: 'shard_queue_quarantined' }
  | { ok: false; reason: 'backup_failed' | 'wipe_failed'; detail: string }
  | { ok: false; reason: 'unknown'; detail?: string };

export type SignOutSwitchOptions = {
  /**
   * Разрешить wipe даже если forceSyncToCloud провалился (нет сети / таймаут).
   * По умолчанию false: прогресс, не доехавший до облака, стирать нельзя —
   * switch отменяется, юзер остаётся в своём аккаунте и может повторить при сети.
   * true передаётся только после явного подтверждения пользователем
   * «сменить без сохранения» — тогда пишем аварийную копию и продолжаем.
   */
  allowWipeWithoutSync?: boolean;
  /**
   * Разрешить wipe при зависшем pending-списании осколков / карантинной очереди.
   * По умолчанию false: незавершённое списание блокирует смену аккаунта НАВСЕГДА,
   * если сервер его перманентно отклоняет (permission-denied / failed-precondition)
   * или до бэкенда нет доступа — юзер застревает в тупике «подключись к интернету».
   * true передаётся только после явного подтверждения «сменить без сохранения»:
   * перед wipe пишем аварийную копию (она включает очередь осколков), чтобы
   * поддержка могла восстановить баланс вручную.
   */
  allowPendingShardSpendDiscard?: boolean;
};

export async function signOutAndWipeForAccountSwitch(
  options?: SignOutSwitchOptions,
): Promise<SignOutSwitchResult> {
  if (!CLOUD_SYNC_ENABLED) {
    // В Expo Go / без облака просто чистим локально — ничего терять не можем.
    try {
      await beginEntitlementSafeAccountTransition();
      await Promise.all([
        waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
        quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
      ]);
      try {
        await wipeLocalAccountData();
      } catch (e: any) {
        const detail = String(e?.message ?? e).slice(0, 80);
        logAuthEvent('auth_signout_wipe_failed', { stage: 'wipe', error: detail });
        return { ok: false, reason: 'wipe_failed', detail };
      }
      await clearStableId();
      beginAccountGeneration(await getStableId().catch(() => null));
      logAuthEvent('auth_signout_wipe', { mode: 'no_cloud' });
      return { ok: true, synced: true };
    } catch (e: any) {
      return { ok: false, reason: 'unknown', detail: String(e?.message ?? e).slice(0, 80) };
    }
  }
  try {
    const switchToken = captureAccountGeneration();
    const switchOwnerStableId = switchToken.stableId;
    if (
      !switchOwnerStableId
      || !isCurrentAccountGeneration(switchToken, switchOwnerStableId)
    ) {
      return { ok: false, reason: 'sync_failed' };
    }
    // 1. Гарантируем что весь локальный прогресс ушёл в облако.
    //    Осколки синкаются отдельным путём и в forceSyncToCloud не входят —
    //    без этого вызова баланс офлайн-сессии терялся при смене аккаунта.
    const shardPreflight = await preparePendingShardDeltasForAccountSwitch();
    if (shardPreflight.stale || shardPreflight.ownerStableId !== switchOwnerStableId) {
      return { ok: false, reason: 'sync_failed' };
    }
    const discardPendingShardSpend = options?.allowPendingShardSpendDiscard === true;
    if ((await hasQuarantinedShardDeltaQueue(switchOwnerStableId)) && !discardPendingShardSpend) {
      logAuthEvent('auth_signout_wipe_sync_failed_aborted', { stage: 'shard_queue_quarantined' });
      return { ok: false, reason: 'shard_queue_quarantined' };
    }
    if (shardPreflight.pendingSpend > 0 && !discardPendingShardSpend) {
      logAuthEvent('auth_signout_wipe_sync_failed_aborted', { stage: 'pending_shard_spend' });
      return { ok: false, reason: 'pending_shard_spend' };
    }
    if (discardPendingShardSpend) {
      // Пользователь явно подтвердил «сменить без сохранения» на алерте про
      // зависшее списание/карантин: до облака очередь доехать не может, но и
      // терять её нельзя — пишем аварийную копию (включает очередь осколков),
      // чтобы поддержка могла восстановить баланс вручную.
      try {
        const backedUp = await saveAccountSwitchEmergencyBackup(
          'pending_shard_spend_discard_before_account_switch',
          switchOwnerStableId,
        );
        if (!backedUp) throw new Error('account_switch_backup_unavailable');
      } catch (e: any) {
        const detail = String(e?.message ?? e).slice(0, 80);
        if (__DEV__) console.warn('[auth_provider] account switch shard-spend discard backup failed', e);
        logAuthEvent('auth_signout_wipe_failed', { stage: 'backup', error: detail });
        return { ok: false, reason: 'backup_failed', detail };
      }
      logAuthEvent('auth_signout_wipe_shard_spend_discard', { stage: 'preflight' });
    }
    await forceSyncShardsToCloud().catch(() => {});
    const synced = await forceSyncToCloud();
    if (!synced) {
      try {
        const backedUp = await saveAccountSwitchEmergencyBackup(
          'force_sync_failed_before_account_switch',
          switchOwnerStableId,
        );
        if (!backedUp) throw new Error('account_switch_backup_unavailable');
      } catch (e: any) {
        const detail = String(e?.message ?? e).slice(0, 80);
        if (__DEV__) console.warn('[auth_provider] account switch emergency backup failed', e);
        logAuthEvent('auth_signout_wipe_failed', { stage: 'backup', error: detail });
        return { ok: false, reason: 'backup_failed', detail };
      }
      if (!options?.allowWipeWithoutSync) {
        // Прогресс НЕ в облаке — стирать локальные данные нельзя. Отменяем switch:
        // юзер остаётся в своём аккаунте, данные целы, можно повторить при сети.
        logAuthEvent('auth_signout_wipe_sync_failed_aborted', { stage: 'sync' });
        return { ok: false, reason: 'sync_failed' };
      }
      logAuthEvent('auth_signout_wipe_sync_failed_continue', { stage: 'sync' });
    }
    const transitionFailure: {
      backupDetail: string | null;
      pendingShardSpend: boolean;
      quarantinedShardQueue: boolean;
    } = {
      backupDetail: null,
      pendingShardSpend: false,
      quarantinedShardQueue: false,
    };
    const transitionReady = await withAccountTransitionLock(async (): Promise<boolean> => {
      if (!isCurrentAccountGeneration(switchToken, switchOwnerStableId)) return false;
      const finalShardQueue = await readShardDeltaQueue(switchOwnerStableId);
      if (!isCurrentAccountGeneration(switchToken, switchOwnerStableId)) return false;
      if (!discardPendingShardSpend && (await hasQuarantinedShardDeltaQueue(switchOwnerStableId))) {
        transitionFailure.quarantinedShardQueue = true;
        return false;
      }
      if (!isCurrentAccountGeneration(switchToken, switchOwnerStableId)) return false;
      if (!discardPendingShardSpend && finalShardQueue.some((entry) => entry.type === 'spend')) {
        transitionFailure.pendingShardSpend = true;
        return false;
      }
      if (finalShardQueue.some((entry) => entry.type === 'earn')) {
        let backedUp = false;
        try {
          backedUp = await saveAccountSwitchEmergencyBackup(
            'pending_shard_earn_before_account_switch',
            switchOwnerStableId,
          );
        } catch (e: any) {
          transitionFailure.backupDetail = String(e?.message ?? e).slice(0, 80);
          return false;
        }
        if (!backedUp || !isCurrentAccountGeneration(switchToken, switchOwnerStableId)) return false;
      }
      await beginEntitlementSafeAccountTransition();
      return true;
    });
    if (!transitionReady) {
      if (transitionFailure.quarantinedShardQueue) {
        logAuthEvent('auth_signout_wipe_sync_failed_aborted', {
          stage: 'shard_queue_quarantined_final',
        });
        return { ok: false, reason: 'shard_queue_quarantined' };
      }
      if (transitionFailure.pendingShardSpend) {
        logAuthEvent('auth_signout_wipe_sync_failed_aborted', { stage: 'pending_shard_spend_final' });
        return { ok: false, reason: 'pending_shard_spend' };
      }
      if (transitionFailure.backupDetail) {
        logAuthEvent('auth_signout_wipe_failed', {
          stage: 'backup',
          error: transitionFailure.backupDetail,
        });
        return {
          ok: false,
          reason: 'backup_failed',
          detail: transitionFailure.backupDetail,
        };
      }
      logAuthEvent('auth_signout_wipe_sync_failed_aborted', { stage: 'pending_shard_queue' });
      return { ok: false, reason: 'sync_failed' };
    }
    await Promise.all([
      waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
      quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
    ]);
    // 2. Выходим из Google и Firebase Auth.
    await signOutCurrentProvider();
    // 3. Сносим локальный прогресс.
    try {
      await wipeLocalAccountData();
    } catch (e: any) {
      const detail = String(e?.message ?? e).slice(0, 80);
      if (__DEV__) console.warn('[auth_provider] account switch local wipe failed', e);
      logAuthEvent('auth_signout_wipe_failed', { stage: 'wipe', error: detail });
      return { ok: false, reason: 'wipe_failed', detail };
    }
    // 4. Сносим stable_id (новый сгенерируется в ensureAnonUser ниже).
    await clearStableId();
    // Отложенная привязка относится к старому аккаунту — снимаем вместе с ним.
    await clearPendingAuthLink();
    // 5. Поднимаем чистую анонимную Firebase сессию + новый stable_id.
    await ensureAnonUser();
    beginAccountGeneration(await getStableId().catch(() => null));
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
  localAccountDeletionInProgress = true;
  try {
    const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;
    const pendingDeleteStableId = await getStableId().catch(() => null);
    const pendingDeleteLock = await persistAccountDeletePendingAuth(
      pendingDeleteProviderUid,
      pendingDeleteStableId,
    );
    if (!pendingDeleteLock) {
      logAuthEvent('auth_account_delete_guard_persist_failed');
      return { ok: false, reason: 'pending_guard_persist_failed' };
    }
    const cloudDeleteEnqueueOperation = startCloudDeletionEnqueue(pendingDeleteStableId);
    void cloudDeleteEnqueueOperation.acknowledgment
      .then((ack) => {
        logAuthEvent('auth_account_delete_enqueued', { status: ack.status });
      })
      .catch((e) => {
        if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: enqueue failed; pending guard retained', e);
        logAuthEvent('auth_account_delete_enqueue_failed');
      });

    // зачем: удаление аккаунта не трогало уведомления вовсе — cancelAllNotifications
    // вызывался ТОЛЬКО из тумблера в настройках. В результате запланированные локальные
    // напоминания (ежедневное, streak-warning, recap, upsell) оставались на устройстве
    // после удаления, а push-токен исчезал лишь когда серверный воркер асинхронно снесёт
    // документ пользователя — в этом окне бывший пользователь продолжал получать пуши.
    // Privacy policy (legal/privacy_policy_en.json, §20) обещает «clear local app data
    // immediately» и удаление данных, привязанных к stable ID, так что это ещё и
    // расхождение кода с политикой. Делаем ДО signOut, пока авторизация жива: иначе
    // удаление токена из Firestore не пройдёт по правам. Ошибку глушим — она не должна
    // отменять само удаление аккаунта.
    // Импорт ленивый: notifications.ts тяжёлый (расписания, локали, шаблоны), а
    // auth_provider участвует в старте приложения — статический импорт утянул бы его
    // в стартовый бандл ради кода, который нужен один раз за всё время жизни аккаунта.
    // Токен чистим ОТДЕЛЬНЫМ awaited вызовом: cancelAllNotifications внутри себя пускает
    // clearPushTokenForServerPush через `void` (fire-and-forget) — для тумблера настроек
    // это нормально, но здесь гонка с signOut реальна. Запись поля токена требует живой
    // авторизации, поэтому на медленной сети незавершённый запрос упёрся бы в
    // permission-denied уже после выхода, и токен пережил бы удаление аккаунта.
    await Promise.all([
      import('./notifications')
        .then(({ cancelAllNotifications }) => cancelAllNotifications())
        .catch((e: unknown) => {
          if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: notifications cleanup failed', e);
          logAuthEvent('auth_account_delete_notifications_cleanup_failed');
        }),
      import('./push_token_registration')
        .then(({ clearPushTokenForServerPush }) => clearPushTokenForServerPush())
        .catch((e: unknown) => {
          if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: push token cleanup failed', e);
          logAuthEvent('auth_account_delete_push_token_cleanup_failed');
        }),
    ]);

    await beginEntitlementSafeAccountTransition();
    await Promise.all([
      waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
      quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
    ]);
    await cloudDeleteEnqueueOperation.dispatchSettled;

    // Start the durable server request while provider auth is still current, but
    // never let its network acknowledgement block sign-out and local exit.
    let firebaseSignedOut = true;
    try {
      await signOutCurrentProvider();
    } catch (e) {
      firebaseSignedOut = false;
      if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: signOut failed', e);
    }

    const localExitComplete = await completePreparedAccountDeleteLocalExit(
      pendingDeleteLock,
      firebaseSignedOut,
    );
    let rotatedStableId: string | null = null;
    if (CLOUD_SYNC_ENABLED && firebaseSignedOut && localExitComplete) {
      try {
        try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
        rotatedStableId = await ensureAnonUser();
        if (rotatedStableId && rotatedStableId === pendingDeleteStableId) {
          await clearStableId();
          try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
          rotatedStableId = await ensureAnonUser();
        }
      } catch (e) {
        if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: ensureAnonUser failed', e);
      }
    }

    if (localExitComplete && rotatedStableId !== pendingDeleteStableId) {
      beginAccountGeneration(rotatedStableId);
    } else {
      beginAccountGeneration(null);
    }

    if (!firebaseSignedOut) {
      logAuthEvent('auth_account_delete_quarantined', { reason: 'firebase_signout_failed' });
      return { ok: false, reason: 'firebase_signout_failed' };
    }
    if (!localExitComplete || rotatedStableId === pendingDeleteStableId) {
      logAuthEvent('auth_account_delete_quarantined', { reason: 'local_exit_unverified' });
      return { ok: false, reason: 'local_exit_unverified' };
    }
    logAuthEvent('auth_account_deleted', { cloudDeleted: 0 });
    return { ok: true, cloudDeleted: false };
  } finally {
    localAccountDeletionInProgress = false;
  }
}

export type RemoteAccountDeleteResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Clears a device whose still-signed-in provider account was deleted elsewhere. */
export async function handleAccountDeletedOnAnotherDevice(): Promise<RemoteAccountDeleteResult> {
  const providerUid = getAuth()?.currentUser?.uid ?? null;
  const deletedStableId = await getStableId().catch(() => null);
  const pendingDelete = await persistAccountDeletePendingAuth(
    providerUid,
    deletedStableId,
    'remote',
  );
  if (!pendingDelete) return { ok: false, reason: 'pending_guard_persist_failed' };

  await beginEntitlementSafeAccountTransition();
  await Promise.all([
    waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
    quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
  ]).catch((e) => {
    if (__DEV__) console.warn('[auth_provider] remote account delete: transition drain failed', e);
  });

  try {
    await signOutCurrentProvider();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] remote account delete: signOut failed', e);
    return { ok: false, reason: 'firebase_signout_failed' };
  }
  const localExitComplete = await completePreparedAccountDeleteLocalExit(pendingDelete, true);
  if (!localExitComplete) return { ok: false, reason: 'local_exit_unverified' };

  let rotatedStableId: string | null = null;
  if (CLOUD_SYNC_ENABLED) {
    try {
      try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
      rotatedStableId = await ensureAnonUser();
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] remote account delete: ensureAnonUser failed', e);
    }
  }
  if (rotatedStableId === deletedStableId) {
    return { ok: false, reason: 'identity_rotation_failed' };
  }
  await AsyncStorage.setItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY, '1').catch(() => {});
  invalidatePremiumCache();
  beginAccountGeneration(rotatedStableId);
  logAuthEvent('auth_account_deleted_on_another_device');
  return { ok: true };
}

export async function consumeRemoteAccountDeletionNotice(): Promise<boolean> {
  const value = await AsyncStorage.getItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY).catch(() => null);
  if (value !== '1') return false;
  await AsyncStorage.removeItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY).catch(() => {});
  return true;
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
  const auth = getAuth();
  if (auth?.currentUser) {
    await auth.signOut();
  }
  // КРИТИЧНО: сбросить кеш _anonAuthReady в cloud_sync. Без этого следующий
  // ensureAnonUser() сразу возвращает старый resolved Promise, и signInAnonymously
  // никогда не вызывается заново — а currentUser уже null. Любые последующие
  // Firestore writes падают с PERMISSION_DENIED до перезапуска приложения.
  try { resetAnonAuthCacheForSignOut(); } catch { /* ignore */ }
  // зачем: signOutCurrentProvider — единственная точка, через которую проходят
  // ВСЕ пути выхода (явный logout, смена аккаунта, account-delete, recovery-
  // mismatch), включая те, что не доходят до wipeLocalAccountData. Сбрасываем
  // здесь же — иначе на recovery-пути (rejectRecoveryProviderMismatch) кэш
  // множителей предыдущего провайдера мог пережить signOut и утечь в
  // PlayerProfileModal следующего вошедшего аккаунта.
  try {
    const { resetMultiplierBreakdownCache } = await import('./xp_manager');
    resetMultiplierBreakdownCache();
  } catch { /* ignore */ }
  // зачем: cachedLeagueStateSnapshot в league_open_cache_policy.ts — module-scope
  // кэш БЕЗ привязки к uid (см. clearCachedLeagueStateSnapshot). При смене
  // аккаунта на общем девайсе/QA БЕЗ полного рестарта приложения
  // getCachedLeagueStateSync() синхронно отдавал ранг/группу/участников лиги
  // ПРЕДЫДУЩЕГО пользователя следующему вошедшему — утечка чужих данных лиги.
  // signOutCurrentProvider — та же единственная точка всех путей выхода, что и
  // для resetMultiplierBreakdownCache выше, поэтому сбрасываем здесь же.
  try {
    const { clearCachedLeagueStateSnapshot } = await import('./league_open_cache_policy');
    clearCachedLeagueStateSnapshot();
  } catch { /* ignore */ }
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
