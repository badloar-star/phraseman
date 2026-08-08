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
exports.adminResetUserProgress = exports.adminMigrateLegacyAdminPremium = exports.adminDeleteDuplicateUser = exports.adminRequestUserMerge = exports.adminResolveUserReport = exports.adminWarnUser = exports.adminUpdateUserProfileField = void 0;
exports.requireAdminUserOperationActor = requireAdminUserOperationActor;
exports.assertAdminUserOperationReplay = assertAdminUserOperationReplay;
exports.normalizeAdminProfileFieldCommand = normalizeAdminProfileFieldCommand;
exports.normalizeAdminWarningCommand = normalizeAdminWarningCommand;
exports.normalizeAdminReportModerationCommand = normalizeAdminReportModerationCommand;
exports.normalizeAdminAliasDeleteCommand = normalizeAdminAliasDeleteCommand;
exports.assertSafeDuplicateAlias = assertSafeDuplicateAlias;
exports.normalizeAdminPremiumMigrationCommand = normalizeAdminPremiumMigrationCommand;
exports.normalizeAdminProgressResetCommand = normalizeAdminProgressResetCommand;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const admin_reports_center_1 = require("./admin_reports_center");
const callable_options_1 = require("./callable_options");
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const PROFILE_FIELDS = ['user_name', 'user_total_xp', 'streak_count'];
const RESET_TYPES = ['achievements', 'daily_tasks'];
const REPORT_ACTIONS = ['warn', 'rename', 'ban', 'status'];
const MAX_MIGRATION_UIDS = 200;
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function parseUid(value, label = 'uid') {
    const uid = text(value, 161);
    if (!UID_RE.test(uid))
        throw new https_1.HttpsError('invalid-argument', `${label} is invalid`);
    return uid;
}
function parseMeta(data) {
    const reason = text(data.reason, 500);
    const requestId = text(data.requestId, 161);
    const idempotencyKey = text(data.idempotencyKey, 161);
    if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
    }
    return Object.freeze({ reason, requestId, idempotencyKey });
}
function inputRecord(data) {
    if (!record(data))
        throw new https_1.HttpsError('invalid-argument', 'admin command required');
    return data;
}
function requireAdminUserOperationActor(request, permission) {
    const actorUid = text(request.auth?.uid, 160);
    const token = request.auth?.token;
    const role = token && (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : 'owner';
    if (!actorUid || token?.admin !== true || !(0, permissions_1.hasPermission)(role, permission)) {
        throw new https_1.HttpsError('permission-denied', 'Admin permission required');
    }
    return Object.freeze({ actorUid, actorEmail: text(token.email, 320) || actorUid, role });
}
function assertAdminUserOperationReplay(operation, fingerprint, actorUid) {
    if (operation.requestFingerprint !== fingerprint || operation.actorUid !== actorUid) {
        throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
    }
}
function operationResult(operation) {
    return record(operation.result) ? operation.result : {};
}
function normalizeAdminProfileFieldCommand(data) {
    const input = inputRecord(data);
    const uid = parseUid(input.uid);
    const field = text(input.field, 40);
    if (!PROFILE_FIELDS.includes(field))
        throw new https_1.HttpsError('invalid-argument', 'profile field is not allowlisted');
    let value;
    if (field === 'user_name') {
        value = text(input.value, 80);
        if (!value)
            throw new https_1.HttpsError('invalid-argument', 'user name is required');
    }
    else {
        const parsed = typeof input.value === 'number' ? input.value : Number(input.value);
        const maximum = field === 'user_total_xp' ? 1000000000 : 100000;
        if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum)
            throw new https_1.HttpsError('invalid-argument', 'profile number is out of range');
        value = parsed;
    }
    return Object.freeze({ uid, field, value, ...parseMeta(input) });
}
function normalizeAdminWarningCommand(data) {
    const input = inputRecord(data);
    const uid = parseUid(input.uid);
    const name = text(input.name, 80);
    const message = text(input.message, 1000);
    if (!message)
        throw new https_1.HttpsError('invalid-argument', 'warning message is required');
    return Object.freeze({ uid, name, message, ...parseMeta(input) });
}
function normalizeAdminReportModerationCommand(data) {
    const input = inputRecord(data);
    const reportId = text(input.reportId, 161);
    const expectedStatus = text(input.expectedStatus, 40).toLowerCase();
    const action = text(input.action, 20);
    if (!TOKEN_RE.test(reportId) || !expectedStatus || !REPORT_ACTIONS.includes(action)) {
        throw new https_1.HttpsError('invalid-argument', 'report moderation command is invalid');
    }
    const uid = action === 'status' ? text(input.uid, 160) : parseUid(input.uid);
    const name = text(input.name, 80);
    const message = text(input.message, 1000);
    const newName = text(input.newName, 80);
    const nextStatus = action === 'ban'
        ? 'banned'
        : action === 'status'
            ? text(input.nextStatus, 40).toLowerCase()
            : 'reviewed';
    if (action === 'warn' && !message)
        throw new https_1.HttpsError('invalid-argument', 'warning message is required');
    if (action === 'rename' && !newName)
        throw new https_1.HttpsError('invalid-argument', 'newName is required');
    if (action === 'status' && !(0, admin_reports_center_1.isAllowedReportTransition)('user_reports', expectedStatus, nextStatus)) {
        throw new https_1.HttpsError('invalid-argument', 'report status transition is not allowed');
    }
    if (action !== 'status' && !['new', 'reviewed'].includes(expectedStatus)) {
        throw new https_1.HttpsError('invalid-argument', 'report action requires an active report');
    }
    return Object.freeze({ uid, reportId, expectedStatus, action, nextStatus, name, message, newName, ...parseMeta(input) });
}
function normalizeAdminMergeRequest(data) {
    const input = inputRecord(data);
    const sourceUid = parseUid(input.sourceUid, 'sourceUid');
    const targetUid = parseUid(input.targetUid, 'targetUid');
    if (sourceUid === targetUid)
        throw new https_1.HttpsError('invalid-argument', 'source and target must differ');
    return Object.freeze({ sourceUid, targetUid, ...parseMeta(input) });
}
function normalizeAdminAliasDeleteCommand(data) {
    const input = inputRecord(data);
    const uid = parseUid(input.uid);
    const expectedCanonicalUid = parseUid(input.expectedCanonicalUid, 'expectedCanonicalUid');
    if (uid === expectedCanonicalUid)
        throw new https_1.HttpsError('invalid-argument', 'alias must differ from canonical user');
    return Object.freeze({ uid, expectedCanonicalUid, ...parseMeta(input) });
}
function assertSafeDuplicateAlias(alias, canonical, uid, expectedCanonicalUid, subcollectionCount, authLinkCount) {
    if (alias.identityHidden !== true || text(alias.canonicalStableId, 160) !== expectedCanonicalUid || uid === expectedCanonicalUid) {
        throw new https_1.HttpsError('failed-precondition', 'user is not the expected hidden alias');
    }
    if (canonical.identityHidden === true)
        throw new https_1.HttpsError('failed-precondition', 'canonical target is hidden');
    if (subcollectionCount !== 0)
        throw new https_1.HttpsError('failed-precondition', 'alias has subcollections and requires offline migration');
    if (authLinkCount !== 0)
        throw new https_1.HttpsError('failed-precondition', 'alias is still referenced by auth_links');
}
function normalizeAdminPremiumMigrationCommand(data) {
    const input = inputRecord(data);
    if (!Array.isArray(input.uids) || input.uids.length < 1 || input.uids.length > MAX_MIGRATION_UIDS) {
        throw new https_1.HttpsError('invalid-argument', `uids must contain 1..${MAX_MIGRATION_UIDS} entries`);
    }
    const uids = input.uids.map((uid) => parseUid(uid));
    if (new Set(uids).size !== uids.length)
        throw new https_1.HttpsError('invalid-argument', 'uids must be unique');
    return Object.freeze({ uids: Object.freeze(uids), ...parseMeta(input) });
}
function normalizeAdminProgressResetCommand(data) {
    const input = inputRecord(data);
    const uid = parseUid(input.uid);
    const reset = text(input.reset, 40);
    if (!RESET_TYPES.includes(reset))
        throw new https_1.HttpsError('invalid-argument', 'reset type is not allowlisted');
    return Object.freeze({ uid, reset, ...parseMeta(input) });
}
function fingerprint(action, command) {
    const { requestId: _requestId, idempotencyKey: _idempotencyKey, ...material } = command;
    return JSON.stringify({ action, ...material });
}
function auditRecord(actor, action, entity, reason, requestId, before, after, nowMs) {
    return (0, audit_contract_1.createAuditRecord)({
        action, actorUid: actor.actorUid, role: actor.role, entity, reason, requestId,
        before, after, timestamp: new Date(nowMs).toISOString(),
    });
}
function assertSecondaryPermission(actor, permission) {
    if (!(0, permissions_1.hasPermission)(actor.role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
}
exports.adminUpdateUserProfileField = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminProfileFieldCommand(request.data);
    const actor = requireAdminUserOperationActor(request, 'users.write');
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const leaderboardRef = db.collection('leaderboard').doc(input.uid);
    const operationRef = db.collection('admin_command_operations').doc(`profile_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = fingerprint('profile_field_update', input);
    const nowMs = Date.now();
    return db.runTransaction(async (tx) => {
        const [operationSnap, userSnap, leaderboardSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef), tx.get(leaderboardRef)]);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
            return { ...operationResult(operation), replayed: true };
        }
        if (!userSnap.exists)
            throw new https_1.HttpsError('not-found', 'user not found');
        const progress = record(userSnap.data()?.progress) ? userSnap.data()?.progress : {};
        const before = { [input.field]: progress[input.field] ?? null };
        const after = { [input.field]: input.value };
        tx.update(userRef, { [`progress.${input.field}`]: input.value, updatedAt: nowMs });
        if (leaderboardSnap.exists) {
            if (input.field === 'user_name')
                tx.update(leaderboardRef, { name: input.value, nameLower: String(input.value).toLowerCase() });
            if (input.field === 'user_total_xp')
                tx.update(leaderboardRef, { points: input.value });
            if (input.field === 'streak_count')
                tx.update(leaderboardRef, { streak: input.value });
        }
        const audit = auditRecord(actor, 'user_profile_field_update', { collection: 'users', id: input.uid }, input.reason, input.requestId, before, after, nowMs);
        const result = { ok: true, uid: input.uid, field: input.field, value: input.value, auditId: auditRef.id };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'profile_field_update', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return result;
    });
});
exports.adminWarnUser = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminWarningCommand(request.data);
    const actor = requireAdminUserOperationActor(request, 'community.moderate');
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const warningRef = db.collection('user_warnings').doc(`admin_${input.idempotencyKey}`);
    const operationRef = db.collection('admin_command_operations').doc(`warning_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = fingerprint('warn_user', input);
    const nowMs = Date.now();
    return db.runTransaction(async (tx) => {
        const [operationSnap, userSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef)]);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
            return { ...operationResult(operation), replayed: true };
        }
        if (!userSnap.exists)
            throw new https_1.HttpsError('not-found', 'user not found');
        const nowIso = new Date(nowMs).toISOString();
        tx.create(warningRef, { uid: input.uid, name: input.name, message: input.message, createdAt: nowIso, createdBy: actor.actorUid, operationId: operationRef.id });
        const audit = auditRecord(actor, 'warn_user', { collection: 'users', id: input.uid }, input.reason, input.requestId, {}, { warningId: warningRef.id }, nowMs);
        const result = { ok: true, uid: input.uid, warningId: warningRef.id, auditId: auditRef.id };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'warn_user', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return result;
    });
});
exports.adminResolveUserReport = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminReportModerationCommand(request.data);
    const actor = requireAdminUserOperationActor(request, 'reports.status.write');
    if (input.action !== 'status')
        assertSecondaryPermission(actor, 'community.moderate');
    const db = admin.firestore();
    const reportRef = db.collection('user_reports').doc(input.reportId);
    const userRef = input.uid ? db.collection('users').doc(input.uid) : null;
    const leaderboardRef = input.uid ? db.collection('leaderboard').doc(input.uid) : null;
    const banRef = input.uid ? db.collection('banned_users').doc(input.uid) : null;
    const warningRef = input.action === 'warn' ? db.collection('user_warnings').doc(`report_${input.idempotencyKey}`) : null;
    const operationRef = db.collection('admin_command_operations').doc(`report_moderation_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = fingerprint('resolve_user_report', input);
    const nowMs = Date.now();
    return db.runTransaction(async (tx) => {
        const operationSnap = await tx.get(operationRef);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
            return { ...operationResult(operation), replayed: true };
        }
        const reportSnap = await tx.get(reportRef);
        if (!reportSnap.exists)
            throw new https_1.HttpsError('not-found', 'report not found');
        const currentStatus = text(reportSnap.data()?.status, 40).toLowerCase() || 'new';
        if (currentStatus !== input.expectedStatus)
            throw new https_1.HttpsError('failed-precondition', `report status changed to ${currentStatus}`);
        const userSnap = userRef ? await tx.get(userRef) : null;
        const leaderboardSnap = leaderboardRef ? await tx.get(leaderboardRef) : null;
        if (userRef && (!userSnap || !userSnap.exists))
            throw new https_1.HttpsError('not-found', 'reported user not found');
        const nowIso = new Date(nowMs).toISOString();
        if (input.action === 'warn' && warningRef)
            tx.create(warningRef, { uid: input.uid, name: input.name, message: input.message, createdAt: nowIso, createdBy: actor.actorUid, reportId: input.reportId, operationId: operationRef.id });
        if (input.action === 'rename' && userRef) {
            tx.update(userRef, { 'progress.user_name': input.newName, updatedAt: nowMs });
            if (leaderboardRef && leaderboardSnap?.exists)
                tx.update(leaderboardRef, { name: input.newName, nameLower: input.newName.toLowerCase() });
        }
        if (input.action === 'ban' && userRef && banRef) {
            tx.update(userRef, { banned: true, bannedAt: nowIso, updatedAt: nowMs });
            tx.set(banRef, { uid: input.uid, name: input.name, reason: input.reason, bannedAt: nowIso, bannedBy: actor.actorUid, operationId: operationRef.id });
            if (leaderboardRef && leaderboardSnap?.exists)
                tx.delete(leaderboardRef);
        }
        tx.update(reportRef, { status: input.nextStatus, reviewedAt: nowIso, adminStatusUpdatedAtMs: nowMs, adminStatusUpdatedBy: actor.actorUid });
        const audit = auditRecord(actor, `user_report_${input.action}`, { collection: 'user_reports', id: input.reportId }, input.reason, input.requestId, { status: currentStatus }, { status: input.nextStatus, uid: input.uid || null }, nowMs);
        const result = { ok: true, reportId: input.reportId, uid: input.uid || null, action: input.action, status: input.nextStatus, auditId: auditRef.id };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'resolve_user_report', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return result;
    });
});
exports.adminRequestUserMerge = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminMergeRequest(request.data);
    const actor = requireAdminUserOperationActor(request, 'users.auth_repair');
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations').doc(`merge_blocked_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = fingerprint('request_user_merge', input);
    const nowMs = Date.now();
    await db.runTransaction(async (tx) => {
        const operationSnap = await tx.get(operationRef);
        if (operationSnap.exists) {
            assertAdminUserOperationReplay(operationSnap.data() ?? {}, requestFingerprint, actor.actorUid);
            return;
        }
        const audit = auditRecord(actor, 'user_merge_blocked', { collection: 'users', id: input.sourceUid }, input.reason, input.requestId, { sourceUid: input.sourceUid, targetUid: input.targetUid }, { blocked: true, requiredBoundary: 'offline_identity_migration' }, nowMs);
        const result = { ok: false, code: 'admin_user_merge_requires_offline_migration', sourceUid: input.sourceUid, targetUid: input.targetUid, auditId: auditRef.id };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'request_user_merge', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    throw new https_1.HttpsError('failed-precondition', 'admin_user_merge_requires_offline_migration');
});
exports.adminDeleteDuplicateUser = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminAliasDeleteCommand(request.data);
    const actor = requireAdminUserOperationActor(request, 'users.delete');
    const db = admin.firestore();
    const aliasRef = db.collection('users').doc(input.uid);
    const canonicalRef = db.collection('users').doc(input.expectedCanonicalUid);
    const leaderboardRef = db.collection('leaderboard').doc(input.uid);
    const archiveRef = db.collection('users_dedup_archive').doc(input.uid);
    const operationRef = db.collection('admin_command_operations').doc(`delete_alias_${input.idempotencyKey}`);
    const cleanupJobRef = db.collection('admin_duplicate_cleanup_jobs').doc(operationRef.id);
    const auditRef = db.collection('admin_log').doc();
    const authLinkRef = db.collection('auth_links').doc(input.uid);
    const authLinkQuery = db.collection('auth_links').where('stable_id', '==', input.uid).limit(1);
    const requestFingerprint = fingerprint('delete_duplicate_alias', input);
    const nowMs = Date.now();
    return db.runTransaction(async (tx) => {
        const operationSnap = await tx.get(operationRef);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
            return { ...operationResult(operation), replayed: true };
        }
        const [aliasSnap, canonicalSnap, leaderboardSnap, authLinkSnap, authLinkQuerySnap] = await Promise.all([
            tx.get(aliasRef), tx.get(canonicalRef), tx.get(leaderboardRef), tx.get(authLinkRef), tx.get(authLinkQuery),
        ]);
        if (!aliasSnap.exists)
            throw new https_1.HttpsError('not-found', 'duplicate alias not found');
        if (!canonicalSnap.exists)
            throw new https_1.HttpsError('failed-precondition', 'canonical target does not exist');
        const authLinkCount = (authLinkSnap.exists ? 1 : 0) + authLinkQuerySnap.size;
        assertSafeDuplicateAlias(aliasSnap.data() ?? {}, canonicalSnap.data() ?? {}, input.uid, input.expectedCanonicalUid, 0, authLinkCount);
        const nowIso = new Date(nowMs).toISOString();
        const tombstone = {
            identityHidden: true,
            canonicalStableId: input.expectedCanonicalUid,
            duplicateCleanupStatus: 'queued',
            duplicateCleanupJobId: cleanupJobRef.id,
            duplicateCleanupQueuedAt: nowMs,
            duplicateCleanupQueuedBy: actor.actorUid,
            accessBlocked: true,
        };
        tx.set(aliasRef, tombstone, { merge: true });
        if (leaderboardSnap.exists)
            tx.set(leaderboardRef, { identityHidden: true, duplicateCleanupStatus: 'queued', duplicateCleanupJobId: cleanupJobRef.id, updatedAt: nowMs }, { merge: true });
        tx.set(archiveRef, { archivedAt: nowMs, archivedAtISO: nowIso, sourceCollection: 'users', canonicalStableId: input.expectedCanonicalUid, queuedBy: actor.actorUid, reason: input.reason, snapshot: aliasSnap.data() ?? {}, tombstone, status: 'queued', physicallyDeleted: false, operationId: operationRef.id }, { merge: true });
        tx.create(cleanupJobRef, {
            type: 'duplicate_alias_offline_cleanup',
            status: 'queued',
            aliasUid: input.uid,
            canonicalUid: input.expectedCanonicalUid,
            archiveId: archiveRef.id,
            preserveFirebaseAuthUser: true,
            discoverSubcollectionsOffline: true,
            requestedBy: actor.actorUid,
            reason: input.reason,
            requestId: input.requestId,
            operationId: operationRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const audit = auditRecord(actor, 'queue_duplicate_alias_cleanup', { collection: 'users', id: input.uid }, input.reason, input.requestId, { canonicalStableId: input.expectedCanonicalUid, identityHidden: true }, { archived: true, tombstoned: true, status: 'queued', cleanupJobId: cleanupJobRef.id, physicallyDeleted: false }, nowMs);
        const result = { ok: true, uid: input.uid, canonicalUid: input.expectedCanonicalUid, archiveId: archiveRef.id, cleanupJobId: cleanupJobRef.id, auditId: auditRef.id, status: 'queued', tombstoned: true, hidden: true, physicallyDeleted: false };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'delete_duplicate_alias', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return result;
    });
});
exports.adminMigrateLegacyAdminPremium = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminPremiumMigrationCommand(request.data);
    const actor = requireAdminUserOperationActor(request, 'money.manual_access.write');
    const db = admin.firestore();
    const userRefs = input.uids.map((uid) => db.collection('users').doc(uid));
    const operationRef = db.collection('admin_command_operations').doc(`premium_migration_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = fingerprint('migrate_legacy_admin_premium', input);
    const nowMs = Date.now();
    return db.runTransaction(async (tx) => {
        const operationSnap = await tx.get(operationRef);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
            return { ...operationResult(operation), replayed: true };
        }
        const snapshots = await Promise.all(userRefs.map((ref) => tx.get(ref)));
        const migrated = [];
        const skipped = [];
        snapshots.forEach((snapshot, index) => {
            const uid = input.uids[index];
            if (!snapshot.exists) {
                skipped.push(uid);
                return;
            }
            const progress = record(snapshot.data()?.progress) ? snapshot.data()?.progress : {};
            const expiry = Number(progress.premium_expiry) || 0;
            const hasLegacyProvenance = progress.premium_plan === 'admin_grant' && String(progress.admin_premium_override ?? '') === 'true';
            if (!hasLegacyProvenance || (expiry !== 0 && expiry <= nowMs)) {
                skipped.push(uid);
                return;
            }
            const grantAt = String(progress.premium_admin_grant_at || nowMs);
            tx.update(snapshot.ref, {
                'progress.vip_active': 'true', 'progress.vip_plan': 'admin_vip', 'progress.vip_from': grantAt,
                'progress.vip_until': String(expiry), 'progress.vip_admin_override': 'true',
                'progress.vip_admin_grant_at': grantAt, 'progress.vip_migrated_from_admin_grant_at': String(nowMs), updatedAt: nowMs,
            });
            migrated.push(uid);
        });
        const audit = auditRecord(actor, 'migrate_legacy_admin_premium', { collection: 'users', id: 'explicit_candidates' }, input.reason, input.requestId, { requested: input.uids.length }, { migrated: migrated.length, skipped: skipped.length }, nowMs);
        const result = { ok: true, checked: input.uids.length, migrated, skipped, auditId: auditRef.id };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'migrate_legacy_admin_premium', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return result;
    });
});
exports.adminResetUserProgress = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const input = normalizeAdminProgressResetCommand(request.data);
    const actor = requireAdminUserOperationActor(request, 'users.write');
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const operationRef = db.collection('admin_command_operations').doc(`progress_reset_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = fingerprint('reset_user_progress', input);
    const nowMs = Date.now();
    const field = input.reset === 'achievements' ? 'achievements_state' : 'daily_tasks_progress';
    return db.runTransaction(async (tx) => {
        const [operationSnap, userSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef)]);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
            return { ...operationResult(operation), replayed: true };
        }
        if (!userSnap.exists)
            throw new https_1.HttpsError('not-found', 'user not found');
        const before = { [field]: userSnap.data()?.[field] ?? null };
        tx.update(userRef, { [field]: '', updatedAt: nowMs });
        const audit = auditRecord(actor, `reset_${input.reset}`, { collection: 'users', id: input.uid }, input.reason, input.requestId, before, { [field]: '' }, nowMs);
        const result = { ok: true, uid: input.uid, reset: input.reset, field, auditId: auditRef.id };
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, { action: 'reset_user_progress', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return result;
    });
});
//# sourceMappingURL=admin_user_operations.js.map