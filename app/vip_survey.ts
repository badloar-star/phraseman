import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, ENABLE_DEV_TOOLS, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId, resetAnonAuthCacheForSignOut } from './cloud_sync';
import { emitAppEvent } from './events';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';
import { markVipCelebrationPending } from './vip_celebration_state';
import {
  normalizeVipSurveyAnswers,
  VIP_SURVEY_ID,
  VIP_SURVEY_REWARD_DAYS,
  type VipSurveyAnswers,
} from './vip_survey_content';
import { readSavedDevCredential, signInWithDevEmailCredential } from './vip_survey_dev_auth';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';

const FUNCTIONS_REGION = 'us-central1';
let vipCallableAuthPromise: Promise<string> | null = null;

export type VipSurveyReviewIntent = 'yes' | 'no' | 'not_now';

export type SubmitVipSurveyRequest = {
  stableId: string;
  messageId: string;
  surveyId: string;
  answers: VipSurveyAnswers;
  reviewIntent: VipSurveyReviewIntent;
  storeOpened: boolean;
  platform: string;
};

export type SubmitVipSurveyResponse = {
  ok: boolean;
  alreadyGranted: boolean;
  uid: string;
  grantAt: string;
  vipFrom: string;
  vipUntil: string;
  vipPlan: string;
  rewardDays: number;
};

type RecordVipSurveyReviewClickRequest = {
  stableId: string;
  surveyId: string;
  messageId: string;
  storeOpened: boolean;
  platform: string;
};

type RecordVipSurveyReviewClickResponse = {
  ok: boolean;
  uid: string;
  storeOpened: boolean;
};

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err || 'unknown');
}

function credentialUid(credential: unknown, auth: any): string {
  const row = credential as { user?: { uid?: unknown } } | null | undefined;
  return String(row?.user?.uid || auth?.currentUser?.uid || '').trim();
}

async function signInAnonymouslyForVipCallable(auth: any): Promise<string> {
  if (ENABLE_DEV_TOOLS) {
    const savedDevCredential = await readSavedDevCredential();
    if (savedDevCredential) {
      try {
        return await signInWithDevEmailCredential(auth, false);
      } catch (savedError) {
        console.warn('[vip_survey] saved dev auth failed, falling back to anonymous', errorDetail(savedError));
      }
    }
  }
  try {
    const credential = await auth?.signInAnonymously?.();
    const uid = credentialUid(credential, auth);
    if (!uid) throw new Error('anonymous_auth_missing_uid');
    return uid;
  } catch (firstError) {
    const firstDetail = errorDetail(firstError);
    if (/keychain|auth\/keychain|anonymous/i.test(firstDetail)) {
      await auth?.signOut?.().catch(() => undefined);
      resetAnonAuthCacheForSignOut();
      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        const credential = await auth?.signInAnonymously?.();
        const uid = credentialUid(credential, auth);
        if (!uid) throw new Error('anonymous_auth_missing_uid_after_retry');
        return uid;
      } catch (retryError) {
        if (ENABLE_DEV_TOOLS) {
          return signInWithDevEmailCredential(auth, true);
        }
        throw retryError;
      }
    }
    if (ENABLE_DEV_TOOLS && /too-many-requests|network|internal|unavailable|auth\//i.test(firstDetail)) {
      return signInWithDevEmailCredential(auth, true);
    }
    throw firstError;
  }
}

async function ensureFirebaseAuthUidForVipCallableInner(): Promise<string> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) throw new Error('cloud_unavailable');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@react-native-firebase/auth');
    const getAuth = authModule.default || authModule;
    const auth = typeof getAuth === 'function' ? getAuth() : getAuth;
    let user = auth?.currentUser;
    if (!user) {
      await signInAnonymouslyForVipCallable(auth);
      user = auth?.currentUser;
    }
    if (!user?.uid) throw new Error('missing_user');
    if (typeof user.getIdToken === 'function') {
      await user.getIdToken(true).catch(() => undefined);
    }
    return String(user.uid);
  } catch (e) {
    const detail = errorDetail(e);
    throw new Error(`auth_unavailable:${detail}`);
  }
}

async function ensureFirebaseAuthUidForVipCallable(): Promise<string> {
  if (vipCallableAuthPromise) return vipCallableAuthPromise;
  vipCallableAuthPromise = ensureFirebaseAuthUidForVipCallableInner().finally(() => {
    vipCallableAuthPromise = null;
  });
  return vipCallableAuthPromise;
}

function vipSurveyAccountChanged(): Error {
  return new Error('vip_survey_account_changed');
}

