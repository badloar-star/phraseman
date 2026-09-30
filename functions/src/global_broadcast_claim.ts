import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { isPremiumAccessActive } from './premium_status';
import * as crypto from 'node:crypto';
import { requireGlobalBroadcastPublicAuthority } from './global_broadcast_public_schema';
import { getWeekKey, isoDateUtc } from './progress_events';
import {
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  prepareStarOperations,
  STAR_OP_MAX_ABS_DELTA,
  type StarLedgerPrepared,
} from './stars_ledger';

const REGION = 'us-central1';
const PACK_TRIAL_MS = 48 * 60 * 60 * 1000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,180}$/;
const RETIRED_REWARD_TYPES = new Set([
  'xp_boost_2x_24h', 'xp_boost_2x_48h',
  'energy_full', 'energy_plus1', 'energy_plus2', 'energy_plus3',
  'chain_shield_1', 'chain_shield_3',
  'club_boost_free', 'wager_discount_25',
  // зачем: D70/D104 — жемчуг в рассылках снят; вместо него тип 'coins'.
  // Старые рассылки/квитанции с 'shards' ничего не начисляют.
  'shards',
]);

/** Детерминированный opId журнала монет: один клейм рассылки = одна операция. */
export function globalBroadcastCoinOpId(broadcastId: string): string {
  return `global_broadcast:${crypto.createHash('sha256').update(broadcastId).digest('hex').slice(0, 64)}`;
}

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function int(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function canonicalizeExistingGlobalBroadcastReceipt(existing: Row, _user: Row): Row {
  const rewardType = String(existing.rewardType ?? 'none');
  if (RETIRED_REWARD_TYPES.has(rewardType)) return { ok: true, rewardType: 'none', alreadyClaimed: true };
  return existing;
}

export function resolveGlobalBroadcastClaimDecision(input: {
  claimExists: boolean;
  claimResponse: unknown;
  broadcast: Row;
  user: Row;
  broadcastId?: string;
}): Readonly<{ kind: 'replay'; response: Row } | { kind: 'first_grant'; broadcast: Row }> {
  if (input.claimExists) {
    const existing = record(input.claimResponse);
    return Object.freeze({
      kind: 'replay',
      response: Object.keys(existing).length
        ? canonicalizeExistingGlobalBroadcastReceipt(existing, input.user)
        : { ok: true, broadcastId: input.broadcastId ?? '', rewardType: 'none', alreadyClaimed: true, legacyClaim: true },
    });
  }
  requireGlobalBroadcastPublicAuthority(input.broadcast);
  return Object.freeze({ kind: 'first_grant', broadcast: input.broadcast });
}

export function buildGlobalBroadcastRewardMutation(
  broadcast: Row,
  _user: Row,
  _now: number,
): { userPatch: Row; response: Row } {
  // зачем: D70 — старое поле broadcast.shards (жемчуг) больше ничего не выдаёт.
  const requestedType = String(broadcast.rewardType ?? 'none');
  if (RETIRED_REWARD_TYPES.has(requestedType)) return { userPatch: {}, response: { ok: true, rewardType: 'none' } };
  if (requestedType === 'none') return { userPatch: {}, response: { ok: true, rewardType: 'none' } };

  // зачем: D104 — награда рассылки монетами (рунный кошелёк, stars_ledger).
  if (requestedType === 'coins') {
    const amount = int(broadcast.rewardAmount);
    if (amount < 1 || amount > STAR_OP_MAX_ABS_DELTA) throw new HttpsError('failed-precondition', 'broadcast_coin_amount_invalid');
    return {
      userPatch: {},
      response: {
        ok: true,
        rewardType: 'coins',
        rewardAmount: amount,
      },
    };
  }

  if (requestedType === 'pack_trial_48h') {
    return { userPatch: {}, response: { ok: true, rewardType: requestedType } };
  }
  throw new HttpsError('failed-precondition', 'broadcast_reward_unsupported');
}

export const globalBroadcastClaim = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Auth required');
  const authUid = request.auth.uid;
  const requestedStableId = String(request.data?.stableId ?? '').trim();
  const broadcastId = String(request.data?.broadcastId ?? '').trim();
  if (!requestedStableId || !SAFE_ID.test(broadcastId)) {
    throw new HttpsError('invalid-argument', 'stableId and broadcastId required');
  }
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, requestedStableId, { requireKnownIdentity: true });
  const userRef = db.collection('users').doc(stableUid);
  const broadcastRef = db.collection('global_broadcast_modals').doc(broadcastId);
  const claimRef = userRef.collection('reward_claims').doc(`global_broadcast_${broadcastId}`);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    beginStarLedgerTransactionAttempt(tx);
    const [broadcastSnap, userSnap, claimSnap] = await Promise.all([
      tx.get(broadcastRef), tx.get(userRef), tx.get(claimRef),
    ]);
    const user = record(userSnap.data());
    const broadcast = record(broadcastSnap.data());
    if (claimSnap.exists) {
      const replay = resolveGlobalBroadcastClaimDecision({
        claimExists: true,
        claimResponse: claimSnap.data()?.response,
        broadcast,
        user,
        broadcastId,
      });
      if (replay.kind !== 'replay') throw new HttpsError('internal', 'claim_replay_resolution_failed');
      return replay.response;
    }
    if (!broadcastSnap.exists || !userSnap.exists) throw new HttpsError('not-found', 'broadcast_or_user_missing');
    resolveGlobalBroadcastClaimDecision({ claimExists: false, claimResponse: null, broadcast, user, broadcastId });
    if (broadcast.active !== true) throw new HttpsError('failed-precondition', 'broadcast_inactive');
    const expiresAt = int(broadcast.expiresAtMs ?? broadcast.expiresAt);
    if (expiresAt > 0 && expiresAt <= now) throw new HttpsError('failed-precondition', 'broadcast_expired');
    const isPremium = isPremiumAccessActive(record(user.progress), now);
    const audience = String(broadcast.premiumAudience ?? 'all');
    if ((audience === 'premium' && !isPremium) || (audience === 'free' && isPremium)) {
      throw new HttpsError('permission-denied', 'broadcast_audience_mismatch');
    }

    const mutation = buildGlobalBroadcastRewardMutation(broadcast, user, now);
    const response: Row = { ...mutation.response, broadcastId };
    // зачем: D104 — журнал монет читает расписку в этой же транзакции, поэтому
    // подготовка идёт ДО первой записи (Firestore: все чтения раньше записей).
    let coinsPrepared: StarLedgerPrepared | null = null;
    if (String(mutation.response.rewardType) === 'coins') {
      coinsPrepared = await prepareStarOperations(tx, db, stableUid, userSnap, [{
        opId: globalBroadcastCoinOpId(broadcastId),
        delta: int(mutation.response.rewardAmount),
        reason: 'global_broadcast',
        sourceKind: 'global_broadcast',
        sourceId: broadcastId.slice(0, 96),
        ruleVersion: 1,
        earnedAtMs: now,
      }], {
        nowMs: now,
        activeSeasonId: '',
        weekKeyNow: getWeekKey(isoDateUtc(new Date(now))),
        authUid,
      });
      const outcome = coinsPrepared.outcomes[0];
      console.log(JSON.stringify({
        event: 'global_broadcast_coins_prepared',
        stableUid,
        broadcastId,
        amount: mutation.response.rewardAmount,
        status: outcome?.status ?? null,
        errorCode: outcome?.errorCode ?? null,
      }));
      if (!outcome || outcome.status === 'rejected') {
        throw new HttpsError('failed-precondition', `broadcast_coins_rejected:${outcome?.errorCode ?? 'unknown'}`);
      }
    }
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
    if (coinsPrepared) {
      // Единственный писатель кошелька монет; снапшот уходит телефону
      // (mergeLevelSpinServerStars применяет только более новый starsSeq).
      const committed = commitStarOperations(tx, coinsPrepared);
      response.stars = committed.balance;
      response.starsEarnedTotal = committed.earnedTotal;
      response.starsSeq = committed.seq;
    }
    tx.set(claimRef, { source: 'global_broadcast_modal', broadcastId, createdAt: now, response });
    return response;
  });
});
