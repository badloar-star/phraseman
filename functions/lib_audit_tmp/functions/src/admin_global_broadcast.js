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
exports.adminDeactivateGlobalBroadcasts = exports.adminPublishGlobalBroadcast = exports.adminListGlobalBroadcasts = void 0;
exports.normalizeGlobalBroadcastPublishInput = normalizeGlobalBroadcastPublishInput;
exports.normalizeGlobalBroadcastDeactivateInput = normalizeGlobalBroadcastDeactivateInput;
exports.normalizeGlobalBroadcastListInput = normalizeGlobalBroadcastListInput;
exports.globalBroadcastFingerprint = globalBroadcastFingerprint;
exports.projectGlobalBroadcastRow = projectGlobalBroadcastRow;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const MAX_ACTIVE_BROADCASTS = 100;
const MAX_SHARD_REWARD = 1000;
const LANGUAGE_KEYS = ['ru', 'uk', 'es', 'ptBr', 'vi', 'id', 'tr', 'pl'];
const LANGUAGE_SUFFIXES = {
    ru: 'Ru',
    uk: 'Uk',
    es: 'Es',
    ptBr: 'PtBr',
    vi: 'Vi',
    id: 'Id',
    tr: 'Tr',
    pl: 'Pl',
};
const REWARD_TYPES = [
    'none',
    'shards',
    'xp_boost_2x_24h',
    'xp_boost_2x_48h',
    'chain_shield_1',
    'chain_shield_3',
    'club_boost_free',
    'wager_discount_25',
    'pack_trial_48h',
];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function requiredCommandFields(data) {
    const reason = text(data.reason, 500);
    const idempotencyKey = text(data.idempotencyKey, 160);
    const requestId = text(data.requestId, 160);
    if (!reason || !TOKEN_RE.test(idempotencyKey) || !TOKEN_RE.test(requestId)) {
        throw new https_1.HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
    }
    return Object.freeze({ reason, idempotencyKey, requestId });
}
function localizedText(value, max, field) {
    const source = isRecord(value) ? value : {};
    const ru = text(source.ru, max);
    if (!ru)
        throw new https_1.HttpsError('invalid-argument', `RU ${field} is required`);
    return Object.freeze(Object.fromEntries(LANGUAGE_KEYS.map((language) => [language, text(source[language], max) || ru])));
}
function rewardType(value) {
    const candidate = text(value, 40);
    if (!REWARD_TYPES.includes(candidate)) {
        throw new https_1.HttpsError('invalid-argument', 'unsupported broadcast reward');
    }
    return candidate;
}
function normalizeGlobalBroadcastPublishInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'publish request required');
    const command = requiredCommandFields(data);
    const normalizedRewardType = rewardType(data.rewardType);
    const rawRewardAmount = Number(data.rewardAmount ?? 0);
    if (!Number.isFinite(rawRewardAmount))
        throw new https_1.HttpsError('invalid-argument', 'rewardAmount is invalid');
    const integerRewardAmount = Math.floor(rawRewardAmount);
    if (normalizedRewardType === 'shards' && (integerRewardAmount < 1 || integerRewardAmount > MAX_SHARD_REWARD)) {
        throw new https_1.HttpsError('invalid-argument', `shard reward must be between 1 and ${MAX_SHARD_REWARD}`);
    }
    const rewardAmount = normalizedRewardType === 'shards' ? integerRewardAmount : 0;
    return Object.freeze({
        rewardType: normalizedRewardType,
        rewardAmount,
        titles: localizedText(data.titles, 160, 'title'),
        messages: localizedText(data.messages, 2000, 'message'),
        ...command,
    });
}
function normalizeGlobalBroadcastDeactivateInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'deactivation request required');
    return requiredCommandFields(data);
}
function normalizeGlobalBroadcastListInput(data) {
    const input = isRecord(data) ? data : {};
    const requested = Number(input.limit ?? 20);
    const finite = Number.isFinite(requested) ? Math.floor(requested) : 20;
    return Object.freeze({ limit: Math.max(1, Math.min(50, finite)) });
}
function globalBroadcastFingerprint(action, input) {
    if (action === 'publish') {
        const publish = input;
        return JSON.stringify({
            action,
            rewardType: publish.rewardType,
            rewardAmount: publish.rewardAmount,
            titles: publish.titles,
            messages: publish.messages,
            reason: publish.reason,
        });
    }
    return JSON.stringify({ action, reason: input.reason });
}
function millis(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    const parsed = Date.parse(text(value, 80));
    return Number.isFinite(parsed) ? parsed : 0;
}
function projectGlobalBroadcastRow(id, row) {
    const legacyAmount = Math.max(0, Math.floor(Number(row.rewardAmount ?? row.shards ?? 0) || 0));
    const rawRewardType = text(row.rewardType, 40);
    const normalizedRewardType = REWARD_TYPES.includes(rawRewardType)
        ? rawRewardType
        : legacyAmount > 0 ? 'shards' : 'none';
    const projected = {
        id,
        active: row.active === true,
        rewardType: normalizedRewardType,
        rewardAmount: normalizedRewardType === 'shards' ? legacyAmount : 0,
        createdAt: text(row.createdAt, 80),
        createdAtMs: millis(row.createdAtMs ?? row.createdAt),
        createdByUid: text(row.createdByUid, 160) || null,
        createdBy: text(row.createdBy, 320) || null,
        deactivatedAt: text(row.deactivatedAt, 80) || null,
        replacedAt: text(row.replacedAt, 80) || null,
    };
    for (const language of LANGUAGE_KEYS) {
        const suffix = LANGUAGE_SUFFIXES[language];
        projected[`title${suffix}`] = text(row[`title${suffix}`], 160);
        projected[`message${suffix}`] = text(row[`message${suffix}`], 2000);
    }
    return Object.freeze(projected);
}
function roleFor(request, permission) {
    const actorUid = text(request.auth?.uid, 160);
    const token = request.auth?.token;
    if (!actorUid || token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'Admin role required');
    }
    // зачем: adminRole в проекте никем не выдаётся — флага admin достаточно, роль по умолчанию owner.
    const role = (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : 'owner';
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return { actorUid, actorEmail: text(token.email, 320) || actorUid, role };
}
function assertReplay(operation, fingerprint, actorUid, action) {
    if (operation.action !== action) {
        throw new https_1.HttpsError('already-exists', 'idempotencyKey belongs to another admin action');
    }
    if (operation.requestFingerprint !== fingerprint) {
        throw new https_1.HttpsError('already-exists', 'idempotencyKey reused for another broadcast command');
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
        broadcastId: text(result.broadcastId, 160) || null,
        deactivatedCount: Math.max(0, Math.floor(Number(result.deactivatedCount ?? 0) || 0)),
        auditId: text(operation.auditId, 160),
    };
}
function broadcastDocument(input, context) {
    const createdAt = new Date(context.nowMs).toISOString();
    const document = {
        kind: 'general',
        premiumAudience: 'all',
        active: true,
        rewardType: input.rewardType,
        rewardAmount: input.rewardAmount,
        shards: input.rewardType === 'shards' ? input.rewardAmount : 0,
        createdAt,
        createdAtMs: context.nowMs,
        createdBy: context.actorEmail,
        createdByUid: context.actorUid,
        createdByRole: context.role,
        adminOperationId: context.operationId,
    };
    for (const language of LANGUAGE_KEYS) {
        const suffix = LANGUAGE_SUFFIXES[language];
        document[`title${suffix}`] = input.titles[language];
        document[`message${suffix}`] = input.messages[language];
    }
    return document;
}
exports.adminListGlobalBroadcasts = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    roleFor(request, 'campaigns.read');
    const input = normalizeGlobalBroadcastListInput(request.data);
    const collection = admin.firestore().collection('global_broadcast_modals');
    const [activeSnapshot, historySnapshot] = await Promise.all([
        collection.where('active', '==', true).limit(MAX_ACTIVE_BROADCASTS + 1).get(),
        collection.orderBy('createdAt', 'desc').limit(input.limit).get(),
    ]);
    const merged = new Map();
    for (const doc of [...activeSnapshot.docs, ...historySnapshot.docs])
        merged.set(doc.id, doc);
    return {
        ok: true,
        items: [...merged.values()].map((doc) => projectGlobalBroadcastRow(doc.id, doc.data())),
        activeCount: activeSnapshot.size,
        activeTruncated: activeSnapshot.size > MAX_ACTIVE_BROADCASTS,
        fetchedAtMs: Date.now(),
    };
});
exports.adminPublishGlobalBroadcast = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const context = roleFor(request, 'campaigns.write');
    const input = normalizeGlobalBroadcastPublishInput(request.data);
    const db = admin.firestore();
    const broadcastRef = db.collection('global_broadcast_modals').doc();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = globalBroadcastFingerprint('publish', input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const activeQuery = db.collection('global_broadcast_modals').where('active', '==', true).limit(MAX_ACTIVE_BROADCASTS + 1);
    return db.runTransaction(async (tx) => {
        const operationSnapshot = await tx.get(operationRef);
        if (operationSnapshot.exists) {
            const operation = operationSnapshot.data() ?? {};
            assertReplay(operation, fingerprint, context.actorUid, 'global_broadcast_send');
            return replayResult(operation);
        }
        const activeSnapshot = await tx.get(activeQuery);
        if (activeSnapshot.size > MAX_ACTIVE_BROADCASTS) {
            throw new https_1.HttpsError('failed-precondition', 'too many active broadcasts to replace safely');
        }
        const activeIds = activeSnapshot.docs.map((doc) => doc.id).sort();
        const document = broadcastDocument(input, {
            ...context,
            operationId: input.idempotencyKey,
            nowMs,
        });
        for (const active of activeSnapshot.docs) {
            tx.update(active.ref, {
                active: false,
                replacedAt: nowIso,
                replacedAtMs: nowMs,
                replacedBy: context.actorEmail,
                replacedByUid: context.actorUid,
                replacedByRole: context.role,
                replacementOperationId: input.idempotencyKey,
            });
        }
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'global_broadcast_send',
            actorUid: context.actorUid,
            role: context.role,
            entity: { collection: 'global_broadcast_modals', id: broadcastRef.id },
            reason: input.reason,
            before: { activeIds },
            after: {
                broadcastId: broadcastRef.id,
                active: true,
                rewardType: input.rewardType,
                rewardAmount: input.rewardAmount,
                titleRu: input.titles.ru,
                messageRu: input.messages.ru,
            },
            rollbackReference: activeIds[0] ?? null,
            requestId: input.requestId,
            timestamp: nowIso,
        });
        const result = { broadcastId: broadcastRef.id, deactivatedCount: activeIds.length };
        tx.create(broadcastRef, document);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, {
            operationId: input.idempotencyKey,
            action: 'global_broadcast_send',
            requestFingerprint: fingerprint,
            actorUid: context.actorUid,
            auditId: auditRef.id,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
});
exports.adminDeactivateGlobalBroadcasts = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const context = roleFor(request, 'campaigns.write');
    const input = normalizeGlobalBroadcastDeactivateInput(request.data);
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = globalBroadcastFingerprint('deactivate', input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const activeQuery = db.collection('global_broadcast_modals').where('active', '==', true).limit(MAX_ACTIVE_BROADCASTS + 1);
    return db.runTransaction(async (tx) => {
        const operationSnapshot = await tx.get(operationRef);
        if (operationSnapshot.exists) {
            const operation = operationSnapshot.data() ?? {};
            assertReplay(operation, fingerprint, context.actorUid, 'global_broadcast_deactivate');
            return replayResult(operation);
        }
        const activeSnapshot = await tx.get(activeQuery);
        if (activeSnapshot.size > MAX_ACTIVE_BROADCASTS) {
            throw new https_1.HttpsError('failed-precondition', 'too many active broadcasts to deactivate safely');
        }
        const activeIds = activeSnapshot.docs.map((doc) => doc.id).sort();
        for (const active of activeSnapshot.docs) {
            tx.update(active.ref, {
                active: false,
                deactivatedAt: nowIso,
                deactivatedAtMs: nowMs,
                deactivatedBy: context.actorEmail,
                deactivatedByUid: context.actorUid,
                deactivatedByRole: context.role,
                deactivationOperationId: input.idempotencyKey,
            });
        }
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'global_broadcast_deactivate',
            actorUid: context.actorUid,
            role: context.role,
            entity: { collection: 'global_broadcast_modals', id: 'active' },
            reason: input.reason,
            before: { activeIds },
            after: { activeIds: [], deactivatedCount: activeIds.length },
            rollbackReference: activeIds[0] ?? null,
            requestId: input.requestId,
            timestamp: nowIso,
        });
        const result = { broadcastId: null, deactivatedCount: activeIds.length };
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, {
            operationId: input.idempotencyKey,
            action: 'global_broadcast_deactivate',
            requestFingerprint: fingerprint,
            actorUid: context.actorUid,
            auditId: auditRef.id,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
});
//# sourceMappingURL=admin_global_broadcast.js.map