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
exports.adminTestAlerts = exports.adminPublishAlertsConfig = exports.adminPublishNavLayout = exports.adminGetAdminConfigWorkspace = void 0;
exports.normalizeAdminNavLayoutInput = normalizeAdminNavLayoutInput;
exports.normalizeAdminAlertsConfigInput = normalizeAdminAlertsConfigInput;
exports.normalizeAdminAlertsTestInput = normalizeAdminAlertsTestInput;
exports.requireAdminConfigActor = requireAdminConfigActor;
exports.assertAdminConfigReplay = assertAdminConfigReplay;
exports.assertExpectedAdminConfigRevision = assertExpectedAdminConfigRevision;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const callable_options_1 = require("./callable_options");
const ALERT_TYPES = ['userReport', 'criticalError', 'contentReportDigest', 'cancelRefundSpike', 'safetyFlag'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function command(data) {
    const reason = text(data.reason, 500);
    const idempotencyKey = text(data.idempotencyKey, 120);
    const requestId = text(data.requestId, 160);
    if (!reason || !idempotencyKey || !requestId || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
    }
    const expectedRevision = Number(data.expectedRevision);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new https_1.HttpsError('invalid-argument', 'expectedRevision must be a non-negative integer');
    }
    return { reason, idempotencyKey, requestId, expectedRevision };
}
function boundedKeys(value, field) {
    if (!Array.isArray(value) || value.length > 100)
        throw new https_1.HttpsError('invalid-argument', `${field} must contain at most 100 items`);
    const values = value.map((item) => text(item, 200));
    if (values.some((item) => !item) || new Set(values).size !== values.length) {
        throw new https_1.HttpsError('invalid-argument', `${field} must contain unique non-empty keys`);
    }
    return Object.freeze(values);
}
function normalizeAdminNavLayoutInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const required = command(data);
    const order = boundedKeys(data.order, 'order');
    const pinned = boundedKeys(data.pinned, 'pinned');
    const hidden = boundedKeys(data.hidden, 'hidden');
    if (pinned.some((item) => hidden.includes(item)))
        throw new https_1.HttpsError('invalid-argument', 'pinned and hidden must be disjoint');
    const document = Object.freeze({ order, pinned, hidden, rev: Math.max(0, Math.floor(Number(data.clientRevision ?? 0))) });
    const requestFingerprint = JSON.stringify({ document, expectedRevision: required.expectedRevision });
    return Object.freeze({ document, requestFingerprint, ...required });
}
function normalizeAdminAlertsConfigInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const required = command(data);
    if (typeof data.enabled !== 'boolean' || !isRecord(data.types))
        throw new https_1.HttpsError('invalid-argument', 'enabled and types are required');
    const typeInput = data.types;
    const chatId = text(data.chatId, 160);
    if (data.enabled && !chatId)
        throw new https_1.HttpsError('invalid-argument', 'chatId is required while alerts are enabled');
    const spikePerHour = Number(data.spikePerHour);
    if (!Number.isInteger(spikePerHour) || spikePerHour < 1 || spikePerHour > 100)
        throw new https_1.HttpsError('invalid-argument', 'spikePerHour must be 1-100');
    const unknownTypes = Object.keys(typeInput).filter((key) => !ALERT_TYPES.includes(key));
    if (unknownTypes.length)
        throw new https_1.HttpsError('invalid-argument', 'unknown alert type');
    const types = Object.freeze(Object.fromEntries(ALERT_TYPES.map((key) => [key, typeInput[key] !== false])));
    const document = Object.freeze({ enabled: data.enabled, chatId, spikePerHour, types });
    const requestFingerprint = JSON.stringify({ document, expectedRevision: required.expectedRevision });
    return Object.freeze({ document, requestFingerprint, ...required });
}
function normalizeAdminAlertsTestInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    if ('chatId' in data || 'enabled' in data || 'types' in data || 'spikeThreshold' in data || 'spikePerHour' in data) {
        throw new https_1.HttpsError('invalid-argument', 'alert test uses saved server configuration only');
    }
    const required = command(data);
    const requestFingerprint = JSON.stringify({ expectedRevision: required.expectedRevision });
    return Object.freeze({ requestFingerprint, ...required });
}
function requireAdminConfigActor(request) {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const role = (0, permissions_1.roleFromAdminToken)(request.auth?.token);
    if (!request.auth?.uid || !role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'application.config.write required');
    }
    return { actorUid: request.auth.uid, role };
}
function assertAdminConfigReplay(operation, actorUid, fingerprint) {
    if (operation.actorUid !== actorUid)
        throw new https_1.HttpsError('permission-denied', 'admin operation belongs to another actor');
    if (operation.requestFingerprint !== fingerprint)
        throw new https_1.HttpsError('already-exists', 'idempotencyKey reused for another payload');
}
function assertExpectedAdminConfigRevision(currentRevision, expectedRevision) {
    const revision = Number(currentRevision ?? 0);
    if (!Number.isSafeInteger(revision) || revision < 0 || revision !== expectedRevision) {
        throw new https_1.HttpsError('aborted', `stale_admin_config_revision:${Number.isFinite(revision) ? revision : 'invalid'}`);
    }
    return revision;
}
async function publishConfig(request, input, documentId, action) {
    const { actorUid, role } = requireAdminConfigActor(request);
    const db = admin.firestore();
    const configRef = db.collection('admin_config').doc(documentId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            assertAdminConfigReplay(previous, actorUid, input.requestFingerprint);
            return { ok: true, revision: Number(previous.revision), auditId: String(previous.auditId ?? ''), replayed: true };
        }
        const before = configSnap.exists ? (configSnap.data() ?? {}) : {};
        const revision = assertExpectedAdminConfigRevision(before.revision, input.expectedRevision);
        const nextRevision = revision + 1;
        const nowMs = Date.now();
        const after = { ...before, ...input.document, revision: nextRevision, updatedAt: nowMs, updatedBy: actorUid };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action, actorUid, role, entity: { collection: 'admin_config', id: documentId }, reason: input.reason,
            before, after, requestId: input.requestId, rollbackReference: `${documentId}:${revision}`,
            timestamp: new Date(nowMs).toISOString(),
        });
        tx.set(configRef, after);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, { operationId: input.idempotencyKey, actorUid, requestFingerprint: input.requestFingerprint, revision: nextRevision, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, revision: nextRevision, auditId: auditRef.id, replayed: false };
    });
}
exports.adminGetAdminConfigWorkspace = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    requireAdminConfigActor(request);
    const db = admin.firestore();
    const [nav, alerts] = await Promise.all([
        db.collection('admin_config').doc('nav_layout').get(),
        db.collection('admin_config').doc('alerts').get(),
    ]);
    return { ok: true, nav: nav.exists ? nav.data() : null, alerts: alerts.exists ? alerts.data() : null };
});
exports.adminPublishNavLayout = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    const input = normalizeAdminNavLayoutInput(request.data);
    return publishConfig(request, input, 'nav_layout', 'admin_config.nav_layout.publish');
});
exports.adminPublishAlertsConfig = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    const input = normalizeAdminAlertsConfigInput(request.data);
    return publishConfig(request, input, 'alerts', 'admin_config.alerts.publish');
});
exports.adminTestAlerts = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    const input = normalizeAdminAlertsTestInput(request.data);
    const { actorUid, role } = requireAdminConfigActor(request);
    const db = admin.firestore();
    const configRef = db.collection('admin_config').doc('alerts');
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            assertAdminConfigReplay(previous, actorUid, input.requestFingerprint);
            return { ok: true, revision: Number(previous.revision), auditId: String(previous.auditId ?? ''), replayed: true };
        }
        if (!configSnap.exists)
            throw new https_1.HttpsError('failed-precondition', 'alerts_config_not_saved');
        const before = configSnap.data() ?? {};
        const revision = assertExpectedAdminConfigRevision(before.revision, input.expectedRevision);
        if (before.enabled !== true)
            throw new https_1.HttpsError('failed-precondition', 'alerts_must_be_enabled_for_test');
        if (!text(before.chatId, 160))
            throw new https_1.HttpsError('failed-precondition', 'alerts_chat_id_not_saved');
        const nowMs = Date.now();
        const nextRevision = revision + 1;
        const after = { ...before, testPing: nowMs, revision: nextRevision, updatedAt: nowMs, updatedBy: actorUid };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'admin_config.alerts.test', actorUid, role, entity: { collection: 'admin_config', id: 'alerts' },
            reason: input.reason, before, after: { ...after, chatId: '[saved]' }, requestId: input.requestId,
            rollbackReference: `alerts:${revision}`, timestamp: new Date(nowMs).toISOString(),
        });
        tx.set(configRef, after);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, { operationId: input.idempotencyKey, actorUid, requestFingerprint: input.requestFingerprint, revision: nextRevision, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, revision: nextRevision, testPing: nowMs, auditId: auditRef.id, replayed: false };
    });
});
//# sourceMappingURL=admin_config_controls.js.map