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
exports.adminGetRemoteConfigWorkspace = exports.adminPublishRemoteConfig = void 0;
exports.parseRemoteConfigRequest = parseRemoteConfigRequest;
exports.mergeRemoteConfigBranches = mergeRemoteConfigBranches;
exports.buildRemoteConfigRequestFingerprint = buildRemoteConfigRequestFingerprint;
exports.assertRemoteConfigReplay = assertRemoteConfigReplay;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const REGION = 'us-central1';
const REMOTE_CONFIG_ID = 'app';
const ALLOWED_KEYS = new Set(['bools', 'numbers', 'texts', 'version']);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validateConfigPatch(config) {
    for (const branch of ['bools', 'numbers', 'texts']) {
        if (!(branch in config))
            continue;
        const value = config[branch];
        if (!isRecord(value))
            throw new https_1.HttpsError('invalid-argument', `${branch} must be an object`);
        for (const [key, item] of Object.entries(value)) {
            if (!key.trim() || (branch === 'bools' && typeof item !== 'boolean') || (branch === 'numbers' && (typeof item !== 'number' || !Number.isFinite(item))) || (branch === 'texts' && typeof item !== 'string')) {
                throw new https_1.HttpsError('invalid-argument', `invalid ${branch}.${key}`);
            }
        }
    }
    if ('version' in config && (typeof config.version !== 'number' || !Number.isInteger(config.version) || config.version < 1)) {
        throw new https_1.HttpsError('invalid-argument', 'version must be a positive integer');
    }
}
function parseRemoteConfigRequest(data) {
    if (!isRecord(data) || !isRecord(data.nextConfig)) {
        throw new https_1.HttpsError('invalid-argument', 'nextConfig object required');
    }
    const expectedRevision = Number(data.expectedRevision);
    const idempotencyKey = String(data.idempotencyKey ?? '').trim();
    const reason = String(data.reason ?? '').trim().slice(0, 500);
    const requestId = String(data.requestId ?? '').trim();
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw new https_1.HttpsError('invalid-argument', 'expectedRevision must be a non-negative integer');
    }
    if (!idempotencyKey || idempotencyKey.length > 120 || !reason || !requestId) {
        throw new https_1.HttpsError('invalid-argument', 'idempotencyKey, reason and requestId are required');
    }
    const nextConfig = data.nextConfig;
    const unknownKeys = Object.keys(nextConfig).filter((key) => !ALLOWED_KEYS.has(key));
    if (unknownKeys.length > 0 || Object.keys(nextConfig).length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'nextConfig contains unsupported or empty fields');
    }
    validateConfigPatch(nextConfig);
    return Object.freeze({ nextConfig: Object.freeze({ ...nextConfig }), expectedRevision, idempotencyKey, reason, requestId });
}
function mergeRemoteConfigBranches(before, patch) {
    const merged = { ...before };
    for (const branch of ['bools', 'numbers', 'texts']) {
        if (!(branch in patch))
            continue;
        const current = isRecord(before[branch]) ? before[branch] : {};
        const next = isRecord(patch[branch]) ? patch[branch] : {};
        merged[branch] = { ...current, ...next };
    }
    if ('version' in patch)
        merged.version = patch.version;
    return merged;
}
function stableFingerprintValue(value) {
    if (Array.isArray(value))
        return value.map(stableFingerprintValue);
    if (!isRecord(value))
        return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableFingerprintValue(value[key])]));
}
function buildRemoteConfigRequestFingerprint(input) {
    return JSON.stringify(stableFingerprintValue({
        action: 'remote_config.publish',
        entity: `remote_config/${REMOTE_CONFIG_ID}`,
        expectedRevision: input.expectedRevision,
        nextConfig: input.nextConfig,
        reason: input.reason,
        requestId: input.requestId,
    }));
}
function assertRemoteConfigReplay(operation, requestFingerprint, actorUid) {
    if (operation.requestFingerprint !== requestFingerprint || operation.actorUid !== actorUid) {
        throw new https_1.HttpsError('already-exists', 'idempotencyKey replay does not match the original actor and command');
    }
}
exports.adminPublishRemoteConfig = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const input = parseRemoteConfigRequest(request.data);
    const actorUid = request.auth.uid;
    const role = (0, permissions_1.roleFromAdminToken)(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'Role cannot publish remote config');
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc(REMOTE_CONFIG_ID);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('remote_config_history').doc();
    const now = new Date().toISOString();
    const requestFingerprint = buildRemoteConfigRequestFingerprint(input);
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            assertRemoteConfigReplay(previous, requestFingerprint, actorUid);
            return {
                ok: true,
                auditId: String(previous.auditId ?? ''),
                revision: Number(previous.revision ?? 0),
                replayed: true,
            };
        }
        const before = (configSnap.data() ?? {});
        const currentRevision = Number(before.revision ?? 0);
        if (!Number.isInteger(currentRevision) || currentRevision !== input.expectedRevision) {
            throw new https_1.HttpsError('failed-precondition', 'remote config changed; reload before publishing');
        }
        const after = { ...mergeRemoteConfigBranches(before, input.nextConfig), revision: currentRevision + 1, updatedBy: actorUid };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'remote_config.publish',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: REMOTE_CONFIG_ID },
            reason: input.reason,
            before,
            after,
            rollbackReference: historyRef.id,
            requestId: input.requestId,
            timestamp: now,
        });
        tx.set(configRef, { ...after, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.create(historyRef, { ...audit, operationId: input.idempotencyKey, revision: currentRevision + 1 });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, {
            operationId: input.idempotencyKey,
            requestFingerprint,
            actorUid,
            auditId: auditRef.id,
            revision: currentRevision + 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, auditId: auditRef.id, revision: currentRevision + 1, replayed: false };
    });
});
exports.adminGetRemoteConfigWorkspace = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = (0, permissions_1.roleFromAdminToken)(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot read remote config');
    const db = admin.firestore();
    const [configSnap, historySnap] = await Promise.all([
        db.collection('remote_config').doc(REMOTE_CONFIG_ID).get(),
        db.collection('remote_config_history').limit(100).get(),
    ]);
    const config = (configSnap.data() ?? {});
    const revision = Number(config.revision ?? 0);
    if (!Number.isInteger(revision) || revision < 0)
        throw new https_1.HttpsError('data-loss', 'remote_config_revision_invalid');
    const history = historySnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((left, right) => String(right.timestamp ?? right.at ?? '').localeCompare(String(left.timestamp ?? left.at ?? '')));
    return { ok: true, config: { ...config, revision }, history };
});
//# sourceMappingURL=admin_remote_config.js.map