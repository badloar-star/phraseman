"use strict";
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
exports.dailyTasksAllShardsClaim = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_TASKS_SHARD_AMOUNT = 1;
const REWARD_CLAIMS_COLLECTION = 'reward_claims';
function readShardBalance(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : 0;
}
/**
 * Callable: выдать +1 осколок за выполнение всех дневных заданий.
 *
 * Вход:  { dayKey: "2026-06-15" }
 * Ответ: { alreadyClaimed: boolean; newBalance: number }
 */
exports.dailyTasksAllShardsClaim = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const db = admin.firestore();
    const uid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid);
    const dayKey = request.data?.dayKey;
    if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey)) {
        throw new https_1.HttpsError('invalid-argument', 'dayKey must be YYYY-MM-DD');
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
//# sourceMappingURL=daily_tasks_shards.js.map