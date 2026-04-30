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
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId, setStableId, clearStableId } from './stable_id';
import {
  ensureAnonUser,
  syncToCloud,
  restoreFromCloud,
  forceSyncToCloud,
  wipeLocalAccountData,
  deleteCloudData,
  resetAnonAuthCacheForSignOut,
} from './cloud_sync';
import { reserveName, deleteMyLeaderboardEntry } from './firestore_leaderboard';
import { loadShardsFromCloud } from './shards_system';
import { logEvent, recordError } from './firebase';

function scheduleReferralApplyAfterLink(): void {
  if (!CLOUD_SYNC_ENABLED) return;
  void import('./referral_bootstrap')
    .then((m) => m.tryApplyPendingReferral())
    .then(() => import('./referral_system'))
    .then((m) => m.generateReferralCode('User'))
    .catch(() => {});
}

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

export interface AuthLinkDoc {
  providerUid: string;
  provider: AuthProviderId;
  stable_id: string;
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
 * Apple sign-in только на iOS, физическом устройстве с iCloud.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  const mod = getAppleAuth();
  if (!mod) return false;
  try {
    return await mod.isAvailableAsync();
  } catch {
    return false;
  }
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

/**
 * Текущая привязка к провайдеру для залогиненного юзера.
 * Returns null если юзер ещё анонимный.
 */
export async function getLinkedAuthInfo(): Promise<LinkedAuth | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  const db = getFirestore();
  if (!db) return null;
  try {
    const stableId = await getStableId();
    const doc = await db.collection('users').doc(stableId).get();
    if (!doc.exists) return null;
    const linked = doc.data()?.linkedAuth as LinkedAuth | undefined;
    return linked ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] getLinkedAuthInfo failed', e);
    return null;
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
 * (тапнул аккаунт в picker'е → токен максимум за 30 секунд). Если промис висит
 * дольше — это баг native-модуля / битая Activity / отозванный consent с автокансел.
 * Без таймаута UI-loader спинит вечно, кнопка disable'd, и юзер думает «приложение
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
  try {
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: GoogleSignin.signIn()...');
    res = await withTimeout(mod.GoogleSignin.signIn(), GOOGLE_SIGNIN_TIMEOUT_MS, 'native_signin');
    if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: GoogleSignin.signIn returned', JSON.stringify({
      type: res?.type,
      hasData: !!(res?.data ?? res),
    }));
  } catch (e: any) {
    if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5' || e?.code === '12501') {
      if (__DEV__) console.log('[auth_provider] runGoogleNativeSignIn: cancelled by user (error code)');
      return { cancelled: true };
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

async function runAppleNativeSignIn(): Promise<NativeAuthCredential | { cancelled: true }> {
  const mod = getAppleAuth();
  if (!mod) throw new Error('apple_auth_module_unavailable');

  // expo-apple-authentication: requestedScopes
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

/** Crashlytics: прод-диагностика sign-in без logcat */
function captureAuthSignInFailure(provider: AuthProviderId, stage: string, detail: string): void {
  try {
    const d = detail.replace(/\s+/g, ' ').slice(0, 280);
    recordError(new Error(`auth_signin:${provider}:${stage}:${d}`), 'auth_signin');
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

  // 1. Native sign-in
  let cred: NativeAuthCredential | { cancelled: true };
  try {
    cred = provider === 'google' ? await runGoogleNativeSignIn() : await runAppleNativeSignIn();
  } catch (e: any) {
    if (__DEV__) console.warn('[auth_provider] native sign-in failed', e);
    const code = e?.code ? String(e.code) : '';
    const msg = e?.message ? String(e.message) : 'unknown';
    const detail = code ? `${code}:${msg}` : msg;
    logAuthEvent('auth_signin_error', { provider, stage: 'native', error: detail.slice(0, 80) });
    const errStr = `native_${detail}`.slice(0, 120);
    captureAuthSignInFailure(provider, 'native', errStr);
    return { result: 'error', error: errStr };
  }
  if ('cancelled' in cred) {
    logAuthEvent('auth_signin_cancelled', { provider });
    return { result: 'cancelled' };
  }

  // 2. Sign in to Firebase via credential
  let firebaseProviderUid: string;
  let firebaseEmail: string | null = cred.email;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authMod = require('@react-native-firebase/auth');
    const credential =
      provider === 'google'
        ? authMod.default.GoogleAuthProvider.credential(cred.idToken)
        : authMod.default.AppleAuthProvider.credential(cred.idToken);
    const userCredential = await auth.signInWithCredential(credential);
    const fbUser = userCredential?.user ?? auth.currentUser;
    firebaseProviderUid = fbUser?.uid ?? '';
    if (!firebaseEmail) firebaseEmail = fbUser?.email ?? null;
    if (!firebaseProviderUid) throw new Error('firebase_no_uid');
  } catch (e: any) {
    if (__DEV__) console.warn('[auth_provider] firebase signInWithCredential failed', e);
    const code = e?.code ? String(e.code) : '';
    const msg = e?.message ? String(e.message) : 'unknown';
    const detail = code ? `${code}:${msg}` : msg;
    logAuthEvent('auth_signin_error', { provider, stage: 'firebase', error: detail.slice(0, 80) });
    const errStr = `firebase_${detail}`.slice(0, 120);
    captureAuthSignInFailure(provider, 'firebase', errStr);
    return { result: 'error', error: errStr };
  }

  // 3. Lookup auth_links → link OR auto-merge by XP
  const localStableId = await getStableId();
  const now = Date.now();
  const devicePlatform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  const linkRef = db.collection('auth_links').doc(firebaseProviderUid);
  const usersRef = db.collection('users');

  type Outcome =
    | { kind: 'linked_existing' }
    | { kind: 'created_new' }
    | { kind: 'merged_keep_local'; mergedFromStableId: string }
    | { kind: 'merged_swap_to_remote'; remoteStableId: string; mergedFromStableId: string };

  let outcome: Outcome;
  try {
    outcome = await db.runTransaction(async (tx: any) => {
      const linkSnap = await tx.get(linkRef);

      if (linkSnap.exists) {
        const remoteStableId = linkSnap.data()?.stable_id as string | undefined;
        if (!remoteStableId) {
          // Corrupted link — overwrite with local stable_id
          tx.update(linkRef, {
            stable_id: localStableId,
            email: firebaseEmail,
            displayName: cred.displayName,
            lastSignInAt: now,
            devicePlatform,
          });
          return { kind: 'linked_existing' as const };
        }

        if (remoteStableId === localStableId) {
          // Бэкенд может потереть users/{stable_id} (удаление аккаунта через
          // админку, либо сценарий «delete account → re-login» когда локальный
          // stable_id ещё совпадает со старым). Если облачного дока нет — это
          // НЕ "linked_existing", это свежий аккаунт с тем же ID. Лечим как
          // created_new: записываем linkedAuth обратно в users/{stable_id},
          // иначе post-transaction restoreFromCloud улетит в no-op и в UI
          // получится бесконечная загрузка / зомби-сессия.
          const localUserSnap = await tx.get(usersRef.doc(localStableId));
          if (!localUserSnap.exists) {
            tx.update(linkRef, {
              email: firebaseEmail,
              displayName: cred.displayName,
              lastSignInAt: now,
              devicePlatform,
            });
            const linkedAuth: LinkedAuth = {
              provider,
              providerUid: firebaseProviderUid,
              email: firebaseEmail,
              displayName: cred.displayName,
              linkedAt: now,
              lastSignInAt: now,
              devicePlatform,
            };
            tx.set(
              usersRef.doc(localStableId),
              { linkedAuth, updatedAt: now, created_at: now },
              { merge: true },
            );
            return { kind: 'created_new' as const };
          }
          tx.update(linkRef, {
            email: firebaseEmail,
            displayName: cred.displayName,
            lastSignInAt: now,
            devicePlatform,
          });
          return { kind: 'linked_existing' as const };
        }

        // Different stable_id → auto-merge by XP
        const localUserSnap = await tx.get(usersRef.doc(localStableId));
        const remoteUserSnap = await tx.get(usersRef.doc(remoteStableId));

        // ЕСЛИ remote stable_id указывает на удалённый/несуществующий док
        // (типичный orphan после "delete account" из приложения или удаления
        // юзера через админку — auth_links доку допилить нельзя из клиента
        // по rules), — то это, по сути, "висячий" линк. Чиним: переписываем
        // линк на текущий localStableId и идём по ветке created_new.
        // Без этой проверки старый remoteStableId выигрывал «по XP=0»,
        // mergeSwapToRemote свапал stable_id обратно на удалённый, и
        // restoreFromCloud в постхуке возвращал 404 → юзер залипал.
        if (!remoteUserSnap.exists) {
          tx.update(linkRef, {
            stable_id: localStableId,
            email: firebaseEmail,
            displayName: cred.displayName,
            lastSignInAt: now,
            devicePlatform,
          });
          // Записываем linkedAuth в users/{localStableId} (как в "created_new").
          const linkedAuth: LinkedAuth = {
            provider,
            providerUid: firebaseProviderUid,
            email: firebaseEmail,
            displayName: cred.displayName,
            linkedAt: now,
            lastSignInAt: now,
            devicePlatform,
          };
          tx.set(
            usersRef.doc(localStableId),
            { linkedAuth, updatedAt: now, created_at: now },
            { merge: true },
          );
          return { kind: 'created_new' as const };
        }

        const localXP = parseInt(localUserSnap.data()?.progress?.user_total_xp ?? '0', 10) || 0;
        const remoteXP = parseInt(remoteUserSnap.data()?.progress?.user_total_xp ?? '0', 10) || 0;

        // Сборка LinkedAuth (та же форма используется в любой merge-ветке).
        const mergedLinkedAuth: LinkedAuth = {
          provider,
          providerUid: firebaseProviderUid,
          email: firebaseEmail,
          displayName: cred.displayName,
          linkedAt: now,
          lastSignInAt: now,
          devicePlatform,
        };

        if (remoteXP >= localXP) {
          // Remote (existing) wins — клиент после транзакции свапнет stable_id
          tx.update(linkRef, {
            email: firebaseEmail,
            displayName: cred.displayName,
            lastSignInAt: now,
            devicePlatform,
          });
          // КРИТИЧНО: обязательно записать linkedAuth в users/{remoteStableId}.
          // Сценарий-боль: после старого delete-account flow + повторного логина
          // remote-док мог пересоздаться через restoreAndMigrateFromCloud → syncToCloud
          // БЕЗ поля linkedAuth. Тогда getLinkedAuthInfo() возвращает null, и Settings
          // вечно показывает "Не привʼязано" хотя юзер реально залогинен.
          tx.set(
            usersRef.doc(remoteStableId),
            { linkedAuth: mergedLinkedAuth, updatedAt: now },
            { merge: true },
          );
          return {
            kind: 'merged_swap_to_remote' as const,
            remoteStableId,
            mergedFromStableId: localStableId,
          };
        }

        // Local wins — переписываем link на local
        tx.update(linkRef, {
          stable_id: localStableId,
          email: firebaseEmail,
          displayName: cred.displayName,
          lastSignInAt: now,
          devicePlatform,
        });
        // То же самое: если у локального юзера в облаке нет поля linkedAuth
        // (сирота после delete-account), без этой записи UI Settings не увидит
        // что мы залогинены.
        tx.set(
          usersRef.doc(localStableId),
          { linkedAuth: mergedLinkedAuth, updatedAt: now },
          { merge: true },
        );
        return { kind: 'merged_keep_local' as const, mergedFromStableId: remoteStableId };
      }

      // Создаём новый link
      const linkData: AuthLinkDoc = {
        providerUid: firebaseProviderUid,
        provider,
        stable_id: localStableId,
        email: firebaseEmail,
        displayName: cred.displayName,
        linkedAt: now,
        lastSignInAt: now,
        devicePlatform,
      };
      tx.set(linkRef, linkData);

      // Записываем linkedAuth в users/{localStableId}
      const linkedAuth: LinkedAuth = {
        provider,
        providerUid: firebaseProviderUid,
        email: firebaseEmail,
        displayName: cred.displayName,
        linkedAt: now,
        lastSignInAt: now,
        devicePlatform,
      };
      tx.set(
        usersRef.doc(localStableId),
        { linkedAuth, updatedAt: now },
        { merge: true },
      );
      return { kind: 'created_new' as const };
    });
  } catch (e: any) {
    if (__DEV__) console.warn('[auth_provider] transaction failed', e);
    logAuthEvent('auth_signin_error', { provider, stage: 'transaction', error: String(e?.message ?? e).slice(0, 80) });
    const errStr = `transaction_${e?.message ?? 'unknown'}`.slice(0, 80);
    captureAuthSignInFailure(provider, 'transaction', errStr);
    return { result: 'error', error: errStr };
  }

  // 4. Post-transaction: handle stable_id swap if needed
  if (outcome.kind === 'merged_swap_to_remote') {
    try {
      // Сразу синкаем текущий локальный прогресс в облако
      // (на случай если local чуть-чуть свежее — после swap данные не пропадут).
      // syncToCloud у нас пишет в users/{currentLocalStableId} — это корректно ДО swap.
      await syncToCloud();

      // Подменяем stable_id локально
      await setStableId(outcome.remoteStableId);

      // Чистим локальные progress-ключи, чтобы restoreFromCloud записал данные нового аккаунта.
      // Берём список из cloud_sync.SYNC_KEYS косвенно — проще сразу удалить набор known progress keys.
      // Должен соответствовать SYNC_KEYS в cloud_sync.ts (плюс legacy/служебные).
      // Если ключ есть в SYNC_KEYS, но НЕТ здесь — после свапа stable_id в локалке
      // могут остаться обрывки прошлого аккаунта.
      const progressKeys = [
        // identity / progress
        'user_total_xp', 'user_prev_xp', 'user_name', 'user_avatar', 'user_frame',
        'streak_count', 'streak_last_date',
        'unlocked_lessons', 'flashcards', 'achievements_v1', 'achievements_state',
        'active_recall_items',
        'onboarding_done', 'lang', 'app_lang',
        // league
        'league_state_v3', 'week_leaderboard', 'week_points_v2', 'week_points',
        'daily_tasks_progress',
        // premium / streak protection
        'premium_plan', 'admin_premium_override', 'premium_expiry', 'had_premium_ever',
        'streak_freeze', 'premium_free_freeze_used',
        'chain_shield', 'gift_xp_multiplier',
        // level exams
        'level_exam_A1_passed', 'level_exam_A2_passed', 'level_exam_B1_passed', 'level_exam_B2_passed',
        'level_exam_A1_pct', 'level_exam_A2_pct', 'level_exam_B1_pct', 'level_exam_B2_pct',
        'level_exam_A1_best_pct', 'level_exam_A2_best_pct', 'level_exam_B1_best_pct', 'level_exam_B2_best_pct',
        'level_exam_A1_pass_count', 'level_exam_A2_pass_count', 'level_exam_B1_pass_count', 'level_exam_B2_pass_count',
        // flashcards user library + purchases
        'custom_flashcards_v2', 'flashcards_progress_v1', 'flashcards_owned_packs_v1',
        'community_owned_pack_ids_v1', 'irregular_verbs_global',
        // shards (баланс) и его служебные
        'shards_balance', 'shards_one_time_events', 'shards_arena_wins_total', 'shards_admin_override_applied_at',
        // UI / behavior
        'app_theme', 'app_font_size', 'haptics_tap',
        'user_settings', 'placement_level',
        'user_stats_v1', 'xp_migration_v2', 'week_points_migrated_v1',
        // sync bookkeeping
        'cloud_last_sync_snapshot_v1', 'cloud_created_at_synced_v1', 'cloud_migration_v1',
        // per-lesson progress (32 урока × 5 ключей = 160) — чтобы не оставались
        // звёзды/прогресс прежнего аккаунта на устройстве после свапа.
        ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`),
        ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_pass_count`),
        ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`),
        ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_listening_progress`),
        ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_intro_shown`),
      ];
      await AsyncStorage.multiRemove(progressKeys);

      // Гарантируем Firebase Auth state ready (после signInWithCredential anon → google)
      await ensureAnonUser();

      // Тащим прогресс с remote stable_id
      await restoreFromCloud();

      // КРИТИЧНО: шарды лежат в users/{uid}.shards (отдельно от SYNC_KEYS),
      // и после свапа stable_id локальный баланс соответствует СТАРОМУ аккаунту.
      // Без этого вызова первый же addShards/spendShards перезапишет правильный
      // облачный баланс мусором с прежнего stable_id.
      await loadShardsFromCloud().catch(() => {});

      // Если в облаке тоже автоген/пусто — попробуем дать человеческий ник из Google.
      await maybeAdoptDisplayNameAsUserName(cred.displayName).catch(() => {});
      await markOnboardedAfterSignIn();

      logAuthEvent('auth_signin_merged', {
        provider,
        from: outcome.mergedFromStableId.slice(0, 8),
        to: outcome.remoteStableId.slice(0, 8),
      });
      scheduleReferralApplyAfterLink();
      return {
        result: 'merged_devices',
        email: firebaseEmail,
        displayName: cred.displayName,
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
    // Local выиграл → попробуем подставить человеческий ник из Google если локальный — автоген,
    // ПОТОМ синкаем (чтобы новый ник тоже ушёл в облако одним пакетом).
    await maybeAdoptDisplayNameAsUserName(cred.displayName).catch(() => {});
    await markOnboardedAfterSignIn();
    syncToCloud().catch(() => {});
    logAuthEvent('auth_signin_merged_keep_local', {
      provider,
      replaced: outcome.mergedFromStableId.slice(0, 8),
    });
    scheduleReferralApplyAfterLink();
    return {
      result: 'merged_devices',
      email: firebaseEmail,
      displayName: cred.displayName,
      mergedFromStableId: outcome.mergedFromStableId,
    };
  }

  if (outcome.kind === 'linked_existing') {
    // КРИТИЧЕСКИ ВАЖНО: после переустановки приложения с allowBackup=true Keychain
    // восстанавливает stable_id, а локальный AsyncStorage пустой. Если сразу вызвать
    // syncToCloud — он перезапишет users/{stable_id}.progress null'ами и затрёт прогресс.
    // Поэтому сначала тащим cloud → local. Если local имеет существенный прогресс —
    // тогда можно sync. Иначе — пропускаем sync, чтобы не пере-затереть облако null'ами.
    try {
      await restoreFromCloud();
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] linked_existing restoreFromCloud failed', e);
    }
    // Шарды отдельным каналом (users/{uid}.shards): подтягиваем под актуальный stable_id.
    await loadShardsFromCloud().catch(() => {});
    // Если в облаке/локально оказался автоген — попробуем подставить displayName из Google.
    await maybeAdoptDisplayNameAsUserName(cred.displayName).catch(() => {});
    await markOnboardedAfterSignIn();
    if (await hasMeaningfulLocalProgress()) {
      syncToCloud().catch(() => {});
    } else if (__DEV__) {
      console.warn('[auth_provider] linked_existing: skipping syncToCloud — local AsyncStorage пустой, cloud не перезаписываем');
    }
    logAuthEvent('auth_signin_linked', { provider });
    scheduleReferralApplyAfterLink();
    return { result: 'linked_existing', email: firebaseEmail, displayName: cred.displayName };
  }

  // outcome.kind === 'created_new'
  // Тот же подход: сначала restore, потом sync только если local не пустой.
  try {
    await restoreFromCloud();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] created_new restoreFromCloud failed', e);
  }
  // Шарды: для нового аккаунта в облаке их ещё нет — функция просто вернётся,
  // но лучше явный вызов для симметрии и на случай pre-seeding из бэкенда.
  await loadShardsFromCloud().catch(() => {});
  await maybeAdoptDisplayNameAsUserName(cred.displayName).catch(() => {});
  await markOnboardedAfterSignIn();
  if (await hasMeaningfulLocalProgress()) {
    syncToCloud().catch(() => {});
  } else if (__DEV__) {
    console.warn('[auth_provider] created_new: skipping syncToCloud — local AsyncStorage пустой');
  }
  logAuthEvent('auth_signin_created', { provider });
  scheduleReferralApplyAfterLink();
  return { result: 'created_new', email: firebaseEmail, displayName: cred.displayName };
}

/**
 * Распознавание авто-сгенерированного ника из онбординга
 * (паттерн «<Слово><4 цифры>», слово из AUTO_NAME_WORDS в components/onboarding.tsx).
 * Если ник руками введён в онбординге — пользователю он значим, не трогаем.
 */
const AUTO_NAME_WORDS_LOWER = new Set([
  'syntax', 'lexis', 'prose', 'verse', 'quill', 'glyph', 'script', 'riddle',
  'fable', 'rhyme', 'serif', 'sonnet', 'clause', 'motif', 'trope', 'parable',
  'thesis', 'corpus', 'lore', 'rune', 'lyric', 'gloss', 'tome', 'epics',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'iota',
  'kappa', 'lambda', 'sigma', 'omega', 'phi', 'psi', 'tau', 'rho',
  'axiom', 'cipher', 'sage', 'totem', 'omen', 'nexus', 'prism', 'vector',
  'quantum', 'ethos', 'logos', 'kairos', 'telos', 'aporia', 'datum',
]);

function isAutoGeneratedName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const m = trimmed.match(/^([A-Z][a-z]+)(\d{4})$/);
  if (!m) return false;
  return AUTO_NAME_WORDS_LOWER.has(m[1].toLowerCase());
}

/**
 * После успешного sign-in считаем что юзер уже "onboarded" даже если он только что
 * создан (created_new). У него есть Google/Apple displayName → авто-ник + язык
 * интерфейса уже выбран на устройстве. Показывать классический онбординг повторно
 * (привет/выбор уровня/имя) не нужно.
 *
 * Особенно важно для flow "Сменить аккаунт" (Variant 2 в settings.tsx):
 * там мы стираем onboarding_done из локалки. Без этой пометки при следующем
 * запуске app покажется онбординг.
 */
async function markOnboardedAfterSignIn(): Promise<void> {
  try {
    const cur = await AsyncStorage.getItem('onboarding_done');
    if (cur !== '1') {
      await AsyncStorage.setItem('onboarding_done', '1');
    }
  } catch {
    /* ignore */
  }
}

/**
 * После успешного sign-in: если у юзера локально пустой ник или
 * авто-сгенерированный «Psi5552»-стиль — попробуем подставить displayName из Google/Apple
 * как обычный человеческий ник (только первое слово, очищенное от спецсимволов,
 * не длиннее 20 символов; коллизии ника решаются числовым суффиксом).
 *
 * Не перезаписывает ник, который пользователь явно вводил руками в онбординге.
 */
async function maybeAdoptDisplayNameAsUserName(displayName: string | null): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  if (!displayName) return;
  const firstWord = displayName.trim().split(/\s+/)[0] ?? '';
  // Оставляем латиницу/кириллицу/цифры/_; всё прочее (точки, скобки, эмодзи) убираем.
  const cleaned = firstWord.replace(/[^A-Za-zА-Яа-яЇїІіЄєҐґЁё0-9_]/g, '').slice(0, 18);
  if (cleaned.length < 2) return;

  const oldNameRaw = await AsyncStorage.getItem('user_name');
  const oldName = (oldNameRaw ?? '').trim();
  if (oldName && !isAutoGeneratedName(oldName)) return;

  let candidate = cleaned;
  for (let i = 0; i < 5; i++) {
    let result: 'ok' | 'taken' | 'error';
    try {
      result = await reserveName(candidate, oldName);
    } catch {
      return;
    }
    if (result === 'ok') {
      try {
        await AsyncStorage.setItem('user_name', candidate);
        await syncToCloud({ forceNow: true });
        logAuthEvent('auth_user_name_adopted', {
          had_old: oldName ? 1 : 0,
          attempt: i,
          len: candidate.length,
        });
      } catch { /* ignore */ }
      return;
    }
    if (result === 'error') return;
    // 'taken' → пробуем суффикс «Maksym2», «Maksym3», ...
    const suffix = String(2 + i);
    const maxLen = Math.max(2, 20 - suffix.length);
    candidate = `${cleaned.slice(0, maxLen)}${suffix}`;
  }
}

/**
 * Признак что у локального юзера есть значимый прогресс.
 * Используется чтобы не запускать syncToCloud сразу после login на переустановленном
 * устройстве, когда AsyncStorage пуст и любой sync затрёт облако null'ами.
 *
 * Считаем что есть прогресс если:
 *   • user_total_xp > 0, ИЛИ
 *   • streak_count > 0, ИЛИ
 *   • unlocked_lessons непустой массив, ИЛИ
 *   • user_name установлен (не пустая строка).
 */
async function hasMeaningfulLocalProgress(): Promise<boolean> {
  try {
    const [[, xp], [, streak], [, lessons], [, name]] = await AsyncStorage.multiGet([
      'user_total_xp',
      'streak_count',
      'unlocked_lessons',
      'user_name',
    ]);
    if (xp && parseInt(xp, 10) > 0) return true;
    if (streak && parseInt(streak, 10) > 0) return true;
    if (lessons) {
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
 *   1. forceSyncToCloud() — гарантируем что текущий прогресс записан в users/{stable_id}.
 *      Если нет интернета / Firestore недоступен — НЕ выходим, возвращаем ошибку.
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
  | { ok: true }
  | { ok: false; reason: 'sync_failed' | 'unknown'; detail?: string };

export async function signOutAndWipeForAccountSwitch(): Promise<SignOutSwitchResult> {
  if (!CLOUD_SYNC_ENABLED) {
    // В Expo Go / без облака просто чистим локально — ничего терять не можем.
    try {
      await wipeLocalAccountData();
      await clearStableId();
      logAuthEvent('auth_signout_wipe', { mode: 'no_cloud' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: 'unknown', detail: String(e?.message ?? e).slice(0, 80) };
    }
  }
  try {
    // 1. Гарантируем что весь локальный прогресс ушёл в облако.
    const synced = await forceSyncToCloud();
    if (!synced) {
      logAuthEvent('auth_signout_wipe_failed', { stage: 'sync' });
      return { ok: false, reason: 'sync_failed' };
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
    return { ok: true };
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
 *   1. deleteMyLeaderboardEntry() — сносим запись из глобального лидерборда.
 *   2. deleteCloudData() — удаляем users/{stable_id} (+ дублирующий по authUid)
 *      и пытаемся удалить Firebase Auth юзера (currentUser.delete()).
 *      ВАЖНО: auth_links/{providerUid} тут НЕ удаляется (rules не позволяют),
 *      но он становится "orphan" и лечится в signInWithProvider при ре-логине
 *      (см. ветку !remoteUserSnap.exists в транзакции выше).
 *   3. signOutCurrentProvider() — Google revoke + Firebase signOut.
 *   4. wipeLocalAccountData() + AsyncStorage.clear() — сносим локальный кеш.
 *   5. clearStableId() — сносим UUID из SecureStore + AsyncStorage + памяти.
 *   6. ensureAnonUser() — поднимаем чистую анонимную сессию + новый stable_id.
 *
 * После этого вход через Google = поведение "первый запуск на новом устройстве":
 * созданный ранее auth_links/{providerUid} будет починен (см. signInWithProvider).
 */
export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteAccountAndWipe(): Promise<DeleteAccountResult> {
  // 1. Удаляем облачные данные. Без сети это просто упадёт молча (catch внутри),
  //    локальный wipe всё равно выполняем — иначе юзер останется в зомби-состоянии.
  try {
    await deleteMyLeaderboardEntry();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: leaderboard delete failed', e);
  }
  try {
    await deleteCloudData();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: cloud delete failed', e);
  }

  // 2. Выходим из Google + Firebase Auth (revoke session, чтобы при следующем
  //    GoogleSignin.signIn() появился picker аккаунтов; иначе автологин в тот же).
  try {
    await signOutCurrentProvider();
  } catch (e) {
    if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: signOut failed', e);
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

  // 6. Поднимаем чистую анонимную Firebase сессию + сгенерится новый stable_id
  //    при первом getStableId(). ensureAnonUser в конце — best-effort, не валим
  //    весь flow если нет сети.
  if (CLOUD_SYNC_ENABLED) {
    try {
      await ensureAnonUser();
    } catch (e) {
      if (__DEV__) console.warn('[auth_provider] deleteAccountAndWipe: ensureAnonUser failed', e);
    }
  }

  logAuthEvent('auth_account_deleted');
  return { ok: true };
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
  // и не повиснет на пустом native picker'е.
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
