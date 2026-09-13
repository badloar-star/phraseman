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
import { DebugLogger } from './debug-logger';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { beginSettingsStorageMutation } from '../lib/startup_settings_read_scope';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId, setStableId, clearStableId, peekStableId, readExistingStableId } from './stable_id';
import {
  ensureAnonUser,
  ensureAnonIdentityDetailed,
  syncToCloud,
  restoreFromCloud,
  restoreFromCloudDetailed,
  forceSyncToCloud,
  quiesceSyncBeforeStableIdSwap,
  quiesceCloudSyncForAccountTransition,
  wipeLocalAccountData,
  startCloudDeletionEnqueue,
  waitForAccountDeletionCredentialSafe,
  resetAnonAuthCacheForSignOut,
  ensureStableAuthLinkForStableIdDetailed,
  mergeStableAccountsViaServer,
  saveAccountSwitchEmergencyBackup,
  type StableAuthLinkMetadata,
  type StableAuthLinkEnsureResult,
  type AccountDeleteEnqueueAck,
} from './cloud_sync';
import type { AccountDeleteEnqueueOperation } from './account_delete_enqueue';
import {
  ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
  ACCOUNT_DELETE_PENDING_AUTH_KEY,
  advanceAccountDeletePendingAuthLock,
  cleanAccountDeleteLockId,
  clearAccountDeletePendingAuthLock,
  createAccountDeleteOperationId,
  inspectAccountDeletePendingAuth,
  isAccountDeleteGuardNoLockSeenError,
  persistAccountDeletePendingAuthLock,
  readAccountDeletePendingAuthRaw,
  restoreAccountDeletePendingAuthMirror,
  runPostDeleteFreshIdentityTransition,
  type AccountDeletePendingAuthLock,
  type AccountDeleteRetiredSubject,
  type FreshPostDeletionIdentityResult,
} from './account_delete_quarantine';
import {
  hasMeaningfulLocalAccountData,
  isLocalAnonymousIdentityProvenCleanForCredentialHandoff,
} from './local_account_data';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  withAccountTransitionLockWithDeadline,
  waitForRestoreApplicationIdleWithDeadline,
  type AccountTransitionLockLease,
} from './account_generation';
import {
  announceAccountSwitchQuarantineFailure,
  clearProviderCredentialHandoff,
  inspectAccountSwitchQuarantine,
  markProviderCredentialHandoffAuthenticated,
  markProviderCredentialHandoffCredentialReady,
  prepareAccountSwitchQuarantine,
  prepareProviderCredentialHandoff,
  resumeAccountSwitchQuarantine,
  type AccountProviderHandoffMarker,
  type AccountSwitchOwnerProvider,
  type AccountSwitchResumeResult,
} from './account_switch_quarantine';
import {
  beginPremiumAccountTransition, invalidatePremiumCache,
  waitForPremiumAccountWorkIdleWithDeadline,
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
import {
  assertNoCleanInstallRecoveryTransition,
  reserveCleanInstallRecoveryAccountTransition,
  setCleanInstallRecoveryGuardCriticalSink,
} from './auth_clean_install_recovery_transition';
import { logEvent, recordError } from './firebase';
import { logAppError } from './app_health';
import { emitAppEvent } from './events';
import { persistPortableProgressRegister } from './phone_state_progress_register_bridge';
import { clearMaxFinalizeOutbox } from './max_voice_finalize_outbox';
import { clearMaxVoiceReviewReceipts } from './max_voice_finalize_client';

WebBrowser.maybeCompleteAuthSession();

// зачем (владелец, 2026-09-13): замок clean-install-recovery блокирует И выход,
// И удаление аккаунта, но отказывал молча — владелец не видел причину вообще.
// Канал подключаем отсюда: сам модуль замка обязан оставаться без зависимостей
// (его тянут юнит-тесты с минимальным моком AsyncStorage).
setCleanInstallRecoveryGuardCriticalSink((context, line) => {
  DebugLogger.error(context, new Error(line), 'critical');
});

/** Подстрока в `SignInResult.error` при нажатии Apple на Android без EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID. */
export const APPLE_ANDROID_MISSING_SERVICE_ID = 'apple_android_missing_service_id';

function providerSubjectFromIdToken(idToken: string): string | null {
  try {
    const payload = String(idToken).split('.')[1];
    const decode = (globalThis as unknown as { atob?: (value: string) => string }).atob;
    if (!payload || typeof decode !== 'function') return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const data = JSON.parse(decode(padded)) as { sub?: unknown };
    const subject = typeof data.sub === 'string' ? data.sub.trim() : '';
    return subject && subject.length <= 160 && !subject.includes('/') ? subject : null;
  } catch {
    return null;
  }
}

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
  } catch (e) {
      // UI refresh is best-effort; auth result must still return.
      DebugLogger.error('auth_provider:emitAuthProviderLinked', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function drainEntitlementSafeAccountTransition(): Promise<void> {
  const premiumWorkDrained = await waitForPremiumAccountWorkIdleWithDeadline(
    ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS,
  );
  if (!premiumWorkDrained) {
    logAuthEvent('auth_premium_account_work_drain_timed_out', {
      timeoutMs: ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS,
    });
  }
}

async function beginEntitlementSafeAccountTransition(): Promise<void> {
  invalidateAccountGeneration();
  beginPremiumAccountTransition();
  await drainEntitlementSafeAccountTransition();
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
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:q', e instanceof Error ? e : new Error(String(e)), 'warning');
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
  } catch (e) {
      // восстановление — best effort
      DebugLogger.error('auth_provider:res', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

const REMOTE_ACCOUNT_DELETED_NOTICE_KEY = 'remote_account_deleted_notice_v1';
let localAccountDeletionInProgress = false;
let localAccountDeletionAttemptCount = 0;

function beginLocalAccountDeletionAttempt(): void {
  localAccountDeletionAttemptCount += 1;
  localAccountDeletionInProgress = true;
}

function endLocalAccountDeletionAttempt(): void {
  localAccountDeletionAttemptCount = Math.max(0, localAccountDeletionAttemptCount - 1);
  localAccountDeletionInProgress = localAccountDeletionAttemptCount > 0;
}

export function isLocalAccountDeletionInProgress(): boolean {
  return localAccountDeletionInProgress;
}

/**
 * Есть ли уже поставленный замок удаления (точка невозврата пройдена).
 *
 * зачем: используется, когда резервация занята — чтобы отличить «удаление уже
 * идёт, просто выпусти человека на онбординг» от настоящей ошибки подготовки.
 */
async function readPendingAccountDeleteLockForHandoff(): Promise<AccountDeletePendingAuthLock | null> {
  try {
    const raw = await readAccountDeletePendingAuthRaw();
    const inspection = inspectAccountDeletePendingAuth(raw);
    return inspection.status === 'active' || inspection.status === 'expired'
      ? inspection.lock
      : null;
  } catch {
    return null;
  }
}

/**
 * Перенимает незавершённый замок удаления, если он принадлежит ТОЙ ЖЕ личности.
 *
 * зачем: без этого одна оборванная попытка (нет сети, приложение убито, отказ
 * записи) навсегда блокировала удаление аккаунта — якорь сверяется по
 * operationId+createdAt, а они у новой попытки другие, поэтому запись всегда
 * отвергалась. Пользователь жал «Удалить» повторно и снова получал ошибку.
 *
 * Возвращает существующий замок (его уже достаточно: точка невозврата пройдена
 * ещё в прошлой попытке), либо null, если замок чужой или нечитаемый — чужой
 * перенимать нельзя, иначе удаление одного аккаунта продолжилось бы под другим.
 */
async function adoptStaleAccountDeleteLock(
  providerUid: string,
  stableId: string | null,
): Promise<AccountDeletePendingAuthLock | null> {
  try {
    const raw = await readAccountDeletePendingAuthRaw();
    const inspection = inspectAccountDeletePendingAuth(raw);
    if (inspection.status !== 'active' && inspection.status !== 'expired') return null;
    const existing = inspection.lock;
    if (!existing) return null;
    // Своей считаем запись, совпавшую хотя бы по одному стабильному признаку:
    // providerUid (привязанный аккаунт) или stableId (аноним/сменившийся токен).
    const sameProvider = existing.providerUid === providerUid;
    const sameStableId = stableId !== null && existing.stableId === stableId;
    if (!sameProvider && !sameStableId) return null;
    return existing;
  } catch {
    return null;
  }
}

async function persistAccountDeletePendingAuth(
  providerUidRaw: string | null | undefined,
  stableIdRaw: string | null | undefined,
  source: AccountDeletePendingAuthLock['source'] = 'local',
): Promise<AccountDeletePendingAuthLock | null> {
  // зачем: замок раньше требовал providerUid и без него возвращал null — то есть
  // удаление ПАДАЛО у всех, кто не привязал Google/Apple (анонимная сессия), а
  // также в момент, когда Firebase ещё не поднял currentUser. Пользователь видел
  // «не удалось подготовить удаление», аккаунт оставался на месте и на онбординг
  // он не попадал. Провайдера может не быть вовсе — это законный случай, а не
  // ошибка: удалять всё равно есть что (stable_id + локальные данные + документ
  // на сервере). Поэтому якорем становится stable_id, а providerUid остаётся
  // пустым — блокировать по нему нечего, старой привязки просто нет.
  const rawProviderUid = cleanAccountDeleteLockId(providerUidRaw);
  const stableId = cleanAccountDeleteLockId(stableIdRaw);
  // Нечего удалять только если нет ВООБЩЕ никакой идентичности.
  if (!rawProviderUid && !stableId) return null;
  // Формат замка требует непустой providerUid, а валидация отвергает пустую
  // строку. Для аккаунта без привязки берём синтетический ключ по stable_id: он
  // непустой и заведомо не совпадёт с настоящим Firebase UID, поэтому вход по
  // Google/Apple он не блокирует — блокировать нечего, привязки нет.
  const providerUid = rawProviderUid ?? `anon:${stableId}`;
  const now = Date.now();
  const capabilityBytes = await Crypto.getRandomBytesAsync(32);
  const credentialSafeCapability = Array.from(capabilityBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const lock: AccountDeletePendingAuthLock = {
    operationId: createAccountDeleteOperationId(providerUid, cleanAccountDeleteLockId(stableIdRaw), now),
    providerUid,
    stableId,
    source,
    phase: 'prepared',
    createdAt: now,
    expiresAt: now + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
    credentialSafeCapability,
  };
  let persisted = await persistAccountDeletePendingAuthLock(lock);
  if (!persisted) {
    // зачем: якорь в SecureStore сверяется по operationId+createdAt, а они у
    // каждой попытки НОВЫЕ. Поэтому один-единственный незавершённый замок
    // (оборванная прошлая попытка, убитое приложение) отвергал все последующие
    // удаления НАВСЕГДА — пользователь жал «Удалить» снова и снова, а получал
    // «не удалось подготовить удаление». Если залипший замок принадлежит этой
    // же личности, перенимаем его вместо отказа: удаление и так незавершённое,
    // продолжить его — ровно то, чего хочет пользователь.
    const adopted = await adoptStaleAccountDeleteLock(providerUid, stableId);
    if (!adopted) return null;
    logAuthEvent('auth_account_delete_stale_lock_adopted');
    if (adopted.credentialSafeCapability) return adopted;
    const upgraded = { ...adopted, credentialSafeCapability };
    return await persistAccountDeletePendingAuthLock(upgraded) ? upgraded : null;
  }
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
      providerUid
      && inspection.lock.providerUid !== providerUid
    ) {
      // A provider UID created by a post-deletion sign-in must never inherit or
      // enqueue the old UID's destructive operation. The subsequent
      // authoritative stable-link call will classify the retained stable ID.
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
  // зачем: на пути «Удалить» из UI локальные данные уже снесены в быстрой фазе
  // (владелец: стирать сразу, не дожидаясь сети). Повторять их снос в фоне —
  // лишняя работа. А на пути восстановления при старте
  // (resumePendingAccountDeleteLocalExit) очистка ещё НЕ делалась, поэтому там
  // флаг остаётся false и функция чистит сама.
  alreadyWipedLocally = false,
): Promise<boolean> {
  let localExitVerified = true;
  if (!alreadyWipedLocally) {
    try {
      await wipeLocalAccountData();
    } catch (e) {
      localExitVerified = false;
      if (__DEV__) console.warn('[auth_provider] pending account delete: local wipe failed', e);
    }
    const finishSettingsMutation = beginSettingsStorageMutation();
    try {
      await AsyncStorage.clear();
    } catch (e) {
      localExitVerified = false;
      if (__DEV__) console.warn('[auth_provider] pending account delete: AsyncStorage.clear failed', e);
    } finally {
      finishSettingsMutation();
    }
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
    phase: 'old_stable_cleared',
  };
  return persistAccountDeletePendingAuthLock(localClearedLock);
}

async function verifyPostDeleteLocalWipe(): Promise<boolean> {
  try {
    const remainingKeys = await AsyncStorage.getAllKeys();
    // AsyncStorage.clear() is the privacy boundary: every account-owned key,
    // including customization/avatar/aura keys unknown to SYNC_KEYS, must be
    // gone. The only permitted row is the non-secret deletion guard mirror
    // restored after clear; authoritative proofs remain in SecureStore.
    return remainingKeys.every((key) => key === ACCOUNT_DELETE_PENDING_AUTH_KEY);
  } catch {
    return false;
  }
}

function traceAccountDeleteLocal(stage: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info(`[account-delete-local] ${stage.replace(/[^a-z0-9_:+-]/gi, '_').slice(0, 180)}`);
  }
}

const postDeleteLocalWipeFlights = new Map<string, Promise<boolean>>();
const verifiedPostDeleteLocalWipes = new Set<string>();

async function executePostDeleteLocalWipe(
  lock: AccountDeletePendingAuthLock | null,
  stableId: string | null,
): Promise<boolean> {
  try {
    traceAccountDeleteLocal('start');
    // Close the old generation before waiting for writers. A writer which
    // already captured it may still be running, so every account-scoped drain
    // is authoritative: timeout means no clear and no fresh identity.
    invalidateAccountGeneration();
    beginPremiumAccountTransition();
    const [premiumDrained, restoreDrained, cloudDrained] = await Promise.all([
      waitForPremiumAccountWorkIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)
        .catch(() => false),
      waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)
        .catch(() => false),
      quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)
        .catch(() => false),
    ]);
    traceAccountDeleteLocal(
      `drains:premium=${premiumDrained ? 1 : 0}:restore=${restoreDrained ? 1 : 0}:cloud=${cloudDrained ? 1 : 0}`,
    );
    if (!premiumDrained || !restoreDrained || !cloudDrained) {
      logAuthEvent('auth_account_delete_writer_drain_failed', {
        premiumDrained: premiumDrained ? 1 : 0,
        restoreDrained: restoreDrained ? 1 : 0,
        cloudDrained: cloudDrained ? 1 : 0,
      });
      return false;
    }
    const phoneStateRetired = await retirePhoneStateForDeletion(stableId);
    traceAccountDeleteLocal(`phone_state_retired=${phoneStateRetired ? 1 : 0}`);
    if (!phoneStateRetired) return false;
    if (stableId) await clearMaxFinalizeOutbox(stableId);
    if (stableId) await clearMaxVoiceReviewReceipts(stableId);
    traceAccountDeleteLocal('outboxes_cleared');
    await wipeLocalAccountData();
    traceAccountDeleteLocal('account_data_wiped');
    const finishSettingsMutation = beginSettingsStorageMutation();
    try {
      await AsyncStorage.clear();
    } finally {
      finishSettingsMutation();
    }
    traceAccountDeleteLocal('async_storage_cleared');
    // AsyncStorage.clear removes the non-authoritative mirror. Restore it only
    // after the privacy wipe, while the SecureStore record/anchor stay durable.
    if (lock) await restoreAccountDeletePendingAuthMirror(lock);
    const verified = await verifyPostDeleteLocalWipe();
    traceAccountDeleteLocal(`readback_verified=${verified ? 1 : 0}`);
    if (!verified) return false;
    invalidatePremiumCache();
    return true;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    traceAccountDeleteLocal(`threw:${detail}`);
    if (__DEV__) console.warn('[auth_provider] post-delete local wipe failed', e);
    return false;
  }
}

async function wipeAndVerifyPostDeleteLocalData(
  lock: AccountDeletePendingAuthLock | null,
  stableId: string | null,
): Promise<boolean> {
  const flightKey = lock?.operationId ?? `anonymous:${stableId ?? 'none'}`;
  if (verifiedPostDeleteLocalWipes.has(flightKey)) return true;
  let flight = postDeleteLocalWipeFlights.get(flightKey);
  if (!flight) {
    traceAccountDeleteLocal(`flight_created:${lock ? 'guarded' : 'anonymous'}`);
    flight = executePostDeleteLocalWipe(lock, stableId);
    postDeleteLocalWipeFlights.set(flightKey, flight);
    void flight.then((verified) => {
      if (verified) verifiedPostDeleteLocalWipes.add(flightKey);
    }).finally(() => {
      if (postDeleteLocalWipeFlights.get(flightKey) === flight) {
        postDeleteLocalWipeFlights.delete(flightKey);
      }
    });
  }
  // The UI gets a bounded fail-closed result. The registered flight remains
  // joinable so a late native/AsyncStorage clear cannot cross into a fresh
  // account generation.
  const result = await withLocalStepDeadline(
    () => flight!,
    false,
    ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,
  );
  traceAccountDeleteLocal(`flight_deadline_result=${result ? 1 : 0}`);
  return result;
}

const phoneStateRetirementFlights = new Map<string, Promise<boolean>>();

async function retirePhoneStateForDeletion(stableId: string | null): Promise<boolean> {
  if (!stableId) return true;
  let flight = phoneStateRetirementFlights.get(stableId);
  if (!flight) {
    flight = import('./phone_state_bootstrap')
      .then(({ retirePhoneStateAfterDeletion }) => retirePhoneStateAfterDeletion(stableId))
      .then(() => true)
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        traceAccountDeleteLocal(`phone_state_retire_threw:${detail}`);
        return false;
      });
    phoneStateRetirementFlights.set(stableId, flight);
    void flight.finally(() => {
      if (phoneStateRetirementFlights.get(stableId) === flight) {
        phoneStateRetirementFlights.delete(stableId);
      }
    });
  }
  const result = await withLocalStepDeadline(() => flight!, false);
  return result;
}

