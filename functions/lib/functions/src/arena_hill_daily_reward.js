"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.arenaHillDailyRewardCron = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const REGION = 'us-central1';
const THRONES = 'arena_hill_thrones';
const THRONE_REWARDS = 'arena_hill_throne_rewards';
const THRONE_REWARD_SHARDS = 10;
function pad2(n) {
    return String(n).padStart(2, '0');
}
function dayKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function yesterdayKey() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return dayKey(d);
}
async function resolveStableUid(db, authUid) {
    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty)
        return byAuth.docs[0].id;
    return authUid;
}
// Запускается в 00:01 UTC каждый день — начисляет осколки чемпиону вчерашнего трона
exports.arenaHillDailyRewardCron = (0, scheduler_1.onSchedule)({ schedule: '1 0 * * *', timeZone: 'UTC', region: REGION }, async () => {
    const db = admin.firestore();
    const yesterday = yesterdayKey();
    const throneSnap = await db.collection(THRONES).doc(yesterday).get();
    if (!throneSnap.exists) {
        console.log(`[arenaHillDailyReward] No throne for ${yesterday}, skipping`);
        return;
    }
    const throne = throneSnap.data();
    const championAuthUid = throne.championAuthUid ?? throne.championUid;
    const championName = throne.championName ?? 'Unknown';
    const wins = throne.score ?? 0;
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
});
//# sourceMappingURL=arena_hill_daily_reward.js.map