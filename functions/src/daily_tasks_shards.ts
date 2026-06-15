// ═══════════════════════════════════════════════════════════════════════════
// daily_tasks_shards.ts — серверная выдача осколка за выполнение всех
// 3 ежедневных заданий.
//
// Проблема: клиентский путь в shards_system.ts:claimDailyTasksAllShardsReward
// пишет поле `shards` напрямую в users/{uid} → заблокировано Firestore-правилом
// hasNoShardWrites(). Admin SDK обходит rules, поэтому выдача переведена сюда.
//
// Идемпотентность: users/{uid}/reward_claims/daily_tasks_all_{dayKey}.
// Повторный вызов с тем же dayKey возвращает уже записанный баланс.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_TASKS_SHARD_AMOUNT = 1;
const REWARD_CLAIMS_COLLECTION = 'reward_claims';

function readShardBalance(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Callable: выдать +1 осколок за выполнение всех дневных заданий.
 *
 * Вход:  { dayKey: "2026-06-15" }
 * Ответ: { alreadyClaimed: boolean; newBalance: number }
 */
export const dailyTasksAllShardsClaim = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid);

  const dayKey = request.data?.dayKey;
  if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey)) {
    throw new HttpsError('invalid-argument', 'dayKey must be YYYY-MM-DD');
  }
  const userRef = db.collection('users').doc(uid);
  const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`daily_tasks_all_${dayKey}`);

  const result = await db.runTransaction(async (tx) => {
    const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);

    if (claimSnap.exists) {
      const existingBalance = readShardBalance(userSnap.data()?.shards);
      return { alreadyClaimed: true, newBalance: existingBalance };
    }

    const currentBalance = readShardBalance(userSnap.data()?.shards);
    const newBalance = currentBalance + DAILY_TASKS_SHARD_AMOUNT;
    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.set(claimRef, {
      source: 'daily_tasks_all',
      dayKey,
      amount: DAILY_TASKS_SHARD_AMOUNT,
      createdAt: now,
    });

    tx.set(userRef, {
      shards: newBalance,
      shards_updated_at_ms: Date.now(),
      shards_updated_op: 'earn',
      shards_updated_reason: 'daily_tasks_all',
    }, { merge: true });

    return { alreadyClaimed: false, newBalance };
  });

  return result;
});
