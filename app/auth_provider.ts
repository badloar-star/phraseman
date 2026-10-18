// ════════════════════════════════════════════════════════════════════════════
// auth_provider.ts — Регистрация/вход через Google и Apple провайдеры.
//
// Архитектура identity (см. также CLAUDE.md инвариант "Единый идентификатор"):
//   1. stable_id (UUID) — primary key для users/* и разрешённых progress/social records.
//   2. Firebase Auth uid — анонимный токен для Firestore Rules (request.auth).
//   3. Provider link (Google/Apple) — якорь для восстановления stable_id
//      на новом устройстве. Хранится в auth_links/{providerUid}.
//
// Flow при login:
//   • Native sign-in (Google/Apple) → idToken → signInWithCredential.
//   • Получаем providerUid (sub из id token).
//   • Lookup auth_links/{providerUid}:
//       - есть и stable_id == local: просто update lastSignInAt.
//       - есть и stable_id != local: AUTO-MERGE по legacy reward (выбираем тот у кого legacy reward больше)
//         + swap локального stable_id если нужно + restoreFromCloud.
//       - нет: create auth_links → пишем linkedAuth в users/{stable_id}.
//
// Flow при logout / "Сменить аккаунт":
//   • signOut() — Firebase Auth выходит.
//   • signInWithProvider() — юзер выбирает другой Google/Apple аккаунт.
//   • Дальше та же логика lookup auth_links.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_LINKED_DEMO_REFUSAL, getDevLinkedAuthDemo, getDevSignInError, getDevSignInStub, getDevSignOutOutcome, isDevAccountLinkedDemo, isDevAuthNone, isDevDeleteFail, isDevDeleteThrow } from './dev_account_state';
import { ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS } from './account_delete_timeout';
import { markFirestoreCacheClearPending } from './firestore_cache_clear';
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
import { identityErrorCode, identityTag, identityTrace, identityTraceClockMs } from './identity_trace';
import { decideRemoteLinkReuseForSwap, type RemoteLinkEvidence } from './auth_swap_link_reuse';

type AuthSwallowPrefix = '[AUTH-SIGNIN]' | '[AUTH-SIGNOUT]' | '[AUTH-DELETE]' | '[AUTH-LINK-GOOGLE]' | '[AUTH-RC]' | '[AUTH-BG-REFRESH]';

/**
 * Обработчик для .catch: прежнее значение по умолчанию + причина в логе.
 *
 * зачем (PM-229, AA S2d): 25 немых catch в этом файле — отказы шагов входа/выхода/
 * удаления были невидимы. Поведение не меняется (ошибка по-прежнему проглатывается),
 * но строка с префиксом, шагом и кодом ошибки (identityErrorCode: без текста, uid,
 * stableId и токенов) остаётся в релизе.
 */
function swallowAuthAs<T>(prefix: AuthSwallowPrefix, step: string, whenSwallowed: T): (error: unknown) => T {
  return (error: unknown): T => {
    console.warn(`${prefix} swallowed step=${step} code=${identityErrorCode(error)}`);
    return whenSwallowed;
  };
}
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
  startCloudDeletionDirect,
  waitForAccountDeletionCredentialSafe,
  resetAnonAuthCacheForSignOut,
  ensureStableAuthLinkForStableIdDetailed,
  mergeStableAccountsViaServer,
  saveAccountSwitchEmergencyBackup,
  readAccountSwitchEmergencyBackupSummary,
  shelveAccountSwitchEmergencyBackupOf,
  pruneShelvedAccountSwitchBackups,
  rememberSwapConfirmedStableAuthLink,
  type StableAuthLinkMetadata,
  type StableAuthLinkEnsureResult,
  type AccountDeleteEnqueueAck,
  type AccountDeleteCredentialProof,
  type AccountDeleteDirectAck,
} from './cloud_sync';
import type { AccountDeleteEnqueueOperation } from './account_delete_enqueue';
import {
  beginAccountAuthorityDeletionIfEnabled,
  beginAccountsV2DeletionIfEnabled,
  resolveAccountAuthorityDeletionByLegacyIfEnabled,
  clearStoredAccountsV2DeletionCredentialIfEnabled,
  clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled,
  readStoredAccountsV2DeletionCredentialIfEnabled,
  runAccountAuthorityProviderSignInTransition,
  runAccountAuthorityProviderSignOutTransition,
} from './accounts_v2_client_flag';
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
import { beginCloudProfileRefresh } from './cloud_profile_refresh_state';
import {
  announceAccountSwitchQuarantineFailure,
  clearProviderCredentialHandoff,
  consumeAccountSwitchPostCompletionHandoff,
  hasAccountSwitchPostCompletionHandoff,
  inspectAccountSwitchQuarantine,
  markProviderCredentialHandoffAuthenticated,
  beginProviderSignInInFlight,
  endProviderSignInInFlight,
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
  preparePendingShardDeltasForAccountSwitch,
} from './shards_system';
import {
  hasQuarantinedShardDeltaQueue,
  readShardDeltaQueue,
} from './shards_delta_queue';
import {
  restoreAccountSwitchEmergencyBackupIfSafe,
  shelvesAllowedForPostAuthStage,
  writeAccountSwitchBackupMergeAlias,
} from './account_switch_backup_restore';
import { applyFutureKeptStashAfterReturn } from './flashcards_future_kept_stash';
import { classifyPresyncBackupRefusal } from './presync_backup_refusal';
import { presyncBackupWithQuietRetry, presyncUploadWithQuietRetry } from './presync_quiet_retry';
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
import {
  acceptAnonMergeStampResponse,
  forgetAllAnonMergeNonces,
} from '../modules/account-authority-v2/account_authority_anon_merge_nonce';
import {
  consumeStampPrefetch,
  currentStampPrefetch,
  settleStampPrefetch,
  startStampPrefetch,
} from './auth_stamp_prefetch';
import {
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  accountAuthorityProviderErrorCode,
  safeAccountAuthorityLogger,
} from '../modules/account-authority-v2/account_authority_logger';
import { releaseReasonForAuthEvent } from './auth_release_reasons';

// зачем (AA S2b, пункт 11): ветки входа AA и nonce M-1 пишут через логгер S1 —
// только коды и виды, без uid, stableId, nonce и токенов.
const AUTH_PROVIDER_AA_LOG = safeAccountAuthorityLogger(undefined);

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
  } catch (e) {
    // зачем (аудит [AUTH-OPTIMISTIC] 17.10): немой catch — причина в журнал, значение прежнее; текст ошибки без данных входа.
    console.warn('[AUTH] token subject decode failed', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
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
    .catch(swallowAuthAs('[AUTH-RC]', 'rc_identity_sync', undefined));
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
const STAMP_FETCH_TIMEOUT_MS = 20_000;

/**
 * Запрос метки для предвыборки [LOGIN-STAMP] — тот же вызов, что в stampAnonOwnershipBeforeSignIn, но БЕЗ приёма nonce:
 * ответ держит модуль auth_stamp_prefetch и отдаёт его только в точке метки. Может отклониться — модуль поймает.
 */
async function requestAnonOwnershipStampForPrefetch(localStableId: string): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'authStampAnonOwnership');
  const payload = { stableId: localStableId, nonceRequested: true };
  const { invokeAuthCallable } = await import('./auth_callable_fetch');
  return invokeAuthCallable('authStampAnonOwnership', payload, () => fn(payload), { timeoutMs: STAMP_FETCH_TIMEOUT_MS });
}

async function stampAnonOwnershipBeforeSignIn(localStableId: string): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || !localStableId) return;
  try {
    // зачем (координатор и Ядро 15.10, [LOGIN-STAMP]): метка запрошена ещё на тапе, пока человек выбирал аккаунт. Её ответ берём,
    // только если совпали попытка, stableId (позднее чтение — сверка), анонимный uid и возраст; иначе — метка заново, как раньше.
    const prefetched = await consumeStampPrefetch(currentStampPrefetch(), { stableId: localStableId, authUid: String(getAuth().currentUser?.uid ?? '') });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'authStampAnonOwnership');
    // зачем (AA S2b, пункт 9, контракт M-1): просим одноразовый nonce метки. Он
    // живёт только в памяти процесса (модуль nonce) и уходит в ensureLink/merge
    // для этого же stableId. Старый сервер nonce не даёт — работаем без него.
    // зачем (координатор 14.10, прогон №5): под флагом auth_callables_fetch_v1 (выкл) — мимо однопоточной очереди RNFirebase;
    // нативный путь — только если запрос гарантированно не ушёл (метку нельзя ставить дважды вслепую).
    const payload = { stableId: localStableId, nonceRequested: true };
    const { invokeAuthCallable } = await import('./auth_callable_fetch');
    const response = prefetched.hit
      ? prefetched.hit.response
      : await invokeAuthCallable('authStampAnonOwnership', payload, () => fn(payload), { timeoutMs: STAMP_FETCH_TIMEOUT_MS });
    acceptAnonMergeStampResponse(localStableId, response);
  } catch (e) {
    // Лог без текста ошибки и без stableId: только вид и код (S1-логгер).
    AUTH_PROVIDER_AA_LOG.warn('anon_merge_nonce stamp_failed', {
      kind: accountAuthorityErrorKind(e),
      code: accountAuthorityErrorCode(e),
    });
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
  /**
   * Вход сразу после подтверждённой смены аккаунта: вместо окна Google берём
   * пропуск, который человек выбрал в ЭТОМ ЖЕ входе минуту назад (только память,
   * одноразово, ≤ 10 мин). Нет пропуска → `resume_credential_<причина>` без окна.
   */
  resumeAfterAccountSwitch?: boolean;
  /**
   * Сохранить выбранный пропуск при `account_switch_required` — только вызывающий,
   * который сам предлагает смену и затем продолжает вход (онбординг). Без флага
   * (окно входа, Настройки) пропуск не сохраняется вовсе.
   */
  captureAccountSwitchResume?: boolean;
}>;

function emitAuthProviderLinked(): void {
  // зачем (координатор 14.10, прогон №2 🔴1: карточка Настроек минуту «не привязан» после входа): кто шлёт событие обновления карточки.
  if (__DEV__) console.log(`[SETTINGS-ACCOUNT-CARD] t=${Date.now() % 100000} emit auth_provider_linked from=${(new Error().stack ?? '').split('\n').slice(2, 4).map((s) => s.trim()).join(' <- ')}`); // guard-ok: временная трассировка
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
  } catch (e) {
    // зачем (аудит [AUTH-OPTIMISTIC] 17.10): немой catch — причина в журнал, значение прежнее; текст ошибки без данных входа.
    console.warn('[AUTH] firebase auth module unavailable', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
    return null;
  }
};

