import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const REGION = 'us-central1';
const THRONES = 'arena_hill_thrones';
const THRONE_REWARDS = 'arena_hill_throne_rewards';
const THRONE_REWARD_SHARDS = 10;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return dayKey(d);
}

async function resolveStableUid(db: FirebaseFirestore.Firestore, authUid: string): Promise<string> {
  const direct = await db.collection('users').doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  return authUid;
}

// Запускается в 00:01 UTC каждый день — начисляет осколки чемпиону вчерашнего трона
export const arenaHillDailyRewardCron = onSchedule(
  { schedule: '1 0 * * *', timeZone: 'UTC', region: REGION },
  async () => {
    const db = admin.firestore();
    const yesterday = yesterdayKey();

    const throneSnap = await db.collection(THRONES).doc(yesterday).get();
    if (!throneSnap.exists) {
      console.log(`[arenaHillDailyReward] No throne for ${yesterday}, skipping`);
      return;
    }

    const throne = throneSnap.data()!;
    const championAuthUid: string | undefined = throne.championAuthUid ?? throne.championUid;
    const championName: string = throne.championName ?? 'Unknown';
    const wins: number = throne.score ?? 0;

    if (!championAuthUid) {
      console.log(`[arenaHillDailyReward] No champion uid for ${yesterday}, skipping`);
      return;
    }

    // Дедупликация — не начислять дважды
    const rewardRef = db.collection(THRONE_REWARDS).doc(yesterday);
    const rewardSnap = await rewardRef.get();
    if (rewardSnap.exists) {
      console.log(`[arenaHillDailyReward] Reward for ${yesterday} already granted, skipping`);
      return;
    }

    const stableUid = await resolveStableUid(db, championAuthUid);
    const userRef = db.collection('users').doc(stableUid);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        console.warn(`[arenaHillDailyReward] User ${stableUid} not found`);
        return;
      }

      const before = Number(userSnap.data()?.shards) || 0;
      const after = before + THRONE_REWARD_SHARDS;

      tx.set(userRef, {
        shards: after,
        shards_updated_at_ms: now,
        shards_updated_op: 'earn',
        shards_updated_reason: 'arena_throne_champion',
        updatedAt: now,
      }, { merge: true });

      tx.set(userRef.collection('shard_log').doc(), {
        ts: nowIso,
        type: 'earn',
        amount: THRONE_REWARD_SHARDS,
        reason: 'arena_throne_champion',
        balanceBefore: before,
        balanceAfter: after,
        dayKey: yesterday,
        wins,
      });

      // Уведомление в Firestore — клиент подпишется и покажет модалку
      tx.set(userRef.collection('inbox').doc(`throne_reward_${yesterday}`), {
        type: 'throne_reward',
        shards: THRONE_REWARD_SHARDS,
        wins,
        dayKey: yesterday,
        championName,
        createdAt: now,
        read: false,
      });

      tx.set(rewardRef, {
        dayKey: yesterday,
        championUid: stableUid,
        championAuthUid,
        championName,
        wins,
        shards: THRONE_REWARD_SHARDS,
        grantedAt: now,
      });
    });

    console.log(`[arenaHillDailyReward] Granted ${THRONE_REWARD_SHARDS} shards to ${championName} (${stableUid}) for ${yesterday} with ${wins} wins`);
  },
);
