import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
}

export function isReferralCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

export type EnsureReferralCodeResult = { code: string };

export async function callReferralEnsureMyCode(stableId: string): Promise<EnsureReferralCodeResult> {
  const fn = callable<{ stableId: string }, EnsureReferralCodeResult>('referralEnsureMyCode');
  const res = await fn({ stableId });
  return res.data;
}

export type ApplyReferralResult = {
  ok?: boolean;
  already?: boolean;
  referrerStableId?: string;
  refCode?: string;
  status?: string;
};

export async function callReferralApply(params: {
  refereeStableId: string;
  refCode: string;
}): Promise<ApplyReferralResult> {
  const fn = callable<typeof params, ApplyReferralResult>('referralApply');
  const res = await fn(params);
  return res.data;
}

/** Коды ошибок callable для UI. */
export function getReferralCallableErrorCode(e: unknown): string | null {
  if (e && typeof e === 'object' && 'code' in e) {
    return String((e as { code: string }).code ?? '');
  }
  return null;
}