/** Actual native Firebase Auth readiness signal for account-bound background work. */
export function subscribeFirebaseAuthUid(listener: (authUid: string | null) => void): () => void {
  const auth = getAuth();
  if (!auth || typeof auth.onAuthStateChanged !== 'function') {
    listener(null);
    return () => undefined;
  }
  return auth.onAuthStateChanged((user: { uid?: string } | null) => {
    const uid = String(user?.uid ?? '').trim();
    listener(uid || null);
  });
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch (e) {
    // зачем (аудит [AUTH-OPTIMISTIC] 17.10): немой catch — причина в журнал, значение прежнее; текст ошибки без данных входа.
    console.warn('[AUTH] firestore module unavailable', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
    return null;
  }
};

const getGoogleSignin = () => {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin');
  } catch (e) {
    // зачем (аудит [AUTH-OPTIMISTIC] 17.10): немой catch — причина в журнал, значение прежнее; текст ошибки без данных входа.
    console.warn('[AUTH] google sign-in module unavailable', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
    return null;
  }
};

const getAppleAuth = () => {
  if (IS_EXPO_GO || Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-apple-authentication');
  } catch (e) {
    // зачем (аудит [AUTH-OPTIMISTIC] 17.10): немой catch — причина в журнал, значение прежнее; текст ошибки без данных входа.
    console.warn('[AUTH] apple authentication module unavailable', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
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
// зачем (TG-AA6EC9A6D998, кнопки входа без сдвига): нативный ответ iOS об Apple
// запоминается на процесс — второе открытие окна входа знает ответ уже в первом кадре.
let iosAppleSignInAvailabilityCache: boolean | null = null;

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (isDevAuthNone()) return false; // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `auth=none` — «Вход недоступен»; в стор-сборке геттер выключен.
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return false;
  if (Platform.OS === 'ios') {
    const mod = getAppleAuth();
    if (!mod) {
      iosAppleSignInAvailabilityCache = false;
      return false;
    }
    try {
      const available = await mod.isAvailableAsync();
      iosAppleSignInAvailabilityCache = available === true;
      return iosAppleSignInAvailabilityCache;
    } catch (error) {
      // зачем: не немой catch — причина видна; кэш не пишем, следующее открытие спросит снова.
      identityTrace('[AUTH-AVAIL]', 'apple_is_available_failed', { code: identityErrorCode(error) });
      return false;
    }
  }
  if (Platform.OS === 'android') {
    return !!getAppleAndroidServiceId();
  }
  return false;
}

/**
 * Синхронный ответ «доступен ли Apple»: true/false, когда он известен без
 * нативного вызова (Android/web — по переменной, iOS — после первого ответа
 * isAppleSignInAvailable), и null, пока iOS ещё не ответил.
 *
 * зачем (TG-AA6EC9A6D998, Performance Bible «первый кадр = финальная геометрия»):
 * экраны входа держат место под кнопкой Apple, пока здесь null, и не двигают
 * раскладку, когда приходит асинхронный ответ.
 */
/**
 * Почему Apple недоступен (для журнала окна входа). null — доступен или iOS ещё не ответил.
 * зачем (координатор 18.10 05:45): без Services ID кнопка Apple на Android скрыта — причина должна быть видна в [AUTH-MODAL].
 */
export function peekAppleUnavailableReason(): 'dev_auth_none' | 'cloud_off' | 'missing_service_id' | 'ios_unavailable' | 'platform' | null {
  if (isDevAuthNone()) return 'dev_auth_none';
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return 'cloud_off';
  if (Platform.OS === 'ios') return iosAppleSignInAvailabilityCache === false ? 'ios_unavailable' : null;
  if (Platform.OS === 'android') return getAppleAndroidServiceId() ? null : 'missing_service_id';
  return 'platform';
}

export function peekAppleSignInAvailability(): boolean | null {
  if (isDevAuthNone()) return false; // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `auth=none`
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return false;
  if (Platform.OS === 'ios') return iosAppleSignInAvailabilityCache;
  if (Platform.OS === 'android') return !!getAppleAndroidServiceId();
  return false;
}

/**
 * Доступен ли Google Sign-In на текущем устройстве — синхронно.
 * Проверяет только наличие встроенного модуля и Web Client ID. На Android
 * Play Services проверяются после нажатия (с системным диалогом обновления) в
 * runGoogleNativeSignIn: временный сбой preflight не должен убирать все точки входа.
 *
 * зачем (TG-AA6EC9A6D998): проверка и раньше не ждала ничего асинхронного, но
 * экраны узнавали ответ через промис — первый кадр рисовался без кнопки Google,
 * а следующий вставлял её и сдвигал всё ниже. Синхронная версия даёт ответ до
 * первого кадра.
 */
export function isGoogleSignInAvailableSync(): boolean {
  if (isDevAuthNone()) return false; // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `auth=none`
  const mod = getGoogleSignin();
  if (!mod) return false;
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) return false;
  return true;
}

export async function isGoogleSignInAvailable(): Promise<boolean> {
  return isGoogleSignInAvailableSync();
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
// зачем (Ревизор к 1b38ad210): довод прерванного входа при запуске держит заставку не дольше ≈6 с, дальше — безопасный откат.
const ROLL_FORWARD_NETWORK_DEADLINE_MS = 6_000;

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
// зачем (прогон Сверки 18.10, шаг 4: provider_handoff_lock_timeout сразу после смены гостя): только что активированное поколение
// гостя пишет своё под замком 1–2,6 с (курсор Learning V2, withLocalAccountLock) — 1,5 с передаче входа не хватало, человек получал
// ошибку. Передача ждёт замок и тишину до 8 с: на экране «Входим…», ничего ещё не тронуто.
const PROVIDER_HANDOFF_LOCK_WAIT_MS = 8_000;

/**
 * Best-effort долив аварийной копии «Сменить аккаунт» после restoreFromCloud.
 * Внутри проверяется совпадение stableId и доливаются только отсутствующие
 * ключи, поэтому вызов безопасен на любом пути входа. Вход не валим никогда.
 */
async function tryRestoreAccountSwitchBackup(
  stage: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  // зачем (ревью TG-92BAE5BC536D): полки доливаются только во вход со стиранием; список
  // ключей, прочитанный восстановлением, отдаём чистке полок (один getAllKeys за вход).
  const shelvesAllowed = shelvesAllowedForPostAuthStage(stage);
  let scannedKeys: readonly string[] | undefined;
  try {
    const res = await restoreAccountSwitchEmergencyBackupIfSafe(isCurrent, {
      skipShelves: !shelvesAllowed,
      onKeysScanned: (keys) => { scannedKeys = keys; },
    });
    if (!shelvesAllowed) {
      identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelves_skipped', { stage, reason: 'entry_without_wipe', status: res.status });
    }
    if (res.status === 'restored') {
      logAuthEvent('auth_switch_backup_restored', { stage, keys: res.restoredKeys });
    }
  } catch (e) {
      // восстановление — best effort
      DebugLogger.error('auth_provider:res', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  // зачем (AA 2.0, S1e): копия доливает только отсутствующие ключи — список карточек после облачного
  // restore уже есть, и локальные версии, уступившие облачной «из будущего» при силовом переносе,
  // лежат отдельным ключом. Возвращаем их в список (только поверх той самой облачной версии).
  if (isCurrent()) {
    try {
      await applyFutureKeptStashAfterReturn(peekStableId());
    } catch (error) {
      identityTrace('[AUTH-LINK-GOOGLE]', 'future_kept_stash_apply_failed', { stage, code: identityErrorCode(error) });
    }
  } else {
    identityTrace('[AUTH-LINK-GOOGLE]', 'future_kept_stash_apply_skipped', { stage, reason: 'stale_generation' });
  }
  // AA S2d раунд 3 (ревью п.2): отложенные копии старше 30 дней — давняя утечка.
  try {
    await pruneShelvedAccountSwitchBackups(undefined, scannedKeys);
  } catch (error) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelved_prune_failed', { stage, code: identityErrorCode(error) });
  }
}

/**
 * Только для тестов: связка «этап входа → полки» проверяется поведением настоящего
 * tryRestoreAccountSwitchBackup (ревью TG-2307361A2567), а не по исходнику.
 */
export const __tryRestoreAccountSwitchBackupForTests = tryRestoreAccountSwitchBackup;

/**
 * Судьба аварийной копии гостя A после свапа на B (вызов под замком смены аккаунта).
 *
 * зачем (AA S2d раунд 3, §135 ❓2 + повторное security-ревью):
 *  - merge(A→B) подтверждён в этом же входе → метка {from: A, to: B}; фоновое
 *    восстановление после входа дольёт в B только недостающие ключи и удалит копию;
 *  - не подтверждён → копию A сразу отложить, иначе она блокирует «Сменить аккаунт».
 * Копию НЕ удаляем по признаку «выгрузка подтверждена» — дельта A в облако не попала.
 * Сбой здесь вход не рвёт: свап уже выполнен, причина — в журнал.
 */
async function settleGuestBackupAfterSwap(
  guestStableId: string,
  targetStableId: string,
  mergeConfirmed: boolean,
  provider: AuthProviderId,
): Promise<void> {
  try {
    if (mergeConfirmed) {
      try {
        await writeAccountSwitchBackupMergeAlias(guestStableId, targetStableId);
        identityTrace('[AUTH-LINK-GOOGLE]', 'swap backup_alias_written', {
          provider, from: identityTag(guestStableId), to: identityTag(targetStableId),
        }, { persist: true });
        return;
      } catch (aliasError) {
        // зачем (AA S2d раунд 4, L-R3-2): без метки копия A навсегда «чужая» для B и
        // блокировала бы «Сменить аккаунт» — откладываем её, как при неподтверждённом merge.
        identityTrace('[AUTH-LINK-GOOGLE]', 'swap backup_alias_write_failed', {
          provider, code: identityErrorCode(aliasError),
        }, { persist: true });
      }
    }
    const shelved = await shelveAccountSwitchEmergencyBackupOf(guestStableId);
    identityTrace('[AUTH-LINK-GOOGLE]', 'swap backup_shelved', {
      provider, shelved, owner: identityTag(guestStableId),
    }, { persist: true });
  } catch (error) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'swap backup_settle_failed', {
      provider, mergeConfirmed, code: identityErrorCode(error),
    }, { persist: true });
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
  } catch (error) {
    console.warn(`[AUTH-DELETE] swallowed step=read_pending_lock_for_handoff code=${identityErrorCode(error)}`);
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
  } catch (error) {
    console.warn(`[AUTH-DELETE] swallowed step=adopt_stale_lock code=${identityErrorCode(error)}`);
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
  // зачем (координатор 12.10): путь возобновления удаления при старте чистит AsyncStorage сам — метка очистки кэша Firestore после.
  if (!alreadyWipedLocally) await markFirestoreCacheClearPending('account_delete_resume');

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
  } catch (error) {
    // зачем (хвост security-ревью PM-289, L-2): немой catch прятал причину отказа проверки.
    // Поведение прежнее — непрочитанное хранилище не считается чистым (удаление закрыто).
    console.warn(`[AUTH-DELETE] wipe_verify_failed code=${identityErrorCode(error)}`);
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
        .catch(swallowAuthAs('[AUTH-DELETE]', 'post_delete_drain_premium', false)),
      waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)
        .catch(swallowAuthAs('[AUTH-DELETE]', 'post_delete_drain_restore', false)),
      quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)
        .catch(swallowAuthAs('[AUTH-DELETE]', 'post_delete_drain_cloud', false)),
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
    // зачем (координатор 12.10, удаление данных + замер ~20 мс SecureStore на каждом старте): метка очистки кэша Firestore SDK —
    // в AsyncStorage, ТОЛЬКО после проверки стирания (граница приватности); на следующем старте её читает уже существующий multiGet.
    await markFirestoreCacheClearPending('account_delete');
    invalidatePremiumCache();
    return true;
  } catch (e) {
    // зачем (TG-0AE4918142EE): в журнал — только код ошибки, без текста (может нести почту).
    const detail = identityErrorCode(e);
    traceAccountDeleteLocal(`threw:${detail}`);
    if (__DEV__) console.warn(`[auth_provider] post-delete local wipe failed code=${detail}`);
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

const ACCOUNT_DELETE_LOCAL_WIPE_GRACE_MS = 10_000;

/** Дождаться уже идущего полёта стирания (после истечения быстрого потолка), не запуская новый. */
async function awaitInFlightLocalWipe(
  lock: AccountDeletePendingAuthLock | null,
  stableId: string | null,
): Promise<boolean> {
  const flightKey = lock?.operationId ?? `anonymous:${stableId ?? 'none'}`;
  if (verifiedPostDeleteLocalWipes.has(flightKey)) {
    traceAccountDeleteLocal('grace_result=1 source=verified_after_deadline');
    return true;
  }
  const flight = postDeleteLocalWipeFlights.get(flightKey);
  if (!flight) {
    traceAccountDeleteLocal('grace_result=0 source=no_flight');
    return false;
  }
  const startedAt = Date.now();
  const result = await withLocalStepDeadline(() => flight, false, ACCOUNT_DELETE_LOCAL_WIPE_GRACE_MS);
  traceAccountDeleteLocal(`grace_result=${result ? 1 : 0} waited_ms=${Date.now() - startedAt}`);
  return result;
}

const phoneStateRetirementFlights = new Map<string, Promise<boolean>>();

async function retirePhoneStateForDeletion(stableId: string | null): Promise<boolean> {
  if (!stableId) return true;
  let flight = phoneStateRetirementFlights.get(stableId);
  // зачем (живой прогон 10.10, «сперва логи»): удаление гостя на эмуляторе отказало
  // phone_state_retired=0 без строки о сбое — значит, шаг не уложился в потолок.
  // Печатаем, сколько он реально идёт и чем кончается, чтобы чинить по факту.
  const retireStartedAt = Date.now();
  if (!flight) {
    flight = import('./phone_state_bootstrap')
      .then(({ retirePhoneStateAfterDeletion }) => retirePhoneStateAfterDeletion(stableId))
      .then(() => {
        traceAccountDeleteLocal(`phone_state_retire_done_ms=${Date.now() - retireStartedAt}`);
        return true;
      })
      .catch((error: unknown) => {
        // зачем (TG-0AE4918142EE): в журнал — только код ошибки.
        const detail = identityErrorCode(error);
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
  // зачем (живой прогон 10.10): общий потолок шага 1 с не вмещал подгрузку модуля
  // (430–900+ мс) — удаление гостя молча отказывало local_wipe_unverified. Свой потолок
  // 2,5 с: вместе с ожиданием писателей (≤1,5 с) остаётся в общем потолке стирания 5 с.
  const result = await withLocalStepDeadline(() => flight!, false, ACCOUNT_DELETE_PHONE_STATE_RETIRE_TIMEOUT_MS);
  if (!result) {
    traceAccountDeleteLocal(`phone_state_retire_deadline_or_fail_after_ms=${Date.now() - retireStartedAt}`);
    // зачем (ревью M-1): поздний успех закрывает хранилище гостя, которому удаление уже
    // ответило отказом, — смешанное состояние. Пока решение о дожатии не принято, делаем
    // такие случаи видимыми в журнале.
    void flight!.then((lateOk) => {
      if (lateOk) traceAccountDeleteLocal(`phone_state_retired_after_refusal_ms=${Date.now() - retireStartedAt}`);
    });
  }
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
  const bytes = await Crypto.getRandomBytesAsync(32).catch(swallowAuthAs('[AUTH-DELETE]', 'credential_capability_random', null));
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
  // зачем (Account V2, ревью 6B, P3): повтор после перезапуска шлёт сохранённый
  // ключ V2, иначе телефон терял право узнать этап и дотолкнуть стирание V2.
  // Флаг выключен → null: вызов прежний, ровно два аргумента. Фон, не UI.
  const storedAccountsV2Key = readStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId);
  const retryAccountsV2Deletion = storedAccountsV2Key
    ? await withLocalStepDeadline(() => storedAccountsV2Key, null)
    : null;
  const retryAccountsV2Args: [] | [AccountDeleteCredentialProof] = retryAccountsV2Deletion ? [retryAccountsV2Deletion] : [];
  try {
    const op = startCloudDeletionEnqueue(lock.stableId, proof, ...retryAccountsV2Args);
    const ack = await op.acknowledgment;
    if (ack.authReleased === true && ack.credentialSafe === true) {
      // зачем (Пакет 6C): постановка принята — ключ V2 этого замка больше не нужен телефону.
      if (retryAccountsV2Deletion) clearStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId);
      return true;
    }
  } catch (e) {
      // The closure may have committed and deleted Auth while its response was lost.
      DebugLogger.error('auth_provider:ack', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return waitForAccountDeletionCredentialSafe(proof)
    .then((safe) => {
      // зачем (ревью 6C, P3): квитанция подтвердила постановку — ключ V2 замка больше не нужен.
      if (safe) clearStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId);
      return safe;
    })
    .catch(swallowAuthAs('[AUTH-DELETE]', 'credential_safe_wait', false));
}

/**
 * Сетевой (временный) отказ постановки: повтор имеет смысл на следующем старте.
 * зачем (TG-F5939EAC5D97): отказ по существу (нет прав, личность уже удалена и т. п.) не
 * исправится повтором — такой замок сходится локально, как раньше, а не держит карантин.
 */
const TRANSIENT_ENQUEUE_FAILURE = /unavailable|deadline|timeout|network|offline/i;

/**
 * Одна ограниченная попытка дожать серверное удаление ГОСТЯ после перезапуска.
 * true — постановка принята или отказ не временный (замок сходится локально, исход в логе);
 * false — временный отказ (нет сети): фаза local_data_cleared и гостевая сессия остаются,
 * следующий старт/возврат в приложение пробует снова (TG-F5939EAC5D97).
 */
async function retryGuestServerDeletionOnce(
  lock: AccountDeletePendingAuthLock,
): Promise<boolean> {
  const proof = accountDeleteCredentialProof(lock);
  if (!proof) {
    console.warn('[ACC-MUT] delete:anon_server=skipped reason=retry_no_capability');
    return true;
  }
  try {
    const ack = await startCloudDeletionEnqueue(lock.stableId, proof).acknowledgment;
    console.log(`[ACC-MUT] delete:anon_server=enqueue_retry ack=ok status=${ack.status}`);
    logAuthEvent('auth_account_delete_enqueued', { status: ack.status });
    return true;
  } catch (e) {
    const reason = String((e as any)?.message ?? e).slice(0, 120);
    const code = String((e as any)?.code ?? '');
    const transient = TRANSIENT_ENQUEUE_FAILURE.test(`${reason} ${code}`);
    console.warn(`[ACC-MUT] delete:anon_server=enqueue_retry ack=failed reason=${reason} code=${code || 'none'} keep_lock=${transient ? 1 : 0}`);
    DebugLogger.error('acc_mut:delete_anon_retry_failed', new Error(reason), 'warning');
    return !transient;
  }
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
  const localStableId = await getStableId().catch(swallowAuthAs('[AUTH-DELETE]', 'retired_identity_read_stable', null));
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
    // зачем (аудит 11.10): отказ чтения замка решал исход молча — теперь причина в логе.
    console.warn(`[AUTH-DELETE] fresh_identity read_lock_failed trigger=${trigger} code=${identityErrorCode(e)}`);
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
    await waitForPostDeleteAuthHydration().catch(swallowAuthAs('[AUTH-DELETE]', 'post_delete_auth_hydration', false));
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
        // therefore require no provider quarantine: the guard still converges
        // locally (always true), onboarding never waits for the linked receipt.
        // зачем (TG-20707BD701DC): но замок гостя — единственный ключ к его
        // серверным данным. Раньше эта ветка молча пропускала постановку, и
        // гость, чьё удаление оборвалось (приложение убито до ответа сервера),
        // оставался на сервере навсегда. Сервер примет постановку только от той
        // же вошедшей личности — значит, дожимать можно ровно здесь, одной
        // ограниченной попыткой (потолок постановки 8 с), без 15-секундной
        // квитанции связанных аккаунтов.
        if (
          getAuth()?.currentUser?.isAnonymous === true
          && getAuth()?.currentUser?.uid === lock!.providerUid
        ) return retryGuestServerDeletionOnce(lock!);
        return ensureAccountDeleteCredentialSafe(lock!);
      },
      signOutProvider: async () => {
        const currentUser = getAuth()?.currentUser;
        // зачем (TG-F5939EAC5D97): гостя без сети больше не разлогинивают в фоне удаления —
        // его сессия нужна, чтобы при старте дослать постановку. После неё эту УДАЛЁННУЮ
        // гостевую личность надо покинуть здесь, иначе анонимный вход вернёт тот же uid и
        // новая личность не выдастся никогда. Любой другой аноним — уже новый, его не трогаем.
        const retiredGuestSignedIn = currentUser?.isAnonymous === true
          && currentUser.uid === lock!.providerUid;
        if (!currentUser || (currentUser.isAnonymous === true && !retiredGuestSignedIn)) return true;
        try {
          await signOutCurrentProvider();
          const afterSignOut = getAuth()?.currentUser;
          return afterSignOut == null
            || (afterSignOut.isAnonymous === true && afterSignOut.uid !== lock!.providerUid);
        } catch (e) {
          // зачем (TG-0AE4918142EE): в журнал — только код ошибки выхода провайдера.
          console.warn(`[ACC-MUT] delete:fresh_identity signout_failed retired_guest=${retiredGuestSignedIn ? 1 : 0} reason=${identityErrorCode(e)}`);
          return false;
        }
      },
      clearOldStable: async () => {
        try {
          await clearStableId();
          await clearPendingAuthLink();
          resetAnonAuthCacheForSignOut();
          return peekStableId() === null;
        } catch (error) {
          console.warn(`[AUTH-DELETE] swallowed step=fresh_identity_clear_old_stable code=${identityErrorCode(error)}`);
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
        } catch (error) {
          console.warn(`[AUTH-DELETE] swallowed step=fresh_identity_adopt_stable code=${identityErrorCode(error)}`);
          return false;
        }
      },
      beginAccountGeneration,
      persistPhase: advanceAccountDeletePendingAuthLock,
      clearTransition: async () => {
        try {
          await clearAccountDeletePendingAuthLock();
          return true;
        } catch (error) {
          console.warn(`[AUTH-DELETE] swallowed step=fresh_identity_clear_transition code=${identityErrorCode(error)}`);
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
          } catch (error) {
            console.warn(`[AUTH-DELETE] swallowed step=live_provider_clear_old_stable code=${identityErrorCode(error)}`);
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
          const freshStableId = await getStableId().catch(swallowAuthAs('[AUTH-DELETE]', 'fresh_identity_read_stable', null));
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
          } catch (error) {
            console.warn(`[AUTH-DELETE] swallowed step=live_provider_clear_transition code=${identityErrorCode(error)}`);
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
  if (activeCompletion) await activeCompletion.catch(swallowAuthAs('[AUTH-SIGNIN]', 'wait_active_delete_completion', null));
  let remaining: AccountDeletePendingAuthLock | null;
  try {
    remaining = await readPendingDeleteTransition();
  } catch (error) {
    console.warn(`[AUTH-SIGNIN] swallowed step=converge_read_pending_delete provider=${provider} code=${identityErrorCode(error)}`);
    return false;
  }
  if (!remaining) return true;
  const result = await ensureFreshPostDeletionIdentity('foreground');
  if (result.status !== 'ready') {
    if (remaining.phase === 'local_data_cleared') {
      const proof = accountDeleteCredentialProof(remaining);
      if (proof) await waitForAccountDeletionCredentialSafe(proof).catch(swallowAuthAs('[AUTH-SIGNIN]', 'wait_delete_credential_safe', false));
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
  // зачем (Авторизация 12.10, settings-gap-001): dev `account=linked` — привязка для показа из памяти; в сторе null.
  const devLinked = getDevLinkedAuthDemo();
  if (devLinked) return devLinked;
  try {
    return getLinkedAuthFromCurrentUser();
  } catch (error) {
    // зачем (ревью «Авторизации» 10.10): немой catch прятал, почему экран «Аккаунт» стартует без привязки.
    identityTrace('[AUTH-PEEK]', 'linked_auth_peek_failed', { code: identityErrorCode(error) });
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
  } catch (error) {
    identityTrace('[AUTH-PEEK]', 'created_at_peek_failed', { code: identityErrorCode(error) });
    return null;
  }
}

/**
 * Текущая привязка к провайдеру для залогиненного юзера.
 * Returns null если юзер ещё анонимный.
 */
export async function getLinkedAuthInfo(): Promise<LinkedAuth | null> {
  // зачем (Авторизация 12.10, settings-gap-001): dev `account=linked` — привязка для показа из памяти, Firestore не читается; в сторе null.
  const devLinked = getDevLinkedAuthDemo();
  const cardStartedAt = Date.now();
  const cardLog = (source: string, result: LinkedAuth | null): LinkedAuth | null => {
    if (__DEV__) console.log(`[SETTINGS-ACCOUNT-CARD] t=${Date.now() % 100000} getLinkedAuthInfo source=${source} result=${result?.provider ?? 'none'} ms=${Date.now() - cardStartedAt}`); // guard-ok: временная трассировка
    return result;
  };
  if (devLinked) {
    console.log('[DEV-STATE] account: привязка для показа (account=linked), сеть не вызывалась'); // guard-ok: dev-ветка
    return devLinked;
  }
  if (!CLOUD_SYNC_ENABLED) return cardLog('cloud_off', null);
  const db = getFirestore();
  if (!db) return cardLog('no_db', null);
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
    if (doc == null) return cardLog('users_doc_timeout_or_error→currentUser', fromAuth());
    if (!doc.exists) return cardLog('users_doc_missing→currentUser', fromAuth());
    const linked = doc.data()?.linkedAuth as LinkedAuth | undefined;
    if (linked?.provider) return cardLog('users_doc.linkedAuth', { ...linked, displayName: null });
    return cardLog('users_doc_without_linkedAuth→currentUser', fromAuth());
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] getLinkedAuthInfo failed', e);
    return cardLog(`catch:${e instanceof Error ? e.message.slice(0, 60) : 'unknown'}→currentUser`, fromAuth());
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

// ── Пропуск Google через смену аккаунта (прогон 11.10, пакет auth-legacy-google-not-found, шаг 3) ──
// зачем: гость в онбординге выбрал Google → конфликт → «Сменить аккаунт» → после стирания
// телефона человек ОБЯЗАН был открыть окно Google второй раз и выбрать тот же аккаунт.
// Держим только что выбранный им Google-пропуск в ПАМЯТИ процесса (не диск, не журнал,
// не аналитика), чтобы вход после смены продолжился сам. Пропуск одноразовый: любая
// попытка взять его (успех/отказ/протух/не тот провайдер) стирает его; живёт ≤ 10 мин.
// Apple сюда НЕ кладём: его ID-токен связан с одноразовым nonce, Firebase повторно
// его не примет — Apple после смены по-прежнему входит вторым тапом.
const ACCOUNT_SWITCH_RESUME_CREDENTIAL_TTL_MS = 10 * 60_000;

/** Внутренний сигнал правила 3 (A→B): аккаунт выбран, пропуск в памяти — смену делает signInWithProvider. Человеку не виден. */
const ACCOUNT_SWITCH_DIRECT_SIGNAL = 'account_switch_direct';
/** Потолок ожидания облака при прямой смене A→B — тот же, что при выходе и смене из онбординга. */
const DIRECT_ACCOUNT_SWITCH_SYNC_DEADLINE_MS = 3000;

/** Журнал развилок правил владельца 18.10 — ISO-время в строке (в metro_live.log своих меток времени нет); без uid/почты. */
function authSwitchTrace(step: string, fields: Record<string, unknown> = {}): void {
  console.warn(`[AUTH-SWITCH] ${new Date().toISOString()} ${step} ${JSON.stringify(fields)}`); // guard-ok: только метки h:xxxx и флаги
}

type AccountSwitchResumeCredential = Readonly<{
  provider: AuthProviderId;
  credential: NativeAuthCredential;
  capturedAtMs: number;
}>;

let accountSwitchResumeCredential: AccountSwitchResumeCredential | null = null;

function storeAccountSwitchResumeCredential(
  provider: AuthProviderId,
  credential: NativeAuthCredential,
  // зачем (правило 3, 18.10): прямой A→B берёт пропуск сразу из окна выбора — Firebase его ещё не видел, nonce Apple цел.
  options: Readonly<{ unconsumed?: boolean }> = {},
): void {
  if (provider !== 'google' && !options.unconsumed) {
    console.log(`[AUTH-SWITCH-OFFER] resume_credential not_stored provider=${provider} reason=provider_not_reusable`);
    accountSwitchResumeCredential = null;
    return;
  }
  accountSwitchResumeCredential = Object.freeze({ provider, credential, capturedAtMs: Date.now() });
  console.log(`[AUTH-SWITCH-OFFER] resume_credential stored provider=${provider} ttlMs=${ACCOUNT_SWITCH_RESUME_CREDENTIAL_TTL_MS}`);
}

/**
 * Стереть пропуск для входа после смены. Зовётся, когда смена не состоялась (отмена,
 * сбой) или начался новый обычный вход — тогда старый выбор человека уже не действует.
 */
export function discardAccountSwitchResumeCredential(reason: string): void {
  if (!accountSwitchResumeCredential) return;
  console.log(`[AUTH-SWITCH-OFFER] resume_credential discarded provider=${accountSwitchResumeCredential.provider} reason=${reason}`);
  accountSwitchResumeCredential = null;
}

type AccountSwitchResumeTake =
  | Readonly<{ kind: 'used'; credential: NativeAuthCredential }>
  | Readonly<{ kind: 'missing' | 'expired' | 'provider_mismatch' }>;

function takeAccountSwitchResumeCredential(provider: AuthProviderId): AccountSwitchResumeTake {
  const stored = accountSwitchResumeCredential;
  // Одноразовость: стираем ДО любых проверок — второй попытки с тем же пропуском нет.
  accountSwitchResumeCredential = null;
  if (!stored) {
    console.log(`[AUTH-SWITCH-OFFER] resume_credential missing provider=${provider}`);
    return { kind: 'missing' };
  }
  const ageMs = Date.now() - stored.capturedAtMs;
  if (stored.provider !== provider) {
    console.warn(`[AUTH-SWITCH-OFFER] resume_credential provider_mismatch stored=${stored.provider} requested=${provider}`);
    return { kind: 'provider_mismatch' };
  }
  if (ageMs < 0 || ageMs > ACCOUNT_SWITCH_RESUME_CREDENTIAL_TTL_MS) {
    console.warn(`[AUTH-SWITCH-OFFER] resume_credential expired provider=${provider} ageMs=${ageMs}`);
    return { kind: 'expired' };
  }
  console.log(`[AUTH-SWITCH-OFFER] resume_credential used provider=${provider} ageMs=${ageMs}`);
  return { kind: 'used', credential: stored.credential };
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

const GOOGLE_PREVIOUS_SESSION_CLEAR_TIMEOUT_MS = 3_000;

/** Снять прежний нативный выбор аккаунта Google, чтобы окно выбора показалось. Отказ не блокирует вход — пишет причину. */
async function clearPreviousGoogleNativeSession(mod: NonNullable<ReturnType<typeof getGoogleSignin>>): Promise<void> {
  const startedAt = Date.now();
  try {
    await withTimeout(mod.GoogleSignin.signOut(), GOOGLE_PREVIOUS_SESSION_CLEAR_TIMEOUT_MS, 'google_previous_session_clear');
    console.log(`[AUTH-LINK-GOOGLE] picker previous_session_cleared ms=${Date.now() - startedAt}`); // guard-ok: шаг перед окном выбора
  } catch (e) {
    console.warn(`[AUTH-LINK-GOOGLE] picker previous_session_clear_failed code=${identityErrorCode(e)} ms=${Date.now() - startedAt}`); // guard-ok: catch пишет причину
  }
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
      // зачем (TG-0AE4918142EE): в журнал только код ошибки Google.
      if (__DEV__) console.warn(`[auth_provider] hasPlayServices failed code=${identityErrorCode(e)}`);
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
      // зачем (прогон 18.10 10:49/10:55): нативная сессия Google переживала отказ входа и убийство процесса — следующее
      // нажатие молча брало тот же аккаунт без окна выбора (тупик: не тот аккаунт → отказ → снова он же). Снимаем её перед
      // КАЖДЫМ новым окном; в одной цепочке с signIn — висящий вызов по-прежнему переиспользуется, второе окно не откроется.
      const task: GoogleNativeSignInTask = {
        promise: clearPreviousGoogleNativeSession(mod).then(() => mod.GoogleSignin.signIn()),
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
    // зачем (TG-0AE4918142EE): текст ошибки Google может нести почту — в журнал только код.
    if (__DEV__) console.warn(`[auth_provider] runGoogleNativeSignIn: signIn threw code=${identityErrorCode(e)}`);
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
  // зачем (прогон 11.10): полная почта попадала в журнал — печатаем только маску.
  if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: success, email=', typeof user?.email === 'string' && user.email.indexOf('@') > 0 ? `${user.email.slice(0, 1)}***${user.email.slice(user.email.indexOf('@'))}` : '***');
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

// зачем (TG-17B4F6788C5A): отчёт уходит в Crashlytics и (critical) в Firestore/Telegram,
// куда персональные данные не должны попадать. Вызовы передают коды; страховка ловит
// случайный сырой текст (пробел/«@» и т. п.): сохраняем безопасный префикс до «:», хвост — redacted.
const SAFE_AUTH_FAILURE_DETAIL = /^[a-z0-9_:./-]{1,280}$/i;

function safeAuthFailureDetail(detail: string): string {
  if (SAFE_AUTH_FAILURE_DETAIL.test(detail)) return detail;
  const head = detail.split(':')[0] ?? '';
  return SAFE_AUTH_FAILURE_DETAIL.test(head) ? `${head}:redacted_text` : 'redacted_text';
}

function captureAuthSignInFailure(provider: AuthProviderId, stage: string, detail: string): void {
  try {
    const d = safeAuthFailureDetail(detail.slice(0, 280));
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
    }).catch(swallowAuthAs('[AUTH-SIGNIN]', 'report_signin_failure', undefined));
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
    // This recovery branch runs inside the queued provider sign-in callback.
    // Calling the public coordinator again would wait behind the transition
    // that is currently awaiting this recovery result (self-deadlock).
    await performCurrentProviderSignOut();
  } catch (e) {
    // зачем (Ревизор 3.15, aac7e1014): событие без причины — добавлен тип ошибки (без uid и e-mail).
    logAuthEvent('auth_recovery_provider_mismatch_signout_failed', { provider, reason, kind: e instanceof Error ? e.name : typeof e });
    return { result: 'error', error: 'recovery_signout_failed' };
  }
  await ensureAnonUser().catch(swallowAuthAs('[AUTH-SIGNIN]', 'recovery_mismatch_ensure_anon', null));
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

/**
 * Account Authority cutover adapter: acquire one Google/Apple credential and
 * apply it to Firebase Auth. It intentionally has no Firestore, stable identity,
 * local-data, migration, or scope decisions; the authority lease decides the
 * accountId/sessionId after this callback returns.
 */
async function runAccountAuthorityCredentialSignIn(
  provider: AuthProviderId,
  resumeCredential: NativeAuthCredential | null = null,
): Promise<SignInResult> {
  if (!CLOUD_SYNC_ENABLED) return { result: 'error', error: 'cloud_sync_disabled' };
  const auth = getAuth();
  if (!auth) return { result: 'error', error: 'firebase_unavailable' };

  let nativeCredential: NativeAuthCredential | { cancelled: true };
  try {
    // зачем (шаг 3): вход после смены — без второго окна выбора, тем же пропуском.
    nativeCredential = resumeCredential
      ? resumeCredential
      : provider === 'google'
      ? await runGoogleNativeSignIn()
      : Platform.OS === 'android'
        ? await runAppleAndroidOAuthSignIn()
        : await runAppleNativeSignIn();
  } catch (error: unknown) {
    // зачем (AA S2b, пункт 10): наружу и в лог — только код ошибки. Сырой текст
    // Firebase/провайдера может нести email, токен или uid и не уходит никуда.
    const code = accountAuthorityProviderErrorCode(error);
    AUTH_PROVIDER_AA_LOG.warn('credential_sign_in failed', { phase: 'native', code, kind: accountAuthorityErrorKind(error) });
    return { result: 'error', error: `native_${code}` };
  }
  if ('cancelled' in nativeCredential) {
    AUTH_PROVIDER_AA_LOG.info('credential_sign_in cancelled', { phase: 'native' });
    return { result: 'cancelled' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@react-native-firebase/auth');
    const credential = provider === 'google'
      ? authModule.default.GoogleAuthProvider.credential(nativeCredential.idToken)
      : authModule.default.AppleAuthProvider.credential(
        nativeCredential.idToken,
        nativeCredential.appleNonce,
      );
    const signedIn = await auth.signInWithCredential(credential);
    const user = signedIn?.user ?? auth.currentUser;
    const uid = String(user?.uid ?? '').trim();
    if (!uid || user?.isAnonymous !== false) {
      AUTH_PROVIDER_AA_LOG.warn('credential_sign_in rejected', {
        phase: 'firebase',
        reason: uid ? 'still_anonymous' : 'uid_missing',
      });
      return { result: 'error', error: 'firebase_authenticated_uid_missing' };
    }
    AUTH_PROVIDER_AA_LOG.info('credential_sign_in ok', { phase: 'firebase' });
    return {
      result: 'linked_existing',
      email: nativeCredential.email ?? user?.email ?? null,
      displayName: nativeCredential.displayName ?? user?.displayName ?? null,
    };
  } catch (error: unknown) {
    // зачем (AA S2b, пункт 10): только код, без текста ошибки Firebase.
    const code = accountAuthorityProviderErrorCode(error);
    AUTH_PROVIDER_AA_LOG.warn('credential_sign_in failed', { phase: 'firebase', code, kind: accountAuthorityErrorKind(error) });
    return { result: 'error', error: `firebase_${code}` };
  }
}

/** Окно выбора аккаунта для прямой смены A→B (правило 3): тот же нативный вызов, что у обычного входа. */
async function openProviderPickerForDirectSwitch(provider: AuthProviderId): Promise<NativeAuthCredential | { cancelled: true }> {
  if (provider === 'google') return runGoogleNativeSignIn();
  return Platform.OS === 'android' ? runAppleAndroidOAuthSignIn() : runAppleNativeSignIn();
}

export async function signInWithProvider(
  provider: AuthProviderId,
  options: SignInWithProviderOptions = {},
): Promise<SignInResult> {
  // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `switch=not_uploaded|backup_blocked`, `restore=retired` — ошибка входа ДО любых замков, сети и записи; в стор-сборке null.
  // зачем (Авторизация 12.10, settings-gap-001): при подставной привязке вход/смена аккаунта не начинаются — до провайдера, замков и сети.
  if (isDevAccountLinkedDemo()) {
    console.warn('[DEV-STATE] account: вход отклонён — привязка только для показа (account=linked)'); // guard-ok: dev-ветка
    return { result: 'error', error: DEV_LINKED_DEMO_REFUSAL };
  }
  const devSignInError = getDevSignInError();
  if (devSignInError) {
    console.log(`[DEV-STATE] account: вход подменён ошибкой ${devSignInError} [AUTH-SIGNIN] ignored provider=${provider} reason=dev_state`); // guard-ok: dev-ветка; метка [AUTH-SIGNIN] ignored — сторож ранних выходов (aa_auth_double_tap_contract)
    return { result: 'error', error: devSignInError };
  }
  // зачем (координатор 12.10, onboarding-003/004/008 без авиарежима): dev `signin=hold|offline|generic` — результат входа ДО замков и сети.
  const devSignInStub = getDevSignInStub();
  if (devSignInStub) {
    console.log(`[DEV-STATE] account: вход подменён signin=${devSignInStub.mode} delayMs=${devSignInStub.delayMs} [AUTH-SIGNIN] ignored provider=${provider} reason=dev_state`); // guard-ok: dev-ветка
    if (devSignInStub.delayMs > 0) await new Promise<void>((resolve) => { setTimeout(resolve, devSignInStub.delayMs); });
    const stubbed: SignInResult = devSignInStub.error
      ? { result: 'error', error: devSignInStub.error }
      : devSignInStub.createdNew
        ? { result: 'created_new', email: devSignInStub.createdNew.email, displayName: devSignInStub.createdNew.displayName }
        : { result: 'cancelled' };
    console.log(`[DEV-STATE] account: signin=${devSignInStub.mode} → result=${stubbed.result}${devSignInStub.error ? ` error=${devSignInStub.error}` : ''}`); // guard-ok: итог dev-ветки
    return stubbed;
  }
  try {
    await assertNoCleanInstallRecoveryTransition();
  } catch (transitionError) {
    // A provider tap made after the delete handoff joins that exact durable
    // transition. Other clean-install/recovery mutations remain excluded.
    // зачем (аудит двойного тапа 11.10): catch был немым — причину отказа замка видно в логе.
    console.warn(`[AUTH-SIGNIN] transition_guard_busy provider=${provider} code=${identityErrorCode(transitionError)}`);
    const pendingDelete = await readPendingDeleteTransition().catch(swallowAuthAs('[AUTH-SIGNIN]', 'read_pending_delete_transition', null));
    if (!pendingDelete) {
      console.warn(`[AUTH-SIGNIN] ignored provider=${provider} reason=clean_recovery_transition_active`);
      return { result: 'error', error: 'clean_recovery_transition_active' };
    }
  }
  if (providerCredentialModeReservation?.mode === 'recovery') {
    console.warn(`[AUTH-SIGNIN] ignored provider=${provider} reason=recovery_in_flight`);
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
      console.warn(`[AUTH-SIGNIN] ignored provider=${provider} reason=native_reservation_held held=${providerCredentialModeReservation.provider}`);
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
      console.warn(`[AUTH-SIGNIN] ignored provider=${provider} reason=in_flight_other held=${providerSignInInFlight.provider}`);
      return { result: 'error', error: `auth_signin_in_progress_${providerSignInInFlight.provider}` };
    }
    if (Date.now() - providerSignInInFlight.startedAt >= PROVIDER_SIGN_IN_STALE_MS) {
      console.warn(`[AUTH-SIGNIN] ignored provider=${provider} reason=in_flight_stale ageMs=${Date.now() - providerSignInInFlight.startedAt}`);
      return { result: 'error', error: `auth_signin_still_running_${provider}` };
    }
    // зачем (аудит двойного тапа 11.10): повторный тап того же провайдера не запускает второй
    // вход, а присоединяется к идущему — это видно в логе одной строкой.
    console.log(`[AUTH-SIGNIN] joined provider=${provider} reason=in_flight`);
    return providerSignInInFlight.task;
  }
  // зачем (шаг 3, прогон 11.10): вход после смены берёт пропуск из памяти (одноразово);
  // обычный вход открывает окно заново — тогда прежний пропуск уже не выбор человека.
  let resumeCredential: NativeAuthCredential | null = null;
  if (options.resumeAfterAccountSwitch) {
    const taken = takeAccountSwitchResumeCredential(provider);
    if (taken.kind !== 'used') {
      console.warn(`[AUTH-SIGNIN] ignored provider=${provider} reason=resume_credential_${taken.kind}`);
      return { result: 'error', error: `resume_credential_${taken.kind}` };
    }
    resumeCredential = taken.credential;
  } else {
    discardAccountSwitchResumeCredential('fresh_sign_in');
  }
  const reservation = createProviderCredentialModeReservation('signin', provider);
  providerCredentialModeReservation = reservation;
  const task = runAccountAuthorityProviderSignInTransition(
    () => runAccountAuthorityCredentialSignIn(provider, resumeCredential),
    () => runSignInWithProvider(provider, options, resumeCredential),
  );
  providerSignInInFlight = {
    provider,
    task,
    startedAt: Date.now(),
    requireCurrentStableIdOwnership: Boolean(options.requireCurrentStableIdOwnership),
  };
  // зачем (блокер входа 18.10): восстановление при загрузке не откатывает запись передачи, пока этот вход идёт (переживает горячую перезагрузку)
  const inFlightKey = beginProviderSignInInFlight();
  let settled: SignInResult;
  try {
    settled = await task;
  } finally {
    endProviderSignInInFlight(inFlightKey);
    if (providerSignInInFlight?.task === task) providerSignInInFlight = null;
    reservation.operationSettled = true;
    releaseProviderCredentialModeReservationIfSettled(reservation);
  }
  if (settled.result === 'error' && settled.error === ACCOUNT_SWITCH_DIRECT_SIGNAL) {
    return completeDirectAccountSwitch(provider);
  }
  return settled;
}

/**
 * Правило 3 владельца (18.10): вошёл в A → выбрал в окне B → штатная смена A (облако догоняет не дольше 3 с, аварийная
 * копия под замком) → вход в B тем же выбором, без второго окна. Резервации исходного входа уже сняты — замки не вложены.
 */
async function completeDirectAccountSwitch(provider: AuthProviderId): Promise<SignInResult> {
  const startedAt = Date.now();
  authSwitchTrace('rule3 switch_start', { provider });
  let switched: SignOutSwitchResult;
  try {
    switched = await signOutAndWipeForAccountSwitch({ syncDeadlineMs: DIRECT_ACCOUNT_SWITCH_SYNC_DEADLINE_MS, allowWipeWithoutSync: true });
  } catch (switchError) {
    discardAccountSwitchResumeCredential('direct_switch_threw');
    authSwitchTrace('rule3 switch_threw', { provider, code: identityErrorCode(switchError), tookMs: Date.now() - startedAt });
    return { result: 'error', error: `account_switch_failed_${identityErrorCode(switchError)}` };
  }
  if (!switched.ok) {
    discardAccountSwitchResumeCredential('direct_switch_failed');
    authSwitchTrace('rule3 switch_failed', { provider, reason: switched.reason, tookMs: Date.now() - startedAt, outcome: 'stay_in_current_account' });
    return { result: 'error', error: `account_switch_failed_${switched.reason}` };
  }
  authSwitchTrace('rule3 switched', { provider, synced: switched.synced ? 'yes' : 'no', tookMs: Date.now() - startedAt });
  const resumed = await resumeSignInAfterAccountSwitch(provider);
  if (!resumed) {
    authSwitchTrace('rule3 resume_failed', { provider, tookMs: Date.now() - startedAt, outcome: 'guest_sign_in_again' });
    return { result: 'error', error: 'account_switch_resume_failed' };
  }
  authSwitchTrace('rule3 done', { provider, result: resumed.result, tookMs: Date.now() - startedAt });
  return resumed;
}

const PROVIDER_SIGN_IN_STALE_MS = 45_000;
let providerSignInInFlight: {
  provider: AuthProviderId;
  task: Promise<SignInResult>;
  startedAt: number;
  requireCurrentStableIdOwnership: boolean;
} | null = null;

/**
 * Ошибки входа после смены, у которых в онбординге есть своё окно (удалён навсегда /
 * на удалении — предложить вернуть). Их отдаём как есть, а не прячем в «Войди ещё раз».
 */
const RESUME_PASSTHROUGH_ERRORS = ['identity_retired', 'account_delete_pending'] as const;
type ResumePassthroughError = typeof RESUME_PASSTHROUGH_ERRORS[number];

export type AccountSwitchResumeSignInResult =
  | Exclude<SignInResult, { result: 'error' } | { result: 'cancelled' }>
  | Readonly<{ result: 'error'; error: ResumePassthroughError }>;

function isResumePassthroughError(error: string): error is ResumePassthroughError {
  return (RESUME_PASSTHROUGH_ERRORS as readonly string[]).includes(error);
}

/**
 * Продолжить вход сразу после успешной смены аккаунта тем же Google-пропуском
 * (без второго окна выбора). `null` — продолжить нельзя (пропуска нет, протух,
 * Apple, сервер отклонил): вызывающий показывает прежнее «Войди ещё раз».
 * `identity_retired` / `account_delete_pending` возвращаются как есть (ревью M-2).
 */
export async function resumeSignInAfterAccountSwitch(
  provider: AuthProviderId,
): Promise<AccountSwitchResumeSignInResult | null> {
  try {
    const result = await signInWithProvider(provider, { resumeAfterAccountSwitch: true });
    // зачем (ревью L-3): присоединение к уже идущему входу не берёт пропуск — стираем
    // его при ЛЮБОМ исходе, чтобы он не пережил эту попытку.
    discardAccountSwitchResumeCredential('resume_settled');
    if (result.result === 'error' && isResumePassthroughError(result.error)) {
      console.warn(`[AUTH-SWITCH-OFFER] resume_sign_in passthrough provider=${provider} code=${result.error}`);
      return { result: 'error', error: result.error };
    }
    if (result.result === 'error' || result.result === 'cancelled') {
      // зачем: в журнал только код до «:» — после него у Firebase бывает почта.
      const head = result.result === 'error' ? result.error.split(':')[0] : 'cancelled';
      const code = /^[a-z0-9_./-]{1,64}$/i.test(head) ? head : 'redacted';
      console.warn(`[AUTH-SWITCH-OFFER] resume_sign_in not_continued provider=${provider} result=${result.result} code=${code}`);
      return null;
    }
    console.log(`[AUTH-SWITCH-OFFER] resume_sign_in ok provider=${provider} result=${result.result}`);
    return result;
  } catch (error) {
    console.warn(`[AUTH-SWITCH-OFFER] resume_sign_in threw provider=${provider} code=${identityErrorCode(error)}`);
    discardAccountSwitchResumeCredential('resume_threw');
    return null;
  }
}

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
  const lockWaitStartedAt = Date.now();
  const lockTask = withAccountTransitionLockWithDeadline(async (lease) => {
    console.log(`[AUTH-HANDOFF] lock_acquired waitedMs=${Date.now() - lockWaitStartedAt}`); // guard-ok: сколько ждали замок перехода
    scope.lease = lease;
    resolveLease(lease);
    await barrier;
  }, PROVIDER_HANDOFF_LOCK_WAIT_MS);
  void lockTask.then((result) => {
    if (!result.completed) {
      console.warn(`[AUTH-HANDOFF] lock_wait_timeout waitedMs=${Date.now() - lockWaitStartedAt} limitMs=${PROVIDER_HANDOFF_LOCK_WAIT_MS}`); // guard-ok: ранний отказ пишет причину
      rejectLease(new Error('provider_handoff_lock_timeout'));
    }
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
  resumeCredential: NativeAuthCredential | null = null,
): Promise<SignInResult> {
  const handoffLeaseScope: ProviderHandoffLeaseScope = { lease: null, release: null };
  let settledResult: SignInResult['result'] | null = null;
  try {
    const result = await runSignInWithProviderWhileOwningHandoffLease(provider, options, handoffLeaseScope, resumeCredential);
    settledResult = result.result;
    return result;
  } finally {
    // зачем (координатор 15.10, [LOGIN-STAMP]): поздний ответ предвыборки после конца входа никуда не кладётся, а итог
    // outcome=used|wasted_no_conflict|wasted_cancel|… считает долю впустую потраченных вызовов (>80% — запуск только при конфликте).
    settleStampPrefetch(settledResult);
    // зачем (AA S2b, пункт 9): nonce M-1 нужен только внутри одного входа —
    // успех (merge/relink), отказ или отмена одинаково его стирают.
    forgetAllAnonMergeNonces('sign_in_settled');
    await handoffLeaseScope.release?.();
  }
}

async function runSignInWithProviderWhileOwningHandoffLease(
  provider: AuthProviderId,
  options: SignInWithProviderOptions,
  handoffLeaseScope: ProviderHandoffLeaseScope,
  resumeCredential: NativeAuthCredential | null = null,
): Promise<SignInResult> {
  if (__DEV__) console.log(`[auth_provider] signInWithProvider(${provider}): start`);
  // зачем (AA S2c, случай §126 «после смены Google-аккаунта не привязывается»):
  // СПЕРВА ЛОГИ. Вход, каждая развилка со значением, итог. Без uid/stableId —
  // только метки h:xxxxxxxx (см. identity_trace.ts).
  const traceStartedAt = identityTraceClockMs();
  {
    const traceUser = getAuth()?.currentUser;
    identityTrace('[AUTH-LINK-GOOGLE]', 'start', {
      provider,
      authState: !traceUser ? 'none' : traceUser.isAnonymous === false ? 'provider' : 'anonymous',
      authUid: identityTag(traceUser?.uid),
      localStable: identityTag(peekStableId()),
      requireOwnership: Boolean(options.requireCurrentStableIdOwnership),
    });
  }
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
    // зачем (TG-17B4F6788C5A): stage guard = critical (Firestore/Telegram) — хвост только код.
    captureAuthSignInFailure(
      provider,
      'guard',
      `account_delete_guard_unavailable:${identityErrorCode(guardError)}`,
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
    // Главная гипотеза случая §126: Firebase уже держит провайдер-сессию
    // (например, прошлый вход оборвался после signInWithCredential — см.
    // swap_presync), а локально — анонимный профиль. Любой новый тап сюда.
    // зачем (правило 3 владельца 18.10: «из A в B — без проблем, без вопросов и текстов»): отказа больше нет. Открываем окно
    // выбора; выбран другой аккаунт → пропуск в память и сигнал ACCOUNT_SWITCH_DIRECT_SIGNAL — смену A и вход в B делает
    // signInWithProvider ПОСЛЕ снятия резерваций этого входа (вложенные замки недопустимы). Тот же аккаунт → ничего не меняем.
    const currentUser = auth.currentUser;
    if (pendingDeleteBeforeCredential) {
      // зачем (сторож auth_provider_behavior «foreign delete guard»): после выхода из A гостевая сессия сочла бы чужой замок
      // удаления своим и дожала бы удаление ЧУЖОГО аккаунта. Прямую смену не запускаем — прежняя граница, редкий случай.
      authSwitchTrace('rule3 blocked', { provider, reason: 'foreign_delete_lock_present', authUid: identityTag(currentUser.uid) });
      logAuthEvent('auth_signin_account_switch_required', { provider });
      return { result: 'error', error: 'account_switch_required' };
    }
    authSwitchTrace('rule3 picker_open', { provider, authUid: identityTag(currentUser.uid), localStable: identityTag(peekStableId()) });
    let directCred: NativeAuthCredential | { cancelled: true };
    try {
      directCred = await openProviderPickerForDirectSwitch(provider);
    } catch (pickerError) {
      authSwitchTrace('rule3 picker_failed', { provider, code: identityErrorCode(pickerError) });
      return { result: 'error', error: `native_${identityErrorCode(pickerError)}` };
    }
    if ('cancelled' in directCred) {
      authSwitchTrace('rule3 picker_cancelled', { provider, outcome: 'stay_in_current_account' });
      return { result: 'cancelled' };
    }
    const pickedSubject = directCred.providerSubject ?? providerSubjectFromIdToken(directCred.idToken);
    const providerId = provider === 'google' ? 'google.com' : 'apple.com';
    const currentSubjects = (Array.isArray(currentUser.providerData) ? currentUser.providerData : [])
      .filter((entry: { providerId?: string }) => entry?.providerId === providerId)
      .map((entry: { uid?: string }) => String(entry?.uid ?? '').trim())
      .filter(Boolean);
    const sameAccount = Boolean(pickedSubject && currentSubjects.includes(pickedSubject));
    authSwitchTrace('rule3 picked', { provider, picked: identityTag(pickedSubject), sameAccount: sameAccount ? 'yes' : 'no', currentLinked: currentSubjects.length });
    if (sameAccount) {
      return { result: 'linked_existing', email: currentUser.email ?? null, displayName: currentUser.displayName ?? null };
    }
    // пропуск ещё не тратился Firebase — годится и для Apple (nonce цел)
    storeAccountSwitchResumeCredential(provider, directCred, { unconsumed: true });
    logAuthEvent('auth_signin_direct_account_switch', { provider });
    return { result: 'error', error: ACCOUNT_SWITCH_DIRECT_SIGNAL };
  }

  // A pending guard on an anonymous session may belong to the provider selected
  // in the picker. Do not generate/bind any stable identity until the credential
  // reveals that provider uid and the mandatory post-credential check runs.
  const deferIdentityPreparation = completedPendingDeleteBeforeCredential
    || pendingDeleteBeforeCredential?.phase === 'prepared';
  const anonPreparation = deferIdentityPreparation
    ? Promise.resolve(null)
    : ensureAnonUser();
  // зачем (координатор 15.10, замер №7: метка 1,96 с последовательно ПОСЛЕ окна выбора): запрос метки уходит сейчас, пока открыт
  // выбор аккаунта. Без pending-delete (там метки нет) и без продолжения после «Сменить аккаунт» (окна нет — прятать нечего).
  if (!deferIdentityPreparation && !resumeCredential && CLOUD_SYNC_ENABLED && !IS_EXPO_GO) {
    startStampPrefetch({
      resolveIdentity: async () => {
        await anonPreparation;
        const user = auth.currentUser;
        if (!user?.isAnonymous || !user.uid) return null;
        return { stableId: await getStableId(), authUid: String(user.uid) };
      },
      request: requestAnonOwnershipStampForPrefetch,
    });
  } else {
    console.log(`[LOGIN-STAMP] prefetch_off defer=${deferIdentityPreparation} resume=${Boolean(resumeCredential)}`);
  }

  // 1. Native / OAuth sign-in
  let cred: NativeAuthCredential | { cancelled: true };
  try {
    if (resumeCredential) {
      // зачем (шаг 3): человек уже выбрал этот аккаунт в окне Google перед сменой —
      // второе окно не открываем. Дальше путь тот же: свежий гость → конфликт →
      // подтверждённая смена (post-completion handoff) → signInWithCredential.
      identityTrace('[AUTH-LINK-GOOGLE]', 'native skipped', { provider, source: 'resume_credential' });
      cred = resumeCredential;
    } else if (provider === 'google') {
      cred = await runGoogleNativeSignIn();
    } else if (Platform.OS === 'android') {
      cred = await runAppleAndroidOAuthSignIn();
    } else {
      cred = await runAppleNativeSignIn();
    }
  } catch (e: any) {
    // зачем (TG-0AE4918142EE): в тексте ошибки Google/Apple бывает почта — в журнал и
    // стороннюю аналитику уходит только код; полный текст остаётся в errStr для логики
    // (распознавание отмены/конфигурации, describeAuthError для человека).
    const telemetryCode = identityErrorCode(e);
    if (__DEV__) console.warn(`[auth_provider] native sign-in failed code=${telemetryCode}`);
    const code = e?.code ? String(e.code) : '';
    const msg = e?.message ? String(e.message) : 'unknown';
    const detail = code ? `${code}:${msg}` : msg;
    logAuthEvent('auth_signin_error', { provider, stage: 'native', error: telemetryCode });
    const errStr = `native_${detail}`.slice(0, 120);
    identityTrace('[AUTH-LINK-GOOGLE]', 'native failed', { provider, code: identityErrorCode(e) });
    if (errStr.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
      return { result: 'error', error: errStr };
    }
    // зачем (TG-17B4F6788C5A): в отчёт о сбое — только код; errStr с текстом — для логики.
    captureAuthSignInFailure(provider, 'native', `native_${telemetryCode}`);
    return { result: 'error', error: errStr };
  }
  if ('cancelled' in cred) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'native cancelled', { provider });
    logAuthEvent('auth_signin_cancelled', { provider });
    return { result: 'cancelled' };
  }
  identityTrace('[AUTH-LINK-GOOGLE]', 'native ok', {
    provider,
    providerSubject: identityTag(cred.providerSubject ?? null),
    deferIdentityPreparation,
  });

  try {
    await anonPreparation;
  } catch (error) {
    // зачем (TG-17B4F6788C5A): в отчёт о сбое — только код, префикс сохранён.
    captureAuthSignInFailure(provider, 'firebase', `anonymous_preparation_failed:${identityErrorCode(error)}`);
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
    let postCompletionHandoff = false;
    const canTryLink = Boolean(
      !deferIdentityPreparation &&
      anonUser?.isAnonymous &&
      typeof anonUser?.linkWithCredential === 'function'
    );

    let userCredential: any = null;
    // зачем (блокер 18.10, журнал iPhone 08:41/08:47): у Apple id_token с nonce одноразовый — неудачная привязка гостя его тратит,
    // и повторный вход тем же credential падал auth/unknown. Firebase отдаёт в ошибке привязки обновлённый credential — входим им.
    let conflictUpdatedCredential: any = null;
    identityTrace('[AUTH-LINK-GOOGLE]', 'link decision', {
      provider,
      canTryLink,
      anonymous: anonUser?.isAnonymous === true,
      sourceUid: identityTag(anonUser?.uid),
      preProviderStable: identityTag(preProviderStableId),
    });
    if (canTryLink) {
      try {
        // Firebase credential mutations are not cancellable. A Promise.race timeout
        // here used to start signInWithCredential while the timed-out link could
        // still complete in the background, racing two identity mutations.
        userCredential = await anonUser.linkWithCredential(credential);
        identityTrace('[AUTH-LINK-GOOGLE]', 'link linked_in_place', { provider });
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
        identityTrace('[AUTH-LINK-GOOGLE]', 'link conflict', {
          provider,
          code: identityErrorCode(linkErr),
          expectedConflict: EXPECTED_LINK_CONFLICT.has(linkCode),
        });
        if (EXPECTED_LINK_CONFLICT.has(linkCode)) {
          const updatedFromError = linkErr?.userInfo?.authCredential ?? null;
          conflictUpdatedCredential = updatedFromError && typeof updatedFromError === 'object' ? updatedFromError : null;
          console.log(`[AUTH-HANDOFF] updated_credential provider=${provider} present=${conflictUpdatedCredential !== null} code=${linkCode}`); // guard-ok: только наличие, без токена
          let localClean = await isLocalAnonymousIdentityProvenCleanForCredentialHandoff();
          postCompletionHandoff = await hasAccountSwitchPostCompletionHandoff({
            freshAuthUid: String(anonUser?.uid ?? '').trim(),
            freshStableId: preProviderStableId,
          }).catch(swallowAuthAs('[AUTH-LINK-GOOGLE]', 'post_completion_handoff_check', false));
          console.log('[AUTH-SWITCH] handoff-proof', JSON.stringify({
            provider,
            localClean,
            postCompletionHandoff,
            stableId: preProviderStableId.slice(0, 8),
          }));
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
            waitForRestoreApplicationIdleWithDeadline(PROVIDER_HANDOFF_LOCK_WAIT_MS),
            quiesceCloudSyncForAccountTransition(PROVIDER_HANDOFF_LOCK_WAIT_MS),
          ]);
          if (!restoreIdle || !cloudIdle) {
            console.warn(`[AUTH-HANDOFF] quiesce_failed restoreIdle=${restoreIdle} cloudIdle=${cloudIdle} limitMs=${PROVIDER_HANDOFF_LOCK_WAIT_MS}`); // guard-ok: ранний отказ пишет причину
            throw new Error('provider_handoff_quiesce_failed');
          }
          // зачем (ревью Opus 15.10, R15): первая проверка чистоты шла ДО замка и тишины синхронизации — запись в этом окне
          // (начисление, урок) стёрлась бы без копии. Раньше ответ почти всегда был «не чист»; теперь свежий гость «чист»,
          // поэтому при «чист» перепроверяем уже под замком перехода. Стало «не чист» — обычное окно смены аккаунта ниже.
          if (localClean) {
            localClean = await isLocalAnonymousIdentityProvenCleanForCredentialHandoff();
            identityTrace('[AUTH-LINK-GOOGLE]', 'clean_proof recheck', { provider, localClean }, { persist: true });
          }
          identityTrace('[AUTH-LINK-GOOGLE]', 'handoff proof', { provider, localClean, postCompletionHandoff });
          // зачем (эмулятор 18.10 10:04, сценарий №2 координатора): метка «свежий гость после смены аккаунта» живёт 24 ч и раньше
          // пропускала окно смены даже при НАСТОЯЩЕМ прогрессе (уроки, 64 карточки, 4 своих набора) — swap шёл с
          // preserveLocalProgress=false и молча стирал гостя. С классификатором 15.10 значения по умолчанию уже «чистые»,
          // поэтому метка больше не перекрывает прогресс: есть что терять → окно «Сменить аккаунт», решает человек.
          if (!localClean && postCompletionHandoff) {
            identityTrace('[AUTH-LINK-GOOGLE]', 'post_completion_handoff ignored', { provider, reason: 'guest_has_progress' }, { persist: true });
          }
          if (!localClean) {
            identityTrace('[AUTH-LINK-GOOGLE]', 'branch account_switch_required', {
              provider,
              source: 'anonymous_link_conflict',
              localStable: identityTag(preProviderStableId),
              tookMs: identityTraceClockMs() - traceStartedAt,
            }, { persist: true });
            try {
              await clearProviderCredentialHandoff(providerHandoffMarker);
              providerHandoffMarker = null;
              beginAccountGeneration(preProviderStableId);
            } catch (e) {
              // зачем (Ревизор 3.15, aac7e1014): причина снятия handoff — тип ошибки, без идентификаторов.
              console.warn('[AUTH] provider handoff clear failed', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
              announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
              return { result: 'error', error: 'provider_handoff_recovery_required' };
            }
            logAuthEvent('auth_signin_account_switch_required', { provider, source: 'anonymous_link_conflict' });
            // зачем (шаг 3): сохранить выбор человека на время окна «Сменить аккаунт»,
            // чтобы после смены вход продолжился без второго окна Google. Повтор из
            // пропуска сам пропуск НЕ перекладывает — иначе одноразовость ломается.
            // зачем (правило 2 владельца 18.10, эмулятор владельца: caller_not_capturing → ошибка): выбор человека сохраняем ВСЕГДА —
            // шторка гостя «Войти» входит им без второго окна Google; каждый новый обычный вход стирает пропуск (fresh_sign_in).
            if (resumeCredential) {
              console.warn(`[AUTH-SWITCH-OFFER] resume_credential rejected provider=${provider} reason=switch_still_required`);
            } else {
              storeAccountSwitchResumeCredential(provider, cred);
            }
            authSwitchTrace('rule2 guest_with_progress_existing_account', {
              provider,
              localStable: identityTag(preProviderStableId),
              captured: resumeCredential ? 'no_resume_attempt' : provider === 'google' ? 'yes' : 'apple_second_picker',
              next: 'guest_switch_sheet',
            });
            return { result: 'error', error: 'account_switch_required' };
          }
          // зачем ([ACC-SPEED], координатор 14.10): между «handoff proof» и «signed_in» 8,1 с — по отдельности маркер, отметка, вход.
          const handoffStepStartedAtMs = Date.now();
          providerHandoffMarker = await markProviderCredentialHandoffCredentialReady(
            providerHandoffMarker,
            cred.providerSubject ?? providerSubjectFromIdToken(cred.idToken),
          );
          console.warn('[ACC-SPEED]', JSON.stringify({ step: 'switch:handoff_credential_ready', ms: Date.now() - handoffStepStartedAtMs }));
          const stampStartedAtMs = Date.now();
          await stampAnonOwnershipBeforeSignIn(preProviderStableId);
          console.warn('[ACC-SPEED]', JSON.stringify({ step: 'switch:stamp_anon_ownership', ms: Date.now() - stampStartedAtMs }));
          const signInStartedAtMs = Date.now();
          // зачем (блокер 18.10): после неудачной привязки — обновлённый credential из ошибки (Apple: исходный nonce уже израсходован)
          userCredential = await auth.signInWithCredential(conflictUpdatedCredential ?? credential);
          console.warn('[ACC-SPEED]', JSON.stringify({ step: 'switch:signInWithCredential', ms: Date.now() - signInStartedAtMs, updatedCredential: conflictUpdatedCredential !== null }));
          const targetAuthUid = String(userCredential?.user?.uid ?? auth.currentUser?.uid ?? '').trim();
          identityTrace('[AUTH-LINK-GOOGLE]', 'handoff signed_in', {
            provider,
            sourceUid: identityTag(sourceAuthUid),
            targetUid: identityTag(targetAuthUid),
            uidChanged: targetAuthUid !== sourceAuthUid,
          });
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
        identityTrace('[AUTH-LINK-GOOGLE]', 'branch account_switch_required', {
          provider,
          source: 'anonymous_link_unavailable',
          tookMs: identityTraceClockMs() - traceStartedAt,
        }, { persist: true });
        logAuthEvent('auth_signin_account_switch_required', { provider, source: 'anonymous_link_unavailable' });
        return { result: 'error', error: 'account_switch_required' };
      }
      await stampAnonOwnershipBeforeSignIn(preProviderStableId);
      userCredential = await auth.signInWithCredential(credential);
    }

    if (postCompletionHandoff) {
      await consumeAccountSwitchPostCompletionHandoff({
        freshAuthUid: String(anonUser?.uid ?? '').trim(),
        freshStableId: preProviderStableId,
      });
    }

    const fbUser = userCredential?.user ?? auth.currentUser;
    firebaseUserForTokenRefresh = fbUser;
    firebaseProviderUid = fbUser?.uid ?? '';
    if (!firebaseEmail) firebaseEmail = fbUser?.email ?? null;
    if (!firebaseDisplayName) firebaseDisplayName = fbUser?.displayName ?? null;
    if (!firebaseProviderUid) throw new Error('firebase_no_uid');
  } catch (e: any) {
    if (providerHandoffMarker) {
      // зачем (блокер 18.10, журнал iPhone 08:41–08:48): запись передачи после провала оставалась — каждый следующий вход ЛЮБОГО
      // провайдера падал на provider_handoff_active до перезапуска. Если Firebase ОТКЛОНИЛ вход (фаза credential_ready — запись стоит прямо
      // перед signInWithCredential) и сессия не сменилась (текущий uid — тот же гость), передачи не было: снимаем запись и возвращаем
      // поколение гостя, как в ранней ветке account_switch_required.
      // зачем (прогон Сверки 18.10, шаг 4): фаза prepared (обрыв раньше — замок перехода, тишина синхронизации) тоже ничего не тронула:
      // запись, оставленная «для повтора», сама запирала следующий вход (provider_handoff_active). При том же госте — снимаем.
      const currentUidNow = String(auth.currentUser?.uid ?? '').trim();
      const sameGuestUid = !currentUidNow || currentUidNow === providerHandoffMarker.ownerAuthUid;
      const currentIsAnonymousOrNone = !auth.currentUser || auth.currentUser.isAnonymous !== false;
      // зачем (подсказка Ядра 18.10): в фазе prepared пропуск ещё не использован — снимаем и при сменившемся анонимном uid
      // (хвост смены гостя мог поднять новую анонимную сессию); иначе запись запирала следующий вход (provider_handoff_active).
      const sessionUnchanged = (providerHandoffMarker.phase === 'credential_ready' && sameGuestUid)
        || (providerHandoffMarker.phase === 'prepared' && (sameGuestUid || currentIsAnonymousOrNone));
      if (sessionUnchanged) {
        try {
          await clearProviderCredentialHandoff(providerHandoffMarker);
          const clearedPhase = providerHandoffMarker.phase;
          providerHandoffMarker = null;
          // поколение прежнего гостя открываем только если это всё тот же гость
          if (sameGuestUid) beginAccountGeneration(preProviderStableId);
          console.warn(`[AUTH-HANDOFF] cleared reason=firebase_failed phase=${clearedPhase} sameGuestUid=${sameGuestUid ? 'yes' : 'no'} anonymousNow=${currentIsAnonymousOrNone ? 'yes' : 'no'} provider=${provider} code=${identityErrorCode(e)}`); // guard-ok: причина снятия записи
        } catch (clearError) {
          console.warn(`[AUTH-HANDOFF] clear_failed provider=${provider} code=${identityErrorCode(clearError)}`); // guard-ok: catch пишет причину
          announceAccountSwitchQuarantineFailure('provider_handoff_incomplete');
        }
      } else {
        console.warn(`[AUTH-HANDOFF] kept reason=provider_session phase=${providerHandoffMarker.phase} sameGuestUid=${sameGuestUid ? 'yes' : 'no'} anonymousNow=${currentIsAnonymousOrNone ? 'yes' : 'no'} provider=${provider}`); // guard-ok: запись нужна восстановлению
        announceAccountSwitchQuarantineFailure('provider_handoff_incomplete');
      }
    }
    // зачем (TG-0AE4918142EE): текст ошибки Firebase может нести почту — в журнал и
    // аналитику только код; errStr с текстом нужен вызывающему для логики и текста человеку.
    const telemetryCode = identityErrorCode(e);
    if (__DEV__) console.warn(`[auth_provider] firebase sign-in/link failed code=${telemetryCode}`);
    const code = e?.code ? String(e.code) : '';
    const msg = e?.message ? String(e.message) : 'unknown';
    const detail = code ? `${code}:${msg}` : msg;
    logAuthEvent('auth_signin_error', { provider, stage: 'firebase', error: telemetryCode });
    const errStr = `firebase_${detail}`.slice(0, 120);
    identityTrace('[AUTH-LINK-GOOGLE]', 'firebase failed', {
      provider,
      code: identityErrorCode(e),
      handoffMarker: providerHandoffMarker !== null,
      tookMs: identityTraceClockMs() - traceStartedAt,
    }, { persist: true });
    // зачем (TG-17B4F6788C5A): в отчёт о сбое — только код; errStr с текстом — для логики.
    captureAuthSignInFailure(provider, 'firebase', `firebase_${telemetryCode}`);
    return { result: 'error', error: errStr };
  }

  let pendingDelete: AccountDeletePendingAuthLock | null;
  try {
    pendingDelete = await readAccountDeletePendingAuth(firebaseProviderUid);
  } catch (guardError) {
    // зачем: см. выше — noLockSeen не запирает вход, сервер классифицирует сам.
    // зачем (TG-17B4F6788C5A): stage guard = critical (Firestore/Telegram) — хвост только код.
    captureAuthSignInFailure(
      provider,
      'guard',
      `account_delete_guard_unavailable:${identityErrorCode(guardError)}`,
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

  // 3. Lookup auth_links → link OR auto-merge by legacy reward
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
  } catch (lookupError) {
    // зачем (S2c): прежде немой catch — «не нашли привязку» и «не смогли
    // прочитать» были неотличимы, а от этого зависит ветка remote/local.
    identityTrace('[AUTH-LINK-GOOGLE]', 'link_lookup failed', { provider, code: identityErrorCode(lookupError) });
    remoteStableId = null;
  }
  identityTrace('[AUTH-LINK-GOOGLE]', 'link_lookup result', {
    provider,
    completed: linkLookupCompleted,
    found: linkLookupFound,
    providerUid: identityTag(firebaseProviderUid),
    localStable: identityTag(localStableId),
    remoteStable: identityTag(remoteStableId),
    branch: remoteStableId ? 'remote' : 'local',
  });

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
  let remoteLinkEvidence: RemoteLinkEvidence | null = null;
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
    identityTrace('[AUTH-LINK-GOOGLE]', 'ensure_link remote', {
      provider,
      ok: linkedRemote.ok,
      failure: linkedRemote.failure ?? null,
      source: linkedRemote.source,
      stableUid: identityTag(linkedRemote.stableUid),
      nonceRejection: linkedRemote.nonceRejection ?? null,
    });
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
        // зачем (координатор 18.10): вход в удалённый аккаунт — какой subject вернул сервер и чем кончился вход.
        console.log('[ACCOUNT-GONE]', JSON.stringify({
          step: 'signin_identity_retired', provider, scope: 'remote', subject: retiredSubject, fresh: fresh.status,
          result: retiredSubject === 'stable' && fresh.status === 'ready' ? 'created_new' : 'error_identity_retired',
        })); // guard-ok: без идентификаторов
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
        console.log('[ACCOUNT-GONE]', JSON.stringify({ step: 'signin_delete_pending', provider, scope: 'remote', result: 'error_account_delete_pending' })); // guard-ok: ранний выход
        return { result: 'error', error: 'account_delete_pending' };
      }
      // зачем (AA S2c, L-S2b-4): перепривязку отклонили из-за потерянного nonce —
      // различимый код «повторите вход» вместо общего тупика auth_link_failed.
      const remoteFailureCode = linkedRemote.nonceRejection ?? 'auth_link_failed';
      identityTrace('[AUTH-LINK-GOOGLE]', 'result error', { provider, error: remoteFailureCode, branch: 'remote', tookMs: identityTraceClockMs() - traceStartedAt }, { persist: true });
      return { result: 'error', error: remoteFailureCode };
    }
    // зачем (B3, координатор 12.10): авторитетный ответ этого входа — свап может не перечитывать ту же привязку вторым callable.
    remoteLinkEvidence = {
      stableUid: linkedRemote.stableUid,
      authUid: linkedRemote.authUid ?? null,
      source: linkedRemote.source,
      atMs: identityTraceClockMs(),
    };
    outcome = {
      kind: 'merged_swap_to_remote',
      remoteStableId: linkedRemote.stableUid,
      mergedFromStableId: localStableId,
    };
  } else {
    let linkedLocal = await ensureStableAuthLinkWithRetry(localStableId);
    identityTrace('[AUTH-LINK-GOOGLE]', 'ensure_link local', {
      provider,
      ok: linkedLocal.ok,
      failure: linkedLocal.failure ?? null,
      source: linkedLocal.source,
      stableUid: identityTag(linkedLocal.stableUid),
      sameAsLocal: linkedLocal.stableUid === localStableId,
      nonceRejection: linkedLocal.nonceRejection ?? null,
    });
    // S2c (L-S2b-4): потерянный nonce запоминаем ДО ротации — ротация не меняет
    // прежнее поведение, но итоговый отказ получит различимый код.
    const localNonceRejection = linkedLocal.nonceRejection ?? null;
    if (!linkedLocal.ok && linkedLocal.failure === 'stable_id_mismatch') {
      if (options.requireCurrentStableIdOwnership) {
        return rejectRecoveryProviderMismatch(provider, 'stable_owner_mismatch');
      }
      // A previous interrupted provider switch can leave local progress under a
      // stable id owned by an obsolete anonymous Firebase uid. That identity
      // cannot be reclaimed safely, so rotate only the anchor and keep the local
      // progress. This restores social access without merging foreign data.
      try {
        await quiesceSyncBeforeStableIdSwap();
        await beginEntitlementSafeAccountTransition();
        await clearStableId();
        localStableId = await getStableId();
        beginAccountGeneration(localStableId);
        linkedLocal = await ensureStableAuthLinkWithRetry(localStableId);
        identityTrace('[AUTH-LINK-GOOGLE]', 'stale_identity rotated', {
          provider,
          ok: linkedLocal.ok,
          failure: linkedLocal.failure ?? null,
          newLocalStable: identityTag(localStableId),
        }, { persist: true });
        if (linkedLocal.ok) logAuthEvent('auth_signin_stale_identity_rotated', { provider });
      } catch (e) {
        if (__DEV__) console.warn('[auth_provider] stale stable id rotation failed', e);
        identityTrace('[AUTH-LINK-GOOGLE]', 'stale_identity rotation_failed', { provider, code: identityErrorCode(e) }, { persist: true });
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
        // зачем (координатор 18.10): вход в удалённый аккаунт — какой subject вернул сервер и чем кончился вход.
        console.log('[ACCOUNT-GONE]', JSON.stringify({
          step: 'signin_identity_retired', provider, scope: 'local', subject: retiredSubject, fresh: fresh.status,
          result: retiredSubject === 'stable' && fresh.status === 'ready' ? 'created_new' : 'error_identity_retired',
        })); // guard-ok: без идентификаторов
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
        console.log('[ACCOUNT-GONE]', JSON.stringify({ step: 'signin_delete_pending', provider, scope: 'local', result: 'error_account_delete_pending' })); // guard-ok: ранний выход
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
        identityTrace('[AUTH-LINK-GOOGLE]', 'result linked_pending', { provider, failure: linkedLocal.failure, tookMs: identityTraceClockMs() - traceStartedAt });
        emitAuthProviderLinked();
        return { result: 'linked_pending', email: firebaseEmail, displayName: providerDisplayName };
      }
      // зачем (AA S2c, L-S2b-4): см. remote-ветку — различимый код при потере nonce.
      const localFailureCode = localNonceRejection ?? 'auth_link_failed';
      identityTrace('[AUTH-LINK-GOOGLE]', 'result error', { provider, error: localFailureCode, branch: 'local', failure: linkedLocal.failure ?? null, tookMs: identityTraceClockMs() - traceStartedAt }, { persist: true });
      return { result: 'error', error: localFailureCode };
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

  identityTrace('[AUTH-LINK-GOOGLE]', 'outcome', {
    provider,
    kind: outcome.kind,
    handoffMarker: providerHandoffMarker !== null,
    target: outcome.kind === 'merged_swap_to_remote' ? identityTag(outcome.remoteStableId) : identityTag(localStableId),
  });

  // Любой успешный outcome снимает отложенную привязку — она больше не нужна.
  void clearPendingAuthLink();

  // 4. Post-link: handle stable_id swap if needed
  if (outcome.kind === 'merged_swap_to_remote') {
    // зачем (координатор 12.10, вход в №2 за 55–61 с, 25 с внутри связки; СПЕРВА ЛОГИ): этапы хвоста свапа шли без строк
    // между merge_skipped_fallback и merged_devices — теперь каждый печатает своё время (tookMs) и монотонное t.
    let swapStageAt = identityTraceClockMs();
    const swapStage = (stage: string, extra?: Record<string, string | number | boolean | null>): void => {
      const now = identityTraceClockMs();
      identityTrace('[AUTH-LINK-GOOGLE]', `swap stage ${stage}`, { provider, tookMs: now - swapStageAt, sinceStartMs: now - traceStartedAt, ...(extra ?? {}) });
      swapStageAt = now;
    };
    try {
      const preserveLocalProgress = providerHandoffMarker
        ? false
        : await hasMeaningfulLocalAccountData();
      swapStage('local_data_checked', { preserveLocalProgress, handoff: providerHandoffMarker !== null });
      // AA S2d раунд 3 (§135 ❓2): в этом входе сохранена аварийная копия гостя A —
      // после свапа она либо получает метку подтверждённого merge, либо откладывается.
      let presyncBackupSaved = false;
      // Сразу синкаем текущий локальный прогресс в облако
      // (на случай если local чуть-чуть свежее — после swap данные не пропадут).
      // syncToCloud у нас пишет в users/{currentLocalStableId} — это корректно ДО swap.
      // Здесь нельзя оставлять обычный debounce: дальше мы меняем stable_id и чистим локальные
      // progress-ключи, поэтому свежий локальный прогресс должен быть отправлен прямо сейчас.
      if (preserveLocalProgress) {
        // зачем: ЭТОТ шаг намеренно остаётся блокирующим и с полным таймаутом —
        // единственная защита свежего локального прогресса перед wipeLocalAccountData.
        // Унести в фон или укоротить = риск потери прогресса на медленной сети.
        //
        // зачем (AA S2d 🔴2, §127, H7-1/H7-2): прежде здесь был syncToCloud({forceNow}).
        // Он (а) возвращался сразу, если синхронизация уже шла; (б) при расхождении
        // с сервером молча НИЧЕГО не выгружал, а presync считался успешным;
        // (в) в том же расхождении запускал adopt — стирание и ПОЛНОЕ
        // восстановление чужого профиля прямо внутри 20-секундного окна
        // (swap_timeout_swap_presync_20000ms). Теперь: принудительная выгрузка,
        // которая дожидается идущей синхронизации, НЕ делает adopt и возвращает
        // да/нет. Нет подтверждённой выгрузки → НЕ стираем, понятный отказ
        // local_progress_not_uploaded. Восстановление профиля remote — уже после
        // свапа, в фоне (scheduleSameStablePostAuthRefresh ниже), со своим повтором.
        const presyncStarted = identityTraceClockMs();
        identityTrace('[AUTH-LINK-GOOGLE]', 'swap presync_start', { provider, timeoutMs: SIGNIN_CLOUD_SYNC_TIMEOUT_MS });
        // зачем (владелец 18.10 «ни один вход без ошибки», патч Ядра 04): быстрый сбой выгрузки повторяется тихо (не таймаут).
        const presync = await presyncUploadWithQuietRetry(async () => {
          let refusal = 'not_uploaded';
          try {
            const uploaded = await withTimeout(
              forceSyncToCloud({ adoptOnIdentityMismatch: false, onRefusal: (code) => { refusal = code; } }),
              SIGNIN_CLOUD_SYNC_TIMEOUT_MS,
              'swap_presync',
            );
            return { uploaded, refusal, errorCode: null };
          } catch (e) {
            const code = identityErrorCode(e);
            return { uploaded: false, refusal: code.startsWith('timeout_') ? 'timeout' : 'error', errorCode: code };
          }
        });
        const presyncUploaded = presync.uploaded;
        const presyncRefusal: string = presync.refusal;
        const presyncErrorCode: string | null = presync.errorCode;
        const presyncTookMs = identityTraceClockMs() - presyncStarted;
        if (!presyncUploaded) {
          // зачем (AA S2d раунд 2, H-S2d-2, вариант б): в этой ветке выгрузить гостя A
          // структурно нельзя (сервер называет remote, правила не дают писать A), и
          // голый отказ оставлял человека в тупике. Поэтому — аварийная копия A,
          // проверенная ДО стирания (записана и читается как копия именно A), без
          // права отодвинуть чужую копию; затем тот же серверный merge(A, B), что и до
          // S2d. Любой отказ копии → прежний отказ без стирания.
          let backupPairs: number | null = null;
          let backupBytes: number | null = null;
          // зачем (патч Ядра 04): сбой записи/проверки копии повторяется тихо; «нельзя по состоянию устройства» — нет.
          const backup = await presyncBackupWithQuietRetry(async () => {
            try {
              const saved = await saveAccountSwitchEmergencyBackup(
                'sign_in_presync_not_uploaded_before_swap',
                localStableId,
              );
              const summary = saved ? await readAccountSwitchEmergencyBackupSummary() : null;
              backupPairs = summary?.pairCount ?? null;
              backupBytes = summary?.bytes ?? null;
              if (!saved) return 'account_switch_backup_unavailable';
              if (summary?.stableId !== localStableId) return 'account_switch_backup_owner_mismatch';
              return null;
            } catch (backupError) {
              return identityErrorCode(backupError);
            }
          });
          const backupCode: string | null = backup.backupCode;
          if (backupCode !== null) {
            console.warn(`[SIGNIN] presync REFUSED ${presyncTookMs}ms reason=${presyncRefusal} backup=${backupCode}`);
            // Случай §126: Firebase УЖЕ держит провайдер-сессию — следующий тап упрётся
            // в account_switch_required. Локальный профиль НЕ стёрт и stable_id прежний.
            identityTrace('[AUTH-LINK-GOOGLE]', 'swap presync_failed', {
              provider,
              reason: presyncRefusal,
              code: presyncErrorCode,
              backup: backupCode,
              refusal: classifyPresyncBackupRefusal(backupCode),
              tookMs: presyncTookMs,
              wiped: false,
              authState: auth.currentUser?.isAnonymous === false ? 'provider' : 'anonymous_or_none',
              localStable: identityTag(localStableId),
            }, { persist: true });
            captureAuthSignInFailure(provider, 'swap', `presync_${presyncRefusal}_backup_${backupCode}`);
            // зачем (AA S2d раунд 3, §135 ❓1): «копию сделать нельзя» по состоянию
            // устройства → local_progress_backup_blocked («Сменить аккаунт»); сбой
            // записи/связи → local_progress_not_uploaded («Повторить»). Таблица —
            // app/presync_backup_refusal.ts.
            return { result: 'error', error: classifyPresyncBackupRefusal(backupCode) };
          }
          presyncBackupSaved = true;
          // §134: размер копии (ключи и байты, без значений) — по нему видно, что
          // свежий прогресс гостя действительно сохранён до стирания.
          identityTrace('[AUTH-LINK-GOOGLE]', 'swap presync_backup_saved', {
            provider,
            reason: presyncRefusal,
            code: presyncErrorCode,
            backupPairs,
            backupBytes,
            tookMs: presyncTookMs,
            localStable: identityTag(localStableId),
          }, { persist: true });
        } else {
          console.log(`[SIGNIN] presync ok ${presyncTookMs}ms`);
          identityTrace('[AUTH-LINK-GOOGLE]', 'swap presync_ok', { provider, tookMs: presyncTookMs });
        }
      } else {
        identityTrace('[AUTH-LINK-GOOGLE]', 'swap presync_skipped', {
          provider,
          reason: providerHandoffMarker ? 'handoff' : 'no_meaningful_local_progress',
        });
      }

      // СЛИЯНИЕ НА СЕРВЕРЕ (Admin SDK, best-of-field). Заменяет старую клиентскую
      // склейку, которая (а) теряла прогресс проигравшей стороны и (б) копировала
      // локальный премиум на чужой аккаунт (дубль). Сервер сливает progress/shards
      // корректно и переносит премиум-блок целиком от «сильной» стороны.
      //
      // Merge удаётся, только когда сервер может доказать владение ОБОИМИ аккаунтами
      // (legacy reward-merge ветка: и local, и remote привязаны к этому auth uid). В ветке
      // «провайдер уже привязан к remote» (returning user / новое устройство) локальный
      // анонимный аккаунт НЕ принадлежит новому uid — merge тогда вернёт null. Это НЕ
      // ошибка: деградируем до простого свапа на remote (прежнее поведение), а не рвём
      // вход. canonicalStableId = победитель слияния, иначе сам remote.
      swapStage('presync_phase_done');
      const merge = preserveLocalProgress
        ? await mergeStableAccountsViaServer(outcome.mergedFromStableId, outcome.remoteStableId)
        : null;
      swapStage('server_merge_done', { called: preserveLocalProgress });
      identityTrace('[AUTH-LINK-GOOGLE]', 'swap merge_result', {
        provider,
        called: preserveLocalProgress,
        ok: merge?.ok === true,
        canonical: identityTag(merge?.canonicalStableId ?? null),
        canonicalIsRemote: merge?.canonicalStableId === outcome.remoteStableId,
        alreadyMerged: merge?.alreadyMerged === true,
      });
      let canonicalStableId: string;
      // зачем (координатор 17.10, 💸): подтверждение привязки этим входом — переносим в новое поколение после свапа.
      let swapConfirmedLink: StableAuthLinkEnsureResult | null = null;
      if (merge?.ok && merge.canonicalStableId) {
        canonicalStableId = merge.canonicalStableId;
      } else {
        // A HOT callable timeout does not cancel the server merge. Never turn a
        // null/pending response into a destructive inferred swap: re-read the
        // authoritative anchor after the reservation/copy boundary.
        // зачем (B3, координатор 12.10, реестр п.73): перечтение — второй callable ~3,7 с. Пропускаем ТОЛЬКО когда слияния не было,
        // а этот же вход получил привязку от сервера (callable, тот же stableUid, тот же uid Firebase); иначе перечитываем как раньше.
        // зачем (сторож auth_provider_stable_link «нет запасного владельца»): цель свапа передаём сокращённой записью, а при
        // повторном использовании берём stableUid из ДОКАЗАТЕЛЬСТВА сервера (он равен цели по условию решения) — ни одного
        // присваивания «двоеточие + outcome-цель» в блоке свапа.
        const swapTargetStableId = outcome.remoteStableId;
        const linkReuse = decideRemoteLinkReuseForSwap({
          mergeCalled: preserveLocalProgress,
          evidence: remoteLinkEvidence,
          remoteStableId: swapTargetStableId,
          currentAuthUid: getAuth()?.currentUser?.uid ?? null,
        });
        let authoritativeAfterMerge: StableAuthLinkEnsureResult;
        if (linkReuse.reuse) {
          swapStage('authoritative_link_reused', {
            source: linkReuse.evidence.source,
            ageMs: identityTraceClockMs() - linkReuse.evidence.atMs,
          });
          authoritativeAfterMerge = {
            ok: true,
            requestedStableId: linkReuse.evidence.stableUid,
            stableUid: linkReuse.evidence.stableUid,
            authUid: linkReuse.evidence.authUid,
            source: linkReuse.evidence.source,
          };
        } else {
          identityTrace('[AUTH-LINK-GOOGLE]', 'swap authoritative_link_reread', { provider, reason: linkReuse.reason });
          authoritativeAfterMerge = await ensureStableAuthLinkForStableIdDetailed(
            outcome.remoteStableId,
            authLinkMetadata,
            { requireAuthoritative: true },
          );
          swapStage('authoritative_link_read');
        }
        // 🔴 для координатора (Plus): сюда попадаем, когда слияние не выполнено
        // (null) — свап на remote БЕЗ переноса premium-блока локального аккаунта.
        identityTrace('[AUTH-LINK-GOOGLE]', 'swap merge_skipped_fallback', {
          provider,
          preserveLocalProgress,
          ok: authoritativeAfterMerge.ok,
          failure: authoritativeAfterMerge.failure ?? null,
          canonical: identityTag(authoritativeAfterMerge.stableUid),
        }, { persist: true });
        if (!authoritativeAfterMerge.ok || !authoritativeAfterMerge.stableUid) {
          return { result: 'error', error: 'merge_pending' };
        }
        canonicalStableId = authoritativeAfterMerge.stableUid;
        swapConfirmedLink = authoritativeAfterMerge;
      }

      // Хвост D: погасить фоновый/отложенный sync ДО смены stable_id, иначе debounce-sync
      // со старым прогрессом запишется в users/{новый canonical} и затрёт слитый аккаунт.
      await quiesceSyncBeforeStableIdSwap();
      swapStage('sync_quiesced');

      // Clear account A while its id is still active, then install server-canonical B.
      // This prevents account A AsyncStorage from being observed under account B.
      await beginEntitlementSafeAccountTransition();
      swapStage('entitlement_transition_begun');
      await withAccountTransitionLock(async (transitionLease) => {
        swapStage('transition_lock_acquired');
        await wipeLocalAccountData(transitionLease);
        swapStage('wipe_done');
        await setStableId(canonicalStableId);
        // зачем (прогон 12.10: wipe_done → stable_id_installed 2,2 с): разложить хвост под замком.
        swapStage('set_stable_id_done');
        if (providerHandoffMarker) {
          await clearProviderCredentialHandoff(providerHandoffMarker);
          providerHandoffMarker = null;
          swapStage('handoff_cleared');
        }
        beginAccountGeneration(canonicalStableId);
        swapStage('generation_begun');
        // зачем (координатор 17.10, 💸 + долгий вход): wipe стёр кэш привязки — без переноса swap_restore снова зовёт
        // authEnsureStableLink (4,3 с, лишний вызов функции). Только ветка без слияния: там подтверждение получено этим входом.
        if (swapConfirmedLink) {
          await rememberSwapConfirmedStableAuthLink(swapConfirmedLink, canonicalStableId, 'signin_swap');
          swapStage('link_confirmation_carried');
        }
        if (presyncBackupSaved && canonicalStableId !== outcome.mergedFromStableId) {
          await settleGuestBackupAfterSwap(
            outcome.mergedFromStableId,
            canonicalStableId,
            merge?.ok === true && merge.canonicalStableId === outcome.remoteStableId,
            provider,
          );
        }
      }, handoffLeaseScope.lease ?? undefined);
      swapStage('stable_id_installed');

      // Премиум-кэш (premium_guard, TTL 5 мин) держит решение ПРЕДЫДУЩЕГО аккаунта.
      // Без сброса до 5 минут после свапа в UI виден чужой премиум-статус.
      invalidatePremiumCache();

      // Гарантируем Firebase Auth state ready (после signInWithCredential anon → google)
      await ensureAnonUser();
      swapStage('auth_user_ready');

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
      identityTrace('[AUTH-LINK-GOOGLE]', 'result merged_devices', {
        provider,
        from: identityTag(outcome.mergedFromStableId),
        to: identityTag(canonicalStableId),
        tookMs: identityTraceClockMs() - traceStartedAt,
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
      // зачем (TG-0AE4918142EE): в аналитику и журнал — только код, без текста ошибки.
      const telemetryCode = identityErrorCode(e);
      if (__DEV__) console.warn(`[auth_provider] post-merge swap failed code=${telemetryCode}`);
      logAuthEvent('auth_signin_error', { provider, stage: 'swap', error: telemetryCode });
      const errStr = `swap_${e?.message ?? 'unknown'}`.slice(0, 80);
      identityTrace('[AUTH-LINK-GOOGLE]', 'result error', {
        provider,
        error: 'swap',
        code: identityErrorCode(e),
        authState: auth.currentUser?.isAnonymous === false ? 'provider' : 'anonymous_or_none',
        tookMs: identityTraceClockMs() - traceStartedAt,
      }, { persist: true });
      // зачем (TG-17B4F6788C5A): stage swap = critical (Firestore/Telegram) — только код.
      captureAuthSignInFailure(provider, 'swap', `swap_${telemetryCode}`);
      return { result: 'error', error: errStr };
    }
  }

  if (outcome.kind === 'merged_keep_local') {
    // Local выиграл по legacy reward/владению. РАНЬШЕ тут НЕ звался серверный merge (только в
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
      } catch (e) {
        // зачем (Ревизор 3.15, aac7e1014): причина снятия handoff — тип ошибки, без идентификаторов.
        console.warn('[AUTH] provider handoff clear failed', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
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
        // зачем (TG-0AE4918142EE): в журнал — только код ошибки.
        console.warn(`[SIGNIN] keep_local tail failed reason=${identityErrorCode(e)}`);
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
      } catch (e) {
        // зачем (Ревизор 3.15, aac7e1014): причина снятия handoff — тип ошибки, без идентификаторов.
        console.warn('[AUTH] provider handoff clear failed', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
        announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
        return { result: 'error', error: 'provider_handoff_recovery_required' };
      }
    }
    scheduleSameStablePostAuthRefresh('linked_restore');
    identityTrace('[AUTH-LINK-GOOGLE]', 'result linked_existing', { provider, tookMs: identityTraceClockMs() - traceStartedAt });
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
    } catch (e) {
      // зачем (Ревизор 3.15, aac7e1014): причина снятия handoff — тип ошибки, без идентификаторов.
      console.warn('[AUTH] provider handoff clear failed', e instanceof Error ? e.name : typeof e); // guard-ok: только тип ошибки
      announceAccountSwitchQuarantineFailure('provider_handoff_clear_failed');
      return { result: 'error', error: 'provider_handoff_recovery_required' };
    }
  }
  scheduleSameStablePostAuthRefresh('created_restore');
  identityTrace('[AUTH-LINK-GOOGLE]', 'result created_new', { provider, tookMs: identityTraceClockMs() - traceStartedAt });
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
  // зачем (релизный пол 10.10): тихий спиннер на месте данных, пока они догружаются.
  const endCloudRefresh = beginCloudProfileRefresh(stage);
  void (async () => {
    const t0 = Date.now();
    const stableId = options.preparedStableId ?? (await getStableId().catch(swallowAuthAs('[AUTH-BG-REFRESH]', 'read_stable', null)));
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
        // зачем (TG-0AE4918142EE): только код — текст ошибки входа может нести почту.
        console.warn(`[SIGNIN] bg:${stage}:${name} FAIL ${Date.now() - started}ms reason=${identityErrorCode(e)}`);
        return undefined;
      }
    };

    // зачем (бета А5 15.10, authfetch_on_r7g: restoreFromCloud FAIL по потолку 20 с, а [LOGIN-BONUS-RESTORE] шёл ещё через 3 с):
    // withTimeout не отменяет восстановление — пишем, чем оно кончилось после потолка. Сперва логи; событие обновления экрана — по фактам.
    const restorePromise = restoreFromCloudDetailed();
    restoreResult = (await step('restoreFromCloud', () =>
      withTimeout(restorePromise, SIGNIN_CLOUD_SYNC_TIMEOUT_MS, stage),
    )) ?? 'failed';
    if (restoreResult === 'failed') {
      const lateFrom = Date.now();
      void restorePromise.then(
        (late) => {
          const current = isCurrent();
          console.log(`[SIGNIN] bg:${stage}:restoreFromCloud late=${late} afterTimeoutMs=${Date.now() - lateFrom} current=${current}`);
          // зачем (координатор 15.10, п.2 RESTORE): данные облака, доехавшие после потолка 20 с, уже лежат на диске, но экраны
          // о них не знали — Главная показывала старые серию/монеты до перезапуска. Тот же сигнал, что у вовремя пришедшего
          // восстановления (Главная перечитывает диск с дебаунсом), только для текущего владельца.
          if (late === 'restored' && current) {
            console.log(`[SIGNIN] restore_late_applied stage=${stage} afterTimeoutMs=${Date.now() - lateFrom}`);
            emitAppEvent('cloud_profile_hydrated');
          } else {
            console.log(`[SIGNIN] restore_late_skipped stage=${stage} late=${late} current=${current}`);
          }
        },
        (e) => console.warn(`[SIGNIN] bg:${stage}:restoreFromCloud late_fail afterTimeoutMs=${Date.now() - lateFrom} reason=${identityErrorCode(e)}`),
      );
    }
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_restore`); return; }
    // зачем (PM-289, D70/D84/D103): жемчуг удалён в 2.0 без компенсации — баланс нигде
    // не показывается и не тратится, начислений (в т.ч. оплаченных пакетов) больше нет.
    // Открытие его журнала на входе было лишним шагом фона (до двух чтений Firestore
    // на первом входе с устройства). Журнал client_shard_operation_ledger не тронут.
    console.log(`[AUTH-SHARDS] шаг шардов снят stage=${stage}`);
    await step('switchBackup', () => tryRestoreAccountSwitchBackup(stage, isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_backup`); return; }
    await step('markOnboarded', () => markOnboardedAfterSignIn(isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_onboarded`); return; }
    await step('revenueCat', () => syncRevenueCatAfterAuthLink(isCurrent));
    if (!isCurrent()) { console.log(`[SIGNIN] bg:${stage} abort=stale_after_rc`); return; }
    if (restoreResult !== 'failed' && await hasMeaningfulLocalAccountData()) {
      if (!isCurrent()) return;
      await syncToCloud({ forceNow: true }).catch(swallowAuthAs('[AUTH-BG-REFRESH]', 'sync_after_restore', undefined));
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
    // зачем (TG-0AE4918142EE): в журнал — только код ошибки.
    console.warn(`[SIGNIN] bg:${stage} background refresh failed reason=${identityErrorCode(e)}`);
  }).finally(endCloudRefresh);
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
      const stableId = peekStableId() ?? await readExistingStableId().catch(swallowAuthAs('[AUTH-SIGNOUT]', 'switch_recovery_read_stable', null));
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
      // зачем ([ACC-SPEED], координатор 14.10): какое из трёх ожиданий держит восстановление после выхода/смены.
      const startedAtMs = Date.now();
      const timedWait = async (name: string, work: Promise<boolean>): Promise<boolean> => {
        const value = await work;
        console.warn('[ACC-SPEED]', JSON.stringify({ step: `quiesce:${name}`, ms: Date.now() - startedAtMs, idle: value }));
        return value;
      };
      const [premiumIdle, restoreIdle, cloudIdle] = await Promise.all([
        timedWait('premium', waitForPremiumAccountWorkIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)),
        timedWait('restore', waitForRestoreApplicationIdleWithDeadline(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)),
        timedWait('cloud', quiesceCloudSyncForAccountTransition(ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS)),
      ]);
      return premiumIdle && restoreIdle && cloudIdle;
    },
    // зачем (шаг 3): выход внутри смены сохраняет пропуск, выбранный перед сменой.
    // зачем (координатор 15.10, LOGOUT_WIPE_AUDIT 🔴 приватность): push-токен и запланированные уведомления A снимались только при
    // УДАЛЕНИИ — телефон после выхода/смены получал пуши A. Снимаем ДО signOut (запись токена требует живой авторизации).
    // Только здесь: общий выход провайдера зовёт и ветка восстановления, где аккаунт сохраняется.
    signOut: async (): Promise<void> => {
      await clearAccountPushBeforeSwitchSignOut();
      await signOutCurrentProviderKeepingSwitchResume();
    },
    // зачем (координатор 18.10, Ядро 15.10): выход/смена — онбординг, согласия и языки устройства не стираются (R132).
    wipeLocalData: async (): Promise<void> => { await wipeLocalAccountData(undefined, { mode: 'signout' }); },
    // зачем (координатор 18.10 10:10): откат прерванной передачи входа — тот же человек, согласия не сбрасываем
    wipeLocalDataForHandoffRollback: async (): Promise<void> => { await wipeLocalAccountData(undefined, { mode: 'signout', keepConsents: true }); },
    // зачем (координатор 18.10): довести прерванный вход вперёд вместо отката к гостю
    // зачем (Ревизор f9d304c91, TS7006): объект зависимостей без объявленного типа — параметр типизируем явно.
    completeProviderHandoff: (input: Parameters<typeof completeInterruptedProviderHandoff>[0]) => completeInterruptedProviderHandoff(input),
    clearStableId: async (): Promise<void> => {
      await clearStableId();
      await clearPendingAuthLink();
    },
    ensureAnonymousIdentity: async (): Promise<void> => {
      // зачем ([ACC-SPEED]): анонимный вход (сеть Firebase) и выдача stable id — по отдельности.
      const startedAtMs = Date.now();
      await ensureAnonUser();
      console.warn('[ACC-SPEED]', JSON.stringify({ step: 'anon:ensureAnonUser', ms: Date.now() - startedAtMs }));
      const stableStartedAtMs = Date.now();
      await getStableId();
      console.warn('[ACC-SPEED]', JSON.stringify({ step: 'anon:getStableId', ms: Date.now() - stableStartedAtMs }));
    },
    activateGeneration: (stableId: string): void => { beginAccountGeneration(stableId); },
  };
}

/**
 * зачем (координатор 18.10, «вход — главная задача»): приложение убили посреди входа — Firebase уже вошёл в провайдер B,
 * запись передачи осталась. Раньше загрузка откатывала к гостю; теперь доводим вход вперёд тем же хвостом, что и обычный
 * вход (auth_links → авторитетная связка → под замком: стирание гостя, setStableId, поколение → фоновое восстановление).
 * Гость был доказан чистым ДО записи передачи, поэтому сохранять его прогресс не нужно (как и в самом входе).
 * null — довести нельзя (несовпадение, сеть, сервер): вызывающий делает прежний безопасный откат.
 */
export async function completeInterruptedProviderHandoff(input: Readonly<{
  provider: AuthProviderId;
  ownerStableId: string;
  targetAuthUid: string | null;
  /** Снять запись передачи внутри замка сразу после установки stable id (как обычный вход) — нет окна «запись + чужой stable». */
  clearHandoff: () => Promise<void>;
}>): Promise<{ stableId: string; authUid: string } | null> {
  const startedAt = Date.now();
  const giveUp = (reason: string): null => {
    console.warn(`[AUTH-HANDOFF] roll_forward gave_up reason=${reason} provider=${input.provider} tookMs=${Date.now() - startedAt}`); // guard-ok: ранний выход пишет причину
    return null;
  };
  const user = getAuth()?.currentUser;
  const authUid = String(user?.uid ?? '').trim();
  if (!user || user.isAnonymous !== false || !authUid) return giveUp('no_provider_user');
  if (input.targetAuthUid && input.targetAuthUid !== authUid) return giveUp('target_uid_mismatch');
  console.log(`[AUTH-HANDOFF] roll_forward start provider=${input.provider} authUid=${identityTag(authUid)} owner=${identityTag(input.ownerStableId)}`); // guard-ok: вход
  const firestore = getFirestore();
  if (!firestore) return giveUp('firestore_unavailable');
  // зачем (Ревизор к 1b38ad210, 🟡): auth_links (до 5 с) + функция связки держали заставку при запуске 5–10 с. Общий срок
  // ставим ТОЛЬКО на сетевую часть — до замка и стирания: обрезать весь довод нельзя, он продолжился бы в фоне и столкнулся
  // с откатом (две смены личности сразу). Срок вышел → forward_timeout, сдаёмся без изменений, вызывающий делает откат.
  const networkLeftMs = (): number => Math.max(0, ROLL_FORWARD_NETWORK_DEADLINE_MS - (Date.now() - startedAt));
  const forwardTimeout = (step: string): null => {
    console.warn(`[AUTH-HANDOFF] forward_timeout step=${step} deadlineMs=${ROLL_FORWARD_NETWORK_DEADLINE_MS} tookMs=${Date.now() - startedAt}`); // guard-ok: ранний выход пишет причину
    return giveUp(`forward_timeout_${step}`);
  };
  let remoteStableId: string | null = null;
  try {
    // один документ по ключу (auth_links/{uid}), не выборка коллекции
    const linkSnap = await withTimeout<any>(firestore.collection('auth_links').doc(authUid).get(), Math.min(AUTH_LINK_HINT_TIMEOUT_MS, networkLeftMs()), 'roll_forward_link_lookup');
    const linked = linkSnap.exists ? linkSnap.data()?.stable_id : null;
    remoteStableId = typeof linked === 'string' && linked.trim() ? linked.trim() : null;
  } catch (lookupError) {
    const lookupCode = identityErrorCode(lookupError);
    if (lookupCode.startsWith('timeout_')) return forwardTimeout('link_lookup');
    return giveUp(`link_lookup_${lookupCode}`);
  }
  const metadata: StableAuthLinkMetadata = {
    provider: input.provider,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    lastSignInAt: Date.now(),
    devicePlatform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  };
  // Нашлась связка — это существующий аккаунт B; нет — новый B, привязываем к нему чистого гостя (ветка «local» обычного входа).
  const targetStableId = remoteStableId ?? input.ownerStableId;
  const ensureLeftMs = networkLeftMs();
  if (ensureLeftMs <= 0) return forwardTimeout('before_ensure_link');
  let ensureTimedOut = false;
  const proof = await withTimeout(
    ensureStableAuthLinkForStableIdDetailed(targetStableId, metadata, { requireAuthoritative: true }),
    ensureLeftMs,
    'roll_forward_ensure_link',
  ).catch((linkError: unknown) => {
    const linkCode = identityErrorCode(linkError);
    ensureTimedOut = linkCode.startsWith('timeout_');
    console.warn(`[AUTH-HANDOFF] roll_forward ensure_link threw code=${linkCode}`); // guard-ok: catch пишет причину
    return null;
  });
  if (ensureTimedOut) return forwardTimeout('ensure_link');
  if (!proof?.ok || !proof.stableUid) return giveUp(`ensure_link_${proof?.failure ?? 'failed'}`);
  const canonicalStableId = proof.stableUid;
  console.log(`[AUTH-HANDOFF] roll_forward linked branch=${remoteStableId ? 'remote' : 'local'} canonical=${identityTag(canonicalStableId)}`); // guard-ok: ветка решения
  if (canonicalStableId !== input.ownerStableId) {
    await quiesceSyncBeforeStableIdSwap();
    await beginEntitlementSafeAccountTransition();
    await withAccountTransitionLock(async (transitionLease) => {
      // гость доказан чистым до записи передачи — стираем его локальное, ставим канонический B
      await wipeLocalAccountData(transitionLease, { mode: 'full' });
      await setStableId(canonicalStableId);
      await input.clearHandoff();
      beginAccountGeneration(canonicalStableId);
      await rememberSwapConfirmedStableAuthLink(proof, canonicalStableId, 'handoff_roll_forward');
    });
    invalidatePremiumCache();
    scheduleSameStablePostAuthRefresh('swap_restore', { preparedStableId: canonicalStableId });
  } else {
    await input.clearHandoff();
    beginAccountGeneration(canonicalStableId);
    scheduleSameStablePostAuthRefresh('linked_restore', { preparedStableId: canonicalStableId });
  }
  emitAuthProviderLinked();
  console.log(`[AUTH-HANDOFF] roll_forward done provider=${input.provider} canonical=${identityTag(canonicalStableId)} tookMs=${Date.now() - startedAt}`); // guard-ok: итог
  return { stableId: canonicalStableId, authUid };
}

export function resumePendingAccountSwitchQuarantine(): Promise<AccountSwitchResumeResult> {
  return resumeAccountSwitchQuarantine(accountSwitchRecoveryDependencies());
}

const ACCOUNT_SWITCH_RECOVERY_RETRY_PAUSES_MS: readonly number[] = [800, 2_000];

/**
 * A5 (правило владельца 18.10 «выход без ошибки»): экран выхода/смены вызывает это вместо окна «Не удалось выйти —
 * перезапусти приложение». Защитная запись смены уже стоит (recovery_required / wipe_failed) — доводим её тем же
 * восстановлением, что при запуске, тихо до трёх попыток; повторяем только retryable (quarantined повтор не исправит).
 */
export async function resumeAccountSwitchRecovery(): Promise<{ ok: boolean }> {
  const startedAt = Date.now();
  for (let attempt = 0; ; attempt += 1) {
    let result: AccountSwitchResumeResult;
    try {
      result = await resumePendingAccountSwitchQuarantine();
    } catch (error) {
      result = { result: 'retryable', reason: `threw_${identityErrorCode(error)}` };
    }
    console.log('[AUTH-LOGOUT]', JSON.stringify({ stage: 'recovery_attempt', attempt: attempt + 1, result: result.result, reason: 'reason' in result ? result.reason : null, ms: Date.now() - startedAt })); // guard-ok: каждая попытка и её исход
    if (result.result === 'completed' || result.result === 'none') return { ok: true };
    const pauseMs = ACCOUNT_SWITCH_RECOVERY_RETRY_PAUSES_MS[attempt];
    if (result.result === 'quarantined' || pauseMs === undefined) {
      console.warn('[AUTH-LOGOUT]', JSON.stringify({ stage: 'recovery_gave_up', result: result.result, reason: result.reason, attempts: attempt + 1, ms: Date.now() - startedAt })); // guard-ok: ранний выход пишет причину
      return { ok: false };
    }
    await new Promise<void>((resolve) => { setTimeout(resolve, pauseMs); });
  }
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
   * Потолок ожидания синхронизации с облаком перед выходом, мс (вариант Б «мгновенного выхода», 12.10).
   * Не уложилась — считаем «не синхронизировано»: пишется аварийная копия на телефоне и, при allowWipeWithoutSync,
   * выход идёт дальше. Сама синхронизация не отменяется: её запись после смены поколения аккаунта отбрасывается
   * (stale_generation), а доведение смены ждёт её до 10 с (quiesce). Без значения — ждём, как раньше.
   */
  syncDeadlineMs?: number;
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

/** Последний пройденный шаг выхода — для итоговой строки [AUTH-LOGOUT] (один выход за раз: замок перехода аккаунта). */
let lastSignoutStage = 'none';

export async function signOutAndWipeForAccountSwitch(
  options?: SignOutSwitchOptions,
): Promise<SignOutSwitchResult> {
  // зачем (Авторизация 12.10, settings-gap-001): привязка подставная — выход/смена отказывают ДО замка, синхронизации и стирания.
  if (isDevAccountLinkedDemo()) {
    console.warn('[DEV-STATE] account: выход/смена отклонены — привязка только для показа (account=linked)'); // guard-ok: dev-ветка
    return { ok: false, reason: 'unknown', detail: DEV_LINKED_DEMO_REFUSAL };
  }
  // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `logout=` / `switch=` — отказ ДО резервации замка, синхронизации и стирания (и обычная, и форсированная попытка): реальное стирание недостижимо; в стор-сборке null.
  const devOutcome = getDevSignOutOutcome(options?.allowWipeWithoutSync === true || options?.allowPendingShardSpendDiscard === true);
  if (devOutcome) {
    console.log(`[DEV-STATE] account: выход/смена подменены отказом ${devOutcome.reason} delayMs=${devOutcome.delayMs}`); // guard-ok: dev-ветка
    if (devOutcome.delayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, devOutcome.delayMs));
    // зачем (ревью безопасности 12.10, R-4): результат собирается по каждой причине — без приведения типа, несоответствие поймает tsc.
    switch (devOutcome.reason) {
      case 'wipe_failed': return { ok: false, reason: 'wipe_failed', detail: devOutcome.detail ?? 'dev' };
      case 'sync_failed': return { ok: false, reason: 'sync_failed' };
      case 'pending_shard_spend': return { ok: false, reason: 'pending_shard_spend' };
      case 'shard_queue_quarantined': return { ok: false, reason: 'shard_queue_quarantined' };
      case 'unknown': return { ok: false, reason: 'unknown', detail: devOutcome.detail };
    }
  }
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
    // зачем (TG-0AE4918142EE): в журнал — только код (свои коды замка проходят как есть).
    const reason = identityErrorCode(error);
    console.warn(`[ACC-MUT] signout:out reserve_failed reason=${reason} tookMs=${Date.now() - startedAt}`);
    console.warn('[AUTH-LOGOUT]', JSON.stringify({ stage: 'exit', ok: false, reason: 'reserve_failed', code: reason, lastStage: 'before_start', tookMs: Date.now() - startedAt })); // guard-ok: ранний выход
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
    // зачем (R131): итог одной строкой — любой ранний выход виден причиной и шагом, на котором он случился.
    console.log('[AUTH-LOGOUT]', JSON.stringify({
      stage: 'exit', ok: result.ok, reason: result.ok ? null : result.reason,
      detail: !result.ok && 'detail' in result ? String(result.detail ?? '') : null,
      lastStage: lastSignoutStage, tookMs: Date.now() - startedAt,
    })); // guard-ok: итог выхода, без идентификаторов
    return result;
  } catch (error) {
    // зачем (аудит двойного тапа 11.10): шаг до внутреннего try (возобновление карантина
    // смены) мог бросить — исключение уходило в Настройки/выход/окно входа, где его не
    // ловят, и экран застревал в стадии «стираю». Отдаём обычный отказ с причиной: UI
    // возвращается в исходное состояние, повтор находит маркер и продолжает карантин.
    const code = identityErrorCode(error);
    console.warn(`[ACC-MUT] signout:out threw code=${code} tookMs=${Date.now() - startedAt}`);
    console.warn('[AUTH-LOGOUT]', JSON.stringify({ stage: 'exit', ok: false, reason: 'threw', code, lastStage: lastSignoutStage, tookMs: Date.now() - startedAt })); // guard-ok: catch пишет причину
    return { ok: false, reason: 'unknown', detail: `threw:${code}` };
  } finally {
    releaseTransitionReservation();
  }
}

type AccountSwitchResumeOutcome =
  | { kind: 'resumed'; resumed: AccountSwitchResumeResult }
  | { kind: 'threw'; failure: SignOutSwitchResult };

/**
 * зачем (ревью TG-A3996AF645F1): возобновление карантина идёт ПОСЛЕ записи маркера смены.
 * Его исключение раньше превращалось в reason 'unknown', а Настройки относят 'unknown' к
 * исходу «до маркера» и пишут «Аккаунт и локальные данные не изменены» — неправда. Отдаём
 * recovery_required («перезапусти, чтобы продолжить»): маркер на диске, старт его доведёт.
 */
async function resumeAccountSwitchQuarantineForSignOut(
  stage: 'existing_marker' | 'no_cloud' | 'switch',
): Promise<AccountSwitchResumeOutcome> {
  try {
    return { kind: 'resumed', resumed: await resumePendingAccountSwitchQuarantine() };
  } catch (error) {
    const code = identityErrorCode(error);
    console.warn(`[ACC-MUT] signout:resume_threw stage=${stage} code=${code}`);
    return { kind: 'threw', failure: { ok: false, reason: 'recovery_required', detail: `resume_threw:${code}` } };
  }
}

async function signOutAndWipeForAccountSwitchReserved(
  options?: SignOutSwitchOptions,
): Promise<SignOutSwitchResult> {
  // зачем (2-й прогон Сверки 11.10): выход шёл 28,5 с, а стирание — ~1 с. Засечки [ACC-SIGNOUT] по стадиям (время от входа
  // в функцию) показывают, что держит выход: монеты, синхронизация, замок, доведение смены. Логи — навсегда.
  const signoutStartedAtMs = Date.now();
  // зачем (координатор 18.10 04:52, R131): [AUTH-LOGOUT] — длительность КАЖДОГО шага (stepMs) и от начала; последний шаг
  // запоминается, чтобы итог signOutAndWipeForAccountSwitch показал, на каком шаге был ранний выход.
  let previousStageAtMs = signoutStartedAtMs;
  lastSignoutStage = 'start';
  const signoutStage = (stage: string, extra?: Readonly<Record<string, string | number | boolean | null>>): void => {
    const nowMs = Date.now();
    identityTrace('[ACC-SIGNOUT]', `stage ${stage}`, { sinceStartMs: nowMs - signoutStartedAtMs, ...(extra ?? {}) });
    console.log('[AUTH-LOGOUT]', JSON.stringify({ stage, stepMs: nowMs - previousStageAtMs, sinceStartMs: nowMs - signoutStartedAtMs, ...(extra ?? {}) })); // guard-ok: одна строка на шаг выхода, без идентификаторов
    previousStageAtMs = nowMs;
    lastSignoutStage = stage;
  };
  const syncDeadlineMs = options?.syncDeadlineMs;
  // зачем (вариант Б): ожидание сети при выходе ограничено; по истечении — тот же путь, что при сбое синхронизации.
  const withSyncDeadline = async <T,>(work: Promise<T>, stage: string, onDeadline: T): Promise<T> => {
    if (!syncDeadlineMs || syncDeadlineMs <= 0) return work;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        work,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => {
            signoutStage(`${stage}_deadline`, { deadlineMs: syncDeadlineMs });
            resolve(onDeadline);
          }, syncDeadlineMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const existingTransition = await inspectAccountSwitchQuarantine().catch((inspectError: unknown) => {
    // зачем (AA S2c, [ACC-SWITCH-WIPE]): прежде немой — «маркер битый» и «не
    // смогли прочитать» сливались в один recovery_required/marker_invalid.
    identityTrace('[ACC-SWITCH-WIPE]', 'signout inspect_failed', { code: identityErrorCode(inspectError) }, { persist: true });
    return { status: 'corrupt' as const };
  });
  if (existingTransition.status !== 'none') {
    if (existingTransition.status === 'corrupt') {
      invalidateAccountGeneration();
      beginPremiumAccountTransition();
      return { ok: false, reason: 'recovery_required', detail: 'marker_invalid' };
    }
    const resumeOutcome = await resumeAccountSwitchQuarantineForSignOut('existing_marker');
    if (resumeOutcome.kind === 'threw') return resumeOutcome.failure;
    const resumed = resumeOutcome.resumed;
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
      const resumeOutcome = await resumeAccountSwitchQuarantineForSignOut('no_cloud');
      if (resumeOutcome.kind === 'threw') return resumeOutcome.failure;
      const resumed = resumeOutcome.resumed;
      if (resumed.result !== 'completed') {
        return resumed.result === 'none'
          ? { ok: false, reason: 'recovery_required', detail: 'marker_missing' }
          : mapAccountSwitchRecoveryFailure(resumed);
      }
      logAuthEvent('auth_signout_wipe', { mode: 'no_cloud' });
      return { ok: true, synced: true };
    } catch (e: any) {
      // зачем (TG-0AE4918142EE): detail потребители только печатают (журнал/DebugLogger),
      // никто не разбирает текст — отдаём код без возможной почты из текста ошибки.
      return { ok: false, reason: 'unknown', detail: identityErrorCode(e) };
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
    // зачем (Ревизор P24b, координатор 15.10): тумблер пушей + «Выйти» раньше 1,5 с — новое значение A должно дойти до users/{A}.
    // Досылаем ЗДЕСЬ, пока A авторизован и его поколение активно: дальше смена поколения отменит остаток (P24). Нет записи — не ждём.
    try {
      const { flushPendingServerPushPrefsBeforeOwnerChange } = await import('./push_token_registration');
      const pushPrefsFlush = await flushPendingServerPushPrefsBeforeOwnerChange();
      signoutStage('push_prefs_flush', { outcome: pushPrefsFlush });
    } catch (pushPrefsFlushError) {
      signoutStage('push_prefs_flush', { outcome: 'failed', code: identityErrorCode(pushPrefsFlushError) });
    }
    // 1. Гарантируем что весь локальный прогресс ушёл в облако.
    //    Осколки синкаются отдельным путём и в forceSyncToCloud не входят —
    //    без этого вызова баланс офлайн-сессии терялся при смене аккаунта.
    signoutStage('shard_preflight_start');
    const shardPreflight = await preparePendingShardDeltasForAccountSwitch();
    signoutStage('shard_preflight_done', { pendingSpend: shardPreflight.pendingSpend });
    if (shardPreflight.stale || shardPreflight.ownerStableId !== switchOwnerStableId) {
      return { ok: false, reason: 'sync_failed' };
    }
    const discardPendingShardSpend = options?.allowPendingShardSpendDiscard === true;
    // зачем (владелец, 2026-09-22): форсированный выход обязан пройти даже когда
    // в хранилище лежит аварийная копия ДРУГОГО аккаунта. Иначе выход отказывал
    // с account_switch_backup_other_owner_pending и человек был заперт в аккаунте
    // до возвращения того владельца (или до протухания копии через 30 дней).
    // Копия при этом не удаляется, а откладывается — см. cloud_sync.ts.
    // зачем (TG-0AE4918142EE): теперь и ШТАТНЫЙ выход откладывает чужую копию на полку,
    // а не отказывает: отказ толкал AccountLogoutFlow в форсированный выход без
    // синхронизации. Полку забирает её владелец при входе (account_switch_backup_restore).
    const backupOptions = {
      allowShelveOtherOwnerBackup: true,
      shelveReason: discardPendingShardSpend ? 'forced_switch' : 'normal_switch',
    } as const;
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
          backupOptions,
        );
        if (!backedUp) throw new Error('account_switch_backup_unavailable');
      } catch (e: any) {
        // зачем (TG-0AE4918142EE): в аналитику, журнал и detail результата — только код.
        const detail = identityErrorCode(e);
        if (__DEV__) console.warn(`[auth_provider] account switch shard-spend discard backup failed code=${detail}`);
        logAuthEvent('auth_signout_wipe_failed', { stage: 'backup', error: detail });
        return { ok: false, reason: 'backup_failed', detail };
      }
      logAuthEvent('auth_signout_wipe_shard_spend_discard', { stage: 'preflight' });
    }
    await withSyncDeadline(forceSyncShardsToCloud(), 'shard_sync', undefined).catch((shardSyncError: unknown) => {
      // Осколки дальше страхует аварийная копия; причина — в лог (S2c).
      identityTrace('[ACC-SWITCH-WIPE]', 'signout shard_sync_failed', { code: identityErrorCode(shardSyncError) });
    });
    signoutStage('shard_sync_done');
    // зачем (засечки Сверки 12.10: 1-я синхронизация 12 с → synced=false на рабочей сети): код отказа раньше терялся.
    const synced = await withSyncDeadline(
      forceSyncToCloud({ onRefusal: (code) => signoutStage('force_sync_refused', { code }), logPrefix: '[SIGNOUT-SYNC]', skipUnchangedDocWrite: true }),
      'force_sync',
      false,
    );
    signoutStage('force_sync_done', { synced });
    identityTrace('[ACC-SWITCH-WIPE]', 'signout force_sync', { synced, allowWipeWithoutSync: options?.allowWipeWithoutSync === true });
    // зачем (A1, координатор 12.10, реестр п.73; замер Сверки: 1,6 с на первую копию): при выходе, которому разрешено стирать без
    // синхронизации, первая копия дублирует вторую — та делается под замком через ~0,1 с, свежее и полнее, а её сбой отменяет выход
    // ДО маркера и стирания. Путь «сбросить незаписанные траты монет» (allowPendingShardSpendDiscard) не трогаем — там копия остаётся.
    const skipFirstEmergencyBackup = !synced
      && options?.allowWipeWithoutSync === true
      && options?.allowPendingShardSpendDiscard !== true;
    if (skipFirstEmergencyBackup) {
      signoutStage('emergency_backup_skipped', { reason: 'final_snapshot_under_lock' });
      logAuthEvent('auth_signout_wipe_sync_failed_continue', { stage: 'sync' });
    } else if (!synced) {
      try {
        const backedUp = await saveAccountSwitchEmergencyBackup(
          'force_sync_failed_before_account_switch',
          switchOwnerStableId,
          backupOptions,
        );
        if (!backedUp) throw new Error('account_switch_backup_unavailable');
        // зачем (замер Сверки 12.10: 1,6 с между force_sync_done и lock_wait_start): это время первой аварийной копии.
        signoutStage('emergency_backup_done', { reason: 'force_sync_failed' });
      } catch (e: any) {
        // зачем (TG-0AE4918142EE): в аналитику, журнал и detail результата — только код.
        const detail = identityErrorCode(e);
        if (__DEV__) console.warn(`[auth_provider] account switch emergency backup failed code=${detail}`);
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
    signoutStage('lock_wait_start');
    const transitionLock = await withAccountTransitionLockWithDeadline(async (): Promise<boolean> => {
      // зачем (замер Сверки 12.10: «lock_wait» ~1,5 с): внутри замка идут чтение очереди монет, вторая полная копия и маркер —
      // этапы ниже показывают, ждали ли сам замок или работу под ним.
      signoutStage('lock_acquired');
      if (!isCurrentAccountGeneration(switchToken, switchOwnerStableId)) {
        // зачем (S2c): этот ранний выход прежде маскировался под sync_failed
        // «pending_shard_queue» — на деле сменилось поколение аккаунта.
        identityTrace('[ACC-SWITCH-WIPE]', 'signout generation_changed', { stage: 'lock_enter' }, { persist: true });
        return false;
      }
      const finalShardQueue = await readShardDeltaQueue(switchOwnerStableId);
      signoutStage('shard_queue_read', { entries: finalShardQueue.length });
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
            backupOptions,
          );
        } catch (e: any) {
          // зачем (TG-0AE4918142EE): backupDetail уходит в аналитику и detail — только код.
          transitionFailure.backupDetail = identityErrorCode(e);
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
          backupOptions,
        );
        if (!backedUp) {
          transitionFailure.backupDetail = 'account_switch_backup_unavailable';
          return false;
        }
        signoutStage('final_snapshot_done');
      } catch (e: any) {
        // зачем (TG-0AE4918142EE): backupDetail уходит в аналитику и detail — только код.
        transitionFailure.backupDetail = identityErrorCode(e);
        return false;
      }
      if (!isCurrentAccountGeneration(switchToken, switchOwnerStableId)) return false;
      // Point of no return: the exact owner-bound marker is durably verified
      // before generation invalidation, provider sign-out, or any local wipe.
      await prepareDurableAccountSwitch(switchOwnerStableId);
      signoutStage('marker_done');
      await beginEntitlementSafeAccountTransition();
      signoutStage('entitlement_transition_done');
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
    signoutStage('quarantine_resume_start');
    const resumeOutcome = await resumeAccountSwitchQuarantineForSignOut('switch');
    signoutStage('quarantine_resume_done', { kind: resumeOutcome.kind });
    if (resumeOutcome.kind === 'threw') return resumeOutcome.failure;
    const resumed = resumeOutcome.resumed;
    if (resumed.result !== 'completed') {
      return resumed.result === 'none'
        ? { ok: false, reason: 'recovery_required', detail: 'marker_missing' }
        : mapAccountSwitchRecoveryFailure(resumed);
    }
    logAuthEvent('auth_signout_wipe', { mode: 'switch' });
    return { ok: true, synced };
  } catch (e: any) {
    // зачем (TG-0AE4918142EE): в аналитику, журнал и detail результата — только код;
    // потребители detail лишь печатают его (settings/выход/онбординг/окно входа).
    const code = identityErrorCode(e);
    if (__DEV__) console.warn(`[auth_provider] signOutAndWipeForAccountSwitch failed code=${code}`);
    logAuthEvent('auth_signout_wipe_failed', { stage: 'unknown', error: code });
    return { ok: false, reason: 'unknown', detail: code };
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
/**
 * AA S4a раунд 4 (L-1): операции старого удаления, дошедшие до фазы
 * server_enqueued в этом процессе (заполняет finishAccountDeletion, читает и
 * очищает completion в beginAccountDeletion). Только в памяти — нужна лишь в
 * пределах одного удаления.
 */
const legacyDeletionServerEnqueuedOperations = new Set<string>();

export async function beginAccountDeletion(): Promise<DeleteAccountHandoff> {
  // зачем (координатор 15.10, P24b): при удалении отложенную запись пуш-настроек НЕ досылаем, а отменяем — users/{A} удаляется.
  void cancelPendingPushPrefsForAccountDelete('begin_account_deletion');
  // зачем (Авторизация 12.10, settings-gap-001): привязка подставная — удаление отказывает ДО отмены входа, замков, записи и сети.
  if (isDevAccountLinkedDemo()) {
    console.warn('[DEV-STATE] account: удаление отклонено — привязка только для показа (account=linked)'); // guard-ok: dev-ветка
    return { ok: false, reason: 'pending_guard_persist_failed' };
  }
  // зачем (координатор 12.10, auth-gap-011): dev `delete=throw` — исключение ПЕРВОЙ строкой, до отмены входа, замков, записи и сети;
  // окно ловит его в catch и показывает «Удаление не завершилось» (текст макета). В стор-сборке геттер всегда false.
  if (isDevDeleteThrow()) {
    console.log('[DEV-STATE] account: удаление подменено исключением dev_delete_throw (ничего не удаляется)'); // guard-ok: dev-ветка
    throw new Error('dev_delete_throw');
  }
  // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `delete=fail` — только ИМИТАЦИЯ отказа локальной фазы, ДО любого побочного эффекта: удаление не вызывается и не начинается; в стор-сборке геттер выключен.
  if (isDevDeleteFail()) {
    console.log('[DEV-STATE] account: удаление подменено отказом pending_guard_persist_failed (ничего не удаляется)'); // guard-ok: dev-ветка
    return { ok: false, reason: 'pending_guard_persist_failed' };
  }
  // зачем (ревью L-1): удаление аккаунта отменяет любой отложенный вход после смены.
  discardAccountSwitchResumeCredential('account_delete');
  beginLocalAccountDeletionAttempt();
  let releaseTransitionReservation: () => void;
  // зачем (владелец, 2026-09-13): «сперва логи» — путь удаления был нем.
  console.log('[ACC-MUT] delete:in');
  try {
    releaseTransitionReservation = await reserveCleanInstallRecoveryAccountTransition();
  } catch (reserveError) {
    endLocalAccountDeletionAttempt();
    console.warn(`[ACC-MUT] delete:reserve_failed code=${identityErrorCode(reserveError)} — замок занят, ищем уже идущую попытку`);
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
    // зачем (TG-0AE4918142EE): в журнал и DebugLogger (уходит в Firestore) — только код.
    const detail = identityErrorCode(e);
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

  // зачем (AA S4a): под воротами cutover Account Authority (выключены владельцем)
  // — локальное удаление AA: надгробие сразу, стирание и серверная задача фоном.
  // Ворота выключены → null без require и сети: поток ниже ровно как раньше.
  const authorityDeletion = beginAccountAuthorityDeletionIfEnabled();
  if (authorityDeletion !== null) {
    void authorityDeletion.then(
      () => console.log('[AA-S4] delete:aa_local_done'),
      (e: unknown) => {
        // зачем (TG-0AE4918142EE): в журнал и DebugLogger — только код.
        const detail = identityErrorCode(e);
        console.warn(`[AA-S4] delete:aa_failed reason=${detail}`);
        DebugLogger.error('aa_s4:delete_failed', new Error(detail), 'critical');
      },
    );
  }

  const pendingOperationId = prepared.pendingDeleteLock?.operationId ?? null;
  const backgroundStartedAt = Date.now();
  const completion = (async () => {
    try {
      const result = await finishAccountDeletion(prepared);
      // зачем (AA S4a раунд 3, H-B1 / раунд 4, L-1): сервер принял старое удаление
      // (фаза server_enqueued этого замка) — его задача чистит и данные AA;
      // запрос AA, застрявший без входа, больше не нужен.
      const legacyServerEnqueued = pendingOperationId !== null
        && legacyDeletionServerEnqueuedOperations.delete(pendingOperationId);
      if (legacyServerEnqueued && authorityDeletion !== null) {
        void authorityDeletion.then(
          ({ operationId }) => resolveAccountAuthorityDeletionByLegacyIfEnabled(operationId),
          // зачем (TG-0AE4918142EE): в журнал — только код ошибки.
          (e: unknown) => console.warn(`[AA-S4] delete:legacy_proof_skipped reason=${identityErrorCode(e)}`),
        );
      } else if (authorityDeletion !== null) {
        // зачем (AA S5, D-AA5): главный серверный путь при cutover — это старое
        // удаление; без его server_enqueued запись AA остаётся «ждёт старое
        // удаление» (delete_begin не шлётся), повтор — замок старого потока.
        console.warn(`[AA-S5] delete:aa_awaiting_legacy reason=legacy_not_enqueued ok=${result.ok}`);
      }
      // зачем (владелец, 2026-09-13): ИМЕННО ЗДЕСЬ терялось удаление аккаунта.
      // UI показывает «удалено» сразу после локальной фазы, а исход серверной
      // приходил только в logAuthEvent → logEvent, который молчит без согласия
      // на аналитику (app/firebase.ts:36) и глушит ошибку отправки (:41).
      // Человек видел чистый онбординг, а аккаунт на сервере оставался жив,
      // и владелец об этом не узнавал. Дублируем исход в канал, который
      // реально долетает (DebugLogger 'critical' → Firestore).
      const line = `[ACC-MUT] delete:bg_out ok=${result.ok} reason=${result.ok ? 'none' : String(result.reason)} cloudDeleted=${result.ok ? String(result.cloudDeleted) : 'n/a'} tookMs=${Date.now() - backgroundStartedAt}`;
      if (__DEV__) console.log(line);
      // зачем (координатор 18.10 05:03): итог фоновой фазы удаления виден и в обычной сборке (раньше только под __DEV__).
      console.log('[AUTH-DELETE]', JSON.stringify({ step: 'bg_out', ok: result.ok, reason: result.ok ? null : String(result.reason), cloudDeleted: result.ok ? result.cloudDeleted : null, tookMs: Date.now() - backgroundStartedAt })); // guard-ok: итог, без идентификаторов
      if (!result.ok) {
        DebugLogger.error('acc_mut:delete_background_failed', new Error(line), 'critical');
      }
      return result;
    } catch (e) {
      // зачем (TG-0AE4918142EE): строка уходит в DebugLogger 'critical' (Firestore) — только код.
      const line = `[ACC-MUT] delete:bg_threw reason=${identityErrorCode(e)} tookMs=${Date.now() - backgroundStartedAt}`;
      if (__DEV__) console.warn(line);
      console.warn('[AUTH-DELETE]', JSON.stringify({ step: 'bg_threw', code: identityErrorCode(e), tookMs: Date.now() - backgroundStartedAt })); // guard-ok: catch пишет причину
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
  void completion.catch(swallowAuthAs('[AUTH-DELETE]', 'background_completion', undefined));

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
  /** Постановка с ключом замка; null только у гостя без замка (тогда есть guestDirectDeleteOperation). */
  cloudDeleteEnqueueOperation: AccountDeleteEnqueueOperation<AccountDeleteEnqueueAck> | null;
  /** TG-20707BD701DC: прямой accountDeleteMine гостя, чей замок не записался. */
  guestDirectDeleteOperation: AccountDeleteEnqueueOperation<AccountDeleteDirectAck> | null;
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
const ACCOUNT_DELETE_PHONE_STATE_RETIRE_TIMEOUT_MS = 2_500;
/** Account V2: сколько быстрая фаза удаления ждёт уже начатый ключ V2 (см. prepareAccountDeletion). */
const ACCOUNTS_V2_KEY_FAST_WAIT_MS = 250;
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
      // зачем (аудит 11.10): отказ локального шага удаления был немым — причина в логе.
      run().catch(swallowAuthAs('[AUTH-DELETE]', 'local_step', onTimeout)),
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
  // зачем (TG-20707BD701DC, живой прогон 10.10): с 29.08 гостю замок не писали
  // вовсе (код расходился с комментарием выше) — без замка нет ключа, и
  // постановка удаления гостя падала proof_missing: серверные данные гостя не
  // удалялись НИКОГДА. Теперь замок пишется и гостю, в том же потолке; не
  // записался — гостю не отказываем (ниже запасной прямой вызов).
  let pendingDeleteLock = await withLocalStepDeadline(
    () => persistAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId),
    null,
    ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS,
  );
  if (isProvablyAnonymousAccount) {
    console.log(`[ACC-MUT] delete:anon_lock=${pendingDeleteLock ? 'ok' : 'failed'} stable=${pendingDeleteStableId ? 'present' : 'none'}`);
  }
  // зачем: для связанной/неизвестной личности отказываем ДО стирания. Без замка
  // тот же провайдер вошёл бы снова и восстановил данные; аноним этим не связан.
  if (!isProvablyAnonymousAccount && !pendingDeleteLock) return null;
  // зачем (Account V2, Пакет 6B, TG-F76EA3701B55): точка невозврата пройдена —
  // V2 отсоединяется СИНХРОННО здесь, до стирания и до любой сети (отправка
  // остановлена, область закрыта, защёлка переживёт перезапуск), и готовит ключ
  // удаления V2. Флаг выключен → null: поток удаления байт-в-байт прежний.
  const accountsV2DeletionPending = beginAccountsV2DeletionIfEnabled(
    pendingDeleteProviderUid,
    pendingDeleteLock?.operationId ?? null,
  );
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
    let locallyWiped = await wipeAndVerifyPostDeleteLocalData(
      pendingDeleteLock,
      pendingDeleteStableId,
    );
    if (!locallyWiped) {
      // зачем (живой прогон 10.10 21:35, решение координатора 00:50): потолок 5 с истёк, а полёт
      // стирания продолжал работу и стёр данные уже ПОСЛЕ окна «Не вышло» — человек видел
      // «аккаунт защищён» поверх стёртого имени. Если полёт ещё идёт, дожидаемся его (кнопка
      // в это время крутится); окно сбоя — только если стирание действительно не подтвердилось.
      locallyWiped = await awaitInFlightLocalWipe(pendingDeleteLock, pendingDeleteStableId);
    }
    if (!locallyWiped) return 'local_wipe_unverified';
  } catch (e) {
    // зачем (аудит 11.10): под __DEV__ причина в релизе пропадала — пишем всегда, без текста ошибки.
    console.warn(`[AUTH-DELETE] prepare local_wipe_threw code=${identityErrorCode(e)}`);
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
  // зачем (Пакет 6B): ключ V2 ушёл бы без SecureStore-копии бесполезным — ждём его
  // не дольше локального шага; нет ключа — шлём без поля, сервер сотрёт V2 и так.
  // зачем (ревью 6B, P3): ключ начали готовить ДО стирания (оно и так длиннее),
  // поэтому здесь он обычно уже готов; ждём не дольше ACCOUNTS_V2_KEY_FAST_WAIT_MS,
  // чтобы быстрая фаза (её ждёт UI) не росла на секунду. Не успел — запрос уходит
  // без ключа: сервер всё равно сотрёт V2 (6A), теряется лишь право узнать этап;
  // повтор после перезапуска (ensureAccountDeleteCredentialSafe) шлёт ключ с диска.
  const accountsV2WaitStartedAt = Date.now();
  const accountsV2Deletion = accountsV2DeletionPending
    ? await withLocalStepDeadline(() => accountsV2DeletionPending, null, ACCOUNTS_V2_KEY_FAST_WAIT_MS)
    : null;
  if (accountsV2DeletionPending && !accountsV2Deletion) {
    console.warn(`[ACCOUNT-V2] delete enqueue_without_v2_key waitedMs=${Date.now() - accountsV2WaitStartedAt}`);
  }
  // Без ключа V2 вызов прежний — ровно два аргумента.
  const accountsV2EnqueueArgs: [] | [AccountDeleteCredentialProof] = accountsV2Deletion ? [accountsV2Deletion] : [];
  if (isProvablyAnonymousAccount && !(pendingDeleteLock && accountDeleteCredentialProof(pendingDeleteLock))) {
    // зачем (TG-20707BD701DC): гость без замка/ключа — постановка заведомо упала бы
    // proof_missing. Шлём прямой accountDeleteMine СЕЙЧАС, пока гость ещё вошедший
    // (выход и новая личность — только в фоне). Ждём лишь отправки — в фоне.
    console.log(`[ACC-MUT] delete:anon_server=direct reason=no_lock stable=${pendingDeleteStableId ? 'present' : 'none'}`);
    return {
      pendingDeleteLock,
      pendingDeleteStableId,
      cloudDeleteEnqueueOperation: null,
      guestDirectDeleteOperation: startGuestDirectServerDeletion(pendingDeleteStableId),
      requiresDurableServerDeletion: false,
    };
  }
  const enqueueProof = pendingDeleteLock ? accountDeleteCredentialProof(pendingDeleteLock) ?? undefined : undefined;
  // зачем (координатор 12.10, журнал прода: холодный старт ≈9 с > 8 с): у гостя ответ ждёт ФОН — дедлайн 25 с; связанные — прежний вызов.
  const cloudDeleteEnqueueOperation = isProvablyAnonymousAccount
    ? startCloudDeletionEnqueue(pendingDeleteStableId, enqueueProof, accountsV2Deletion ?? null, {
      timeoutMs: ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS,
      label: 'enqueue_guest',
    })
    : startCloudDeletionEnqueue(pendingDeleteStableId, enqueueProof, ...accountsV2EnqueueArgs);
  // зачем (TG-F5939EAC5D97): фон подпишется на ответ через секунды — ранний отказ сети не
  // должен стать «Uncaught (in promise)»; см. observeEarlyAcknowledgmentRejection.
  observeEarlyAcknowledgmentRejection(cloudDeleteEnqueueOperation, 'enqueue');
  return {
    pendingDeleteLock,
    pendingDeleteStableId,
    cloudDeleteEnqueueOperation,
    guestDirectDeleteOperation: null,
    requiresDurableServerDeletion: !isProvablyAnonymousAccount,
  };
}

/** Фоновая фаза: сеть, выход и локальная очистка. UI её НЕ ждёт. */
async function finishAccountDeletion(
  prepared: PreparedAccountDeletion,
): Promise<DeleteAccountResult> {
  const {
    pendingDeleteLock,
    cloudDeleteEnqueueOperation,
    requiresDurableServerDeletion,
  } = prepared;
    let localExitLock = pendingDeleteLock;
    // зачем (PM-289, D70/D139): отдельный снос ключей pending_shard_grants_* снят —
    // сюда доходим только после проверенного AsyncStorage.clear() в
    // prepareAccountDeletion (verifyPostDeleteLocalWipe), который уже стёр эти ключи;
    // повторный вызов лишь писал и тут же удалял маркер очистки поверх чистого хранилища.
    console.log('[AUTH-SHARDS] delete: снос pending_shard_grants снят (покрыт локальной очисткой)');
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
          // зачем (аудит 11.10): logAuthEvent молчит без согласия на аналитику — причина в лог всегда.
          console.warn(`[AUTH-DELETE] swallowed step=notifications_cleanup code=${identityErrorCode(e)}`);
          logAuthEvent('auth_account_delete_notifications_cleanup_failed');
        }),
      import('./push_token_registration')
        .then(({ clearPushTokenForServerPush }) => clearPushTokenForServerPush())
        .catch((e: unknown) => {
          console.warn(`[AUTH-DELETE] swallowed step=push_token_cleanup code=${identityErrorCode(e)}`);
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
      if (!pendingDeleteLock || !cloudDeleteEnqueueOperation) return { ok: false, reason: 'pending_guard_persist_failed' };
      let credentialSafe = false;
      try {
        const ack = await cloudDeleteEnqueueOperation.acknowledgment;
        credentialSafe = ack.authReleased === true && ack.credentialSafe === true;
        logAuthEvent('auth_account_delete_enqueued', { status: ack.status });
      } catch (e) {
        console.warn(`[AUTH-DELETE] enqueue_response_lost code=${identityErrorCode(e)} — проверяем квитанцию`);
      }
      const proof = accountDeleteCredentialProof(pendingDeleteLock);
      if (!credentialSafe && proof) {
        credentialSafe = await waitForAccountDeletionCredentialSafe(proof).catch(swallowAuthAs('[AUTH-DELETE]', 'wait_credential_safe', false));
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
      // зачем (AA S4a раунд 4, L-1): доказательство для очереди удаления AA —
      // именно фаза server_enqueued этого замка (анонимная ветка сюда не попадает).
      legacyDeletionServerEnqueuedOperations.add(pendingDeleteLock.operationId);
      // зачем (Пакет 6C, хвост 6B P3): сервер принял постановку — ключ V2 замка снимаем.
      clearStoredAccountsV2DeletionCredentialIfEnabled(pendingDeleteLock.operationId);
    } else if (cloudDeleteEnqueueOperation) {
      // зачем: для анонима ждём только отправки запроса, а подтверждение сервера
      // остаётся фоновой работой под замком — медленная сеть не имеет права
      // держать старый аккаунт открытым (гость не попадает в ветку отказа
      // связанных аккаунтов выше). TG-20707BD701DC: ответ сервера всё же ждём
      // здесь, в фоне (UI уже на онбординге, потолок постановки 8 с), — только
      // чтобы при отказе успеть запасной прямой вызов, пока гость ещё вошедший.
      void cloudDeleteEnqueueOperation.acknowledgment
        .then((ack) => {
          console.log(`[ACC-MUT] delete:anon_server=enqueue ack=ok status=${ack.status}`);
          logAuthEvent('auth_account_delete_enqueued', { status: ack.status });
          // зачем (ревью 6C, P3; Пакет 6D): ключ V2 анонима снимаем только после УСПЕШНОГО ответа сервера.
          clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(pendingDeleteLock?.operationId ?? null, ack);
        })
        .catch((e) => {
          console.warn(`[ACC-MUT] delete:anon_server=enqueue ack=failed reason=${String((e as any)?.message ?? e).slice(0, 120)}`);
          logAuthEvent('auth_account_delete_enqueue_failed');
        });
      await cloudDeleteEnqueueOperation.dispatchSettled;
      const guestOutcome = await settleGuestEnqueueOutcome(prepared, cloudDeleteEnqueueOperation);
      if (guestOutcome === 'unconfirmed' && pendingDeleteLock) {
        // зачем (TG-F5939EAC5D97, факт воспроизведения): без сети гостя разлогинивали, а замок
        // перепрыгивал в old_stable_cleared — при старте с сетью постановку слать было уже
        // некому (сервер принимает её только от той же вошедшей личности) и незачем (фаза
        // пройдена): серверные данные гостя оставались навсегда. Теперь, пока сервер не получил
        // ничего, гостевая сессия Firebase и замок в local_data_cleared сохраняются (телефон уже
        // стёрт, синхронизация на карантине); старт/возврат в приложение дожимает постановку
        // через retryGuestServerDeletionOnce и только потом выдаёт новую личность. Окон нет.
        console.warn(`[ACC-MUT] delete:anon_server=deferred_to_startup phase=${pendingDeleteLock.phase} signout=skipped`);
        logAuthEvent('auth_account_delete_quarantined', { reason: 'guest_server_deletion_deferred' });
        return { ok: false, reason: 'local_exit_unverified' };
      }
    } else if (prepared.guestDirectDeleteOperation) {
      // TG-20707BD701DC: гость без замка — прямой вызов стартовал в быстрой фазе;
      // ждём только его отправки, выход из Firebase — строго после неё.
      await awaitGuestDirectDispatch(prepared.guestDirectDeleteOperation);
    } else {
      console.warn('[ACC-MUT] delete:anon_server=skipped reason=no_operation');
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
      console.warn(`[AUTH-DELETE] provider_signout_failed code=${identityErrorCode(e)}`);
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

/**
 * Запускает прямой accountDeleteMine гостя. Никогда не бросает: синхронный сбой
 * превращается в отклонённую операцию, её причину печатает фоновая фаза.
 */
function startGuestDirectServerDeletion(
  stableId: string | null,
): AccountDeleteEnqueueOperation<AccountDeleteDirectAck> {
  try {
    return observeEarlyAcknowledgmentRejection(startCloudDeletionDirect(stableId), 'anon_server_direct');
  } catch (e) {
    const failure = e instanceof Error ? e : new Error(String(e));
    return observeEarlyAcknowledgmentRejection(
      { dispatchSettled: Promise.resolve(), acknowledgment: Promise.reject(failure) },
      'anon_server_direct',
    );
  }
}

/**
 * зачем (TG-F5939EAC5D97, факт: `Uncaught (in promise) UNAVAILABLE`): операцию запускают в
 * БЫСТРОЙ фазе, а фон вешает свой обработчик ответа только после уведомлений, push-токена и
 * дренажей (секунды). Без сети ответ отклоняется раньше — Hermes считает отказ необработанным.
 * Ранний наблюдатель помечает отказ обработанным и пишет причину; сам промис не меняется —
 * фон по-прежнему получает отказ и решает по нему (квитанция, прямой вызов, повтор при старте).
 */
function observeEarlyAcknowledgmentRejection<T>(
  operation: AccountDeleteEnqueueOperation<T>,
  label: string,
): AccountDeleteEnqueueOperation<T> {
  void operation.acknowledgment.catch((e: unknown) => {
    // зачем (TG-0AE4918142EE): в журнал — только код ошибки.
    console.warn(`[ACC-MUT] delete:${label} ack_rejected_observed reason=${identityErrorCode(e)}`);
  });
  return operation;
}

/**
 * Исход постановки удаления ГОСТЯ с замком (TG-20707BD701DC). Никогда не бросает.
 *
 * зачем: гость не связан провайдером — его не держат в ветках связанных
 * аккаунтов (подтверждение сервера как условие выхода, отказ
 * account_delete_enqueue_failed). Но и терять серверное удаление нельзя:
 * ответ постановки ждём в фоне (потолок 8 с, UI уже на онбординге); ответ
 * потерян → квитанция по ключу; квитанции нет → запасной прямой вызов, ПОКА
 * гость ещё вошедший (выход из Firebase — строго после нас). Сам ответ
 * печатает наблюдатель в finishAccountDeletion; здесь только решение.
 */
async function settleGuestEnqueueOutcome(
  prepared: PreparedAccountDeletion,
  operation: AccountDeleteEnqueueOperation<AccountDeleteEnqueueAck>,
): Promise<GuestServerDeletionOutcome> {
  const { pendingDeleteLock, pendingDeleteStableId } = prepared;
  // Отказ здесь уже напечатан наблюдателем — превращаем его в false, не теряя.
  let enqueued = await operation.acknowledgment.then(() => true, () => false);
  const proof = pendingDeleteLock ? accountDeleteCredentialProof(pendingDeleteLock) : null;
  if (!enqueued && proof) {
    // зачем: сервер мог принять постановку, а ответ потеряться. Прямой вызов
    // поверх принятой постановки стёр бы данные мимо 14-дневного окна
    // восстановления — поэтому сперва квитанция по ключу.
    enqueued = await waitForAccountDeletionCredentialSafe(proof)
      .catch(swallowAuthAs('[AUTH-DELETE]', 'anon_receipt_wait', false));
    if (enqueued) console.log('[ACC-MUT] delete:anon_server=enqueue receipt=credential_safe');
  }
  if (enqueued && pendingDeleteLock) {
    // Фаза server_enqueued: если приложение убьют до выхода, перезапуск не шлёт
    // постановку повторно. Не записалась — не беда, повтор идемпотентен по ключу.
    const advanced = await advanceAccountDeletePendingAuthLock(pendingDeleteLock, 'server_enqueued')
      .catch(swallowAuthAs('[AUTH-DELETE]', 'anon_phase_server_enqueued', { ok: false, code: 'threw' } as const));
    console.log(`[ACC-MUT] delete:anon_phase_server_enqueued=${advanced.ok ? 1 : 0}`);
    return 'enqueued';
  }
  if (enqueued) return 'enqueued';
  console.warn(`[ACC-MUT] delete:anon_server=direct reason=enqueue_failed stable=${pendingDeleteStableId ? 'present' : 'none'}`);
  const direct = await awaitGuestDirectDispatch(startGuestDirectServerDeletion(pendingDeleteStableId));
  // зачем (TG-F5939EAC5D97): 'ceiling' = запрос ушёл, ответа нет — сервер мог его выполнить;
  // только явный отказ значит «сервер не получил ничего».
  return direct === 'failed' ? 'unconfirmed' : 'direct_sent';
}

/**
 * Исход серверного удаления гостя в фоне. 'unconfirmed' — и постановка, и прямой вызов
 * явно отказали (типично: нет сети), значит сервер не получил ничего.
 */
type GuestServerDeletionOutcome = 'enqueued' | 'direct_sent' | 'unconfirmed';

/** Ждёт только ОТПРАВКИ прямого вызова; ответ печатается фоном, отказ не всплывает. */
async function awaitGuestDirectDispatch(
  operation: AccountDeleteEnqueueOperation<AccountDeleteDirectAck>,
): Promise<'ack' | 'failed' | 'ceiling'> {
  void operation.acknowledgment.then(
    (ack) => {
      console.log(`[ACC-MUT] delete:anon_server_direct ack=ok authDeleted=${ack.authDeleted ? 1 : 0}`);
      logAuthEvent('auth_account_delete_direct_ok');
    },
    (e: unknown) => {
      const reason = String((e as any)?.message ?? e).slice(0, 120);
      console.warn(`[ACC-MUT] delete:anon_server_direct ack=failed reason=${reason}`);
      logAuthEvent('auth_account_delete_direct_failed');
      DebugLogger.error('acc_mut:delete_anon_direct_failed', new Error(reason), 'critical');
    },
  );
  await operation.dispatchSettled;
  // зачем (security-ревью REVISE): dispatchSettled значит «вызов начат», а не «запрос ушёл с
  // токеном» — ID-токен нативный модуль берёт асинхронно. Выход из Firebase раньше этого дал бы
  // unauthenticated, и данные гостя остались бы навсегда (повтора без замка нет). Ждём ответ
  // сервера с потолком: мы уже в фоне, онбординг открыт; за потолок запрос гарантированно ушёл,
  // а начатое на сервере удаление выход не прерывает.
  let ackTimer: ReturnType<typeof setTimeout> | null = null;
  const waited = await Promise.race([
    operation.acknowledgment.then(() => 'ack' as const, () => 'failed' as const),
    new Promise<'ceiling'>((resolve) => { ackTimer = setTimeout(() => resolve('ceiling'), GUEST_DIRECT_ACK_WAIT_MS); }),
  ]);
  if (ackTimer) clearTimeout(ackTimer);
  console.log(`[ACC-MUT] delete:anon_server_direct before_signout=${waited}`);
  return waited;
}

const GUEST_DIRECT_ACK_WAIT_MS = 8_000;

export type RemoteAccountDeleteResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Clears a device whose still-signed-in provider account was deleted elsewhere. */
export async function handleAccountDeletedOnAnotherDevice(): Promise<RemoteAccountDeleteResult> {
  // зачем (координатор 18.10): цепочка «удалён в другом месте» видна одним поиском [ACCOUNT-GONE] — вход, исход личности, итог.
  const startedAt = Date.now();
  console.log('[ACCOUNT-GONE]', JSON.stringify({ step: 'reset_start' })); // guard-ok: без идентификаторов
  void cancelPendingPushPrefsForAccountDelete('deleted_on_another_device');
  discardAccountSwitchResumeCredential('account_deleted_elsewhere');
  const freshIdentity = await ensureFreshPostDeletionIdentity('identity_retired', {
    subject: 'auth',
  });
  if (freshIdentity.status !== 'ready') {
    console.warn('[ACCOUNT-GONE]', JSON.stringify({ step: 'reset_not_ready', status: freshIdentity.status, phase: freshIdentity.phase ?? null, ms: Date.now() - startedAt })); // guard-ok: ранний выход
    return { ok: false, reason: freshIdentity.status };
  }
  await AsyncStorage.setItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY, '1').catch(swallowAuthAs('[AUTH-DELETE]', 'remote_deleted_notice_write', undefined));
  invalidatePremiumCache();
  logAuthEvent('auth_account_deleted_on_another_device');
  console.log('[ACCOUNT-GONE]', JSON.stringify({ step: 'reset_done', status: 'ready', ms: Date.now() - startedAt })); // guard-ok: итог
  return { ok: true };
}

export async function consumeRemoteAccountDeletionNotice(): Promise<boolean> {
  const value = await AsyncStorage.getItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY).catch(swallowAuthAs('[AUTH-DELETE]', 'remote_deleted_notice_read', null));
  if (value !== '1') return false;
  await AsyncStorage.removeItem(REMOTE_ACCOUNT_DELETED_NOTICE_KEY).catch(swallowAuthAs('[AUTH-DELETE]', 'remote_deleted_notice_remove', undefined));
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
  // зачем (Авторизация 12.10, settings-gap-001): привязка подставная — выход из провайдера отказывает до любых действий (вызвавший ловит исключение).
  if (isDevAccountLinkedDemo()) {
    console.warn('[DEV-STATE] account: выход из провайдера отклонён — привязка только для показа (account=linked)'); // guard-ok: dev-ветка
    throw new Error(DEV_LINKED_DEMO_REFUSAL);
  }
  // зачем (ревью L-1): обычный выход отменяет отложенный вход после смены.
  discardAccountSwitchResumeCredential('provider_sign_out');
  return runAccountAuthorityProviderSignOutTransition(performCurrentProviderSignOut);
}

/**
 * Тот же выход, но пропуск входа после смены НЕ стирается. Только для шага выхода
 * внутри самой смены аккаунта (deps.signOut): ради этого пропуска смена и делается —
 * после неё вход продолжается тем же выбранным аккаунтом.
 */
function signOutCurrentProviderKeepingSwitchResume(): Promise<void> {
  return runAccountAuthorityProviderSignOutTransition(performCurrentProviderSignOut);
}

/** Потолок ожидания снятия push при выходе: выход не должен стоять на медленной сети (токен снимет и сервер по удалённой связке). */
const SWITCH_PUSH_CLEANUP_CAP_MS = 4_000;

/** Снять локальные уведомления и push-токен уходящего аккаунта. Никогда не бросает; итог — [ACC-SWITCH-WIPE] push_cleanup. */
/** Удаление аккаунта: отменить отложенную запись пуш-настроек (досылки нет). Никогда не бросает — причина в журнал. */
async function cancelPendingPushPrefsForAccountDelete(source: string): Promise<void> {
  try {
    const { cancelPendingServerPushPrefsForAccountDelete } = await import('./push_token_registration');
    const outcome = cancelPendingServerPushPrefsForAccountDelete();
    console.log(`[PUSH-PREFS] account_delete source=${source} outcome=${outcome}`); // guard-ok: одна строка на удаление
  } catch (error) {
    console.warn(`[PUSH-PREFS] account_delete source=${source} cancel_failed code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
  }
}

async function clearAccountPushBeforeSwitchSignOut(): Promise<void> {
  const startedAtMs = Date.now();
  // зачем (Авторизация 15.10): владелец A — из памяти, без ensureAnonUser (тот посреди карантина смены мог выдать новую личность)
  const ownerStableId = peekStableId();
  const step = (name: string, run: () => Promise<void>): Promise<string> => run().then(
    () => `${name}:ok`,
    (error: unknown) => {
      console.warn(`[ACC-SWITCH-WIPE] push_cleanup step=${name} failed code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
      return `${name}:failed`;
    },
  );
  let timer: ReturnType<typeof setTimeout> | null = null;
  const capped = new Promise<string[]>((resolve) => { timer = setTimeout(() => resolve(['timeout']), SWITCH_PUSH_CLEANUP_CAP_MS); });
  const result = await Promise.race([
    Promise.all([
      step('notifications', async () => { const { cancelAllNotifications } = await import('./notifications'); await cancelAllNotifications({ skipServerTokenClear: true }); }),
      step('push_token', async () => {
        const { clearPushTokenForServerPush } = await import('./push_token_registration');
        const cleared = await clearPushTokenForServerPush({ ownerStableId });
        if (cleared === 'not_cleared') throw new Error('push_token_not_cleared');
      }),
    ]),
    capped,
  ]);
  if (timer) clearTimeout(timer);
  console.log(`[ACC-SWITCH-WIPE] push_cleanup result=${result.join(',')} ms=${Date.now() - startedAtMs}`); // guard-ok: одна строка на выход
  // зачем (координатор 15.10, ревью Авторизации (Б)): офлайн / отказ / потолок — токен A остался в документе A, и после выхода
  // клиент его оттуда уже не сотрёт. Метка гасит сам токен устройства при первой сети, до регистрации токена за следующего.
  if (!result.includes('push_token:ok')) {
    const { markPushTokenRotationPending } = await import('./push_token_registration');
    await markPushTokenRotationPending(result.includes('timeout') ? 'switch_cap_timeout' : 'switch_clear_failed');
  }
}

async function performCurrentProviderSignOut(): Promise<void> {
  if (__DEV__) console.log('[auth_provider] signOutCurrentProvider: start');
  // Сбрасываем PostHog-идентичность, чтобы события следующего юзера не приписались прошлому
  // (no-op, если PostHog выключен).
  void import('./posthog_client').then(({ resetPostHog }) => resetPostHog()).catch(swallowAuthAs('[AUTH-SIGNOUT]', 'posthog_reset', undefined));
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
  // зачем (RELEASE_LOGGING_R1, 13.10): исходы входа/выхода/удаления — кодом причины в журнал обращения (релиз вырезает console.log).
  releaseReasonForAuthEvent(name, params);
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
