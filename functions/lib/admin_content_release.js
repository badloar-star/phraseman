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
exports.adminSealCourseRelease = exports.adminReviewCourseGeneration = void 0;
exports.parseSealCourseReleaseRequest = parseSealCourseReleaseRequest;
exports.parseCourseGenerationReviewRequest = parseCourseGenerationReviewRequest;
exports.assertSealOperationReplay = assertSealOperationReplay;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const release_sealing_1 = require("./content_factory/release_sealing");
const artifact_storage_1 = require("./content_factory/artifact_storage");
const source_registry_1 = require("./content_factory/source_registry");
const course_release_contract_1 = require("./content_factory/course_release_contract");
const release_review_1 = require("./content_factory/release_review");
const REGION = 'us-central1';
function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function roleFromToken(token) { return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null; }
function parseSealCourseReleaseRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'seal request required');
    const jobId = String(data.jobId ?? '').trim();
    const idempotencyKey = String(data.idempotencyKey ?? '').trim();
    const requestId = String(data.requestId ?? '').trim();
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey) || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId))
        throw new https_1.HttpsError('invalid-argument', 'invalid seal request');
    return Object.freeze({ jobId, idempotencyKey, requestId });
}
function parseCourseGenerationReviewRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'review request required');
    const jobId = String(data.jobId ?? '').trim();
    const status = String(data.status ?? '');
    const reason = String(data.reason ?? '').trim().slice(0, 500);
    const requestId = String(data.requestId ?? '').trim();
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || (status !== 'approved' && status !== 'rejected') || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId))
        throw new https_1.HttpsError('invalid-argument', 'invalid review request');
    return Object.freeze({ jobId, status, reason, requestId });
}
function assertSealOperationReplay(value, expectedJobId) {
    if (!isRecord(value) || value.action !== 'content_factory.course_release.seal' || value.jobId !== expectedJobId || typeof value.releaseId !== 'string' || !/^[A-Za-z0-9._-]{1,160}$/.test(value.releaseId)) {
        throw new https_1.HttpsError('already-exists', 'idempotency_key_reused');
    }
    return value.releaseId;
}
exports.adminReviewCourseGeneration = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.publish'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot review content');
    const input = parseCourseGenerationReviewRequest(request.data);
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(input.jobId);
    const reviewRef = db.collection('content_factory_job_reviews').doc(input.jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists)
        throw new https_1.HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${input.jobId}`;
    const lessonIds = Array.isArray(job.lessonIds) ? job.lessonIds.map(Number) : [];
    const unitsSnap = await db.collection('content_factory_job_units').where('jobId', '==', input.jobId).get();
    let blueprintHash = '';
    let sourceEvidenceIds = [];
    if (input.status === 'approved') {
        let reference;
        try {
            reference = (0, source_registry_1.parseSourceRegistryReference)(String(job.blueprintVersion ?? ''));
        }
        catch {
            throw new https_1.HttpsError('failed-precondition', 'blueprint_reference_invalid');
        }
        const registrySnap = await db.collection('content_factory_source_registry').doc((0, source_registry_1.sourceRegistryDocId)(reference.blueprintId, reference.version)).get();
        if (!registrySnap.exists)
            throw new https_1.HttpsError('failed-precondition', 'source_registry_not_found');
        const registry = registrySnap.data();
        const registryCheck = (0, source_registry_1.validateSourceRegistry)(registry);
        if (!registryCheck.ok)
            throw new https_1.HttpsError('failed-precondition', `source_registry_invalid:${registryCheck.errors.join(',')}`);
        blueprintHash = registry.blueprintHash;
        sourceEvidenceIds = registry.evidence.map((item) => item.evidenceId);
        const validation = (0, release_review_1.validateReleaseReviewCandidate)({ jobId: input.jobId, studyTarget, learnerSourceLocale, releaseId, expectedLessonIds: lessonIds, expectedBlueprintHash: blueprintHash, expectedEvidenceIds: sourceEvidenceIds, units: unitsSnap.docs.map((doc) => doc.data()) });
        if (!validation.ok)
            throw new https_1.HttpsError('failed-precondition', `release_review_failed:${validation.errors.join(',')}`);
    }
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [currentJobSnap, currentReviewSnap] = await Promise.all([tx.get(jobRef), tx.get(reviewRef)]);
        if (!currentJobSnap.exists)
            throw new https_1.HttpsError('not-found', 'generation_job_not_found');
        const currentJob = currentJobSnap.data() ?? {};
        const nextState = input.status === 'approved' ? 'approved' : 'needs_review';
        const review = { jobId: input.jobId, status: input.status, reason: input.reason, reviewerId: request.auth?.uid, blueprintHash, sourceEvidenceIds, reviewedUnitCount: unitsSnap.size, reviewedAt: admin.firestore.FieldValue.serverTimestamp() };
        const audit = {
            action: 'content_factory.course_generation.review',
            actorUid: request.auth?.uid,
            role,
            entity: { collection: 'content_factory_jobs', id: input.jobId },
            reason: input.reason,
            requestId: input.requestId,
            before: { state: currentJob.state ?? null, review: currentReviewSnap.exists ? currentReviewSnap.data() : null },
            after: { state: nextState, status: input.status, blueprintHash, sourceEvidenceIds, reviewedUnitCount: unitsSnap.size },
            timestamp: new Date().toISOString(),
        };
        tx.set(reviewRef, review, { merge: false });
        tx.set(jobRef, { state: nextState, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.create(auditRef, audit);
        return { ok: true, jobId: input.jobId, status: input.status, auditId: auditRef.id };
    });
});
exports.adminSealCourseRelease = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.publish'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot seal content');
    const input = parseSealCourseReleaseRequest(request.data);
    const db = admin.firestore();
    const jobSnap = await db.collection('content_factory_jobs').doc(input.jobId).get();
    if (!jobSnap.exists)
        throw new https_1.HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const blueprintReference = String(job.blueprintVersion ?? '').trim();
    if (!studyTarget || !learnerSourceLocale)
        throw new https_1.HttpsError('failed-precondition', 'generation_job_identity_missing');
    let sourceReference;
    try {
        sourceReference = (0, source_registry_1.parseSourceRegistryReference)(blueprintReference);
    }
    catch {
        throw new https_1.HttpsError('failed-precondition', 'blueprint_reference_invalid');
    }
    const reviewSnap = await db.collection('content_factory_job_reviews').doc(input.jobId).get();
    const review = reviewSnap.data() ?? {};
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const existingOperation = await operationRef.get();
    if (existingOperation.exists)
        return { ok: true, releaseId: assertSealOperationReplay(existingOperation.data(), input.jobId), replayed: true };
    const unitsSnap = await db.collection('content_factory_job_units').where('jobId', '==', input.jobId).get();
    const units = unitsSnap.docs.map((doc) => doc.data());
    const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${input.jobId}`;
    const registrySnap = await db.collection('content_factory_source_registry').doc((0, source_registry_1.sourceRegistryDocId)(sourceReference.blueprintId, sourceReference.version)).get();
    if (!registrySnap.exists)
        throw new https_1.HttpsError('failed-precondition', 'source_registry_not_found');
    const registry = registrySnap.data();
    const registryCheck = (0, source_registry_1.validateSourceRegistry)(registry);
    if (!registryCheck.ok)
        throw new https_1.HttpsError('failed-precondition', `source_registry_invalid:${registryCheck.errors.join(',')}`);
    const reviewValidation = (0, release_review_1.validateReleaseReviewCandidate)({ jobId: input.jobId, studyTarget, learnerSourceLocale, releaseId, expectedLessonIds: Array.isArray(job.lessonIds) ? job.lessonIds.map(Number) : [], expectedBlueprintHash: registry.blueprintHash, expectedEvidenceIds: registry.evidence.map((item) => item.evidenceId), units });
    const reviewedEvidenceIds = Array.isArray(review.sourceEvidenceIds) ? [...new Set(review.sourceEvidenceIds.map(String))].sort() : [];
    const expectedEvidenceIds = [...new Set(registry.evidence.map((item) => item.evidenceId))].sort();
    if (!reviewValidation.ok || review.status !== 'approved' || review.blueprintHash !== registry.blueprintHash || reviewedEvidenceIds.join('|') !== expectedEvidenceIds.join('|') || Number(review.reviewedUnitCount) !== units.length) {
        throw new https_1.HttpsError('failed-precondition', `release_review_stale_or_invalid:${reviewValidation.errors.join(',')}`);
    }
    const artifacts = {};
    const bucket = admin.storage().bucket();
    for (const surface of course_release_contract_1.CANONICAL_RELEASE_SURFACES) {
        const surfaceUnits = units.filter((unit) => unit.surface === surface);
        if (!surfaceUnits.length || surfaceUnits.some((unit) => unit.state !== 'succeeded'))
            throw new https_1.HttpsError('failed-precondition', `surface_incomplete:${surface}`);
        const indexPath = `course-releases/${releaseId}/${surface}/index.json`;
        const index = { releaseId, studyTarget, learnerSourceLocale, surface, units: surfaceUnits.map((unit) => ({ lessonId: Number(unit.lessonId), objectPath: String(unit.objectPath), contentHash: String(unit.contentHash), objectGeneration: String(unit.objectGeneration), ...(surface === 'arena' ? { engineResolved: String(unit.engineResolved ?? 'legacy'), configRevision: Number(unit.configRevision ?? 0), comparatorVersion: String(unit.comparatorVersion ?? '') } : {}) })).sort((a, b) => a.lessonId - b.lessonId) };
        const receipt = await (0, artifact_storage_1.writeImmutableObject)(bucket, indexPath, index);
        artifacts[surface] = { releaseId, studyTarget, learnerSourceLocale, surface, contentHash: receipt.contentHash, objectGeneration: receipt.objectGeneration, byteSize: receipt.byteSize, entryIndex: receipt.objectPath };
    }
    const release = (0, release_sealing_1.buildCourseRelease)({ releaseId, studyTarget, learnerSourceLocale, blueprintId: sourceReference.blueprintId, blueprintHash: registry.blueprintHash, contentVersion: input.jobId, minAppVersion: String(review.minAppVersion ?? '1.0.0'), reviewStatus: String(review.status ?? ''), reviewerId: String(review.reviewerId ?? ''), unitStates: Object.fromEntries(course_release_contract_1.CANONICAL_RELEASE_SURFACES.map((surface) => [surface, 'succeeded'])), artifacts });
    const releaseRef = db.collection('content_factory_releases').doc(releaseId);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [existing, operation] = await Promise.all([tx.get(releaseRef), tx.get(operationRef)]);
        if (operation.exists)
            return { ok: true, releaseId: assertSealOperationReplay(operation.data(), input.jobId), replayed: true };
        if (existing.exists)
            throw new https_1.HttpsError('already-exists', 'course release already sealed');
        tx.create(releaseRef, { ...release, reviewStatus: review.status, reviewerId: review.reviewerId, sealedBy: request.auth?.uid, sealedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.create(operationRef, { operationId: input.idempotencyKey, action: 'content_factory.course_release.seal', jobId: input.jobId, releaseId, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.create(auditRef, {
            action: 'content_factory.course_release.seal',
            actorUid: request.auth?.uid,
            role,
            entity: { collection: 'content_factory_releases', id: releaseId },
            reason: 'Approved Language Factory release sealed',
            requestId: input.requestId,
            before: { jobId: input.jobId, reviewStatus: review.status, release: null },
            after: { jobId: input.jobId, releaseId, reviewStatus: review.status, artifactSurfaces: course_release_contract_1.CANONICAL_RELEASE_SURFACES },
            operationId: input.idempotencyKey,
            timestamp: new Date().toISOString(),
        });
        return { ok: true, releaseId, auditId: auditRef.id, replayed: false };
    });
});
//# sourceMappingURL=admin_content_release.js.map