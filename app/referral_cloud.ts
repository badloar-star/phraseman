import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

export { isReferralCloudEnabled } from './referral_flags';

const REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
}

export type EnsureReferralCodeResult = { code: string };

export async function callReferralEnsureMyCode(stableId: string): Promise<EnsureReferralCodeResult> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
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
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<typeof params, ApplyReferralResult>('referralApply');
  const res = await fn(params);
  return res.data;
}

/** Статус приглашения для бейджей в /friends (зеркало серверного AttributionStatus). */
export type ReferralInviteStatus = 'pending' | 'qualified' | 'rewarded' | 'skipped_referrer_cap';

export type ReferralInvite = {
  refereeStableId: string;
  status: ReferralInviteStatus;
  createdAtMs: number;
};

export type ListMyInvitesResult = {
  ok?: boolean;
  invites: ReferralInvite[];
  qualifiedCount: number;
  claimableVipDays: number;
};

/** Список приглашений текущего пользователя (для бейджей и кнопки «Открыть»). */
export async function callReferralListMyInvites(referrerStableId: string): Promise<ListMyInvitesResult> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ referrerStableId: string }, ListMyInvitesResult>('referralListMyInvites');
  const res = await fn({ referrerStableId });
  return res.data;
}

export type ClaimedFriend = {
  refereeStableId: string;
  daysGranted: number;
};

export type ClaimVipRewardResult = {
  ok?: boolean;
  granted: number;
  claimed: ClaimedFriend[];
  vipUntilMs: number;
  cappedThisMonth: boolean;
};

/** Обналичивание накопленных дней доступа: +7 дней за каждого qualified-друга (стакается). */
export async function callReferralClaimVipReward(referrerStableId: string): Promise<ClaimVipRewardResult> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ referrerStableId: string }, ClaimVipRewardResult>('referralClaimVipReward');
  const res = await fn({ referrerStableId });
  return res.data;
}

/** Коды ошибок callable для UI. */
export function getReferralCallableErrorCode(e: unknown): string | null {
  if (e && typeof e === 'object' && 'code' in e) {
    return String((e as { code: string }).code ?? '');
  }
  return null;
}
