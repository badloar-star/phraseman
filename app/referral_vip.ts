/**
 * Клиентская оркестрация реферального VIP (Фаза 2).
 *
 * Награду пишет ТОЛЬКО сервер (CF referralClaimVipReward, Admin SDK) — клиент не трогает
 * vip_* поля (firestore.rules: progressHasNoPremiumWrites). Здесь только: вызвать CF,
 * после успеха обновить локальное состояние доступа из облака и завести анимацию активации.
 */
import { logEvent } from './firebase';
import { getCanonicalUserId } from './user_id_policy';
import {
  callReferralClaimVipReward,
  callReferralListMyInvites,
  getReferralCallableErrorCode,
  isReferralCloudEnabled,
  type ClaimVipRewardResult,
  type ListMyInvitesResult,
  type ReferralInvite,
} from './referral_cloud';
import { invalidatePremiumCache } from './premium_guard';
import { markVipCelebrationPending } from './vip_celebration_state';

export type { ReferralInvite } from './referral_cloud';

const EMPTY_INVITES: ListMyInvitesResult = {
  ok: true,
  invites: [],
  qualifiedCount: 0,
  claimableVipDays: 0,
};

/** Сколько дней доступа можно открыть прямо сейчас (есть qualified-друзья). */
export async function getClaimableReferralState(): Promise<ListMyInvitesResult> {
  if (!isReferralCloudEnabled()) return EMPTY_INVITES;
  const stableId = await getCanonicalUserId();
  if (!stableId) return EMPTY_INVITES;
  try {
    const res = await callReferralListMyInvites(stableId);
    return {
      ok: res.ok ?? true,
      invites: Array.isArray(res.invites) ? res.invites : [],
      qualifiedCount: res.qualifiedCount ?? 0,
      claimableVipDays: res.claimableVipDays ?? 0,
    };
  } catch (e) {
    logEvent('referral_list_invites_failed', { code: getReferralCallableErrorCode(e) ?? 'unknown' });
    return EMPTY_INVITES;
  }
}

export type ClaimReferralOutcome =
  | { ok: true; granted: number; friends: number; vipUntilMs: number; cappedThisMonth: boolean }
  | { ok: false; reason: 'disabled' | 'no_user' | 'nothing' | 'error'; code?: string };

/**
 * Открыть накопленные дни доступа. После успешного начисления (granted > 0):
 *  - заводим маркер анимации активации (vip_celebration);
 *  - чистим кэш premium-доступа, чтобы фичи-гейты сразу увидели новое окно;
 *  - подтягиваем авторитетное vip_until из облака отложенно (caller сам решит, когда).
 */
export async function claimReferralVipDays(): Promise<ClaimReferralOutcome> {
  if (!isReferralCloudEnabled()) return { ok: false, reason: 'disabled' };
  const stableId = await getCanonicalUserId();
  if (!stableId) return { ok: false, reason: 'no_user' };

  let res: ClaimVipRewardResult;
  try {
    res = await callReferralClaimVipReward(stableId);
  } catch (e) {
    const code = getReferralCallableErrorCode(e) ?? 'unknown';
    logEvent('referral_claim_vip_failed', { code });
    return { ok: false, reason: 'error', code };
  }

  const granted = Math.max(0, Math.floor(res.granted ?? 0));
  const friends = Array.isArray(res.claimed) ? res.claimed.length : 0;

  if (granted <= 0) {
    return { ok: false, reason: 'nothing' };
  }

  // Маркер для анимации активации (тот же механизм, что admin-grant VIP).
  await markVipCelebrationPending(`referral_${Date.now()}`).catch(() => {});
  invalidatePremiumCache();
  logEvent('referral_claim_vip_success', { days: granted, friends });

  return {
    ok: true,
    granted,
    friends,
    vipUntilMs: Math.max(0, Math.floor(res.vipUntilMs ?? 0)),
    cappedThisMonth: !!res.cappedThisMonth,
  };
}

/** Сколько друзей в каждом статусе — для бейджей и заголовков. */
export function summarizeInvites(invites: ReferralInvite[]): {
  pending: number;
  qualified: number;
  rewarded: number;
} {
  let pending = 0;
  let qualified = 0;
  let rewarded = 0;
  for (const inv of invites) {
    if (inv.status === 'pending') pending += 1;
    else if (inv.status === 'qualified') qualified += 1;
    else if (inv.status === 'rewarded') rewarded += 1;
  }
  return { pending, qualified, rewarded };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
