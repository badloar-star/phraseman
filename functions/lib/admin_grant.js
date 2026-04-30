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
exports.adminGrantReward = void 0;
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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const ALLOWED_TYPES = new Set([
    'shards',
    'xp_boost_2x_24h',
    'xp_boost_2x_48h',
    'chain_shield_1',
    'chain_shield_3',
    'arena_extra_5',
]);
const SHARDS_MIN = 1;
const SHARDS_MAX = 10000;
function todayStrUtc() {
    return new Date().toISOString().split('T')[0];
}
exports.adminGrantReward = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const uid = String(request.data?.uid ?? '').trim();
    const type = String(request.data?.type ?? '').trim();
    const amountRaw = request.data?.amount;
    const amount = Number.isFinite(Number(amountRaw)) ? Math.floor(Number(amountRaw)) : 0;
    const comment = String(request.data?.comment ?? '').trim().slice(0, 200);
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'uid required');
    }
    if (!ALLOWED_TYPES.has(type)) {
        throw new https_1.HttpsError('invalid-argument', `type must be one of: ${Array.from(ALLOWED_TYPES).join(', ')}`);
    }
    if (type === 'shards') {
        if (amount < SHARDS_MIN || amount > SHARDS_MAX) {
            throw new https_1.HttpsError('invalid-argument', `shards amount must be ${SHARDS_MIN}..${SHARDS_MAX}`);
        }
    }
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const adminEmail = String(request.auth?.token?.email ?? '');
    const grantedAtIso = new Date().toISOString();
    return db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new https_1.HttpsError('not-found', `User ${uid} not found`);
        }
        const u = userSnap.data() ?? {};
        let shardsAmount = 0;
        let humanLabel = '';
        const updates = { updatedAt: Date.now() };
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
            const expiresAt = Date.now() + hours * 3600000;
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
                    const parsed = JSON.parse(raw);
                    existingDays = typeof parsed?.daysLeft === 'number' ? parsed.daysLeft : 0;
                }
            }
            catch {
                existingDays = 0;
            }
            updates['chain_shield'] = JSON.stringify({ daysLeft: existingDays + days, grantedAt: today });
            humanLabel = `🛡️ Щит стрика / ${days}д`;
        }
        if (type === 'arena_extra_5') {
            const today = todayStrUtc();
            const cur = u['arena_extra_plays_today'] ?? {};
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
//# sourceMappingURL=admin_grant.js.map