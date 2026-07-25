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
exports.adminRelinkProvider = exports.adminRepairAuthLink = void 0;
exports.normalizeAuthLinkRepairInput = normalizeAuthLinkRepairInput;
exports.normalizeProviderRelinkInput = normalizeProviderRelinkInput;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const account_delete_job_1 = require("./account_delete_job");
const callable_options_1 = require("./callable_options");
/**
 * Ручная диагностика/починка/перепривязка auth-привязок из админки.
 *
 * Дополняет самообслуживаемое восстановление (auth_recovery.ts): когда юзер не
 * может доказать владение email-кодом (потерял почту, Apple private relay и
 * т.п.), владелец/админ чинит привязку вручную. Каждая операция:
 *   — gated permission'ом users.auth_repair (owner/admin, НЕ support);
 *   — идемпотентна через admin_command_operations (повтор с тем же
 *     idempotencyKey возвращает сохранённый result с replayed:true);
 *   — пишет аудит в admin_log через createAuditRecord (before/after).
 *
 * Форма записей повторяет ensureAuthLinkDoc / ensureProviderLinkedAuth из
 * auth_identity.ts (auth_links/{uid}.stable_id + users/{stableId}.firebaseAuthUid/
 * linkedAuth). Меняя ту форму — синхронно менять здесь.
 * Read-диагностики отдельным callable НЕТ намеренно: adminGetUserProfile уже
 * отдаёт auth_links в админ-UI (admin_user_profile.ts).
 */
