import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { isPremiumAccessActive } from './premium_status';

const REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const PACK_TRIAL_MS = 48 * 60 * 60 * 1000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,180}$/;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function parsed(value: unknown): Row {
  if (typeof value !== 'string') return record(value);
  try { return record(JSON.parse(value)); } catch { return {}; }
}

function int(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function shieldDays(user: Row): number {
  const progress = record(user.progress);
  return Math.max(int(parsed(user.chain_shield).daysLeft), int(parsed(progress.chain_shield).daysLeft));
}

function boostExpiry(user: Row): number {
  const progress = record(user.progress);
  return Math.max(int(parsed(user.gift_xp_multiplier).expiresAt), int(parsed(progress.gift_xp_multiplier).expiresAt));
}

function oneUseCount(user: Row, key: string, legacyKey?: string, legacyValue?: string): number {
  const progress = record(user.progress);
  const legacyPresent = legacyKey && legacyValue
    ? user[legacyKey] === legacyValue || progress[legacyKey] === legacyValue
    : false;
  return Math.max(int(user[key]), int(progress[key]), legacyPresent ? 1 : 0);
}

export function canonicalizeExistingGlobalBroadcastReceipt(existing: Row, user: Row): Row {
  const rewardType = String(existing.rewardType ?? 'none');
  const hasCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (rewardType === 'club_boost_free' && !hasCount(existing.clubGiftFreeBoostCount)) {
    return { ...existing, clubGiftFreeBoostCount: oneUseCount(user, 'club_gift_free_boost_v1') };
  }
  if (rewardType === 'wager_discount_25' && !hasCount(existing.wagerDiscountUses)) {
    return {
      ...existing,
      wagerDiscountUses: oneUseCount(user, 'wager_discount_uses_v1', 'wager_discount', '0.25'),
    };
  }
  return existing;
}

export function buildGlobalBroadcastRewardMutation(
  broadcast: Row,
  user: Row,
  now: number,
): { userPatch: Row; response: Row } {
  const legacyShards = int(broadcast.shards);
  const rawRequestedType = String(broadcast.rewardType ?? 'none');
  const requestedType = rawRequestedType === 'none' && legacyShards > 0 ? 'shards' : rawRequestedType;
  if (requestedType === 'none') return { userPatch: {}, response: { ok: true, rewardType: 'none' } };

  if (requestedType === 'shards') {
    const amount = int(broadcast.rewardAmount ?? broadcast.shards);
    if (amount < 1 || amount > 1000) throw new HttpsError('failed-precondition', 'broadcast_shard_amount_invalid');
    const before = int(user.shards);
    const after = before + amount;
    return {
      userPatch: {
        shards: after,
        shards_updated_at_ms: now,
        shards_updated_op: 'earn',
        shards_updated_reason: 'global_broadcast_modal',
      },
      response: {
        ok: true,
        rewardType: 'shards',
        rewardAmount: amount,
        senderBalanceAfter: after,
        shardsUpdatedAtMs: now,
      },
    };
  }

  if (requestedType === 'chain_shield_1' || requestedType === 'chain_shield_3') {
    const days = requestedType === 'chain_shield_1' ? 1 : 3;
    const canonical = JSON.stringify({ daysLeft: shieldDays(user) + days, grantedAt: new Date(now).toISOString().slice(0, 10) });
    return {
      userPatch: { chain_shield: canonical, progress: { chain_shield: canonical } },
      response: { ok: true, rewardType: requestedType, chainShield: canonical },
    };
  }

  if (requestedType === 'xp_boost_2x_24h' || requestedType === 'xp_boost_2x_48h') {
    const hours = requestedType === 'xp_boost_2x_24h' ? 24 : 48;
    const canonical = JSON.stringify({ multiplier: 2, expiresAt: Math.max(now, boostExpiry(user)) + hours * 60 * 60 * 1000 });
    return {
      userPatch: { gift_xp_multiplier: canonical, progress: { gift_xp_multiplier: canonical } },
      response: { ok: true, rewardType: requestedType, giftXpMultiplier: canonical },
    };
  }

  if (requestedType === 'club_boost_free') {
    const count = oneUseCount(user, 'club_gift_free_boost_v1') + 1;
    return {
      userPatch: {
        club_gift_free_boost_v1: String(count),
        progress: { club_gift_free_boost_v1: String(count) },
      },
      response: { ok: true, rewardType: requestedType, clubGiftFreeBoostCount: count },
    };
  }
  if (requestedType === 'wager_discount_25') {
    const count = oneUseCount(user, 'wager_discount_uses_v1', 'wager_discount', '0.25') + 1;
    return {
      userPatch: {
        wager_discount: '0.25',
        wager_discount_uses_v1: String(count),
        progress: { wager_discount: '0.25', wager_discount_uses_v1: String(count) },
      },
      response: { ok: true, rewardType: requestedType, wagerDiscountUses: count },
    };
  }
  if (requestedType === 'pack_trial_48h') {
    return { userPatch: {}, response: { ok: true, rewardType: requestedType } };
  }
  throw new HttpsError('failed-precondition', 'broadcast_reward_unsupported');
}

export const globalBroadcastClaim = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Auth required');
  const requestedStableId = String(request.data?.stableId ?? '').trim();
  const broadcastId = String(request.data?.broadcastId ?? '').trim();
  if (!requestedStableId || !SAFE_ID.test(broadcastId)) {
    throw new HttpsError('invalid-argument', 'stableId and broadcastId required');
  }
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, requestedStableId, { requireKnownIdentity: true });
  const userRef = db.collection('users').doc(stableUid);
  const broadcastRef = db.collection('global_broadcast_modals').doc(broadcastId);
  const claimRef = userRef.collection('reward_claims').doc(`global_broadcast_${broadcastId}`);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [broadcastSnap, userSnap, claimSnap] = await Promise.all([
      tx.get(broadcastRef), tx.get(userRef), tx.get(claimRef),
    ]);
    if (claimSnap.exists) {
      const existing = record(claimSnap.data()?.response);
      return Object.keys(existing).length
        ? canonicalizeExistingGlobalBroadcastReceipt(existing, record(userSnap.data()))
        : { ok: true, broadcastId, rewardType: 'none', alreadyClaimed: true, legacyClaim: true };
    }
    if (!broadcastSnap.exists || !userSnap.exists) throw new HttpsError('not-found', 'broadcast_or_user_missing');
    const broadcast = record(broadcastSnap.data());
    if (broadcast.active !== true) throw new HttpsError('failed-precondition', 'broadcast_inactive');
    const expiresAt = int(broadcast.expiresAtMs ?? broadcast.expiresAt);
    if (expiresAt > 0 && expiresAt <= now) throw new HttpsError('failed-precondition', 'broadcast_expired');
    const user = record(userSnap.data());
    const isPremium = isPremiumAccessActive(record(user.progress), now);
    const audience = String(broadcast.premiumAudience ?? 'all');
    if ((audience === 'premium' && !isPremium) || (audience === 'free' && isPremium)) {
      throw new HttpsError('permission-denied', 'broadcast_audience_mismatch');
    }

    const mutation = buildGlobalBroadcastRewardMutation(broadcast, user, now);
    const response: Row = { ...mutation.response, broadcastId };
    if (String(mutation.response.rewardType) === 'pack_trial_48h') {
      const voucherId = `global_broadcast_${broadcastId}_${stableUid}`;
      const voucherRef = db.collection('flashcard_pack_gift_grants').doc(voucherId);
      const voucherSnap = await tx.get(voucherRef);
      const voucher = record(voucherSnap.data());
      const voucherExpiresAt = voucherSnap.exists ? int(voucher.expiresAt) : now + PACK_TRIAL_MS;
      if (!voucherSnap.exists) {
        tx.set(voucherRef, { ownerStableUid: stableUid, source: 'global_broadcast', sourceId: broadcastId, occurrenceId: voucherId, expiresAt: voucherExpiresAt, createdAt: now });
      }
      response.voucherId = voucherId;
      response.expiresAt = voucherExpiresAt;
    }
    if (Object.keys(mutation.userPatch).length) tx.set(userRef, mutation.userPatch, { merge: true });
    if (String(mutation.response.rewardType) === 'shards') {
      tx.set(userRef.collection('shard_log').doc(), {
        ts: new Date(now).toISOString(), type: 'earn', amount: mutation.response.rewardAmount,
        reason: 'global_broadcast_modal', balanceAfter: mutation.response.senderBalanceAfter, broadcastId,
      });
    }
    tx.set(claimRef, { source: 'global_broadcast_modal', broadcastId, createdAt: now, response });
    return response;
  });
});
