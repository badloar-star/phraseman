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
exports.adminEditContentStageArtifact = void 0;
exports.commitArtifactEditRevision = commitArtifactEditRevision;
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const artifact_edit_1 = require("./content_factory/artifact_edit");
const artifact_storage_1 = require("./content_factory/artifact_storage");
const release_surface_delivery_1 = require("./content_factory/release_surface_delivery");
const review_fingerprint_1 = require("./content_factory/review_fingerprint");
const stage_capabilities_1 = require("./content_factory/stage_capabilities");
const REGION = 'us-central1';
function requireDraftRole(request) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = request.auth.token.adminRole;
    if (!(0, roles_1.hasAdminRole)(role) || !(0, permissions_1.hasPermission)(role, 'content.draft.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot use content.draft.write');
    return role;
}
async function commitArtifactEditRevision(input) {
    const { db, request, prepared, receipt, actorUid, role } = input;
    const eventId = (0, node_crypto_1.createHash)('sha256').update(`${request.baseStageId}:${request.idempotencyKey}`).digest('hex');
    const baseRef = db.collection('content_factory_stages').doc(request.baseStageId);
    const newRef = db.collection('content_factory_stages').doc(prepared.newStageId);
    const eventRef = db.collection('content_factory_correction_events').doc(eventId);
    const auditRef = db.collection('admin_log').doc(eventId);
    return db.runTransaction(async (tx) => {
        const [currentBaseSnapshot, currentNewSnapshot, eventSnapshot] = await Promise.all([tx.get(baseRef), tx.get(newRef), tx.get(eventRef)]);
        if (!currentBaseSnapshot.exists)
            throw new https_1.HttpsError('not-found', 'content_stage_not_found');
        const currentBase = { stageId: currentBaseSnapshot.id, ...(currentBaseSnapshot.data() ?? {}) };
        if ((0, review_fingerprint_1.contentStageReviewFingerprint)(currentBaseSnapshot.id, currentBase) !== request.expectedBaseReviewFingerprint)
            throw new https_1.HttpsError('aborted', 'artifact_edit_base_fingerprint_stale');
        if (eventSnapshot.exists) {
            const event = eventSnapshot.data() ?? {};
            if (event.newStageId !== prepared.newStageId || event.newContentHash !== receipt.contentHash || event.baseReviewFingerprint !== request.expectedBaseReviewFingerprint)
                throw new https_1.HttpsError('already-exists', 'artifact_edit_idempotency_conflict');
            return { ok: true, stageId: prepared.newStageId, artifactId: prepared.newArtifactId, revision: prepared.revision, reviewState: 'needs_review', diff: event.diff ?? prepared.diff, replayed: true };
        }
        if (currentNewSnapshot.exists)
            throw new https_1.HttpsError('already-exists', 'artifact_edit_revision_conflict');
        const baseRevisionIdentity = `${request.baseStageId}:${String(currentBase.revision)}:${String(currentBase.contentHash)}`;
        const newStage = {
            ...currentBase, stageId: prepared.newStageId, artifactId: prepared.newArtifactId, idempotencyKey: prepared.newStageId,
            revision: prepared.revision, state: 'needs_review', objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, contentHash: receipt.contentHash,
            artifactAttempt: prepared.artifactAttempt, artifactLeaseTokenHash: prepared.artifactLeaseTokenHash, artifactByteSize: receipt.byteSize,
            artifactReferenceState: 'committed', artifactFinalizationKey: receipt.finalizationKey,
            baseStageId: request.baseStageId, baseArtifactId: currentBase.artifactId, baseContentHash: currentBase.contentHash, baseReviewFingerprint: request.expectedBaseReviewFingerprint,
            baseRevisionIdentity, editOperationId: eventId, editReason: request.reason, semanticDiff: prepared.diff,
            operatorCorrected: true, correctionStatus: 'collected_pending_review', qaReceipt: { policy: 'artifact-edit-validation-v1', status: 'passed', deterministic: true },
            createdBy: actorUid, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        delete newStage.reviewedBy;
        delete newStage.reviewedAt;
        delete newStage.reviewReason;
        delete newStage.linguisticReview;
        delete newStage.judgeReceipt;
        delete newStage.judgeUpdatedAt;
        tx.create(newRef, newStage);
        tx.create(eventRef, {
            operationId: eventId, idempotencyKey: request.idempotencyKey, baseStageId: request.baseStageId, baseArtifactId: currentBase.artifactId, baseContentHash: currentBase.contentHash,
            baseReviewFingerprint: request.expectedBaseReviewFingerprint, newStageId: prepared.newStageId, newArtifactId: prepared.newArtifactId, newContentHash: receipt.contentHash,
            objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, actorUid, reason: request.reason, diff: prepared.diff,
            changedSemanticPaths: prepared.diff.details.map((detail) => detail.path), changedCount: prepared.diff.totalDetails, status: 'pending_review', createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.create(auditRef, { action: 'content_factory.stage.artifact_edit', actorUid, role, entity: { collection: 'content_factory_stages', id: prepared.newStageId }, operationId: eventId, reason: request.reason, before: { stageId: request.baseStageId, artifactId: currentBase.artifactId, contentHash: currentBase.contentHash }, after: { stageId: prepared.newStageId, artifactId: prepared.newArtifactId, contentHash: receipt.contentHash, state: 'needs_review' }, timestamp: new Date().toISOString() });
        return { ok: true, stageId: prepared.newStageId, artifactId: prepared.newArtifactId, revision: prepared.revision, reviewState: 'needs_review', diff: prepared.diff, replayed: false };
    });
}
exports.adminEditContentStageArtifact = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = requireDraftRole(request);
    let input;
    try {
        input = (0, artifact_edit_1.parseArtifactEditRequest)(request.data);
    }
    catch (error) {
        throw new https_1.HttpsError('invalid-argument', error instanceof Error ? error.message : 'artifact_edit_invalid');
    }
    const db = admin.firestore();
    const baseRef = db.collection('content_factory_stages').doc(input.baseStageId);
    const baseSnapshot = await baseRef.get();
    if (!baseSnapshot.exists)
        throw new https_1.HttpsError('not-found', 'content_stage_not_found');
    const baseRecord = { stageId: baseSnapshot.id, ...(baseSnapshot.data() ?? {}) };
    const kind = String(baseRecord.kind ?? '');
    try {
        (0, stage_capabilities_1.stageCapability)(kind);
    }
    catch {
        throw new https_1.HttpsError('failed-precondition', 'artifact_edit_base_kind_invalid');
    }
    const base = { ...baseRecord, kind };
    if (!['needs_review', 'approved'].includes(String(base.state)))
        throw new https_1.HttpsError('failed-precondition', 'artifact_edit_base_state_invalid');
    if ((0, review_fingerprint_1.contentStageReviewFingerprint)(baseSnapshot.id, base) !== input.expectedBaseReviewFingerprint)
        throw new https_1.HttpsError('aborted', 'artifact_edit_base_fingerprint_stale');
    const objectPath = String(base.objectPath ?? '');
    const objectGeneration = String(base.objectGeneration ?? '');
    const contentHash = String(base.contentHash ?? '');
    if (!objectPath || !objectGeneration || !/^[a-f0-9]{64}$/i.test(contentHash))
        throw new https_1.HttpsError('failed-precondition', 'artifact_edit_base_receipt_invalid');
    const baseFile = admin.storage().bucket().file(objectPath);
    const [metadata] = await baseFile.getMetadata();
    if (String(metadata.generation ?? '') !== objectGeneration)
        throw new https_1.HttpsError('data-loss', 'artifact_edit_base_generation_mismatch');
    const [baseBytes] = await baseFile.download({ validation: false });
    let baseArtifact;
    try {
        baseArtifact = (0, release_surface_delivery_1.parseHashedJsonBytes)(baseBytes, contentHash);
    }
    catch (error) {
        throw new https_1.HttpsError('data-loss', error instanceof Error ? error.message : 'artifact_edit_base_payload_invalid');
    }
    let prepared;
    try {
        prepared = (0, artifact_edit_1.prepareArtifactEdit)(base, baseArtifact, input.artifact, input.idempotencyKey);
    }
    catch (error) {
        throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'artifact_edit_validation_failed');
    }
    const receipt = await (0, artifact_storage_1.writeImmutableObject)(admin.storage().bucket(), prepared.objectPath, prepared.candidateArtifact);
    const newRef = db.collection('content_factory_stages').doc(prepared.newStageId);
    try {
        return await commitArtifactEditRevision({ db, request: input, prepared, receipt, actorUid: request.auth.uid, role });
    }
    catch (error) {
        const committed = await newRef.get();
        if (!committed.exists || committed.data()?.contentHash !== receipt.contentHash) {
            const orphanId = (0, node_crypto_1.createHash)('sha256').update(`${receipt.objectPath}:${receipt.objectGeneration}:${receipt.contentHash}`).digest('hex');
            await db.collection('content_factory_artifact_orphans').doc(orphanId).set({ state: 'orphan_candidate', reason: 'artifact_edit_transaction_not_committed', entityCollection: 'content_factory_stages', entityId: prepared.newStageId, objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, contentHash: receipt.contentHash, finalizationKey: receipt.finalizationKey, detectedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        throw error;
    }
});
//# sourceMappingURL=admin_content_stage_edits.js.map