const REGION = 'us-central1';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_REPAIR_PERMISSION = 'users.auth_repair';
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function numeric(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function actor(request) {
    const actorUid = text(request.auth?.uid, 160);
    const token = request.auth?.token;
    if (!actorUid || token?.admin !== true || !(0, roles_1.hasAdminRole)(token.adminRole) || !(0, permissions_1.hasPermission)(token.adminRole, AUTH_REPAIR_PERMISSION)) {
        throw new https_1.HttpsError('permission-denied', 'Admin permission required');
    }
    return { actorUid, role: token.adminRole, email: text(token.email, 320) || actorUid };
}
function normalizeProvider(value) {
    const raw = text(value, 20);
    return raw === 'google' || raw === 'apple' ? raw : null;
}
/** Провайдер из Firebase Auth record (providerData → google.com/apple.com). */
function providerFromAuthRecord(userRecord) {
    const providerId = text(userRecord?.providerData?.[0]?.providerId, 40).toLowerCase();
    if (providerId === 'google.com')
        return 'google';
    if (providerId === 'apple.com')
        return 'apple';
    return null;
}
function readLinkedAuth(userData) {
    const linked = record(userData.linkedAuth) ? userData.linkedAuth : {};
    return {
        provider: normalizeProvider(linked.provider),
        providerUid: text(linked.providerUid, 160),
        email: text(linked.email, 320) || null,
        displayName: text(linked.displayName, 160) || null,
        devicePlatform: text(linked.devicePlatform, 20) || null,
    };
}
function summarizeLinkDoc(linkSnap) {
    if (!linkSnap?.exists)
        return null;
    const data = linkSnap.data() ?? {};
    return {
        stable_id: data.stable_id ?? null,
        providerUid: data.providerUid ?? null,
        provider: data.provider ?? null,
        linkedAt: data.linkedAt ?? null,
    };
}
function normalizeAuthLinkRepairInput(data) {
    if (!record(data))
        throw new https_1.HttpsError('invalid-argument', 'auth link repair command required');
    const uid = text(data.uid, 160);
    const reason = text(data.reason, 500);
    const requestId = text(data.requestId, 160);
    const idempotencyKey = text(data.idempotencyKey, 160);
    if (!UID_RE.test(uid))
        throw new https_1.HttpsError('invalid-argument', 'uid is invalid');
    if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'reason and request ids are required');
    }
    return Object.freeze({ uid, reason, requestId, idempotencyKey });
}
exports.adminRepairAuthLink = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const input = normalizeAuthLinkRepairInput(request.data);
    const a = actor(request);
    const db = admin.firestore();
    const userRef = db.collection(USERS).doc(input.uid);
    const opRef = db.collection('admin_command_operations').doc(`auth_link_repair_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const now = Date.now();
    const fingerprint = JSON.stringify({ action: 'auth_link_repair', uid: input.uid, reason: input.reason });
    return db.runTransaction(async (tx) => {
        const op = await tx.get(opRef);
        if (op.exists) {
            const d = op.data() ?? {};
            if (d.requestFingerprint !== fingerprint || d.actorUid !== a.actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return { ...(record(d.result) ? d.result : {}), replayed: true };
        }
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists)
            throw new https_1.HttpsError('not-found', 'user not found');
        const userData = userSnap.data() ?? {};
        const linked = readLinkedAuth(userData);
        const firebaseAuthUid = text(userData.firebaseAuthUid, 160);
        // Канонический uid привязки: firebaseAuthUid, а если его нет — providerUid из linkedAuth.
        const canonicalAuthUid = firebaseAuthUid || linked.providerUid;
        if (!canonicalAuthUid) {
            throw new https_1.HttpsError('failed-precondition', 'no_provider_link');
        }
        const linkRef = db.collection(AUTH_LINKS).doc(canonicalAuthUid);
        const linkSnap = await tx.get(linkRef);
        const linkData = linkSnap.data() ?? {};
        // Дрифт-анализ: док привязки отсутствует / указывает не на тот stable_id /
        // не совпадают provider-поля / users-поля не консистентны.
        const driftReasons = [];
        if (!linkSnap.exists) {
            driftReasons.push('auth_link_missing');
        }
        else {
            if (text(linkData.stable_id, 160) !== input.uid)
                driftReasons.push('auth_link_stable_mismatch');
            if (linked.provider && text(linkData.providerUid, 160) !== canonicalAuthUid)
                driftReasons.push('auth_link_provider_uid_mismatch');
            if (linked.provider && normalizeProvider(linkData.provider) !== linked.provider)
                driftReasons.push('auth_link_provider_mismatch');
            if (linked.provider && numeric(linkData.linkedAt) <= 0)
                driftReasons.push('auth_link_linked_at_missing');
        }
        if (firebaseAuthUid !== canonicalAuthUid)
            driftReasons.push('users_firebase_auth_uid_missing');
        const before = {
            users: {
                firebaseAuthUid: firebaseAuthUid || null,
                linkedAuthProviderUid: linked.providerUid || null,
                linkedAuthProvider: linked.provider,
            },
            authLink: summarizeLinkDoc(linkSnap),
        };
        let auditId = null;
        if (driftReasons.length > 0) {
            const linkedAt = numeric(linkData.linkedAt) > 0 ? numeric(linkData.linkedAt) : now;
            // Форма ensureAuthLinkDoc (merge, linkedAt сохраняем).
            tx.set(linkRef, {
                stable_id: input.uid,
                updatedAt: now,
                ...(linked.provider
                    ? {
                        providerUid: canonicalAuthUid,
                        provider: linked.provider,
                        linkedAt,
                        lastSignInAt: numeric(linkData.lastSignInAt) > 0 ? numeric(linkData.lastSignInAt) : now,
                    }
                    : {}),
            }, { merge: true });
            if (firebaseAuthUid !== canonicalAuthUid) {
                tx.update(userRef, { firebaseAuthUid: canonicalAuthUid, updatedAt: now });
            }
            const after = {
                users: {
                    firebaseAuthUid: canonicalAuthUid,
                    linkedAuthProviderUid: linked.providerUid || null,
                    linkedAuthProvider: linked.provider,
                },
                authLink: {
                    stable_id: input.uid,
                    providerUid: linked.provider ? canonicalAuthUid : (linkData.providerUid ?? null),
                    provider: linked.provider ?? (linkData.provider ?? null),
                    linkedAt,
                },
                driftReasons,
            };
            const audit = (0, audit_contract_1.createAuditRecord)({
                action: 'auth_link_repair',
                actorUid: a.actorUid,
                role: a.role,
                entity: { collection: USERS, id: input.uid },
                reason: input.reason,
                before,
                after,
                requestId: input.requestId,
                timestamp: new Date(now).toISOString(),
            });
            tx.create(auditRef, { ...audit, operationId: opRef.id });
            auditId = auditRef.id;
        }
        const result = { ok: true, uid: input.uid, repaired: driftReasons.length > 0, driftReasons, auditId };
        tx.create(opRef, {
            action: 'auth_link_repair',
            requestFingerprint: fingerprint,
            actorUid: a.actorUid,
            auditId,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return result;
    });
});
function normalizeProviderRelinkInput(data) {
    if (!record(data))
        throw new https_1.HttpsError('invalid-argument', 'provider relink command required');
    const uid = text(data.uid, 160);
    const providerEmail = text(data.providerEmail, 320).toLowerCase() || null;
    const providerUid = text(data.providerUid, 160) || null;
    const reason = text(data.reason, 500);
    const requestId = text(data.requestId, 160);
    const idempotencyKey = text(data.idempotencyKey, 160);
    if (!UID_RE.test(uid))
        throw new https_1.HttpsError('invalid-argument', 'uid is invalid');
    // Ровно один идентификатор провайдера: email ИЛИ uid.
    if ((providerEmail ? 1 : 0) + (providerUid ? 1 : 0) !== 1) {
        throw new https_1.HttpsError('invalid-argument', 'exactly_one_provider_identifier_required');
    }
    if (providerEmail && !EMAIL_RE.test(providerEmail))
        throw new https_1.HttpsError('invalid-argument', 'provider_email_invalid');
    if (providerUid && !UID_RE.test(providerUid))
        throw new https_1.HttpsError('invalid-argument', 'provider_uid_invalid');
    if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'reason and request ids are required');
    }
    return Object.freeze({ uid, providerEmail, providerUid, reason, requestId, idempotencyKey });
}
exports.adminRelinkProvider = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const input = normalizeProviderRelinkInput(request.data);
    const a = actor(request);
    // Email → provider uid через Firebase Auth (источник правды для провайдерского
    // email — тот же принцип, что enrichMetadataFromAuth в auth_identity.ts).
    let resolvedProviderUid = input.providerUid;
    let authRecord = null;
    if (input.providerEmail) {
        try {
            authRecord = await admin.auth().getUserByEmail(input.providerEmail);
        }
        catch {
            throw new https_1.HttpsError('not-found', 'provider_not_found');
        }
        resolvedProviderUid = text(authRecord.uid, 160);
    }
    if (!resolvedProviderUid)
        throw new https_1.HttpsError('not-found', 'provider_not_found');
    const db = admin.firestore();
    const userRef = db.collection(USERS).doc(input.uid);
    const linkRef = db.collection(AUTH_LINKS).doc(resolvedProviderUid);
    const markerRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(resolvedProviderUid);
    const opRef = db.collection('admin_command_operations').doc(`auth_provider_relink_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const now = Date.now();
    const fingerprint = JSON.stringify({
        action: 'auth_provider_relink',
        uid: input.uid,
        providerUid: resolvedProviderUid,
        reason: input.reason,
    });
    return db.runTransaction(async (tx) => {
        const op = await tx.get(opRef);
        if (op.exists) {
            const d = op.data() ?? {};
            if (d.requestFingerprint !== fingerprint || d.actorUid !== a.actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return { ...(record(d.result) ? d.result : {}), replayed: true };
        }
        const [userSnap, linkSnap, markerSnap] = await Promise.all([
            tx.get(userRef),
            tx.get(linkRef),
            tx.get(markerRef),
        ]);
        if (!userSnap.exists)
            throw new https_1.HttpsError('not-found', 'user not found');
        if (markerSnap.exists) {
            // Инвариант ensureAuthLinkDoc: uid с незавершённым удалением не привязываем.
            throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
        }
        const userData = userSnap.data() ?? {};
        const linked = readLinkedAuth(userData);
        const oldFirebaseAuthUid = text(userData.firebaseAuthUid, 160);
        const previousProviderUids = Array.from(new Set([oldFirebaseAuthUid, linked.providerUid].filter((value) => value && value !== resolvedProviderUid)));
        const linkData = linkSnap.data() ?? {};
        const previousLinkedStableId = text(linkData.stable_id, 160);
        const displacedStableId = previousLinkedStableId && previousLinkedStableId !== input.uid
            ? previousLinkedStableId
            : null;
        const provider = providerFromAuthRecord(authRecord) ?? linked.provider;
        const email = input.providerEmail ?? (text(authRecord?.email, 320) || null) ?? linked.email;
        const displayName = text(authRecord?.displayName, 160) || linked.displayName;
        const before = {
            users: {
                firebaseAuthUid: oldFirebaseAuthUid || null,
                linkedAuthProviderUid: linked.providerUid || null,
                linkedAuthProvider: linked.provider,
            },
            authLink: summarizeLinkDoc(linkSnap),
            previousProviderUids,
        };
        // auth_links/{providerUid} — форма ensureAuthLinkDoc (merge, linkedAt сохраняем).
        const linkedAt = numeric(linkData.linkedAt) > 0 ? numeric(linkData.linkedAt) : now;
        tx.set(linkRef, {
            stable_id: input.uid,
            updatedAt: now,
            ...(provider
                ? {
                    providerUid: resolvedProviderUid,
                    provider,
                    linkedAt,
                    lastSignInAt: now,
                    email: email ?? null,
                    displayName: displayName ?? null,
                }
                : {}),
        }, { merge: true });
        // users/{stableId} — форма ensureProviderLinkedAuth.
        tx.set(userRef, {
            firebaseAuthUid: resolvedProviderUid,
            ...(provider
                ? {
                    linkedAuth: {
                        provider,
                        providerUid: resolvedProviderUid,
                        email: email ?? null,
                        displayName: displayName ?? null,
                        linkedAt: now,
                        lastSignInAt: now,
                        devicePlatform: linked.devicePlatform ?? 'web',
                    },
                }
                : {}),
            updatedAt: now,
        }, { merge: true });
        const after = {
            users: {
                firebaseAuthUid: resolvedProviderUid,
                linkedAuthProviderUid: provider ? resolvedProviderUid : (linked.providerUid || null),
                linkedAuthProvider: provider,
            },
            authLink: {
                stable_id: input.uid,
                providerUid: provider ? resolvedProviderUid : (linkData.providerUid ?? null),
                provider: provider ?? (linkData.provider ?? null),
                linkedAt,
            },
            previousProviderUids,
            ...(displacedStableId ? { displacedStableId } : {}),
        };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'auth_provider_relink',
            actorUid: a.actorUid,
            role: a.role,
            entity: { collection: USERS, id: input.uid },
            reason: input.reason,
            before,
            after,
            requestId: input.requestId,
            timestamp: new Date(now).toISOString(),
        });
        tx.create(auditRef, { ...audit, operationId: opRef.id });
        const result = {
            ok: true,
            uid: input.uid,
            providerUid: resolvedProviderUid,
            previousProviderUids,
            auditId: auditRef.id,
        };
        tx.create(opRef, {
            action: 'auth_provider_relink',
            requestFingerprint: fingerprint,
            actorUid: a.actorUid,
            auditId: auditRef.id,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return result;
    });
});
//# sourceMappingURL=admin_auth_repair.js.map