async function persistVipResult(
  result: SubmitVipSurveyResponse,
  accountToken: AccountGenerationToken,
  stableId: string,
): Promise<boolean> {
  const grantAt = String(result.grantAt || Date.now());
  const vipUntilMs = Number(result.vipUntil || 0);
  const active = vipUntilMs <= 0 || vipUntilMs > Date.now();
  const storagePairs: [string, string][] = [
    ['vip_active', active ? 'true' : 'false'],
    ['vip_plan', result.vipPlan || 'survey_vip'],
    ['vip_from', result.vipFrom || grantAt],
    ['vip_until', result.vipUntil || '0'],
    ['vip_admin_override', 'true'],
    ['vip_admin_grant_at', grantAt],
  ];
  const isCurrent = () => isCurrentAccountGeneration(accountToken, stableId);
  const persisted = await withAccountTransitionLock(async () => {
    if (!isCurrent()) return false;
    await AsyncStorage.multiSet(storagePairs);
    if (!isCurrent()) return false;
    invalidatePremiumCache();

    if (active && !result.alreadyGranted) {
      if (!isCurrent()) return false;
      await markVipCelebrationPending(grantAt);
      if (!isCurrent()) return false;
    }

    if (!isCurrent()) return false;
    if (active) {
      emitAppEvent('vip_activated');
    } else {
      emitAppEvent('vip_deactivated');
    }
    if (!isCurrent()) return false;
    emitAppEvent('premium_access_changed', { active, source: active ? 'vip' : 'none' });
    return isCurrent();
  });
  if (!persisted || !isCurrent()) return false;

  // Keep the public-profile refresh non-blocking, but serialize its local cache
  // writes with account wipe/hydration and re-check identity on both sides.
  void withAccountTransitionLock(async () => {
    if (!isCurrent()) return;
    await syncPublicProfileSnapshot({
      reason: 'entitlement_change',
      isVip: active,
      isPremium: active,
    }).catch(() => {});
    if (!isCurrent()) return;
  }).catch(() => {});
  return isCurrent();
}

export async function submitVipSurveyFromApp(params: {
  messageId: string;
  answers: VipSurveyAnswers;
  reviewIntent: VipSurveyReviewIntent;
  storeOpened: boolean;
}): Promise<SubmitVipSurveyResponse> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    throw new Error('cloud_unavailable');
  }

  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken)) throw vipSurveyAccountChanged();

  const hasPremiumAccess = await getVerifiedPremiumAccessStatus().catch(() => false);
  if (!isCurrentAccountGeneration(accountToken)) throw vipSurveyAccountChanged();
  if (hasPremiumAccess) {
    throw new Error('vip_survey_free_tier_required');
  }

  await ensureFirebaseAuthUidForVipCallable();
  if (!isCurrentAccountGeneration(accountToken)) throw vipSurveyAccountChanged();
  const stableId = await ensureAnonUser();
  if (!stableId) throw new Error('user_unavailable');
  if (!isCurrentAccountGeneration(accountToken, stableId)) throw vipSurveyAccountChanged();
  await ensureStableAuthLinkForStableId(stableId).catch(() => false);
  if (!isCurrentAccountGeneration(accountToken, stableId)) throw vipSurveyAccountChanged();
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  if (!isCurrentAccountGeneration(accountToken, stableId)) throw vipSurveyAccountChanged();

  const fn = callable<SubmitVipSurveyRequest, SubmitVipSurveyResponse>('submitVipSurvey');
  const payload: SubmitVipSurveyRequest = {
    stableId,
    messageId: String(params.messageId || '').trim(),
    surveyId: VIP_SURVEY_ID,
    answers: normalizeVipSurveyAnswers(params.answers),
    reviewIntent: params.reviewIntent,
    storeOpened: !!params.storeOpened,
    platform: Platform.OS,
  };
  if (!isCurrentAccountGeneration(accountToken, stableId)) throw vipSurveyAccountChanged();
  const result = (await fn(payload)).data;
  if (!isCurrentAccountGeneration(accountToken, stableId)) throw vipSurveyAccountChanged();
  if (String(result.uid || '').trim() !== stableId) throw new Error('vip_survey_owner_mismatch');
  if (!await persistVipResult(result, accountToken, stableId)) throw vipSurveyAccountChanged();
  return result;
}

export async function recordVipSurveyReviewClickFromApp(params: {
  messageId?: string;
  storeOpened: boolean;
}): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return false;

  await ensureFirebaseAuthUidForVipCallable();
  const stableId = await ensureAnonUser();
  if (!stableId) return false;
  await ensureStableAuthLinkForStableId(stableId).catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});

  const fn = callable<RecordVipSurveyReviewClickRequest, RecordVipSurveyReviewClickResponse>('recordVipSurveyReviewClick');
  const result = (await fn({
    stableId,
    surveyId: VIP_SURVEY_ID,
    messageId: String(params.messageId || '').trim(),
    storeOpened: !!params.storeOpened,
    platform: Platform.OS,
  })).data;
  return result.ok === true;
}

export function getVipSurveyRewardDays(): number {
  return VIP_SURVEY_REWARD_DAYS;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
