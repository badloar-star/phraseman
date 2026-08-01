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
exports.adminGrantReward = exports.ADMIN_GRANT_REWARD_TYPES = void 0;
exports.normalizeAdminGrantRewardInput = normalizeAdminGrantRewardInput;
exports.adminGrantRewardFingerprint = adminGrantRewardFingerprint;
exports.buildAdminRewardMutation = buildAdminRewardMutation;
exports.assertAdminRewardReplay = assertAdminRewardReplay;
/**
 * Guarded individual reward grants for Admin v2 and the legacy admin fallback.
 *
 * The callable owns validation, role enforcement, idempotency, the user mutation,
 * the inbox reward row and the audit record. The browser never writes these
 * collections directly.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const SHARDS_MIN = 1;
const SHARDS_MAX = 10000;
// зачем: Арена/квизы сняты (контракт tests/quiz_arena_decommission_contract.test.ts).
// Клиент вычищен, а серверная награда 'arena_extra_5' осталась хвостом: админка
// могла выдать «+5 рейтинговых игр» в режим, которого больше нет. Убираем тип —
// попытка выдать его теперь отвергается валидацией (см. тест «rejects the retired
// Arena reward type»).
exports.ADMIN_GRANT_REWARD_TYPES = [
    'shards',
    'xp_boost_2x_24h',
    'xp_boost_2x_48h',
    'chain_shield_1',
    'chain_shield_3',
];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function finiteNumber(value, fallback = 0) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function rewardType(value) {
    const candidate = text(value, 40);
    if (!exports.ADMIN_GRANT_REWARD_TYPES.includes(candidate)) {
        throw new https_1.HttpsError('invalid-argument', 'unsupported reward type');
    }
    return candidate;
}
function normalizeAdminGrantRewardInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'reward command required');
    const uid = text(data.uid, 161);
    const type = rewardType(data.type);
    const rawAmount = finiteNumber(data.amount, 0);
    const amount = type === 'shards' ? Math.floor(rawAmount) : 0;
    const reason = text(data.reason, 500);
    const comment = text(data.comment, 200);
    const idempotencyKey = text(data.idempotencyKey, 161);
    const requestId = text(data.requestId, 161);
    if (!UID_RE.test(uid))
        throw new https_1.HttpsError('invalid-argument', 'uid is invalid');
    if (type === 'shards' && (amount < SHARDS_MIN || amount > SHARDS_MAX)) {
        throw new https_1.HttpsError('invalid-argument', `shards amount must be ${SHARDS_MIN}..${SHARDS_MAX}`);
    }
    if (!reason)
        throw new https_1.HttpsError('invalid-argument', 'reason is required');
    if (!TOKEN_RE.test(idempotencyKey) || !TOKEN_RE.test(requestId)) {
        throw new https_1.HttpsError('invalid-argument', 'idempotencyKey and requestId are required');
    }
    return Object.freeze({ uid, type, amount, reason, comment, idempotencyKey, requestId });
}
function adminGrantRewardFingerprint(input) {
    return JSON.stringify({
        action: 'grant_reward',
        uid: input.uid,
        type: input.type,
        amount: input.amount,
        reason: input.reason,
        comment: input.comment,
    });
}
function utcDate(nowMs) {
    return new Date(nowMs).toISOString().slice(0, 10);
}
function buildAdminRewardMutation(user, type, amount, nowMs) {
    const updates = { updatedAt: nowMs };
    let shardLog = null;
    let label = '';
    let shardsAmount = 0;
    let before = {};
    let after = {};
    if (type === 'shards') {
        const previous = finiteNumber(user.shards, 0);
        const next = previous + amount;
        updates.shards = next;
        updates.shards_updated_at_ms = nowMs;
        updates.shards_updated_op = 'earn';
        updates.shards_updated_reason = 'admin_grant';
        shardLog = {
            ts: new Date(nowMs).toISOString(),
            type: 'earn',
            amount,
            reason: 'admin_grant',
            balanceBefore: previous,
            balanceAfter: next,
        };
        label = `+${amount} осколков знаний`;
        shardsAmount = amount;
        before = { shards: previous };
        after = { shards: next };
    }
    if (type === 'xp_boost_2x_24h' || type === 'xp_boost_2x_48h') {
        const hours = type === 'xp_boost_2x_24h' ? 24 : 48;
        const previous = text(user.gift_xp_multiplier, 2000) || null;
        const next = JSON.stringify({ multiplier: 2, expiresAt: nowMs + hours * 3600000 });
        updates.gift_xp_multiplier = next;
        label = `x2 XP на ${hours} часов`;
        before = { gift_xp_multiplier: previous };
        after = { gift_xp_multiplier: next };
    }
    if (type === 'chain_shield_1' || type === 'chain_shield_3') {
        const days = type === 'chain_shield_1' ? 1 : 3;
        let existingDays = 0;
        try {
            const parsed = JSON.parse(text(user.chain_shield, 2000));
            existingDays = Math.max(0, Math.floor(finiteNumber(parsed?.daysLeft, 0)));
        }
        catch {
            existingDays = 0;
        }
        const previous = text(user.chain_shield, 2000) || null;
        const next = JSON.stringify({ daysLeft: existingDays + days, grantedAt: utcDate(nowMs) });
        updates.chain_shield = next;
        label = `Щит серии на ${days} ${days === 1 ? 'день' : 'дня'}`;
        before = { chain_shield: previous };
        after = { chain_shield: next };
    }
    return Object.freeze({
        updates: Object.freeze(updates),
        shardLog: shardLog ? Object.freeze(shardLog) : null,
        label,
        shardsAmount,
        before: Object.freeze(before),
        after: Object.freeze(after),
    });
}
function requireRewardWriter(request) {
    const actorUid = text(request.auth?.uid, 160);
    const token = request.auth?.token;
    if (!actorUid || token?.admin !== true || !(0, roles_1.hasAdminRole)(token.adminRole)) {
        throw new https_1.HttpsError('permission-denied', 'Admin role required');
    }
    const role = token.adminRole;
    if (!(0, permissions_1.hasPermission)(role, 'users.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot use users.write');
    return { actorUid, actorEmail: text(token.email, 320) || actorUid, role };
}
function assertAdminRewardReplay(operation, fingerprint, actorUid) {
    if (operation.action !== 'grant_reward') {
        throw new https_1.HttpsError('already-exists', 'idempotencyKey belongs to another admin action');
    }
    if (operation.requestFingerprint !== fingerprint) {
        throw new https_1.HttpsError('already-exists', 'idempotencyKey reused for another reward command');
    }
    if (operation.actorUid && operation.actorUid !== actorUid) {
        throw new https_1.HttpsError('permission-denied', 'admin operation belongs to another actor');
    }
}
function replayResult(operation) {
    const result = isRecord(operation.result) ? operation.result : {};
    return {
        ok: true,
        replayed: true,
        type: text(result.type, 40),
        amount: Math.max(0, Math.floor(finiteNumber(result.amount, 0))),
        label: text(result.label, 200),
        rewardId: text(result.rewardId, 200),
        auditId: text(operation.auditId, 200),
    };
}
exports.adminGrantReward = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const actor = requireRewardWriter(request);
    const input = normalizeAdminGrantRewardInput(request.data);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const rewardRef = userRef.collection('shard_rewards').doc(`admin_${input.idempotencyKey}`);
    const shardLogRef = userRef.collection('shard_log').doc(`admin_${input.idempotencyKey}`);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = adminGrantRewardFingerprint(input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    return db.runTransaction(async (tx) => {
        const operationSnapshot = await tx.get(operationRef);
        if (operationSnapshot.exists) {
            const operation = operationSnapshot.data() ?? {};
            assertAdminRewardReplay(operation, fingerprint, actor.actorUid);
            return replayResult(operation);
        }
        const userSnapshot = await tx.get(userRef);
        if (!userSnapshot.exists)
            throw new https_1.HttpsError('not-found', `User ${input.uid} not found`);
        const mutation = buildAdminRewardMutation(userSnapshot.data() ?? {}, input.type, input.amount, nowMs);
        const result = {
            type: input.type,
            amount: mutation.shardsAmount,
            label: mutation.label,
            rewardId: rewardRef.id,
        };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'grant_reward',
            actorUid: actor.actorUid,
            role: actor.role,
            entity: { collection: 'users', id: input.uid },
            reason: input.reason,
            before: mutation.before,
            after: { ...mutation.after, rewardType: input.type, rewardId: rewardRef.id },
            rollbackReference: null,
            requestId: input.requestId,
            timestamp: nowIso,
        });
        tx.update(userRef, mutation.updates);
        if (mutation.shardLog) {
            tx.create(shardLogRef, {
                ...mutation.shardLog,
                targetUid: input.uid,
                adminEmail: actor.actorEmail,
                adminUid: actor.actorUid,
                comment: input.comment || null,
                operationId: input.idempotencyKey,
            });
        }
        tx.create(rewardRef, {
            ts: nowIso,
            reason: 'admin_grant',
            amount: mutation.shardsAmount,
            rewardType: input.type,
            adminEmail: actor.actorEmail,
            adminUid: actor.actorUid,
            comment: input.comment || null,
            label: mutation.label,
            operationId: input.idempotencyKey,
            seen: false,
        });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, {
            operationId: input.idempotencyKey,
            action: 'grant_reward',
            requestFingerprint: fingerprint,
            actorUid: actor.actorUid,
            auditId: auditRef.id,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
});
//# sourceMappingURL=admin_grant.js.map