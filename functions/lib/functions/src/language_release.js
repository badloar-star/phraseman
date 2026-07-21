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
exports.getPublishedCourseRelease = exports.adminRollbackCourseRelease = exports.adminActivateCourseRelease = void 0;
exports.assertReleaseActivationMetadata = assertReleaseActivationMetadata;
exports.courseCatalogId = courseCatalogId;
exports.parseActivateCourseReleaseRequest = parseActivateCourseReleaseRequest;
exports.parseRollbackCourseReleaseRequest = parseRollbackCourseReleaseRequest;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const course_release_contract_1 = require("./content_factory/course_release_contract");
const REGION = 'us-central1';
function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function roleFromToken(token) { return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null; }
function assertReleaseActivationMetadata(value) {
    if (!isRecord(value) || value.reviewStatus !== 'approved')
        throw new Error('course_release_not_approved');
    if (typeof value.reviewerId !== 'string' || !value.reviewerId.trim() || typeof value.sealedBy !== 'string' || !value.sealedBy.trim())
        throw new Error('course_release_review_metadata_missing');
}
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
function courseCatalogId(studyTarget, learnerSourceLocale) {
    if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(learnerSourceLocale))
        throw new Error('course_catalog_identity_invalid');
    return `${studyTarget}:${learnerSourceLocale}`;
}
function parseActivateCourseReleaseRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'activation request required');
    const releaseId = String(data.releaseId ?? '').trim();
    const expectedRevision = Number(data.expectedRevision);
    const idempotencyKey = String(data.idempotencyKey ?? '').trim();
    const reason = String(data.reason ?? '').trim().slice(0, 500);
    const requestId = String(data.requestId ?? '').trim();
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(releaseId) || !Number.isInteger(expectedRevision) || expectedRevision < 0 || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey) || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId))
        throw new https_1.HttpsError('invalid-argument', 'invalid activation request');
    return Object.freeze({ releaseId, expectedRevision, idempotencyKey, reason, requestId });
}
function parseRollbackCourseReleaseRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'rollback request required');
    const targetReleaseId = String(data.targetReleaseId ?? '').trim();
    const expectedCurrentReleaseId = String(data.expectedCurrentReleaseId ?? '').trim();
    const expectedRevision = Number(data.expectedRevision);
    const idempotencyKey = String(data.idempotencyKey ?? '').trim();
    const reason = String(data.reason ?? '').trim().slice(0, 500);
    const requestId = String(data.requestId ?? '').trim();
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(targetReleaseId) || !/^[A-Za-z0-9._-]{1,160}$/.test(expectedCurrentReleaseId) || targetReleaseId === expectedCurrentReleaseId || !Number.isInteger(expectedRevision) || expectedRevision < 1 || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey) || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId))
        throw new https_1.HttpsError('invalid-argument', 'invalid rollback request');
    return Object.freeze({ targetReleaseId, expectedCurrentReleaseId, expectedRevision, idempotencyKey, reason, requestId });
}
function membershipId(catalogId, releaseId) {
    return `${catalogId}__${releaseId}`;
}
exports.adminActivateCourseRelease = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.publish'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot activate content');
    const input = parseActivateCourseReleaseRequest(request.data);
    const db = admin.firestore();
    const releaseSnap = await db.collection('content_factory_releases').doc(input.releaseId).get();
    if (!releaseSnap.exists)
        throw new https_1.HttpsError('not-found', 'course_release_not_found');
    const releaseData = releaseSnap.data();
    try {
        assertReleaseActivationMetadata(releaseData);
    }
    catch (error) {
        throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'course_release_not_approved');
    }
    const release = (0, course_release_contract_1.assertCourseRelease)(releaseData);
    if (release.releaseId !== input.releaseId)
        throw new https_1.HttpsError('failed-precondition', 'release_catalog_identity_mismatch');
    const catalogId = courseCatalogId(release.studyTarget, release.learnerSourceLocale);
    const catalogRef = db.collection('content_factory_catalog').doc(catalogId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const historyRef = db.collection('content_factory_release_history').doc();
    const auditRef = db.collection('admin_log').doc();
    const membershipRef = db.collection('content_factory_catalog_releases').doc(membershipId(catalogId, input.releaseId));
    return db.runTransaction(async (tx) => {
        const [catalogSnap, operationSnap, membershipSnap] = await Promise.all([tx.get(catalogRef), tx.get(operationRef), tx.get(membershipRef)]);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            if (operation.releaseId !== input.releaseId || operation.catalogId !== catalogId)
                throw new https_1.HttpsError('already-exists', 'idempotency_key_reused');
            return { ok: true, releaseId: input.releaseId, revision: Number(operation.revision ?? 0), replayed: true };
        }
        const catalog = catalogSnap.data() ?? {};
        const revision = Number(catalog.revision ?? 0);
        if (revision !== input.expectedRevision)
            throw new https_1.HttpsError('failed-precondition', 'catalog_changed_reload_before_activation');
        const nextRevision = revision + 1;
        const nextActive = { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, blueprintId: release.blueprintId, blueprintHash: release.blueprintHash };
        const audit = { action: 'content_factory.course_release.activate', actorUid: request.auth?.uid, role, entity: { collection: 'content_factory_catalog', id: catalogId }, reason: input.reason, requestId: input.requestId, before: { revision, activeRelease: catalog.activeRelease ?? null }, after: { revision: nextRevision, activeRelease: nextActive }, rollbackReference: historyRef.id, operationId: input.idempotencyKey, timestamp: new Date().toISOString() };
        tx.set(catalogRef, { studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, revision: nextRevision, activeRelease: nextActive, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.create(historyRef, audit);
        tx.create(auditRef, audit);
        if (!membershipSnap.exists)
            tx.create(membershipRef, { catalogId, releaseId: input.releaseId, firstActivatedRevision: nextRevision, firstActivatedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.create(operationRef, { operationId: input.idempotencyKey, releaseId: input.releaseId, catalogId, revision: nextRevision, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, releaseId: input.releaseId, catalogId, revision: nextRevision, auditId: auditRef.id, replayed: false };
    });
});
exports.adminRollbackCourseRelease = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.publish'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot rollback content');
    const input = parseRollbackCourseReleaseRequest(request.data);
    const db = admin.firestore();
    const releaseSnap = await db.collection('content_factory_releases').doc(input.targetReleaseId).get();
    if (!releaseSnap.exists)
        throw new https_1.HttpsError('not-found', 'rollback_course_release_not_found');
    const releaseData = releaseSnap.data();
    try {
        assertReleaseActivationMetadata(releaseData);
    }
    catch (error) {
        throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'course_release_not_approved');
    }
    const release = (0, course_release_contract_1.assertCourseRelease)(releaseData);
    const catalogId = courseCatalogId(release.studyTarget, release.learnerSourceLocale);
    const catalogRef = db.collection('content_factory_catalog').doc(catalogId);
    const membershipRef = db.collection('content_factory_catalog_releases').doc(membershipId(catalogId, input.targetReleaseId));
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const historyRef = db.collection('content_factory_release_history').doc();
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [catalogSnap, membershipSnap, operationSnap] = await Promise.all([tx.get(catalogRef), tx.get(membershipRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const operation = operationSnap.data() ?? {};
            if (operation.releaseId !== input.targetReleaseId || operation.catalogId !== catalogId)
                throw new https_1.HttpsError('already-exists', 'idempotency_key_reused');
            return { ok: true, releaseId: input.targetReleaseId, revision: Number(operation.revision ?? 0), replayed: true };
        }
        if (!catalogSnap.exists)
            throw new https_1.HttpsError('not-found', 'course_catalog_not_found');
        if (!membershipSnap.exists)
            throw new https_1.HttpsError('failed-precondition', 'rollback_target_was_never_active');
        const catalog = catalogSnap.data() ?? {};
        const revision = Number(catalog.revision ?? 0);
        const current = isRecord(catalog.activeRelease) ? catalog.activeRelease : {};
        if (revision !== input.expectedRevision || current.releaseId !== input.expectedCurrentReleaseId)
            throw new https_1.HttpsError('failed-precondition', 'catalog_changed_reload_before_rollback');
        const nextRevision = revision + 1;
        const nextActive = { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, blueprintId: release.blueprintId, blueprintHash: release.blueprintHash };
        const audit = { action: 'content_factory.course_release.rollback', actorUid: request.auth?.uid, role, entity: { collection: 'content_factory_catalog', id: catalogId }, reason: input.reason, requestId: input.requestId, before: { revision, activeRelease: catalog.activeRelease }, after: { revision: nextRevision, activeRelease: nextActive }, rollbackReference: historyRef.id, operationId: input.idempotencyKey, timestamp: new Date().toISOString() };
        tx.set(catalogRef, { revision: nextRevision, activeRelease: nextActive, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.create(historyRef, audit);
        tx.create(auditRef, audit);
        tx.create(operationRef, { operationId: input.idempotencyKey, releaseId: input.targetReleaseId, catalogId, revision: nextRevision, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, releaseId: input.targetReleaseId, catalogId, revision: nextRevision, auditId: auditRef.id, replayed: false };
    });
});
exports.getPublishedCourseRelease = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign-in required');
    const studyTarget = String(request.data?.studyTarget ?? '').trim();
    const learnerSourceLocale = String(request.data?.learnerSourceLocale ?? request.data?.sourceLocale ?? '').trim();
    let catalogId;
    try {
        catalogId = courseCatalogId(studyTarget, learnerSourceLocale);
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'course_release_identity_invalid');
    }
    const catalogSnap = await admin.firestore().collection('content_factory_catalog').doc(catalogId).get();
    const active = catalogSnap.data()?.activeRelease;
    if (!isRecord(active) || active.studyTarget !== studyTarget || active.learnerSourceLocale !== learnerSourceLocale || typeof active.releaseId !== 'string')
        throw new https_1.HttpsError('not-found', 'active_course_release_not_found');
    const releaseSnap = await admin.firestore().collection('content_factory_releases').doc(active.releaseId).get();
    if (!releaseSnap.exists)
        throw new https_1.HttpsError('data-loss', 'active_course_release_missing');
    const release = (0, course_release_contract_1.assertCourseRelease)(releaseSnap.data());
    if (release.studyTarget !== studyTarget || release.learnerSourceLocale !== learnerSourceLocale)
        throw new https_1.HttpsError('data-loss', 'active_course_release_identity_mismatch');
    return release;
});
//# sourceMappingURL=language_release.js.map