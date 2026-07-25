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
exports.adminCleanupExpiredAppMessages = exports.adminDeleteAppMessage = exports.adminUpdateAppMessage = exports.adminSetAppMessageActive = exports.adminCreateAppMessage = exports.adminListAppMessages = exports.adminSendPersonalAppMessage = void 0;
exports.normalizeAppMessageCreateInput = normalizeAppMessageCreateInput;
exports.normalizePersonalAppMessageInput = normalizePersonalAppMessageInput;
exports.normalizeAppMessageToggleInput = normalizeAppMessageToggleInput;
exports.normalizeAppMessageUpdateInput = normalizeAppMessageUpdateInput;
exports.normalizeAppMessageDeleteInput = normalizeAppMessageDeleteInput;
exports.normalizeAppMessageCleanupInput = normalizeAppMessageCleanupInput;
exports.appMessagePollStructureChanged = appMessagePollStructureChanged;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const app_messages_1 = require("./app_messages");
const REGION = 'us-central1';
const LANGUAGES = ['Ru', 'Uk', 'Es', 'PtBr', 'Vi', 'Id', 'Tr', 'Pl'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function requiredCommandFields(data) {
    const reason = text(data.reason, 500);
    const idempotencyKey = text(data.idempotencyKey, 120);
    const requestId = text(data.requestId, 160);
    if (!reason || !idempotencyKey || !requestId || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
    }
    return { reason, idempotencyKey, requestId };
}
function languageContent(translations, suffix, fallback) {
    const key = suffix === 'PtBr' ? 'ptBr' : suffix.toLowerCase();
    const value = isRecord(translations[key]) ? translations[key] : {};
    return {
        title: text(value.title, 160) || text(fallback.title, 160),
        body: text(value.body, 2000) || text(fallback.body, 2000),
        pollQuestion: text(value.pollQuestion, 300) || text(fallback.pollQuestion, 300),
        pollOptions: Array.isArray(value.pollOptions) ? value.pollOptions : fallback.pollOptions,
    };
}
function normalizeAppMessageCreateInput(data, actorEmail, nowMs = Date.now()) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const command = requiredCommandFields(data);
    const translations = isRecord(data.translations) ? data.translations : {};
    const ru = isRecord(translations.ru) ? translations.ru : {};
    const titleRu = text(ru.title, 160);
    const messageRu = text(ru.body, 2000);
    if (!titleRu || !messageRu)
        throw new https_1.HttpsError('invalid-argument', 'RU title and body are required');
    const kind = data.kind === 'poll' ? 'poll' : 'message';
    const audience = ['all', 'free', 'premium'].includes(String(data.audience)) ? String(data.audience) : 'all';
    const priority = Math.max(0, Math.min(99, Math.floor(Number(data.priority ?? 0))));
    const ttlDays = Math.max(1, Math.min(30, Math.floor(Number(data.ttlDays ?? 30))));
    if (!Number.isFinite(priority) || !Number.isFinite(ttlDays))
        throw new https_1.HttpsError('invalid-argument', 'priority or ttlDays invalid');
    const active = data.active === true;
    const nowIso = new Date(nowMs).toISOString();
    const expiresAtMs = nowMs + ttlDays * 24 * 60 * 60 * 1000;
    const document = {
        kind,
        active,
        audience,
        priority,
        ttlDays,
        createdAt: nowIso,
        createdAtMs: nowMs,
        updatedAt: nowIso,
        updatedAtMs: nowMs,
        expiresAt: new Date(expiresAtMs).toISOString(),
        expiresAtMs,
        createdBy: actorEmail,
        updatedBy: actorEmail,
        readCount: 0,
        likeCount: 0,
        dislikeCount: 0,
    };
    for (const suffix of LANGUAGES) {
        const content = languageContent(translations, suffix, ru);
        document[`title${suffix}`] = content.title;
        document[`message${suffix}`] = content.body;
    }
    if (kind === 'poll') {
        const questionRu = text(ru.pollQuestion, 300);
        const ruOptions = Array.isArray(ru.pollOptions) ? ru.pollOptions.map((item) => text(item, 160)).filter(Boolean).slice(0, 6) : [];
        if (!questionRu || ruOptions.length < 2)
            throw new https_1.HttpsError('invalid-argument', 'Poll requires a RU question and 2-6 options');
        const options = ruOptions.map((optionRu, index) => {
            const option = { id: `option_${index + 1}`, textRu: optionRu };
            for (const suffix of LANGUAGES.filter((item) => item !== 'Ru')) {
                const content = languageContent(translations, suffix, ru);
                const translated = Array.isArray(content.pollOptions) ? text(content.pollOptions[index], 160) : '';
                option[`text${suffix}`] = translated || optionRu;
            }
            return option;
        });
        const poll = { questionRu, options, optionIds: options.map((option) => option.id), counts: {}, voteCount: 0 };
        for (const suffix of LANGUAGES.filter((item) => item !== 'Ru')) {
            poll[`question${suffix}`] = languageContent(translations, suffix, ru).pollQuestion || questionRu;
        }
        document.poll = poll;
        document.pollCounts = Object.fromEntries(options.map((option) => [String(option.id), 0]));
        document.pollVoteCount = 0;
        document.pollCountUpdatedAtMs = nowMs;
    }
    const requestFingerprint = JSON.stringify({ kind, active, audience, priority, ttlDays, translations });
    return Object.freeze({ document: Object.freeze(document), requestFingerprint, ...command });
}
function normalizePersonalAppMessageInput(data, actorEmail, nowMs = Date.now()) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    if ('recipientUid' in data || 'firebaseUid' in data || 'authUid' in data) {
        throw new https_1.HttpsError('invalid-argument', 'uid is the only supported recipient identity');
    }
    const command = requiredCommandFields(data);
    const uid = text(data.uid, 160);
    const title = text(data.title, 160);
    const body = text(data.body, 2000);
    const deliveryMode = data.deliveryMode;
    if (!/^[A-Za-z0-9._-]{2,160}$/.test(uid))
        throw new https_1.HttpsError('invalid-argument', 'valid stable uid required');
    if (!title || !body)
        throw new https_1.HttpsError('invalid-argument', 'title and body are required');
    if (deliveryMode !== 'inbox' && deliveryMode !== 'next_login_modal') {
        throw new https_1.HttpsError('invalid-argument', 'deliveryMode must be inbox or next_login_modal');
    }
    const createdAt = new Date(nowMs).toISOString();
    const document = {
        kind: 'personal_admin_message',
        recipientUid: uid,
        deliveryMode,
        title,
        body,
        active: true,
        createdAt,
        createdAtMs: nowMs,
        updatedAt: createdAt,
        updatedAtMs: nowMs,
        createdBy: actorEmail,
        nextLoginModalPending: deliveryMode === 'next_login_modal',
    };
    const requestFingerprint = JSON.stringify({ uid, deliveryMode, title, body });
    return Object.freeze({ uid, deliveryMode, document: Object.freeze(document), requestFingerprint, ...command });
}
function normalizeAppMessageToggleInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const command = requiredCommandFields(data);
    const messageId = text(data.messageId, 160);
    if (!/^[A-Za-z0-9_-]{3,160}$/.test(messageId) || typeof data.active !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'valid messageId and active boolean required');
    }
    const requestFingerprint = JSON.stringify({ messageId, active: data.active });
    return Object.freeze({ messageId, active: data.active, requestFingerprint, ...command });
}
function validMessageId(value) {
    const messageId = text(value, 160);
    if (!/^[A-Za-z0-9_-]{3,160}$/.test(messageId))
        throw new https_1.HttpsError('invalid-argument', 'valid messageId required');
    return messageId;
}
function contentPatchFromDocument(document) {
    const patch = {
        kind: document.kind,
        audience: document.audience,
        priority: document.priority,
    };
    for (const suffix of LANGUAGES) {
        patch[`title${suffix}`] = document[`title${suffix}`];
        patch[`message${suffix}`] = document[`message${suffix}`];
    }
    patch.poll = document.kind === 'poll' ? document.poll : null;
    return patch;
}
function normalizeAppMessageUpdateInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const command = requiredCommandFields(data);
    const messageId = validMessageId(data.messageId);
    const expectedUpdatedAtMs = Math.floor(Number(data.expectedUpdatedAtMs ?? 0));
    if (!Number.isFinite(expectedUpdatedAtMs) || expectedUpdatedAtMs < 0)
        throw new https_1.HttpsError('invalid-argument', 'expectedUpdatedAtMs invalid');
    const normalized = normalizeAppMessageCreateInput({ ...data, active: false, ttlDays: 30 }, '', 0);
    const patch = contentPatchFromDocument(normalized.document);
    const poll = plainPoll(patch.poll);
    const preservedOptionIds = Array.isArray(data.pollOptionIds)
        ? data.pollOptionIds.map((id) => text(id, 40)).filter((id) => /^[A-Za-z0-9_-]{1,40}$/.test(id))
        : [];
    if (poll && Array.isArray(poll.options) && preservedOptionIds.length === poll.options.length) {
        poll.options = poll.options.map((value, index) => ({ ...(isRecord(value) ? value : {}), id: preservedOptionIds[index] }));
        poll.optionIds = preservedOptionIds;
        patch.poll = poll;
    }
    const resetPollEngagement = data.resetPollEngagement === true;
    const requestFingerprint = JSON.stringify({ messageId, expectedUpdatedAtMs, resetPollEngagement, patch });
    return Object.freeze({ messageId, expectedUpdatedAtMs, resetPollEngagement, patch: Object.freeze(patch), requestFingerprint, ...command });
}
function normalizeAppMessageDeleteInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const command = requiredCommandFields(data);
    const messageId = validMessageId(data.messageId);
    const requestFingerprint = JSON.stringify({ messageId });
    return Object.freeze({ messageId, requestFingerprint, ...command });
}
function normalizeAppMessageCleanupInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const command = requiredCommandFields(data);
    const messageIds = Array.isArray(data.messageIds)
        ? [...new Set(data.messageIds.map(validMessageId))].slice(0, 120)
        : [];
    if (!messageIds.length)
        throw new https_1.HttpsError('invalid-argument', 'messageIds required');
    const requestFingerprint = JSON.stringify({ messageIds });
    return Object.freeze({ messageIds: Object.freeze(messageIds), requestFingerprint, ...command });
}
function appMessagePollStructureChanged(previous, next) {
    if (!previous && !next)
        return false;
    if (!isRecord(previous) || !isRecord(next))
        return true;
    const previousOptions = Array.isArray(previous.options) ? previous.options : [];
    const nextOptions = Array.isArray(next.options) ? next.options : [];
    if (previousOptions.length !== nextOptions.length)
        return true;
    return previousOptions.some((value, index) => {
        const before = isRecord(value) ? value : {};
        const after = isRecord(nextOptions[index]) ? nextOptions[index] : {};
        return text(before.id, 40) !== text(after.id, 40) || text(before.textRu, 160) !== text(after.textRu, 160);
    });
}
function roleFor(token) {
    const role = token.adminRole;
    if (!(0, roles_1.hasAdminRole)(role))
        throw new https_1.HttpsError('permission-denied', 'adminRole claim required');
    return role;
}
function assertPermission(request, permission) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFor(request.auth.token);
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return role;
}
exports.adminSendPersonalAppMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = assertPermission(request, 'users.message.write');
    const actorUid = request.auth.uid;
    const actorEmail = text(request.auth.token.email, 320) || actorUid;
    const input = normalizePersonalAppMessageInput(request.data, actorEmail);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const messageRef = userRef.collection('user_messages').doc();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [recipient, operation] = await Promise.all([tx.get(userRef), tx.get(operationRef)]);
        if (operation.exists) {
            const previous = operation.data() ?? {};
            assertOperationFingerprint(previous, input.requestFingerprint);
            assertOperationActor(previous, actorUid);
            return {
                ok: true,
                messageId: String(previous.entityId ?? ''),
                auditId: String(previous.auditId ?? ''),
                replayed: true,
            };
        }
        if (!recipient.exists)
            throw new https_1.HttpsError('not-found', 'personal_message_recipient_not_found');
        const recipientData = recipient.data() ?? {};
        if (recipientData.accountDeletedAtMs || recipientData.deleted === true) {
            throw new https_1.HttpsError('failed-precondition', 'personal_message_recipient_unavailable');
        }
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'app_message.personal_send', actorUid, role,
            entity: { collection: `users/${input.uid}/user_messages`, id: messageRef.id },
            reason: input.reason, before: {}, after: input.document, requestId: input.requestId,
            rollbackReference: messageRef.id, timestamp: new Date().toISOString(),
        });
        tx.create(messageRef, input.document);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey, recipientUid: input.uid });
        tx.create(operationRef, {
            operationId: input.idempotencyKey,
            requestFingerprint: input.requestFingerprint,
            actorUid,
            entityId: messageRef.id,
            recipientUid: input.uid,
            auditId: auditRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, messageId: messageRef.id, auditId: auditRef.id, replayed: false };
    });
});
exports.adminListAppMessages = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    assertPermission(request, 'campaigns.read');
    const limit = Math.max(1, Math.min(120, Math.floor(Number(request.data?.limit ?? 120))));
    const snap = await admin.firestore().collection('app_messages').orderBy('createdAtMs', 'desc').limit(limit).get();
    return { ok: true, items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
});
exports.adminCreateAppMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth.uid;
    const actorEmail = text(request.auth.token.email, 320) || actorUid;
    const input = normalizeAppMessageCreateInput(request.data, actorEmail);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = input.requestFingerprint;
    return db.runTransaction(async (tx) => {
        const operation = await tx.get(operationRef);
        if (operation.exists) {
            const previous = operation.data() ?? {};
            if (previous.requestFingerprint !== fingerprint)
                throw new https_1.HttpsError('already-exists', 'idempotencyKey reused for another payload');
            assertOperationActor(previous, actorUid);
            return { ok: true, messageId: String(previous.entityId ?? ''), auditId: String(previous.auditId ?? ''), replayed: true };
        }
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'app_message.create', actorUid, role,
            entity: { collection: 'app_messages', id: messageRef.id }, reason: input.reason,
            before: {}, after: input.document, requestId: input.requestId,
            rollbackReference: messageRef.id, timestamp: new Date().toISOString(),
        });
        tx.create(messageRef, input.document);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, actorUid, entityId: messageRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, messageId: messageRef.id, auditId: auditRef.id, replayed: false };
    });
});
exports.adminSetAppMessageActive = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth.uid;
    const actorEmail = text(request.auth.token.email, 320) || actorUid;
    const input = normalizeAppMessageToggleInput(request.data);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = input.requestFingerprint;
    return db.runTransaction(async (tx) => {
        const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
        if (operation.exists) {
            const previous = operation.data() ?? {};
            if (previous.requestFingerprint !== fingerprint)
                throw new https_1.HttpsError('already-exists', 'idempotencyKey reused for another payload');
            assertOperationActor(previous, actorUid);
            return { ok: true, messageId: input.messageId, auditId: String(previous.auditId ?? ''), replayed: true };
        }
        if (!message.exists)
            throw new https_1.HttpsError('not-found', 'app_message_not_found');
        const before = message.data() ?? {};
        assertGenericAppMessage(before);
        if (before.adminOperationLock)
            throw new https_1.HttpsError('aborted', 'app_message_operation_in_progress');
        const after = { ...before, active: input.active, updatedAt: new Date().toISOString(), updatedAtMs: Date.now(), updatedBy: actorEmail };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'app_message.toggle', actorUid, role,
            entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
            before, after, requestId: input.requestId, rollbackReference: input.messageId, timestamp: new Date().toISOString(),
        });
        tx.set(messageRef, after);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, actorUid, entityId: input.messageId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false };
    });
});
function assertOperationFingerprint(operation, fingerprint) {
    if (operation.requestFingerprint !== fingerprint) {
        throw new https_1.HttpsError('already-exists', 'idempotencyKey reused for another payload');
    }
}
function assertOperationActor(operation, actorUid) {
    if (operation.actorUid && operation.actorUid !== actorUid)
        throw new https_1.HttpsError('permission-denied', 'admin operation belongs to another actor');
}
function assertGenericAppMessage(data) {
    const kind = text(data.kind, 40) || 'message';
    if (kind !== 'message' && kind !== 'poll')
        throw new https_1.HttpsError('failed-precondition', `app_message_managed_by_special_workflow:${kind}`);
}
function plainPoll(value) {
    return isRecord(value) ? { ...value } : null;
}
exports.adminUpdateAppMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth.uid;
    const actorEmail = text(request.auth.token.email, 320) || actorUid;
    const input = normalizeAppMessageUpdateInput(request.data);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const claimed = await db.runTransaction(async (tx) => {
        const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
        if (operation.exists) {
            const previousOperation = operation.data() ?? {};
            assertOperationFingerprint(previousOperation, input.requestFingerprint);
            assertOperationActor(previousOperation, actorUid);
            return previousOperation;
        }
        if (!message.exists)
            throw new https_1.HttpsError('not-found', 'app_message_not_found');
        const before = message.data() ?? {};
        assertGenericAppMessage(before);
        if (before.active !== false)
            throw new https_1.HttpsError('failed-precondition', 'app_message_must_be_inactive_before_edit');
        if (before.adminOperationLock)
            throw new https_1.HttpsError('aborted', 'app_message_operation_in_progress');
        if (input.expectedUpdatedAtMs > 0 && Number(before.updatedAtMs || 0) !== input.expectedUpdatedAtMs) {
            throw new https_1.HttpsError('aborted', 'app_message_changed_after_preview');
        }
        const structureChanged = appMessagePollStructureChanged(before.poll, input.patch.poll);
        if (structureChanged && !input.resetPollEngagement)
            throw new https_1.HttpsError('failed-precondition', 'poll_structure_change_requires_reset');
        tx.set(messageRef, { active: false, adminOperationLock: input.idempotencyKey }, { merge: true });
        const pending = { operationId: input.idempotencyKey, requestFingerprint: input.requestFingerprint, actorUid, entityId: input.messageId, status: 'pending', before, structureChanged, createdAt: admin.firestore.FieldValue.serverTimestamp() };
        tx.create(operationRef, pending);
        return pending;
    });
    if (claimed.status === 'completed')
        return { ok: true, messageId: input.messageId, auditId: String(claimed.auditId ?? ''), replayed: true };
    const structureChanged = claimed.structureChanged === true;
    if (structureChanged)
        await (0, app_messages_1.clearAppMessagePollEngagement)(db, messageRef);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
        if (!operation.exists)
            throw new https_1.HttpsError('aborted', 'app_message_operation_missing');
        const currentOperation = operation.data() ?? claimed;
        assertOperationFingerprint(currentOperation, input.requestFingerprint);
        assertOperationActor(currentOperation, actorUid);
        if (currentOperation.status === 'completed')
            return { ok: true, messageId: input.messageId, auditId: String(currentOperation.auditId ?? ''), replayed: true };
        if (!message.exists)
            throw new https_1.HttpsError('not-found', 'app_message_not_found');
        const before = message.data() ?? {};
        if (before.active !== false)
            throw new https_1.HttpsError('failed-precondition', 'app_message_must_be_inactive_before_edit');
        if (before.adminOperationLock !== input.idempotencyKey)
            throw new https_1.HttpsError('aborted', 'app_message_operation_lock_lost');
        if (input.expectedUpdatedAtMs > 0 && Number(before.updatedAtMs || 0) !== input.expectedUpdatedAtMs) {
            throw new https_1.HttpsError('aborted', 'app_message_changed_after_preview');
        }
        const nowMs = Date.now();
        const after = {
            ...before,
            ...input.patch,
            active: false,
            updatedAt: new Date(nowMs).toISOString(),
            updatedAtMs: nowMs,
            updatedBy: actorEmail,
        };
        delete after.adminOperationLock;
        const nextPoll = plainPoll(input.patch.poll);
        if (!nextPoll) {
            delete after.poll;
            delete after.pollCounts;
            delete after.pollVoteCount;
            delete after.pollCountUpdatedAtMs;
            if (structureChanged)
                after.pollResetAtMs = nowMs;
        }
        else if (structureChanged) {
            const optionIds = Array.isArray(nextPoll.optionIds) ? nextPoll.optionIds.map((id) => text(id, 40)).filter(Boolean) : [];
            nextPoll.counts = Object.fromEntries(optionIds.map((id) => [id, 0]));
            nextPoll.voteCount = 0;
            after.poll = nextPoll;
            after.pollCounts = Object.fromEntries(optionIds.map((id) => [id, 0]));
            after.pollVoteCount = 0;
            after.pollCountUpdatedAtMs = nowMs;
            after.pollResetAtMs = nowMs;
        }
        else {
            const previousPoll = plainPoll(before.poll) ?? {};
            nextPoll.counts = previousPoll.counts ?? nextPoll.counts ?? {};
            nextPoll.voteCount = Number(previousPoll.voteCount ?? before.pollVoteCount ?? 0);
            after.poll = nextPoll;
        }
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'app_message.update', actorUid, role,
            entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
            before: isRecord(currentOperation.before) ? currentOperation.before : before, after, requestId: input.requestId,
            rollbackReference: input.messageId, timestamp: new Date(nowMs).toISOString(),
        });
        tx.set(messageRef, after);
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey, pollEngagementReset: structureChanged });
        tx.set(operationRef, { ...currentOperation, auditId: auditRef.id, status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false, pollEngagementReset: structureChanged };
    });
});
exports.adminDeleteAppMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth.uid;
    const input = normalizeAppMessageDeleteInput(request.data);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const claimed = await db.runTransaction(async (tx) => {
        const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
        if (operation.exists) {
            const previousOperation = operation.data() ?? {};
            assertOperationFingerprint(previousOperation, input.requestFingerprint);
            assertOperationActor(previousOperation, actorUid);
            return previousOperation;
        }
        if (!message.exists)
            throw new https_1.HttpsError('not-found', 'app_message_not_found');
        const before = message.data() ?? {};
        assertGenericAppMessage(before);
        if (before.adminOperationLock)
            throw new https_1.HttpsError('aborted', 'app_message_operation_in_progress');
        tx.set(messageRef, { active: false, adminOperationLock: input.idempotencyKey, updatedAtMs: Date.now() }, { merge: true });
        const pending = { operationId: input.idempotencyKey, requestFingerprint: input.requestFingerprint, actorUid, entityId: input.messageId, status: 'pending', before, createdAt: admin.firestore.FieldValue.serverTimestamp() };
        tx.create(operationRef, pending);
        return pending;
    });
    if (claimed.status === 'completed')
        return { ok: true, messageId: input.messageId, auditId: String(claimed.auditId ?? ''), replayed: true };
    await (0, app_messages_1.deleteAppMessageWithEngagement)(db, messageRef);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const operation = await tx.get(operationRef);
        const current = operation.data() ?? claimed;
        assertOperationFingerprint(current, input.requestFingerprint);
        assertOperationActor(current, actorUid);
        if (current.status === 'completed')
            return { ok: true, messageId: input.messageId, auditId: String(current.auditId ?? ''), replayed: true };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'app_message.delete', actorUid, role,
            entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
            before: isRecord(current.before) ? current.before : {}, after: { deleted: true }, requestId: input.requestId,
            rollbackReference: input.messageId, timestamp: new Date().toISOString(),
        });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.set(operationRef, { ...current, status: 'completed', auditId: auditRef.id, completedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false };
    });
});
exports.adminCleanupExpiredAppMessages = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth.uid;
    const input = normalizeAppMessageCleanupInput(request.data);
    const db = admin.firestore();
    const refs = input.messageIds.map((messageId) => db.collection('app_messages').doc(messageId));
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const claimed = await db.runTransaction(async (tx) => {
        const operation = await tx.get(operationRef);
        if (operation.exists) {
            const previousOperation = operation.data() ?? {};
            assertOperationFingerprint(previousOperation, input.requestFingerprint);
            assertOperationActor(previousOperation, actorUid);
            return previousOperation;
        }
        const messages = await Promise.all(refs.map((ref) => tx.get(ref)));
        const nowMs = Date.now();
        const beforeItems = messages.map((message, index) => {
            if (!message.exists)
                throw new https_1.HttpsError('not-found', `app_message_not_found:${input.messageIds[index]}`);
            const data = message.data() ?? {};
            if (Number(data.expiresAtMs || 0) > nowMs)
                throw new https_1.HttpsError('failed-precondition', `app_message_not_expired:${input.messageIds[index]}`);
            if (data.adminOperationLock)
                throw new https_1.HttpsError('aborted', `app_message_operation_in_progress:${input.messageIds[index]}`);
            tx.set(refs[index], { active: false, adminOperationLock: input.idempotencyKey, updatedAtMs: nowMs }, { merge: true });
            return { id: input.messageIds[index], titleRu: text(data.titleRu, 160), expiresAtMs: Number(data.expiresAtMs || 0), kind: text(data.kind, 40) };
        });
        const pending = { operationId: input.idempotencyKey, requestFingerprint: input.requestFingerprint, actorUid, entityId: 'expired_app_messages', status: 'pending', beforeItems, createdAt: admin.firestore.FieldValue.serverTimestamp() };
        tx.create(operationRef, pending);
        return pending;
    });
    if (claimed.status === 'completed')
        return { ok: true, deletedIds: input.messageIds, auditId: String(claimed.auditId ?? ''), replayed: true };
    for (const ref of refs)
        await (0, app_messages_1.deleteAppMessageWithEngagement)(db, ref);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const operation = await tx.get(operationRef);
        const current = operation.data() ?? claimed;
        assertOperationFingerprint(current, input.requestFingerprint);
        assertOperationActor(current, actorUid);
        if (current.status === 'completed')
            return { ok: true, deletedIds: input.messageIds, auditId: String(current.auditId ?? ''), replayed: true };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'app_message.cleanup_expired', actorUid, role,
            entity: { collection: 'app_messages', id: 'expired_app_messages' }, reason: input.reason,
            before: { items: Array.isArray(current.beforeItems) ? current.beforeItems : [] }, after: { deletedIds: input.messageIds }, requestId: input.requestId,
            rollbackReference: input.idempotencyKey, timestamp: new Date().toISOString(),
        });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.set(operationRef, { ...current, status: 'completed', auditId: auditRef.id, completedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, deletedIds: input.messageIds, auditId: auditRef.id, replayed: false };
    });
});
//# sourceMappingURL=admin_app_messages.js.map