async function retirePhoneStateThenWipe(
  lock: AccountDeletePendingAuthLock | null,
  stableId: string | null,
): Promise<boolean> {
  return wipeAndVerifyPostDeleteLocalData(lock, stableId);
}

type FreshIdentityTrigger = 'delete' | 'startup' | 'foreground' | 'identity_retired';
type RetiredIdentityEvidence = {
  subject?: AccountDeleteRetiredSubject;
  retiredStableId?: string | null;
  metadata?: StableAuthLinkMetadata;
};

const freshIdentityFlights = new Map<string, Promise<FreshPostDeletionIdentityResult>>();
const activeLocalAccountDeletionCompletions = new Map<string, Promise<DeleteAccountResult>>();

function accountDeleteCredentialProof(lock: AccountDeletePendingAuthLock): {
  operationId: string;
  capability: string;
} | null {
  return lock.credentialSafeCapability
    ? { operationId: lock.operationId, capability: lock.credentialSafeCapability }
    : null;
}

async function ensureAccountDeleteCredentialCapability(
  lock: AccountDeletePendingAuthLock,
): Promise<AccountDeletePendingAuthLock | null> {
  if (lock.credentialSafeCapability) return lock;
  const bytes = await Crypto.getRandomBytesAsync(32).catch(() => null);
  if (!bytes || bytes.length !== 32) return null;
  const credentialSafeCapability = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const upgraded = { ...lock, credentialSafeCapability };
  return await persistAccountDeletePendingAuthLock(upgraded) ? upgraded : null;
}

