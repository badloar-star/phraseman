/**
 * adminGrantReward — Cloud Function для типизированной выдачи наград из админки.
 *
 * Архитектура (см. app/cloud_sync.ts: SYNC_KEYS):
 *   - shards               → пишем в users/{uid}.shards (+ shard_log + shard_rewards)
 *   - xp_boost_2x_24h/48h  → пишем JSON в users/{uid}.gift_xp_multiplier (синкается в AsyncStorage 'gift_xp_multiplier')
 *   - chain_shield_1/3     → пишем JSON в users/{uid}.chain_shield (синкается в AsyncStorage 'chain_shield')
 *   - arena_extra_5        → инкрементим users/{uid}.arena_extra_plays_today (приложение читает из AsyncStorage)
 *
 * Доступ: request.auth.token.admin === true (custom claim, ставится скриптом scripts/set_admin_claim.js).
 *
 * Эффект: запись в users/{uid}/shard_rewards/{auto} + поля юзера. Приложение покажет ShardRewardModal
 * c reason='admin_grant' (см. app/_layout.tsx checkShardRewardsFn whitelist).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';

type RewardType =
  | 'shards'
  | 'xp_boost_2x_24h'
  | 'xp_boost_2x_48h'
  | 'chain_shield_1'
  | 'chain_shield_3'
  | 'arena_extra_5';

const ALLOWED_TYPES: ReadonlySet<RewardType> = new Set<RewardType>([
  'shards',
  'xp_boost_2x_24h',
  'xp_boost_2x_48h',
  'chain_shield_1',
  'chain_shield_3',
  'arena_extra_5',
]);

const SHARDS_MIN = 1;
const SHARDS_MAX = 10_000;

function todayStrUtc(): string {
  return new Date().toISOString().split('T')[0];
}

export const adminGrantReward = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const uid = String(request.data?.uid ?? '').trim();
  const type = String(request.data?.type ?? '').trim() as RewardType;
  const amountRaw = request.data?.amount;
  const amount = Number.isFinite(Number(amountRaw)) ? Math.floor(Number(amountRaw)) : 0;
  const comment = String(request.data?.comment ?? '').trim().slice(0, 200);

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid required');
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw new HttpsError(
      'invalid-argument',
      `type must be one of: ${Array.from(ALLOWED_TYPES).join(', ')}`,
    );
  }
  if (type === 'shards') {
    if (amount < SHARDS_MIN || amount > SHARDS_MAX) {
      throw new HttpsError('invalid-argument', `shards amount must be ${SHARDS_MIN}..${SHARDS_MAX}`);
    }
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const adminEmail = String(request.auth?.token?.email ?? '');
  const grantedAtIso = new Date().toISOString();

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError('not-found', `User ${uid} not found`);
    }
    const u = userSnap.data() ?? {};

    let shardsAmount = 0;
    let humanLabel = '';
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (type === 'shards') {
      const before = Number(u.shards) || 0;
      const after = before + amount;
      updates['shards'] = after;
      shardsAmount = amount;
      humanLabel = `+${amount} 💎`;

      const shardLogRef = userRef.collection('shard_log').doc();
      tx.set(shardLogRef, {
        ts: grantedAtIso,
        type: 'earn',
        amount,
        reason: 'admin_grant',
        balanceAfter: after,
        adminEmail,
        comment: comment || null,
      });
    }

    if (type === 'xp_boost_2x_24h' || type === 'xp_boost_2x_48h') {
      const hours = type === 'xp_boost_2x_24h' ? 24 : 48;
      const expiresAt = Date.now() + hours * 3600_000;
      updates['gift_xp_multiplier'] = JSON.stringify({ multiplier: 2, expiresAt });
      humanLabel = `🔥 x2 XP / ${hours}h`;
    }

    if (type === 'chain_shield_1' || type === 'chain_shield_3') {
      const days = type === 'chain_shield_1' ? 1 : 3;
      const today = todayStrUtc();
      let raw = u['chain_shield'];
      let existingDays = 0;
      try {
        if (typeof raw === 'string' && raw) {
          const parsed = JSON.parse(raw) as { daysLeft?: number };
          existingDays = typeof parsed?.daysLeft === 'number' ? parsed.daysLeft : 0;
        }
      } catch {
        existingDays = 0;
      }
      updates['chain_shield'] = JSON.stringify({ daysLeft: existingDays + days, grantedAt: today });
      humanLabel = `🛡️ Щит стрика / ${days}д`;
    }

    if (type === 'arena_extra_5') {
      const today = todayStrUtc();
      const cur = (u['arena_extra_plays_today'] as { date?: string; n?: number } | undefined) ?? {};
      const sameDay = cur?.date === today;
      const next = (sameDay ? Number(cur.n) || 0 : 0) + 5;
      updates['arena_extra_plays_today'] = { date: today, n: next };
      humanLabel = `🎟️ +5 рейтинг-игр сегодня`;
    }

    tx.update(userRef, updates);

    const rewardRef = userRef.collection('shard_rewards').doc();
    tx.set(rewardRef, {
      ts: grantedAtIso,
      reason: 'admin_grant',
      amount: shardsAmount,
      rewardType: type,
      adminEmail,
      comment: comment || null,
      label: humanLabel,
      seen: false,
    });

    const auditRef = db.collection('admin_log').doc();
    tx.set(auditRef, {
      ts: grantedAtIso,
      adminEmail,
      action: 'grant_reward',
      uid,
      details: {
        type,
        amount: shardsAmount,
        comment: comment || null,
        label: humanLabel,
      },
    });

    return { ok: true, type, amount: shardsAmount, label: humanLabel };
  });
});
