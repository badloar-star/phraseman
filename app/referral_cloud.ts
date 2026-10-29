import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { swallowError } from './debug-logger'; // зачем: PM-229-A1 — сбой init не немой

export { isReferralCloudEnabled } from './referral_flags';

const REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
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
  referralSource?: 'deeplink' | 'play_install' | 'manual_code' | 'clipboard';
}): Promise<ApplyReferralResult> {
  const fn = callable<typeof params, ApplyReferralResult>('referralApply');
  const res = await fn(params);
  return res.data;
}

/** Статус приглашения для бейджей в /friends (зеркало серверного AttributionStatus). */
export type ReferralInviteStatus = 'pending' | 'qualified' | 'rewarded' | 'expired' | 'skipped_referrer_cap';

export type ReferralInvite = {
  refereeStableId: string;
  status: ReferralInviteStatus;
  refereeName?: string;
  createdAtMs: number;
  deadlineAtMs: number;
  qualifiedAtMs?: number;
  /** Лесенка (29.10): когда сервер засчитал первый урок друга. */
  lessonPassedAtMs?: number;
  /** Лесенка: waiting — урок ещё нужен, counted — засчитан, not_counted — не засчитан по правилам (причин клиенту сервер не отдаёт). */
  ladder?: 'waiting' | 'counted' | 'not_counted';
  /** Лесенка, для waiting: до какого времени нужен первый урок. */
  ladderDeadlineMs?: number;
};

/** «Лесенка приглашений» (владелец 29.10): данные ступеней из referralListMyInvites; нет поля — сервер ещё без лесенки. */
export type ReferralLadderData = {
  countedFriends: number;
  plusGrants: number;
  coinsPerFriend: number;
  plusDaysPerGrant: number;
  friendsPerGrant: number;
  monthCounted: number;
  monthlyCap: number;
  lessonWindowDays: number;
};

export type ReferralDrainState = {
  softEnabled: boolean;
  emergencyStop: boolean;
  serverNowMs: number;
  activePendingCount: number;
  claimableQualifiedCount: number;
  availableCreditCount: number;
  latestPendingDeadlineMs: number;
  earliestCreditExpiryMs: number;
  /** Лесенка приглашений едет здесь же, чтобы лечь в уже существующий кэш приглашений (память + диск, по аккаунту) без нового хранилища. */
  ladder?: ReferralLadderData;
};

export type ListMyInvitesResult = {
  ok?: boolean;
  invites: ReferralInvite[];
  qualifiedCount: number;
  claimableVipDays: number;
  drain: ReferralDrainState;
  ladder?: ReferralLadderData;
};

/** Список приглашений текущего пользователя (для бейджей и кнопки «Открыть»). */
export async function callReferralListMyInvites(
  referrerStableId: string,
  options: { force?: boolean } = {},
): Promise<ListMyInvitesResult> {
  const fn = callable<{ referrerStableId: string; force?: boolean }, ListMyInvitesResult>('referralListMyInvites');
  const res = await fn({ referrerStableId, force: options.force === true });
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
  /** Достигнут дневной анти-фарм лимит (награды не потеряны — доступны завтра). */
  cappedToday?: boolean;
};

/** Исторический callable получения накопленных дней доступа; новый UI использует прокруты рулетки. */
export async function callReferralClaimVipReward(referrerStableId: string): Promise<ClaimVipRewardResult> {
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