async function ensureAccountDeleteCredentialSafe(
  lock: AccountDeletePendingAuthLock,
): Promise<boolean> {
  const proof = accountDeleteCredentialProof(lock);
  if (!proof) return false;
  try {
    const op = startCloudDeletionEnqueue(lock.stableId, proof);
    const ack = await op.acknowledgment;
    if (ack.authReleased === true && ack.credentialSafe === true) return true;
  } catch (e) {
      // The closure may have committed and deleted Auth while its response was lost.
      DebugLogger.error('auth_provider:ack', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return waitForAccountDeletionCredentialSafe(proof).catch(() => false);
}

async function waitForPostDeleteAuthHydration(): Promise<boolean> {
  const auth = getAuth();
  if (!auth) return false;
  if (auth.currentUser) return true;
  if (typeof auth.onAuthStateChanged !== 'function') return false;
  return new Promise<boolean>((resolve) => {
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
}

async function readPendingDeleteTransition(): Promise<AccountDeletePendingAuthLock | null> {
  const inspection = inspectAccountDeletePendingAuth(await readAccountDeletePendingAuthRaw());
  return inspection.status === 'active' || inspection.status === 'expired'
    ? inspection.lock
    : null;
}

async function synthesizeRemoteDeleteTransition(
  evidence: RetiredIdentityEvidence,
): Promise<AccountDeletePendingAuthLock | null> {
  const authUid = cleanAccountDeleteLockId(getAuth()?.currentUser?.uid);
  const localStableId = await getStableId().catch(() => null);
  const retiredStableId = cleanAccountDeleteLockId(evidence.retiredStableId ?? localStableId);
  const subject = evidence.subject ?? 'unknown';
  const providerAnchor = subject === 'stable'
    ? `stable-only:${retiredStableId ?? localStableId ?? 'unknown'}`
    : authUid ?? `anon:${retiredStableId ?? localStableId ?? 'unknown'}`;
  if (!providerAnchor || (!localStableId && !retiredStableId)) return null;
  const now = Date.now();
  const lock: AccountDeletePendingAuthLock = {
    operationId: createAccountDeleteOperationId(providerAnchor, localStableId, now),
    providerUid: providerAnchor,
    stableId: localStableId,
    ...(retiredStableId && retiredStableId !== localStableId
      ? { serverRetiredStableId: retiredStableId }
      : {}),
    source: 'remote',
    phase: 'prepared',
    createdAt: now,
    expiresAt: now + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
    retiredSubject: subject,
  };
  return await persistAccountDeletePendingAuthLock(lock) ? lock : null;
}

/**
 * One fail-closed coordinator for delete/startup/foreground/retired recovery.
 * Stable-only one-tap provider recovery delegates to the live-provider path
 * below; every other subject rotates through a new anonymous Firebase user.
 */
export async function ensureFreshPostDeletionIdentity(
  trigger: 'delete' | 'startup' | 'foreground' | 'identity_retired',
  evidence: RetiredIdentityEvidence = {},
): Promise<FreshPostDeletionIdentityResult> {
  let lock: AccountDeletePendingAuthLock | null;
  try {
    lock = await readPendingDeleteTransition();
  } catch (e) {
    if (isAccountDeleteGuardNoLockSeenError(e)) {
      return { status: 'pending_auth', phase: 'prepared' };
    }
    return { status: 'fatal_local_guard', phase: null };
  }
  if (!lock && trigger === 'identity_retired') {
    lock = await synthesizeRemoteDeleteTransition(evidence);
  }
  if (!lock) return { status: 'pending_auth', phase: 'prepared' };
  if (lock.source === 'local' && !lock.credentialSafeCapability) {
    lock = await ensureAccountDeleteCredentialCapability(lock);
    if (!lock) return { status: 'fatal_local_guard', phase: 'prepared' };
  }
  // After credential_safe the old Firebase user may already be absent on a
  // restart. Hydration is therefore best-effort only: the durable receipt can
  // advance the guard and the coordinator can create a fresh anonymous user.
  if (lock.source === 'local' && !getAuth()?.currentUser) {
    await waitForPostDeleteAuthHydration().catch(() => false);
  }
  if (lock.retiredSubject === 'stable') {
    const liveProvider = getAuth()?.currentUser;
    if (liveProvider && liveProvider.isAnonymous === false) {
      return ensureFreshStableIdentityForLiveProvider(lock, liveProvider.uid, evidence.metadata);
    }
    return { status: 'pending_auth', phase: lock.phase };
  }

  const existing = freshIdentityFlights.get(lock.operationId);
  if (existing) return existing;
  const run = (async (): Promise<FreshPostDeletionIdentityResult> => {
    // The active delete completion already opened and drained this boundary
    // before it waited for credential_safe. Re-entering it here duplicates the
    // transition and can race consumers joining the same deletion flight.
    if (trigger !== 'delete') await beginEntitlementSafeAccountTransition();
    return runPostDeleteFreshIdentityTransition(lock!, {
      wipeLocal: () => retirePhoneStateThenWipe(
        lock!,
        lock!.stableId ?? lock!.serverRetiredStableId ?? null,
      ),
      enqueueDeletion: async () => {
        // A remote retirement signal is already authoritative. Re-enqueueing
        // here can target a provider session which only supplied the signal;
        // it must never create a second destructive request or denial.
        if (lock!.source === 'remote' && lock!.retiredSubject) return true;
        // Anonymous Firebase UIDs have no reusable email/Apple credential and
        // therefore require no provider quarantine. Older builds could still
        // create a guard for them; let that guard converge locally instead of
        // blocking onboarding on an unnecessary callable round-trip.
        if (
          getAuth()?.currentUser?.isAnonymous === true
          && getAuth()?.currentUser?.uid === lock!.providerUid
        ) return true;
        return ensureAccountDeleteCredentialSafe(lock!);
      },
      signOutProvider: async () => {
        const currentUser = getAuth()?.currentUser;
        if (!currentUser || currentUser.isAnonymous === true) return true;
        try {
          await signOutCurrentProvider();
          const afterSignOut = getAuth()?.currentUser;
          return afterSignOut == null || afterSignOut.isAnonymous === true;
        } catch {
          return false;
        }
      },
      clearOldStable: async () => {
        try {
          await clearStableId();
          await clearPendingAuthLink();
          resetAnonAuthCacheForSignOut();
          return peekStableId() === null;
        } catch {
          return false;
        }
      },
      authenticateAnonymously: () => ensureAnonIdentityDetailed(),
      linkAuthoritatively: async (authUid, stableId) => {
        const linked = await ensureStableAuthLinkForStableIdDetailed(
          stableId,
          undefined,
          { requireAuthoritative: true },
        );
        return {
          ok: linked.ok,
          authUid: linked.authUid,
          stableId: linked.stableUid,
        };
      },
      adoptAuthoritativeStable: async (stableId) => {
        try {
          await setStableId(stableId);
          return peekStableId() === stableId;
        } catch {
          return false;
        }
      },
      beginAccountGeneration,
      persistPhase: advanceAccountDeletePendingAuthLock,
      clearTransition: async () => {
        try {
          await clearAccountDeletePendingAuthLock();
          return true;
        } catch {
          logAuthEvent('auth_account_delete_lock_release_failed');
          return false;
        }
      },
      emitLocalWipeReady: () => emitAppEvent('account_deleted'),
      emitReady: (authUid, stableId) => {
        emitAppEvent('post_delete_identity_ready', { authUid, stableId });
      },
    });
  })().finally(() => {
    freshIdentityFlights.delete(lock!.operationId);
  });
  freshIdentityFlights.set(lock.operationId, run);
  return run;
}

async function ensureFreshStableIdentityForLiveProvider(
  initial: AccountDeletePendingAuthLock,
  liveProviderUid: string,
  metadata?: StableAuthLinkMetadata,
): Promise<FreshPostDeletionIdentityResult> {
  const existing = freshIdentityFlights.get(initial.operationId);
  if (existing) return existing;
  const run = (async (): Promise<FreshPostDeletionIdentityResult> => {
    let lock = initial;
    const persist = async (
      phase: AccountDeletePendingAuthLock['phase'],
      proof: Partial<Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'>> = {},
    ): Promise<boolean> => {
      const result = await advanceAccountDeletePendingAuthLock(lock, phase, proof);
      if (!result.ok) return false;
      lock = result.lock;
      return true;
    };
    await beginEntitlementSafeAccountTransition();
    for (;;) {
      const currentProvider = getAuth()?.currentUser;
      switch (lock.phase) {
        case 'prepared':
          if (!await retirePhoneStateThenWipe(
            lock,
            lock.stableId ?? lock.serverRetiredStableId ?? null,
          )) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          if (!await persist('local_data_cleared')) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          emitAppEvent('account_deleted');
          break;
        case 'local_data_cleared':
          // `identity_retired` with subject:stable is already authoritative.
          // Never enqueue a destructive deletion for this fresh provider UID.
          if (!await persist('server_enqueued')) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          break;
        case 'server_enqueued':
          if (
            !currentProvider
            || currentProvider.isAnonymous !== false
            || currentProvider.uid !== liveProviderUid
          ) return { status: 'pending_auth', phase: lock.phase };
          if (!await persist('provider_identity_verified', { freshAuthUid: liveProviderUid })) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          break;
        case 'provider_identity_verified':
          try {
            await clearStableId();
            await clearPendingAuthLink();
            resetAnonAuthCacheForSignOut();
          } catch {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          if (peekStableId() !== null || !await persist('old_stable_cleared')) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          break;
        case 'old_stable_cleared': {
          if (
            !currentProvider
            || currentProvider.isAnonymous !== false
            || currentProvider.uid !== liveProviderUid
          ) return { status: 'pending_auth', phase: lock.phase };
          const freshStableId = await getStableId().catch(() => null);
          if (
            !freshStableId
            || freshStableId === lock.stableId
            || freshStableId === lock.serverRetiredStableId
          ) return { status: 'fatal_local_guard', phase: lock.phase };
          if (!await persist('provider_stable_created', {
            freshAuthUid: liveProviderUid,
            freshStableId,
          })) return { status: 'fatal_local_guard', phase: lock.phase };
          break;
        }
        case 'provider_stable_created': {
          if (
            !currentProvider
            || currentProvider.isAnonymous !== false
            || currentProvider.uid !== lock.freshAuthUid
          ) return { status: 'pending_auth', phase: lock.phase };
          const linked = await ensureStableAuthLinkForStableIdDetailed(
            lock.freshStableId!,
            metadata,
            { requireAuthoritative: true },
          );
          if (
            !linked.ok
            || linked.authUid !== lock.freshAuthUid
            || linked.stableUid !== lock.freshStableId
          ) return { status: 'pending_offline', phase: lock.phase };
          if (!await persist('stable_link_verified')) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          break;
        }
        case 'stable_link_verified':
          beginAccountGeneration(lock.freshStableId!);
          if (!await persist('ready')) {
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          break;
        case 'ready':
          try {
            await clearAccountDeletePendingAuthLock();
          } catch {
            logAuthEvent('auth_account_delete_lock_release_failed');
            return { status: 'fatal_local_guard', phase: lock.phase };
          }
          emitAppEvent('post_delete_identity_ready', {
            authUid: lock.freshAuthUid!,
            stableId: lock.freshStableId!,
          });
          return {
            status: 'ready',
            authUid: lock.freshAuthUid!,
            stableId: lock.freshStableId!,
          };
        case 'provider_signed_out':
        case 'anonymous_authenticated':
          return { status: 'fatal_local_guard', phase: lock.phase };
        default:
          return { status: 'fatal_local_guard', phase: null };
      }
    }
  })().finally(() => {
    freshIdentityFlights.delete(initial.operationId);
  });
  freshIdentityFlights.set(initial.operationId, run);
  return run;
}

async function convergePendingAccountDeleteBeforeCredential(
  provider: AuthProviderId,
  pendingDelete: AccountDeletePendingAuthLock,
): Promise<boolean> {
  const ageMs = Math.max(0, Date.now() - pendingDelete.createdAt);
  logAuthEvent('auth_signin_waiting_account_delete_pending', { provider, ageMs });
  const activeCompletion = activeLocalAccountDeletionCompletions.get(pendingDelete.operationId);
  if (activeCompletion) await activeCompletion.catch(() => null);
  let remaining: AccountDeletePendingAuthLock | null;
  try {
    remaining = await readPendingDeleteTransition();
  } catch {
    return false;
  }
  if (!remaining) return true;
  const result = await ensureFreshPostDeletionIdentity('foreground');
  if (result.status !== 'ready') {
    if (remaining.phase === 'local_data_cleared') {
      const proof = accountDeleteCredentialProof(remaining);
      if (proof) await waitForAccountDeletionCredentialSafe(proof).catch(() => false);
    }
    logAuthEvent('auth_account_delete_pending_convergence_failed', { provider });
    return false;
  }
  logAuthEvent('auth_account_delete_pending_converged', { provider });
  return true;
}

export async function resumePendingAccountDeleteLocalExit(): Promise<boolean> {
  const result = await ensureFreshPostDeletionIdentity('startup');
  return result.status === 'ready';
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
 * Синхронный peek привязки из auth.currentUser — для мгновенной гидрации
 * первого кадра экрана «Аккаунт» (без Firestore; уточнение — getLinkedAuthInfo).
 */
export function peekLinkedAuthFromCurrentUser(): LinkedAuth | null {
  try {
    return getLinkedAuthFromCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Синхронный peek даты создания аккаунта (metadata.creationTime текущего
 * Firebase-юзера, включая анонимного) — строка «С нами с …» на экране
 * «Аккаунт» без единого сетевого запроса. null — когда auth ещё не поднялся.
 */
export function peekAccountCreatedAtMs(): number | null {
  try {
    const u = getAuth()?.currentUser;
    const ms = coerceFirebaseMetaTime(u?.metadata?.creationTime, 0);
    return ms > 0 ? ms : null;
  } catch {
    return null;
  }
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
  providerSubject?: string;
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

/**
 * Текущий нативный вызов Google-пикера вместе с его состоянием.
 *
 * зачем: владелец, 2026-07-27 — «вход сработал только с 5 попытки, обязано с
 * первой». Промис переиспользуется, чтобы повторное нажатие не открыло ВТОРОЙ
 * пикер поверх первого (нативный вызов нельзя отменить). Но раньше хранился
 * голый промис, и отличить «ещё висит» от «уже отклонён» было невозможно:
 * очистка шла в `.then`, то есть в следующем микротаске. Пользователь успевал
 * нажать раньше — и цеплялся к УЖЕ ОТКЛОНЁННОМУ промису, получая мгновенную
 * ошибку без всякого пикера. Так повторялось до тех пор, пока очистка наконец
 * не отрабатывала — отсюда «с пятой попытки».
 *
 * Флаг `rejected` выставляется СИНХРОННО в обработчике отказа, поэтому:
 *   • промис ещё выполняется → переиспользуем (второй пикер не открываем);
 *   • промис уже отклонён → он бесполезен, начинаем новый вызов.
 */
type GoogleNativeSignInTask = {
  readonly promise: Promise<any>;
  rejected: boolean;
};
let googleNativeSignInInFlight: GoogleNativeSignInTask | null = null;

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
    // зачем: «вход сработал только с 5 попытки, обязано с первой». Отклонённый
    // вызов больше НЕ переиспользуется — см. GoogleNativeSignInTask. Висящий
    // по-прежнему переиспользуется: открыть второй пикер поверх первого нельзя.
    if (googleNativeSignInInFlight?.rejected) {
      googleNativeSignInInFlight = null;
    }
    if (!googleNativeSignInInFlight) {
      const nativeReservation = providerCredentialModeReservation;
      if (!nativeReservation) throw new Error('google_signin_reservation_missing');
      const task: GoogleNativeSignInTask = {
        promise: mod.GoogleSignin.signIn(),
        rejected: false,
      };
      googleNativeSignInInFlight = task;
      nativeReservation.googleNativePending = true;
      const settleNativeTask = () => {
        if (googleNativeSignInInFlight === task) googleNativeSignInInFlight = null;
        nativeReservation.googleNativePending = false;
        releaseProviderCredentialModeReservationIfSettled(nativeReservation);
      };
      task.promise.then(
        settleNativeTask,
        // Помечаем отказ СИНХРОННО, до settleNativeTask: между отказом и
        // очисткой пользователь успевает нажать снова, и без этого флага он
        // цеплялся к мёртвому промису вместо нового пикера.
        (error: unknown) => { task.rejected = true; settleNativeTask(); return error; },
      );
    }
    const nativeTask = googleNativeSignInInFlight;
    if (!nativeTask) throw new Error('google_signin_native_task_missing');
    res = await withTimeout(nativeTask.promise, GOOGLE_SIGNIN_TIMEOUT_MS, 'native_signin');
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
  const providerSubject = String(user?.id ?? '').trim() || providerSubjectFromIdToken(idToken);
  return {
    idToken,
    email: user?.email ?? null,
    displayName: user?.name ?? user?.displayName ?? null,
    ...(providerSubject ? { providerSubject } : {}),
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

// зачем: ASAuthorizationError.unknown ("The authorization attempt failed for
// an unknown reason", код ERR_REQUEST_UNKNOWN — подтверждено в исходниках
// expo-apple-authentication/expo-modules-core) — задокументированный
// транзиентный сбой самой iOS ДО того, как приложение успевает что-либо
// отправить на сервер (владелец поймал его 2026-08-17 на dev-client; лог
// .expo/metro-console.log показал [auth_provider] signInAsync упал этим кодом
// за секунды до успешного входа через Google на том же устройстве). Наш код
// в момент ошибки ничего не делает, кроме ожидания системного окна Apple —
// повторный вызов почти всегда проходит второй попыткой. Один тихий повтор
// без участия юзера закрывает класс бага «показываем ошибку там, где хватило
// бы подождать 1 секунду».
const APPLE_UNKNOWN_ERROR_RETRY_DELAY_MS = 700;

async function runAppleNativeSignIn(): Promise<NativeAuthCredential | { cancelled: true }> {
  const mod = getAppleAuth();
  if (!mod) throw new Error('apple_auth_module_unavailable');

  // Apple receives only SHA256(rawNonce). Firebase receives the matching raw
  // value later and verifies it against the ID token, preventing token replay.
  const { rawNonce, hashedNonce } = await createAppleSignInNonce();
  let credential: any;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      credential = await mod.signInAsync({
        requestedScopes: [mod.AppleAuthenticationScope.FULL_NAME, mod.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      break;
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') {
        return { cancelled: true };
      }
      if (e?.code === 'ERR_REQUEST_UNKNOWN' && attempt === 1) {
        logAuthEvent('auth_signin_apple_unknown_retry', {});
        await new Promise((resolve) => setTimeout(resolve, APPLE_UNKNOWN_ERROR_RETRY_DELAY_MS));
        continue;
      }
      throw e;
    }
  }

  const idToken: string | null = credential?.identityToken ?? null;
  if (!idToken) throw new Error('apple_signin_no_id_token');

  const fullName = credential?.fullName;
  const display =
    fullName && (fullName.givenName || fullName.familyName)
      ? `${fullName.givenName ?? ''} ${fullName.familyName ?? ''}`.trim() || null
      : null;

  const providerSubject = String(credential?.user ?? '').trim()
    || providerSubjectFromIdToken(idToken);
  return {
    idToken,
    email: credential?.email ?? null,
    displayName: display,
    ...(providerSubject ? { providerSubject } : {}),
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
  } catch (e) {
      // ignore JWT parse
      DebugLogger.error('auth_provider:payload', e instanceof Error ? e : new Error(String(e)), 'warning');
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
    } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:n', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }

  const providerSubject = providerSubjectFromIdToken(idToken);
  return {
    idToken,
    email,
    displayName,
    ...(providerSubject ? { providerSubject } : {}),
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
    // зачем транзиенты → warning (2026-08-30): гонка холодного старта Android
    // (anon-auth/App Check ещё поднимаются) даёт identity_unavailable на первой
    // попытке auth_link, а вход самолечится следующей попыткой — оба живых
    // кейса v1.6.14 (13:55 и 04:23) успешно вошли через минуту после алерта.
    // Critical-канал (Firestore + Telegram) держим для детерминированных
    // отказов (mismatch/retired/unknown); транзиент — в локальный журнал.
    const transientAuthLink = stage === 'auth_link'
      && [...AUTH_LINK_TRANSIENT_FAILURES].some((code) => detail.endsWith(`:${code}`));
    const severity = EXPECTED_AUTH_FAILURE_STAGES.has(stage) || transientAuthLink
      ? 'warning'
      : 'critical';
    // logAppError плавает в фоне: try/catch вокруг НЕ ловит async-reject плавающего
    // промиса → любой внутренний сбой логгера становился uncaught «(in promise)»
    // поверх исходной ошибки входа. Диагностика не должна ухудшать исходный путь.
    void logAppError('auth:signin_failure', new Error(d), {
      feature: 'auth',
      severity,
      writeToFirestore: severity === 'critical',
      tags: { provider, stage },
    }).catch(() => {});
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:severity', e instanceof Error ? e : new Error(String(e)), 'warning');
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
  try {
    await assertNoCleanInstallRecoveryTransition();
  } catch {
    // A provider tap made after the delete handoff joins that exact durable
    // transition. Other clean-install/recovery mutations remain excluded.
    const pendingDelete = await readPendingDeleteTransition().catch(() => null);
    if (!pendingDelete) {
      return { result: 'error', error: 'clean_recovery_transition_active' };
    }
  }
  if (providerCredentialModeReservation?.mode === 'recovery') {
    return {
      result: 'error',
      error: `auth_signin_in_progress_recovery_${providerCredentialModeReservation.provider}`,
    };
  }
  // зачем: «зашло только с 5 попытки». Резервация держится, пока
  // googleNativePending=true, а он снимается лишь когда нативный промис
  // завершится сам. Если промис уже ОТКЛОНЁН, держать её не за что: нативного
  // пикера на экране нет, а каждое следующее нажатие мгновенно получало
  // auth_signin_still_running — вход выглядел намертво сломанным. Снимаем такую
  // резервацию и пускаем пользователя войти с первой попытки. Висящий (ещё не
  // завершённый) вызов по-прежнему блокирует — второй пикер поверх него нельзя.
  if (providerCredentialModeReservation?.mode === 'signin' && !providerSignInInFlight) {
    if (googleNativeSignInInFlight?.rejected) {
      logAuthEvent('auth_signin_stale_reservation_cleared', {
        provider: providerCredentialModeReservation.provider,
      });
      googleNativeSignInInFlight = null;
      providerCredentialModeReservation = null;
    } else {
      return {
        result: 'error',
        error: `auth_signin_still_running_${providerCredentialModeReservation.provider}`,
      };
    }
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

type ProviderHandoffLeaseScope = {
  lease: AccountTransitionLockLease | null;
  release: (() => Promise<void>) | null;
};

async function retainProviderHandoffTransitionLease(
  scope: ProviderHandoffLeaseScope,
): Promise<AccountTransitionLockLease> {
  if (scope.lease) return scope.lease;
  let releaseBarrier!: () => void;
  const barrier = new Promise<void>((resolve) => { releaseBarrier = resolve; });
  let resolveLease!: (lease: AccountTransitionLockLease) => void;
  let rejectLease!: (error: unknown) => void;
  const acquired = new Promise<AccountTransitionLockLease>((resolve, reject) => {
    resolveLease = resolve;
    rejectLease = reject;
  });
  const lockTask = withAccountTransitionLockWithDeadline(async (lease) => {
    scope.lease = lease;
    resolveLease(lease);
    await barrier;
  }, ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS);
  void lockTask.then((result) => {
    if (!result.completed) rejectLease(new Error('provider_handoff_lock_timeout'));
  }, rejectLease);
  scope.release = async () => {
    const release = scope.release;
    if (!release) return;
    scope.release = null;
    releaseBarrier();
    await lockTask;
    scope.lease = null;
  };
  return acquired;
}

async function runSignInWithProvider(
  provider: AuthProviderId,
  options: SignInWithProviderOptions,
): Promise<SignInResult> {
  const handoffLeaseScope: ProviderHandoffLeaseScope = { lease: null, release: null };
  try {
    return await runSignInWithProviderWhileOwningHandoffLease(provider, options, handoffLeaseScope);
  } finally {
    await handoffLeaseScope.release?.();
  }
}

async function runSignInWithProviderWhileOwningHandoffLease(
  provider: AuthProviderId,
  options: SignInWithProviderOptions,
  handoffLeaseScope: ProviderHandoffLeaseScope,
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
  let completedPendingDeleteBeforeCredential = false;
  try {
    pendingDeleteBeforeCredential = await readPendingDeleteTransition();
  } catch (guardError) {
    // зачем (инцидент 2026-08-31, iOS 1.6.15): нечитаемый замок ЗАПИРАЛ вход
    // насовсем. Но «не смогли прочитать» ≠ «этот аккаунт удаляется»: класс
    // noLockSeen означает, что следов удаления мы НЕ видели (нет модуля,
    // сорвалось чтение Keychain) — запирать человека на этом нельзя, сервер
    // всё равно авторитетно классифицирует identity на стадии stable-link
    // (identity_retired / permanent denial). Повреждённый ВИДИМЫЙ замок
    // по-прежнему fail-closed.
    captureAuthSignInFailure(
      provider,
      'guard',
      `account_delete_guard_unavailable:${guardError instanceof Error ? guardError.message : 'unknown'}`,
    );
    if (!isAccountDeleteGuardNoLockSeenError(guardError)) {
      return { result: 'error', error: 'account_delete_guard_unavailable' };
    }
    pendingDeleteBeforeCredential = null;
  }
  // зачем: ИНЦИДЕНТ 2026-08-25 — замок удаления имеет право действовать только
  // против СВОЕЙ identity. Чужая (несовпадающая по uid) провайдер-сессия не
  // должна продолжать чужое удаление: раньше это выходило из невиновного
  // аккаунта, стирало его локальные данные и дожимало enqueue, который сервер
  // подменял на живой якорь. Анонимная сессия с фазой prepared — это
  // собственное недоделанное удаление этого устройства, его завершаем как раньше.
  const preCredentialLockOwnsSession =
    pendingDeleteBeforeCredential != null
    && (
      auth.currentUser == null
      || auth.currentUser.isAnonymous !== false
      || auth.currentUser?.uid === pendingDeleteBeforeCredential.providerUid
    );
  if (
    pendingDeleteBeforeCredential
    && preCredentialLockOwnsSession
  ) {
    const converged = await convergePendingAccountDeleteBeforeCredential(
      provider,
      pendingDeleteBeforeCredential,
    );
    if (!converged) return { result: 'error', error: 'account_delete_pending' };
    completedPendingDeleteBeforeCredential = true;
    pendingDeleteBeforeCredential = null;
  }
  if (pendingDeleteBeforeCredential && !preCredentialLockOwnsSession) {
    logAuthEvent('auth_account_delete_foreign_lock_skipped', { stage: 'pre_credential', provider });
  }

  // A provider-authenticated account must never be replaced by opening another
  // provider picker. The only legal A -> B entry is the explicit, durable
  // signOutAndWipeForAccountSwitch transition. Startup same-account recovery is
  // exempt because it proves ownership of the already persisted stable id.
  if (
    auth.currentUser
    && auth.currentUser.isAnonymous === false
    && !options.requireCurrentStableIdOwnership
  ) {
    logAuthEvent('auth_signin_account_switch_required', { provider });
    return { result: 'error', error: 'account_switch_required' };
  }

  // A pending guard on an anonymous session may belong to the provider selected
  // in the picker. Do not generate/bind any stable identity until the credential
  // reveals that provider uid and the mandatory post-credential check runs.
  const deferIdentityPreparation = completedPendingDeleteBeforeCredential
    || pendingDeleteBeforeCredential?.phase === 'prepared';
  const anonPreparation = deferIdentityPreparation
    ? Promise.resolve(null)
    : ensureAnonUser();

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

  try {
    await anonPreparation;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    captureAuthSignInFailure(provider, 'firebase', `anonymous_preparation_failed:${detail}`);
    return { result: 'error', error: 'anonymous_preparation_failed' };
  }
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
  // Стратегия: обычный вход всегда начинает с анонимной identity и может только
  // linkWithCredential, сохраняя uid. Если credential уже принадлежит другому
  // provider account, без durable handoff нельзя вызывать signInWithCredential:
  // Firebase сразу заменит A на B, а любой crash/фоновой sync сможет показать или
  // записать данные A под B. Такой конфликт сохраняет A и требует отдельного,
  // явно подтверждённого account-switch протокола. Единственное исключение ниже —
  // уже подтверждённое pending-delete продолжение, которому provider uid нужен,
  // чтобы идемпотентно закончить удаление одним тапом.
  let firebaseProviderUid: string;
  let firebaseUserForTokenRefresh: any = null;
  let firebaseEmail: string | null = cred.email;
  let firebaseDisplayName: string | null = cred.displayName;
  let providerHandoffMarker: AccountProviderHandoffMarker | null = null;
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
    const canTryLink = Boolean(
      !deferIdentityPreparation &&
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
        // Эти коды означают, что picker выбрал отдельный существующий аккаунт.
        // Не заменяем текущую Firebase identity без durable handoff/receipt.
        const EXPECTED_LINK_CONFLICT = new Set([
          'auth/credential-already-in-use',
          'auth/email-already-in-use',
          'auth/provider-already-linked',
          'auth/account-exists-with-different-credential',
        ]);
        if (EXPECTED_LINK_CONFLICT.has(linkCode)) {
          const sourceAuthUid = String(anonUser?.uid ?? '').trim();
          if (!sourceAuthUid) throw new Error('anonymous_source_uid_missing');
          providerHandoffMarker = await prepareProviderCredentialHandoff({
            operationId: `provider_handoff_${Crypto.randomUUID()}`,
            nonce: `provider_handoff_nonce_${Crypto.randomUUID()}`,
            ownerStableId: preProviderStableId,
            ownerAuthUid: sourceAuthUid,
            provider,
          });
          await retainProviderHandoffTransitionLease(handoffLeaseScope);
          // The durable point-of-no-return precedes generation invalidation and
          // every scan/mutation. The retained global lease stays held through
          // credential replacement and durable handoff finalization, so MAX and
          // every other account writer cannot land after the clean proof.
          await beginEntitlementSafeAccountTransition();
          const [restoreIdle, cloudIdle] = await Promise.all([
            waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
            quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
          ]);
          if (!restoreIdle || !cloudIdle) throw new Error('provider_handoff_quiesce_failed');
          const clean = await isLocalAnonymousIdentityProvenCleanForCredentialHandoff();
          if (!clean) {
            try {
              await clearProviderCredentialHandoff(providerHandoffMarker);
              providerHandoffMarker = null;
              beginAccountGeneration(preProviderStableId);
            } catch {
              announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
              return { result: 'error', error: 'provider_handoff_recovery_required' };
            }
            logAuthEvent('auth_signin_account_switch_required', { provider, source: 'anonymous_link_conflict' });
            return { result: 'error', error: 'account_switch_required' };
          }
          providerHandoffMarker = await markProviderCredentialHandoffCredentialReady(
            providerHandoffMarker,
            cred.providerSubject ?? providerSubjectFromIdToken(cred.idToken),
          );
          await stampAnonOwnershipBeforeSignIn(preProviderStableId);
          userCredential = await auth.signInWithCredential(credential);
          const targetAuthUid = String(userCredential?.user?.uid ?? auth.currentUser?.uid ?? '').trim();
          if (!targetAuthUid) throw new Error('firebase_no_uid');
          providerHandoffMarker = await markProviderCredentialHandoffAuthenticated(
            providerHandoffMarker,
            targetAuthUid,
          );
        } else {
          throw linkErr;
        }
      }
    } else {
      if (!deferIdentityPreparation) {
        // ensureAnonUser completed above. Reaching this branch means auth changed
        // during the picker or the SDK cannot perform the only non-destructive
        // credential mutation. Either case must preserve local A.
        logAuthEvent('auth_signin_account_switch_required', { provider, source: 'anonymous_link_unavailable' });
        return { result: 'error', error: 'account_switch_required' };
      }
      await stampAnonOwnershipBeforeSignIn(preProviderStableId);
      userCredential = await auth.signInWithCredential(credential);
    }

    const fbUser = userCredential?.user ?? auth.currentUser;
    firebaseUserForTokenRefresh = fbUser;
    firebaseProviderUid = fbUser?.uid ?? '';
    if (!firebaseEmail) firebaseEmail = fbUser?.email ?? null;
    if (!firebaseDisplayName) firebaseDisplayName = fbUser?.displayName ?? null;
    if (!firebaseProviderUid) throw new Error('firebase_no_uid');
  } catch (e: any) {
    if (providerHandoffMarker) {
      announceAccountSwitchQuarantineFailure('provider_handoff_incomplete');
    }
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
  } catch (guardError) {
    // зачем: см. выше — noLockSeen не запирает вход, сервер классифицирует сам.
    captureAuthSignInFailure(
      provider,
      'guard',
      `account_delete_guard_unavailable:${guardError instanceof Error ? guardError.message : 'unknown'}`,
    );
    if (!isAccountDeleteGuardNoLockSeenError(guardError)) {
      return { result: 'error', error: 'account_delete_guard_unavailable' };
    }
    pendingDelete = null;
  }
  // зачем: ИНЦИДЕНТ 2026-08-25 — деструктивный ход по замку разрешён только
  // когда вошедший провайдер И ЕСТЬ удаляемая identity (uid совпадает). Чужой
  // замок (например, от удаления другого аккаунта с этого устройства) не должен
  // выходить из невиновной сессии и дожимать чужое удаление — сервер всё равно
  // авторитетно охраняет удалённую identity через tombstone/permanent denial.
  if (pendingDelete && pendingDelete.providerUid === firebaseProviderUid) {
    const converged = await convergePendingAccountDeleteBeforeCredential(provider, pendingDelete);
    if (!converged) return { result: 'error', error: 'account_delete_pending' };
    pendingDelete = null;
  }
  if (pendingDelete) {
    logAuthEvent('auth_account_delete_foreign_lock_skipped', { stage: 'post_credential', provider });
  }

  // зачем: владелец 2026-08-22 — ускорение входа. Обновление токена и чтение
  // auth_links не зависят друг от друга (правило чтения auth_links проверяет
  // только request.auth.uid, не claims токена) — пускаем ПАРАЛЛЕЛЬНО вместо
  // очереди: −1–2 с на каждом входе. Токен обязан быть свежим ДО стадии
  // authEnsureStableLink (claim sign_in_provider) — await стоит сразу после
  // link-lookup ниже; ошибка рефреша пробрасывается там же, как раньше.
  let tokenRefreshFailed = false;
  let tokenRefreshError: unknown = null;
  const tokenRefreshDone: Promise<void> = (async () => {
    if (typeof firebaseUserForTokenRefresh?.getIdToken !== 'function') return;
    // linkWithCredential may leave the cached callable token carrying the old
    // anonymous sign_in_provider claim. Force refresh before authEnsureStableLink.
    await firebaseUserForTokenRefresh.getIdToken(true);
  })().catch((e: unknown) => {
    tokenRefreshFailed = true;
    tokenRefreshError = e;
  });

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

  // Точка синхронизации параллельного рефреша токена (см. комментарий выше):
  // дальше идут только callable-вызовы, которым нужен свежий claim.
  await tokenRefreshDone;
  if (tokenRefreshFailed) throw tokenRefreshError;

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
      // зачем: сервер авторитетно похоронил найденный remote-аккаунт (удалён
      // владельцем на другом устройстве — auth_links всё ещё указывает на него,
      // но users/{remoteStableId} помечен tombstone'ом). Прежде это было тупиком
      // «auth_link_failed» — юзер навсегда терял вход (TestFlight-инцидент
      // 2026-08-25, error local_stable_link_failed:identity_retired). Дизайн от
      // Coordinator keeps a proven-fresh provider for subject:stable so the
      // same tap creates an empty profile. Auth/closure/unknown retirements
      // fail closed through provider sign-out and a fresh anonymous pair.
      if (linkedRemote.failure === 'identity_retired') {
        const retiredSubject = linkedRemote.retiredSubject ?? 'unknown';
        const fresh = await ensureFreshPostDeletionIdentity('identity_retired', {
          subject: retiredSubject,
          retiredStableId: remoteStableId,
          metadata: authLinkMetadata,
        });
        logAuthEvent('auth_signin_identity_retired_recovered', {
          provider,
          subject: retiredSubject,
          ready: fresh.status === 'ready' ? 1 : 0,
        });
        if (retiredSubject === 'stable' && fresh.status === 'ready') {
          emitAuthProviderLinked();
          return { result: 'created_new', email: firebaseEmail, displayName: providerDisplayName };
        }
        return { result: 'error', error: 'identity_retired' };
      }
      // зачем (владелец, 2026-09-01): аккаунт на удалении, но 14 дней ещё идут.
      // НЕ заводим свежую личность — данные целы, и человеку положен модал
      // «Восстановить аккаунт?». Прежде этот случай схлопывался в
      // identity_retired и молча выдавал пустой профиль.
      if (linkedRemote.failure === 'account_delete_pending') {
        logAuthEvent('auth_signin_account_delete_pending', { provider, scope: 'remote' });
        return { result: 'error', error: 'account_delete_pending' };
      }
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
      // зачем: локальный stable_id похоронен серверным tombstone'ом (аккаунт
      // удалён — свежий Keychain stable_id пережил удаление на этом же
      // устройстве). Прежде это было тупиком «auth_link_failed» — юзер навсегда
      // терял вход (TestFlight-инцидент 2026-08-25, error
      // local_stable_link_failed:identity_retired, UID #q663). Дизайн от
      // Stable-only retirement preserves this proven-fresh provider and creates
      // an empty profile in the same attempt. Other subjects rotate fail closed
      // to a fresh anonymous identity before onboarding can continue.
      if (linkedLocal.failure === 'identity_retired') {
        const retiredSubject = linkedLocal.retiredSubject ?? 'unknown';
        const fresh = await ensureFreshPostDeletionIdentity('identity_retired', {
          subject: retiredSubject,
          retiredStableId: localStableId,
          metadata: authLinkMetadata,
        });
        logAuthEvent('auth_signin_identity_retired_recovered', {
          provider,
          subject: retiredSubject,
          ready: fresh.status === 'ready' ? 1 : 0,
        });
        if (retiredSubject === 'stable' && fresh.status === 'ready') {
          emitAuthProviderLinked();
          return { result: 'created_new', email: firebaseEmail, displayName: providerDisplayName };
        }
        return { result: 'error', error: 'identity_retired' };
      }
      // Тот же grace, что и на remote-ветке: аккаунт жив, ротировать личность
      // нельзя — иначе человек потеряет прогресс, который ещё можно вернуть.
      if (linkedLocal.failure === 'account_delete_pending') {
        logAuthEvent('auth_signin_account_delete_pending', { provider, scope: 'local' });
        return { result: 'error', error: 'account_delete_pending' };
      }
      // Тихий deferred link: провайдер-вход УЖЕ состоялся (Firebase-сессия жива
      // и переживёт рестарт), упала только фоновая серверная привязка по
      // ТРАНЗИЕНТНОЙ причине. Вместо ошибки-тупика журналируем намерение и
      // впускаем юзера: boot-restore зовёт тот же ensure с тем же stableId на
      // каждом запуске и сойдётся сам, а processPendingAuthLink дожимает в фоне.
      // mismatch сюда не доходит (защитные ветки выше), swap не требуется —
      // stableId остаётся локальным, чужой/облачный прогресс не показывается.
      if (linkedLocal.failure && AUTH_LINK_TRANSIENT_FAILURES.has(linkedLocal.failure)) {
        if (providerHandoffMarker) {
          announceAccountSwitchQuarantineFailure('provider_handoff_link_pending');
          return { result: 'error', error: 'provider_handoff_recovery_required' };
        }
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
      const preserveLocalProgress = providerHandoffMarker
        ? false
        : await hasMeaningfulLocalAccountData();
      // Сразу синкаем текущий локальный прогресс в облако
      // (на случай если local чуть-чуть свежее — после swap данные не пропадут).
      // syncToCloud у нас пишет в users/{currentLocalStableId} — это корректно ДО swap.
      // Здесь нельзя оставлять обычный debounce: дальше мы меняем stable_id и чистим локальные
      // progress-ключи, поэтому свежий локальный прогресс должен быть отправлен прямо сейчас.
      if (preserveLocalProgress) {
        // зачем: ЭТОТ шаг намеренно остаётся блокирующим и с полным таймаутом —
        // единственная защита свежего локального прогресса перед wipeLocalAccountData.
        // Унести в фон или укоротить = риск потери прогресса на медленной сети.
        const presyncStarted = Date.now();
        try {
          await withTimeout(syncToCloud({ forceNow: true }), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_presync');
          console.log(`[SIGNIN] presync ok ${Date.now() - presyncStarted}ms`);
        } catch (e) {
          console.warn(`[SIGNIN] presync FAIL ${Date.now() - presyncStarted}ms reason=${String((e as any)?.message ?? e).slice(0, 120)}`);
          throw e;
        }
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
      let canonicalStableId: string;
      if (merge?.ok && merge.canonicalStableId) {
        canonicalStableId = merge.canonicalStableId;
      } else {
        // A HOT callable timeout does not cancel the server merge. Never turn a
        // null/pending response into a destructive inferred swap: re-read the
        // authoritative anchor after the reservation/copy boundary.
        const authoritativeAfterMerge = await ensureStableAuthLinkForStableIdDetailed(
          outcome.remoteStableId,
          authLinkMetadata,
          { requireAuthoritative: true },
        );
        if (!authoritativeAfterMerge.ok || !authoritativeAfterMerge.stableUid) {
          return { result: 'error', error: 'merge_pending' };
        }
        canonicalStableId = authoritativeAfterMerge.stableUid;
      }

      // Хвост D: погасить фоновый/отложенный sync ДО смены stable_id, иначе debounce-sync
      // со старым прогрессом запишется в users/{новый canonical} и затрёт слитый аккаунт.
      await quiesceSyncBeforeStableIdSwap();

      // Clear account A while its id is still active, then install server-canonical B.
      // This prevents account A AsyncStorage from being observed under account B.
      await beginEntitlementSafeAccountTransition();
      await withAccountTransitionLock(async (transitionLease) => {
        await wipeLocalAccountData(transitionLease);
        await setStableId(canonicalStableId);
        if (providerHandoffMarker) {
          await clearProviderCredentialHandoff(providerHandoffMarker);
          providerHandoffMarker = null;
        }
        beginAccountGeneration(canonicalStableId);
      }, handoffLeaseScope.lease ?? undefined);

      // Премиум-кэш (premium_guard, TTL 5 мин) держит решение ПРЕДЫДУЩЕГО аккаунта.
      // Без сброса до 5 минут после свапа в UI виден чужой премиум-статус.
      invalidatePremiumCache();

      // Гарантируем Firebase Auth state ready (после signInWithCredential anon → google)
      await ensureAnonUser();

      // зачем: владелец 2026-08-29 «сделать мгновенным». Ядро свапа выше
      // (merge → wipe → setStableId) обязано быть блокирующим: до него на
      // экране данные СТАРОГО аккаунта, и показать профиль раньше нельзя.
      // А догрузка (restore + шарды + бэкап + ник + RC) — это два таймаута по
      // 20с, ради которых человек ждал впустую. Уносим их в фон: stable_id уже
      // канонический, поколение открыто выше в withAccountTransitionLock,
      // поэтому передаём preparedStableId и не сбрасываем его повторно.
      // Шарды при этом грузятся ДО первого addShards/spendShards, потому что
      // загрузка идёт первым шагом фоновой цепочки, а не по тапу пользователя.
      scheduleSameStablePostAuthRefresh('swap_restore', { preparedStableId: canonicalStableId });

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
        await withAccountTransitionLock(async (transitionLease) => {
          await wipeLocalAccountData(transitionLease);
          await setStableId(canonicalStableId);
          if (providerHandoffMarker) {
            await clearProviderCredentialHandoff(providerHandoffMarker);
            providerHandoffMarker = null;
          }
          beginAccountGeneration(canonicalStableId);
        }, handoffLeaseScope.lease ?? undefined);
        invalidatePremiumCache();
        await ensureAnonUser();
        // зачем: см. swap-ветку — догрузка уходит в фон, ядро свапа выше блокирующее.
        scheduleSameStablePostAuthRefresh('keeplocal_restore', { preparedStableId: canonicalStableId });
      } else if (merge?.ok) {
        // canonical == local: премиум/VIP-блок remote слит в наш local-док сервером.
        // Инвалидируем кэш и тянем слитое состояние в AsyncStorage (иначе VIP не виден).
        // stable_id НЕ менялся — фоновая догрузка сама возьмёт текущий.
        invalidatePremiumCache();
        scheduleSameStablePostAuthRefresh('keeplocal_restore_same');
      }
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] merged_keep_local server-merge failed', e);
      // A durable credential handoff cannot degrade past an uncertain merge:
      // provider B is already active while generation A stays quarantined.
      // Keep the marker for boot recovery instead of exposing either identity.
      if (providerHandoffMarker) {
        announceAccountSwitchQuarantineFailure('provider_handoff_merge_pending');
        return { result: 'error', error: 'provider_handoff_recovery_required' };
      }
      // Ordinary in-place links retain the established best-effort behavior.
    }
    if (providerHandoffMarker) {
      try {
        await clearProviderCredentialHandoff(providerHandoffMarker);
        providerHandoffMarker = null;
        beginAccountGeneration(localStableId);
      } catch {
        announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
        return { result: 'error', error: 'provider_handoff_recovery_required' };
      }
    }
    // Local выиграл → человеческий ник из Google вместо автогена, ПОТОМ синк
    // (чтобы новый ник ушёл в облако одним пакетом).
    // зачем: не держим экран — это косметика профиля, а не условие входа.
    void (async () => {
      try {
        await markOnboardedAfterSignIn();
        await syncRevenueCatAfterAuthLink();
        await syncToCloud();
      } catch (e) {
        console.warn(`[SIGNIN] keep_local tail failed reason=${String((e as any)?.message ?? e).slice(0, 160)}`);
      }
    })();
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
    if (providerHandoffMarker) {
      try {
        await clearProviderCredentialHandoff(providerHandoffMarker);
        providerHandoffMarker = null;
        beginAccountGeneration(localStableId);
      } catch {
        announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
        return { result: 'error', error: 'provider_handoff_recovery_required' };
      }
    }
    scheduleSameStablePostAuthRefresh('linked_restore');
    logAuthEvent('auth_signin_linked', { provider });
    scheduleReferralApplyAfterLink();
    emitAuthProviderLinked();
    return { result: 'linked_existing', email: firebaseEmail, displayName: providerDisplayName };
  }

  // outcome.kind === 'created_new'
  // Тот же подход: сначала restore, потом sync только если local не пустой.
  if (providerHandoffMarker) {
    try {
      await clearProviderCredentialHandoff(providerHandoffMarker);
      providerHandoffMarker = null;
      beginAccountGeneration(localStableId);
    } catch {
      announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
      return { result: 'error', error: 'provider_handoff_recovery_required' };
    }
  }
  scheduleSameStablePostAuthRefresh('created_restore');
  logAuthEvent('auth_signin_created', { provider });
  scheduleReferralApplyAfterLink();
  emitAuthProviderLinked();
  return { result: 'created_new', email: firebaseEmail, displayName: providerDisplayName };
}

/**
 * Фоновая догрузка после входа. Возвращает управление СРАЗУ — экран входа
 * закрывается, не дожидаясь сети.
 *
 * зачем: владелец 2026-08-29 — «сделать чтобы был мгновенным». Раньше вход
 * ждал restoreFromCloud + шарды + бэкап последовательно (два таймаута по 20с,
 * худший случай ~47с), и человек всё это время смотрел на «Входим...».
 * Теперь ядро (привязка/merge/swap stable_id) остаётся блокирующим — его
 * нельзя прерывать без потери данных, — а всё, что лишь ДОГРУЖАЕТ данные,
 * уходит сюда. Гонки закрыты isCurrentAccountGeneration: поздний ответ
 * прошлого аккаунта не затирает свежий (см. app/account_generation.ts).
 *
 * `preparedStableId` — для merge-веток, где stable_id уже подменён вызывающим
 * кодом и повторный beginAccountGeneration сбросил бы чужое поколение.
 */
function scheduleSameStablePostAuthRefresh(
  stage: 'linked_restore' | 'created_restore' | 'swap_restore' | 'keeplocal_restore' | 'keeplocal_restore_same',
  options: { preparedStableId?: string } = {},
): void {
  void (async () => {
    const t0 = Date.now();
    const stableId = options.preparedStableId ?? (await getStableId().catch(() => null));
    // зачем: в merge-ветках поколение уже открыто под новый stable_id —
    // второй beginAccountGeneration сделал бы токен вызывающего устаревшим.
    if (!options.preparedStableId) beginAccountGeneration(stableId);
    const generation = captureAccountGeneration();
    const isCurrent = () => isCurrentAccountGeneration(generation, stableId);
    let restoreResult: 'restored' | 'not_found' | 'failed' = 'failed';
    // зачем: [SIGNIN] — единый префикс, чтобы владелец одним grep увидел,
    // какой шаг сколько занял. Раньше ни один шаг не мерился, и «долго»
    // приходилось оценивать по таймаутам из кода, а не по факту.
    const step = async <T,>(name: string, run: () => Promise<T>): Promise<T | undefined> => {
      const started = Date.now();
      try {
        const value = await run();
        console.log(`[SIGNIN] bg:${stage}:${name} ok ${Date.now() - started}ms`);
        return value;
      } catch (e) {
        // зачем: немой catch запрещён — причина обязана попасть в лог.
        console.warn(`[SIGNIN] bg:${stage}:${name} FAIL ${Date.now() - started}ms reason=${String((e as any)?.message ?? e).slice(0, 120)}`);
        return undefined;
      }
    };

    restoreResult = (await step('restoreFromCloud', () =>
      withTimeout(restoreFromCloudDetailed(), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, stage),
    )) ?? 'failed';
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_restore`); return; }
    await step('loadShards', () => loadShardsFromCloud(isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_shards`); return; }
    await step('switchBackup', () => tryRestoreAccountSwitchBackup(stage, isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_backup`); return; }
    await step('markOnboarded', () => markOnboardedAfterSignIn(isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_onboarded`); return; }
    await step('revenueCat', () => syncRevenueCatAfterAuthLink(isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_rc`); return; }
    if (restoreResult !== 'failed' && await hasMeaningfulLocalAccountData()) {
      if (!isCurrent()) return;
      await syncToCloud({ forceNow: true }).catch(() => {});
    } else if (__DEV__) {
      console.warn(`[auth_provider] ${stage}: skipping syncToCloud — local AsyncStorage empty`);
    }
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_before_hydrate`); return; }
    // зачем: экран уже открыт — это событие плавно обновляет цифры,
    // когда облако догрузилось (без «прыжка» из ниоткуда).
    if (restoreResult === 'restored') emitAppEvent('cloud_profile_hydrated');
    console.log(`[SIGNIN] bg:${stage} done total=${Date.now() - t0}ms restore=${restoreResult}`);
  })().catch((e) => {
    // зачем: раньше причина падения фоновой догрузки терялась в __DEV__-only логе.
    console.warn(`[SIGNIN] bg:${stage} background refresh failed reason=${String((e as any)?.message ?? e).slice(0, 160)}`);
  });
}

async function markOnboardedAfterSignIn(isCurrent: () => boolean = () => true): Promise<void> {
  try {
    const userName = (await AsyncStorage.getItem('user_name'))?.trim();
    if (!userName) return;
    const cur = await AsyncStorage.getItem('onboarding_done');
    if (cur !== '1') {
      if (!isCurrent()) return;
      await persistPortableProgressRegister('onboarding_done', '1');
    }
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:cur', e instanceof Error ? e : new Error(String(e)), 'warning');
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
function currentAccountSwitchOwnerProvider(): AccountSwitchOwnerProvider {
  const user = getAuth()?.currentUser;
  if (!user) return 'none';
  if (user.isAnonymous === true) return 'anonymous';
  const providers = Array.isArray(user.providerData) ? user.providerData : [];
  if (providers.some((entry: { providerId?: string }) => entry?.providerId === 'apple.com')) return 'apple';
  if (providers.some((entry: { providerId?: string }) => entry?.providerId === 'google.com')) return 'google';
  return 'none';
}

function accountSwitchRecoveryDependencies() {
  return {
    readStableId: async (): Promise<string | null> => {
      const stableId = peekStableId() ?? await readExistingStableId().catch(() => null);
      invalidateAccountGeneration();
      return stableId;
    },
    readCachedStableId: (): string | null => peekStableId(),
    readAuthUser: (): {
      uid: string;
      isAnonymous: boolean;
      provider: AccountSwitchOwnerProvider;
      providerSubject?: string;
      providerSubjects?: Readonly<Partial<Record<'google' | 'apple', string>>>;
    } | null => {
      const user = getAuth()?.currentUser;
      const uid = String(user?.uid ?? '').trim();
      const provider = currentAccountSwitchOwnerProvider();
      const providers = Array.isArray(user?.providerData) ? user.providerData : [];
      const providerSubjects = providers.reduce((proofs: Partial<Record<'google' | 'apple', string>>, entry: {
        providerId?: string;
        uid?: string;
      }) => {
        const subject = String(entry?.uid ?? '').trim();
        if (!subject) return proofs;
        if (entry?.providerId === 'google.com') proofs.google = subject;
        if (entry?.providerId === 'apple.com') proofs.apple = subject;
        return proofs;
      }, {});
      const providerId = provider === 'google' ? 'google.com' : provider === 'apple' ? 'apple.com' : '';
      const providerSubject = String(
        providers.find((entry: { providerId?: string }) => entry?.providerId === providerId)?.uid ?? '',
      ).trim();
      return uid ? {
        uid,
        isAnonymous: user?.isAnonymous === true,
        provider,
        ...(Object.keys(providerSubjects).length > 0 ? { providerSubjects } : {}),
        ...(providerSubject ? { providerSubject } : {}),
      } : null;
    },
    invalidateGeneration: (): void => { invalidateAccountGeneration(); },
    beginPremiumTransition: (): void => { beginPremiumAccountTransition(); },
    quiesce: async (): Promise<boolean> => {
      const [premiumIdle, restoreIdle, cloudIdle] = await Promise.all([
        waitForPremiumAccountWorkIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
        waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
        quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
      ]);
      return premiumIdle && restoreIdle && cloudIdle;
    },
    signOut: async (): Promise<void> => { await signOutCurrentProvider(); },
    wipeLocalData: async (): Promise<void> => { await wipeLocalAccountData(); },
    clearStableId: async (): Promise<void> => {
      await clearStableId();
      await clearPendingAuthLink();
    },
    ensureAnonymousIdentity: async (): Promise<void> => {
      await ensureAnonUser();
      await getStableId();
    },
    activateGeneration: (stableId: string): void => { beginAccountGeneration(stableId); },
  };
}

export function resumePendingAccountSwitchQuarantine(): Promise<AccountSwitchResumeResult> {
  return resumeAccountSwitchQuarantine(accountSwitchRecoveryDependencies());
}

async function prepareDurableAccountSwitch(ownerStableId: string): Promise<void> {
  const authUser = getAuth()?.currentUser;
  await prepareAccountSwitchQuarantine({
    operationId: `switch_${Crypto.randomUUID()}`,
    nonce: `nonce_${Crypto.randomUUID()}`,
    ownerStableId,
    ownerAuthUid: String(authUser?.uid ?? '').trim() || null,
    ownerProvider: currentAccountSwitchOwnerProvider(),
  });
}

function mapAccountSwitchRecoveryFailure(result: Exclude<
  AccountSwitchResumeResult,
  { result: 'none' | 'completed' }
>): SignOutSwitchResult {
  if (result.reason === 'wipe_failed') {
    const detail = result.result === 'retryable' ? result.detail : undefined;
    return { ok: false, reason: 'wipe_failed', detail: detail ?? result.reason };
  }
  return { ok: false, reason: 'recovery_required', detail: result.reason };
}

export type SignOutSwitchResult =
  | { ok: true; synced: boolean }
  | { ok: false; reason: 'clean_recovery_transition_active' }
  | { ok: false; reason: 'sync_failed' }
  | { ok: false; reason: 'pending_shard_spend' }
  | { ok: false; reason: 'shard_queue_quarantined' }
  | { ok: false; reason: 'backup_failed' | 'wipe_failed'; detail: string }
  | { ok: false; reason: 'recovery_required'; detail: string }
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
  let releaseTransitionReservation: () => void;
  const startedAt = Date.now();
  // зачем (владелец, 2026-09-13): «сперва логи». Путь выхода был нем целиком —
  // в metro-console.log по нему НОЛЬ строк. Печатаем вход, исход и длительность.
  console.log('[ACC-MUT] signout:in', JSON.stringify({
    allowWipeWithoutSync: options?.allowWipeWithoutSync === true,
    allowPendingShardSpendDiscard: options?.allowPendingShardSpendDiscard === true,
  }));
  try {
    releaseTransitionReservation = await reserveCleanInstallRecoveryAccountTransition();
  } catch (error) {
    // Ранний выход: замок. Причину (какой ключ) уже напечатал сам guard.
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[ACC-MUT] signout:out reserve_failed reason=${reason} tookMs=${Date.now() - startedAt}`);
    return { ok: false, reason: 'clean_recovery_transition_active' };
  }
  try {
    const result = await signOutAndWipeForAccountSwitchReserved(options);
    console.log('[ACC-MUT] signout:out', JSON.stringify({
      ok: result.ok,
      reason: result.ok ? null : result.reason,
      detail: !result.ok && 'detail' in result ? String(result.detail ?? '') : null,
      synced: result.ok ? result.synced : null,
      tookMs: Date.now() - startedAt,
    }));
    return result;
  } finally {
    releaseTransitionReservation();
  }
}

async function signOutAndWipeForAccountSwitchReserved(
  options?: SignOutSwitchOptions,
): Promise<SignOutSwitchResult> {
  const existingTransition = await inspectAccountSwitchQuarantine().catch(() => ({ status: 'corrupt' as const }));
  if (existingTransition.status !== 'none') {
    if (existingTransition.status === 'corrupt') {
      invalidateAccountGeneration();
      beginPremiumAccountTransition();
      return { ok: false, reason: 'recovery_required', detail: 'marker_invalid' };
    }
    const resumed = await resumePendingAccountSwitchQuarantine();
    return resumed.result === 'completed'
      ? { ok: true, synced: false }
      : resumed.result === 'none'
        ? { ok: false, reason: 'recovery_required', detail: 'marker_missing' }
        : mapAccountSwitchRecoveryFailure(resumed);
  }
  if (!CLOUD_SYNC_ENABLED) {
    // В Expo Go / без облака просто чистим локально — ничего терять не можем.
    try {
      const ownerStableId = await getStableId();
      const backedUp = await saveAccountSwitchEmergencyBackup(
        'final_account_snapshot_before_no_cloud_switch',
        ownerStableId,
      );
      if (!backedUp) {
        return { ok: false, reason: 'backup_failed', detail: 'account_switch_backup_unavailable' };
      }
      await prepareDurableAccountSwitch(ownerStableId);
      const resumed = await resumePendingAccountSwitchQuarantine();
      if (resumed.result !== 'completed') {
        return resumed.result === 'none'
          ? { ok: false, reason: 'recovery_required', detail: 'marker_missing' }
          : mapAccountSwitchRecoveryFailure(resumed);
      }
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
    const transitionLock = await withAccountTransitionLockWithDeadline(async (): Promise<boolean> => {
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
      // General cloud sync does not own the Learning V2 completion spool.
      // Always take one final account-wide snapshot while holding the same
      // transition lock as local completion writers. This closes both the
      // "general sync succeeded but completion is still pending" loss and the
      // getAllKeys→multiGet race immediately before the wipe.
      try {
        const backedUp = await saveAccountSwitchEmergencyBackup(
          'final_account_snapshot_before_switch',
          switchOwnerStableId,
        );
        if (!backedUp) {
          transitionFailure.backupDetail = 'account_switch_backup_unavailable';
          return false;
        }
      } catch (e: any) {
        transitionFailure.backupDetail = String(e?.message ?? e).slice(0, 80);
        return false;
      }
      if (!isCurrentAccountGeneration(switchToken, switchOwnerStableId)) return false;
      // Point of no return: the exact owner-bound marker is durably verified
      // before generation invalidation, provider sign-out, or any local wipe.
      await prepareDurableAccountSwitch(switchOwnerStableId);
      await beginEntitlementSafeAccountTransition();
      return true;
    }, ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS);
    if (!transitionLock.completed) {
      logAuthEvent('auth_signout_wipe_sync_failed_aborted', { stage: 'account_transition_lock_timeout' });
      return { ok: false, reason: 'sync_failed' };
    }
    const transitionReady = transitionLock.value;
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
    const resumed = await resumePendingAccountSwitchQuarantine();
    if (resumed.result !== 'completed') {
      return resumed.result === 'none'
        ? { ok: false, reason: 'recovery_required', detail: 'marker_missing' }
        : mapAccountSwitchRecoveryFailure(resumed);
    }
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

/**
 * Результат БЫСТРОЙ фазы удаления — единственное, чего ждёт UI.
 *
 * `ok: true` означает: точка невозврата пройдена И строгая локальная очистка
 * подтверждена. Замок account_delete_pending_auth уже лежит в SecureStore в
 * фазе не ниже local_data_cleared, а значит:
 *   • старая почта / Apple ID уже НЕ пускают в старый аккаунт
 *     (signInWithProvider → handleAccountDeletePendingAuth);
 *   • даже если приложение убить прямо сейчас, следующий запуск дочистит всё
 *     сам через resumePendingAccountDeleteLocalExit() в _layout.
 * Поэтому UI имеет полное право закрыться и уйти в онбординг немедленно.
 */
export type DeleteAccountHandoff =
  | { ok: true; completion: Promise<DeleteAccountResult> }
  | { ok: false; reason: string };

/**
 * зачем: владелец требует, чтобы удаление ощущалось мгновенным — по нажатию
 * «Удалить» настройки обязаны схлопнуться и открыть онбординг СРАЗУ, а вся
 * серверная работа шла фоном. Раньше UI ждал `deleteAccountAndWipe()` целиком:
 * enqueue Cloud Function, drain-таймауты, Google/Firebase signOut и
 * ensureAnonUser — это сетевые раунд-трипы, на плохой сети десятки секунд, во
 * время которых модалка блокировала себя (editable={!deleting}, кнопки disabled)
 * и настройки выглядели зависшими намертво.
 *
 * Теперь удаление разрезано на две фазы:
 *   1. beginAccountDeletion() — ТОЛЬКО локальное и быстрое: поставить замок в
 *      SecureStore + запустить (не дожидаясь) enqueue. Это её ждёт UI.
 *   2. остаток — сеть и очистка — уходит в фон и логируется; при обрыве его
 *      подхватывает resumePendingAccountDeleteLocalExit() на следующем старте.
 *
 * Счётчик localAccountDeletionInProgress держится ВСЮ фоновую фазу (а не только
 * быструю), иначе remote-монитор в _layout успел бы принять наше же удаление за
 * «удалили с другого устройства» и запустил бы второй, конкурирующий wipe.
 *
 * Резервация clean-install-recovery, наоборот, снимается сразу после быстрой
 * фазы: это счётчик в памяти, и удержание его на время сети блокировало бы
 * повторные попытки удаления.
 */
export async function beginAccountDeletion(): Promise<DeleteAccountHandoff> {
  beginLocalAccountDeletionAttempt();
  let releaseTransitionReservation: () => void;
  // зачем (владелец, 2026-09-13): «сперва логи» — путь удаления был нем.
  console.log('[ACC-MUT] delete:in');
  try {
    releaseTransitionReservation = await reserveCleanInstallRecoveryAccountTransition();
  } catch {
    endLocalAccountDeletionAttempt();
    console.warn('[ACC-MUT] delete:reserve_failed — замок занят, ищем уже идущую попытку');
    // зачем: резервацию мог держать НАШ ЖЕ незавершённый фон (сеть висит) или
    // оборванная прошлая попытка. Раньше это давало пользователю «не удалось
    // подготовить удаление» на каждое повторное нажатие. Повтор может присоединить
    // только уже запущенный completion или доказанную фазу local_data_cleared+;
    // один prepared guard ещё не доказывает, что старые данные стёрты.
    const alreadyPending = await readPendingAccountDeleteLockForHandoff();
    console.warn(`[ACC-MUT] delete:already_pending=${alreadyPending ? alreadyPending.phase : 'none'}`);
    if (alreadyPending) {
      const activeCompletion = activeLocalAccountDeletionCompletions.get(alreadyPending.operationId);
      if (activeCompletion) {
        console.log('[ACC-MUT] delete:out joined_active_completion');
        return { ok: true, completion: activeCompletion };
      }
      // A prepared guard proves only that destructive work was requested. It
      // does not prove phone-state retirement, AsyncStorage clear, or strict
      // readback. Letting the UI leave here can expose the old account under a
      // fresh onboarding shell while the first attempt is still stalled.
      if (alreadyPending.phase === 'prepared') {
        console.warn('[ACC-MUT] delete:out local_wipe_unverified (phase=prepared)');
        return { ok: false, reason: 'local_wipe_unverified' };
      }
      console.log(`[ACC-MUT] delete:out resumed_phase=${alreadyPending.phase}`);
      return { ok: true, completion: Promise.resolve({ ok: true, cloudDeleted: false }) };
    }
    console.warn('[ACC-MUT] delete:out clean_recovery_transition_active (замок держит, своей попытки нет)');
    return { ok: false, reason: 'clean_recovery_transition_active' };
  }

  let prepared: PreparedAccountDeletion | 'local_wipe_unverified' | null = null;
  try {
    prepared = await prepareAccountDeletion();
  } catch (e) {
    // зачем (владелец, 2026-09-13): раньше причина жила только под __DEV__ и
    // в релизе исчезала — а prepared=null отсюда неотличим от честного отказа.
    const detail = String((e as any)?.message ?? e).slice(0, 120);
    console.warn(`[ACC-MUT] delete:prepare_threw reason=${detail}`);
    DebugLogger.error('acc_mut:delete_prepare_threw', new Error(detail), 'critical');
  }
  console.log(`[ACC-MUT] delete:prepared=${prepared === null ? 'null' : prepared === 'local_wipe_unverified' ? 'local_wipe_unverified' : 'ok'}`);

  if (prepared === 'local_wipe_unverified') {
    releaseTransitionReservation();
    endLocalAccountDeletionAttempt();
    console.warn('[ACC-MUT] delete:out local_wipe_unverified');
    return { ok: false, reason: 'local_wipe_unverified' };
  }

  if (!prepared) {
    // зачем: связанный (почта/Apple) аккаунт нельзя выпускать без замка — тот же
    // провайдер сразу восстановит данные. Для анонима блокировать нечего, поэтому
    // ему удаление доводится до конца, как требовал владелец.
    const anonymous = getAuth()?.currentUser?.isAnonymous === true;
    releaseTransitionReservation();
    endLocalAccountDeletionAttempt();
    console.warn(`[ACC-MUT] delete:out pending_guard_persist_failed anonymous=${anonymous}`);
    DebugLogger.error(
      'acc_mut:delete_guard_persist_failed',
      new Error(`[ACC-MUT] delete pending_guard_persist_failed anonymous=${anonymous}`),
      'critical',
    );
    return { ok: false, reason: 'pending_guard_persist_failed' };
  }

  const pendingOperationId = prepared.pendingDeleteLock?.operationId ?? null;
  const backgroundStartedAt = Date.now();
  const completion = (async () => {
    try {
      const result = await finishAccountDeletion(prepared);
      // зачем (владелец, 2026-09-13): ИМЕННО ЗДЕСЬ терялось удаление аккаунта.
      // UI показывает «удалено» сразу после локальной фазы, а исход серверной
      // приходил только в logAuthEvent → logEvent, который молчит без согласия
      // на аналитику (app/firebase.ts:36) и глушит ошибку отправки (:41).
      // Человек видел чистый онбординг, а аккаунт на сервере оставался жив,
      // и владелец об этом не узнавал. Дублируем исход в канал, который
      // реально долетает (DebugLogger 'critical' → Firestore).
      const line = `[ACC-MUT] delete:bg_out ok=${result.ok} reason=${result.ok ? 'none' : String(result.reason)} cloudDeleted=${result.ok ? String(result.cloudDeleted) : 'n/a'} tookMs=${Date.now() - backgroundStartedAt}`;
      if (__DEV__) console.log(line);
      if (!result.ok) {
        DebugLogger.error('acc_mut:delete_background_failed', new Error(line), 'critical');
      }
      return result;
    } catch (e) {
      const line = `[ACC-MUT] delete:bg_threw reason=${String((e as any)?.message ?? e).slice(0, 120)} tookMs=${Date.now() - backgroundStartedAt}`;
      if (__DEV__) console.warn(line);
      logAuthEvent('auth_account_delete_background_failed');
      DebugLogger.error('acc_mut:delete_background_threw', new Error(line), 'critical');
      return { ok: false, reason: 'unknown' } as DeleteAccountResult;
    } finally {
      if (pendingOperationId) activeLocalAccountDeletionCompletions.delete(pendingOperationId);
      releaseTransitionReservation();
      endLocalAccountDeletionAttempt();
    }
  })();
  if (pendingOperationId) activeLocalAccountDeletionCompletions.set(pendingOperationId, completion);
  // зачем: completion живёт в фоне и его никто не обязан ждать. Без этой
  // заглушки отказ внутри превратился бы в unhandled rejection. Причина при
  // этом НЕ теряется — её печатает и шлёт владельцу блок выше.
  void completion.catch(() => {});

  return { ok: true, completion };
}

/**
 * Полный синхронный путь — ждёт и быструю, и фоновую фазу.
 * Оставлен для тестов и не-UI вызовов; экран удаления использует
 * beginAccountDeletion(), чтобы не ждать сеть.
 */
export async function deleteAccountAndWipe(): Promise<DeleteAccountResult> {
  const handoff = await beginAccountDeletion();
  if (!handoff.ok) return { ok: false, reason: handoff.reason };
  return handoff.completion;
}

type PreparedAccountDeletion = {
  /**
   * Anonymous deletion may proceed without a lock because it has no linked
   * provider identity to quarantine. Linked and unknown identities require one.
   */
  pendingDeleteLock: AccountDeletePendingAuthLock | null;
  pendingDeleteStableId: string | null;
  cloudDeleteEnqueueOperation: AccountDeleteEnqueueOperation<AccountDeleteEnqueueAck>;
  /**
   * зачем: связанный (почта/Apple) аккаунт обязан дождаться подтверждения сервера,
   * иначе тот же провайдер войдёт заново и восстановит данные. Аноним такого
   * ограничения не имеет — ему удаление доводится до конца сразу.
   */
  requiresDurableServerDeletion: boolean;
};

/**
 * Быстрая фаза: ставит замок и запускает серверное удаление, НО не ждёт сеть.
 *
 * Всё внутри — локальные операции (SecureStore/AsyncStorage). Единственный
 * сетевой вызов, startCloudDeletionEnqueue, только СТАРТУЕТ здесь; его
 * подтверждения ждёт уже фоновая фаза.
 *
 * Anonymous deletion cannot be refused for a missing guard. Linked or unknown
 * identity deletion must fail before the wipe when no durable local quarantine
 * can be verified; otherwise the same provider could immediately restore data.
 */
/**
 * Жёсткий предел на локальные операции быстрой фазы.
 *
 * зачем: на боевом устройстве владельца алерт «Не удалось безопасно подготовить
 * удаление» появился ЧЕРЕЗ ПОЛЧАСА — то есть SecureStore/Keychain не ответил
 * вовсе. Без предела UI ждал бы бесконечно (ровно «настройки зависли намертво»).
 * Ни одна локальная запись не имеет права держать пользователя дольше секунды.
 */
const ACCOUNT_DELETE_LOCAL_STEP_TIMEOUT_MS = 1_000;
// The complete wipe is a sequence of several individually bounded native
// operations (writer drains, SecureStore lineage rotation, module cleanup,
// AsyncStorage clear and strict readback). Giving their entire chain the same
// one-second budget as a single operation created a deterministic false timeout
// on real iOS hardware even though every stage completed successfully.
const ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS = 5_000;

/** Ограничивает локальный шаг по времени; при таймауте отдаёт запасное значение. */
async function withLocalStepDeadline<T>(
  run: () => Promise<T>,
  onTimeout: T,
  timeoutMs = ACCOUNT_DELETE_LOCAL_STEP_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      run().catch(() => onTimeout),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(onTimeout), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function prepareAccountDeletion(): Promise<PreparedAccountDeletion | 'local_wipe_unverified' | null> {
  const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;
  const isProvablyAnonymousAccount = getAuth()?.currentUser?.isAnonymous === true;
  const pendingDeleteStableId = await withLocalStepDeadline(() => getStableId(), null);
  // The bounded guard write is mandatory for linked/unknown identity and
  // best-effort only for a provably anonymous account.
  let pendingDeleteLock = isProvablyAnonymousAccount
    ? null
    : await withLocalStepDeadline(
      () => persistAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId),
      null,
      ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,
    );
  // зачем: для связанной/неизвестной личности отказываем ДО стирания. Без замка
  // тот же провайдер вошёл бы снова и восстановил данные; аноним этим не связан.
  if (!isProvablyAnonymousAccount && !pendingDeleteLock) return null;
  // The deletion guard above is the point of no return for linked identities.
  // SQLCipher retirement, writer drains and every local clear are one
  // registered flight below. Retries join it, so late native work cannot touch
  // a fresh account generation.
  // зачем: владелец (2026-07-27) — «даже анонимный пользователь должен иметь
  // возможность удалить всё; локальные данные стираются сразу и мгновенный
  // переход на первый экран онбординга». Поэтому локальная очистка живёт ЗДЕСЬ,
  // в быстрой фазе, а НЕ в фоне: у анонима серверного документа может не быть
  // вовсе, и ждать сеть, чтобы стереть своё же локальное, бессмысленно.
  // AsyncStorage.clear() снимает и прогресс, и onboarding_step/done/version —
  // без этого онбординг восстановил бы старый шаг вместо первого экрана.
  try {
    const locallyWiped = await wipeAndVerifyPostDeleteLocalData(
      pendingDeleteLock,
      pendingDeleteStableId,
    );
    if (!locallyWiped) return 'local_wipe_unverified';
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] prepareAccountDeletion: local wipe failed', e);
    return 'local_wipe_unverified';
  }
  if (pendingDeleteLock) {
    const localCleared = await withLocalStepDeadline(
      () => advanceAccountDeletePendingAuthLock(
        pendingDeleteLock!,
        'local_data_cleared',
      ),
      { ok: false, code: 'transition_persist_failed' } as const,
      ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,
    );
    traceAccountDeleteLocal(`phase_local_data_cleared=${localCleared.ok ? 1 : 0}`);
    if (!localCleared.ok) return 'local_wipe_unverified';
    verifiedPostDeleteLocalWipes.delete(pendingDeleteLock.operationId);
    pendingDeleteLock = localCleared.lock;
  }
  emitAppEvent('account_deleted');
  const cloudDeleteEnqueueOperation = startCloudDeletionEnqueue(
    pendingDeleteStableId,
    pendingDeleteLock ? accountDeleteCredentialProof(pendingDeleteLock) ?? undefined : undefined,
  );
  return {
    pendingDeleteLock,
    pendingDeleteStableId,
    cloudDeleteEnqueueOperation,
    requiresDurableServerDeletion: !isProvablyAnonymousAccount,
  };
}

/** Фоновая фаза: сеть, выход и локальная очистка. UI её НЕ ждёт. */
async function finishAccountDeletion(
  prepared: PreparedAccountDeletion,
): Promise<DeleteAccountResult> {
  const {
    pendingDeleteLock,
    pendingDeleteStableId,
    cloudDeleteEnqueueOperation,
    requiresDurableServerDeletion,
  } = prepared;
    let localExitLock = pendingDeleteLock;
    if (pendingDeleteStableId) {
      await import('./shards_pending_grants')
        .then(({ removePendingShardGrantsForAccount }) => (
          removePendingShardGrantsForAccount(pendingDeleteStableId)
        ))
        .catch(() => {});
    }
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

    // The strict local wipe already invalidated the old generation and opened
    // the premium transition. Here we only drain in-flight work before the
    // server/auth boundary, avoiding a duplicate transition notification.
    await drainEntitlementSafeAccountTransition();
    await Promise.all([
      waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
      quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS),
    ]);
    if (requiresDurableServerDeletion) {
      if (!pendingDeleteLock) return { ok: false, reason: 'pending_guard_persist_failed' };
      let credentialSafe = false;
      try {
        const ack = await cloudDeleteEnqueueOperation.acknowledgment;
        credentialSafe = ack.authReleased === true && ack.credentialSafe === true;
        logAuthEvent('auth_account_delete_enqueued', { status: ack.status });
      } catch (e) {
        if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: enqueue response lost; checking receipt', e);
      }
      const proof = accountDeleteCredentialProof(pendingDeleteLock);
      if (!credentialSafe && proof) {
        credentialSafe = await waitForAccountDeletionCredentialSafe(proof).catch(() => false);
      }
      if (!credentialSafe) {
        logAuthEvent('auth_account_delete_enqueue_failed');
        return { ok: false, reason: 'account_delete_enqueue_failed' };
      }
      const advanced = await advanceAccountDeletePendingAuthLock(
        pendingDeleteLock,
        'server_enqueued',
      );
      if (!advanced.ok) {
        logAuthEvent('auth_account_delete_quarantined', { reason: 'enqueue_phase_persist_failed' });
        return { ok: false, reason: 'pending_guard_persist_failed' };
      }
      localExitLock = advanced.lock;
    } else {
      // зачем: для анонима ждём только отправки запроса, а подтверждение сервера
      // остаётся фоновой работой под замком — медленная сеть не имеет права
      // держать старый аккаунт открытым.
      void cloudDeleteEnqueueOperation.acknowledgment
        .then((ack) => {
          logAuthEvent('auth_account_delete_enqueued', { status: ack.status });
        })
        .catch((e) => {
          if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: enqueue failed; pending guard retained', e);
          logAuthEvent('auth_account_delete_enqueue_failed');
        });
      await cloudDeleteEnqueueOperation.dispatchSettled;
    }

    if (requiresDurableServerDeletion && localExitLock) {
      const freshIdentity = await ensureFreshPostDeletionIdentity('delete');
      if (freshIdentity.status !== 'ready') {
        if (
          freshIdentity.status === 'pending_auth'
          && getAuth()?.currentUser?.isAnonymous === false
        ) {
          logAuthEvent('auth_account_delete_quarantined', { reason: 'firebase_signout_failed' });
          return { ok: false, reason: 'firebase_signout_failed' };
        }
        logAuthEvent('auth_account_delete_quarantined', { reason: 'local_exit_unverified' });
        return { ok: false, reason: 'local_exit_unverified' };
      }
      logAuthEvent('auth_account_deleted', { cloudDeleted: 0 });
      return { ok: true, cloudDeleted: false };
    }

    // Linked deletion keeps provider auth until durable server acceptance. This
    // runs only in completion: UI handoff and the fast local privacy wipe already
    // completed, while the guard lets a later launch retry any interruption.
    let firebaseSignedOut = true;
    try {
      await signOutCurrentProvider();
    } catch (e) {
      firebaseSignedOut = false;
      if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: signOut failed', e);
    }

    // зачем: локальные данные уже стёрты в БЫСТРОЙ фазе (требование владельца —
    // мгновенно, ещё до сети). Здесь остаётся только довести замок до фазы
    // old_stable_cleared. Без замка (аноним/недоступный SecureStore) доводить нечего:
    // считаем локальный выход выполненным, иначе удаление вечно висело бы
    // «незавершённым» и блокировало следующие попытки.
    const localExitComplete = localExitLock
      ? await completePreparedAccountDeleteLocalExit(localExitLock, firebaseSignedOut, true)
      : firebaseSignedOut;
    const freshIdentity = localExitComplete && localExitLock
      ? await ensureFreshPostDeletionIdentity('delete')
      : null;

    if (!firebaseSignedOut) {
      logAuthEvent('auth_account_delete_quarantined', { reason: 'firebase_signout_failed' });
      return { ok: false, reason: 'firebase_signout_failed' };
    }
    if (
      !localExitComplete
      || (CLOUD_SYNC_ENABLED && localExitLock && freshIdentity?.status !== 'ready')
    ) {
      logAuthEvent('auth_account_delete_quarantined', { reason: 'local_exit_unverified' });
      return { ok: false, reason: 'local_exit_unverified' };
    }
    logAuthEvent('auth_account_deleted', { cloudDeleted: 0 });
  return { ok: true, cloudDeleted: false };
}

export type RemoteAccountDeleteResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Clears a device whose still-signed-in provider account was deleted elsewhere. */
export async function handleAccountDeletedOnAnotherDevice(): Promise<RemoteAccountDeleteResult> {
  const freshIdentity = await ensureFreshPostDeletionIdentity('identity_retired', {
    subject: 'auth',
  });
  if (freshIdentity.status !== 'ready') {
    return { ok: false, reason: freshIdentity.status };
  }
  await AsyncStorage.setItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY, '1').catch(() => {});
  invalidatePremiumCache();
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
  const maxPrivateAccountKey = await getStableId().catch(() => null);
  if (maxPrivateAccountKey) {
    await Promise.all([
      clearMaxFinalizeOutbox(maxPrivateAccountKey),
      clearMaxVoiceReviewReceipts(maxPrivateAccountKey),
    ]).catch(() => {});
  }
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
  try { resetAnonAuthCacheForSignOut(); } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:auth', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  // зачем: signOutCurrentProvider — единственная точка, через которую проходят
  // ВСЕ пути выхода (явный logout, смена аккаунта, account-delete, recovery-
  // mismatch), включая те, что не доходят до wipeLocalAccountData. Сбрасываем
  // здесь же — иначе на recovery-пути (rejectRecoveryProviderMismatch) кэш
  // множителей предыдущего провайдера мог пережить signOut и утечь в
  // PlayerProfileModal следующего вошедшего аккаунта.
  try {
    const { resetMultiplierBreakdownCache } = await import('./xp_manager');
    resetMultiplierBreakdownCache();
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:auth', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:auth', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  // зачем: общий снапшот экранов рисует первый кадр синхронно, поэтому после выхода
  // его надо убрать — иначе следующий вошедший на общем девайсе увидит чужие цифры
  // (та же защита, что у снапшота практики выше).
  try {
    const { clearScreenSnapshots } = await import('./screen_snapshot_store');
    clearScreenSnapshots();
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:auth', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
  } catch (e) {
      // ignore
      DebugLogger.error('auth_provider:logAuthEvent', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// Re-exports чтобы Phase 3 / 4 могли в одном импорте получить всё.
export { getStableId, setStableId, ensureAnonUser, syncToCloud, restoreFromCloud };

// Required by Expo Router — not a screen
export default {};
