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
exports.adminRestoreArenaPoolQuestion = exports.adminRemoveArenaPoolQuestion = exports.adminPublishArenaQuestionBatch = exports.adminListArenaQuestionPool = void 0;
exports.parseArenaPoolListRequest = parseArenaPoolListRequest;
exports.parseArenaPoolPublishRequest = parseArenaPoolPublishRequest;
exports.parseArenaPoolMutationRequest = parseArenaPoolMutationRequest;
exports.publicArenaPoolQuestion = publicArenaPoolQuestion;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const review_fingerprint_1 = require("./content_factory/review_fingerprint");
const arena_question_pool_1 = require("./arena_question_pool");
const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function requirePermission(request, permission) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ (0, roles_1.hasAdminRole)(request.auth.token.adminRole) ? request.auth.token.adminRole : 'owner';
    if (!role || !(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return role;
}
function parseArenaPoolListRequest(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => !['limit', 'level', 'availability', 'topicArtifactId'].includes(key)))
        throw new https_1.HttpsError('invalid-argument', 'arena_pool_list_invalid');
    const limit = data.limit === undefined ? 50 : Number(data.limit);
    const level = String(data.level ?? '').trim();
    const availability = String(data.availability ?? '').trim();
    const topicArtifactId = String(data.topicArtifactId ?? '').trim();
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || (level && !/^[A-C][1-2]$/.test(level)) || !['', 'active', 'removed'].includes(availability) || (topicArtifactId && !ID_RE.test(topicArtifactId)))
        throw new https_1.HttpsError('invalid-argument', 'arena_pool_list_invalid');
    return Object.freeze({ limit, level, availability, topicArtifactId });
}
function parseArenaPoolPublishRequest(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => !['stageId', 'expectedReviewFingerprint'].includes(key)))
        throw new https_1.HttpsError('invalid-argument', 'arena_pool_publish_invalid');
    const stageId = String(data.stageId ?? '').trim();
    const expectedReviewFingerprint = String(data.expectedReviewFingerprint ?? '').trim();
    if (!ID_RE.test(stageId) || !HASH_RE.test(expectedReviewFingerprint))
        throw new https_1.HttpsError('invalid-argument', 'arena_pool_publish_invalid');
    return Object.freeze({ stageId, expectedReviewFingerprint });
}
function parseArenaPoolMutationRequest(data, needsReason) {
    if (!isRecord(data) || Object.keys(data).some((key) => !['questionId', 'expectedRevision', 'reason'].includes(key)))
        throw new https_1.HttpsError('invalid-argument', 'arena_pool_mutation_invalid');
    const questionId = String(data.questionId ?? '').trim();
    const expectedRevision = Number(data.expectedRevision);
    const reason = String(data.reason ?? '').trim();
    if (!ID_RE.test(questionId) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision > 1000000 || (needsReason && (!reason || reason.length > 500)) || (!needsReason && reason))
        throw new https_1.HttpsError('invalid-argument', 'arena_pool_mutation_invalid');
    return Object.freeze({ questionId, expectedRevision, reason });
}
function publicArenaPoolQuestion(id, value) {
    return Object.freeze({
        id,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        level: value.level,
        availability: value.availability,
        skillTag: value.skillTag,
        difficulty: value.difficulty,
        rand: value.rand,
        question: value.question,
        options: Object.freeze([...value.options]),
        correct: value.correct,
        correctIndex: value.correctIndex,
        sourceStageId: value.sourceStageId,
        artifactId: value.artifactId,
        contentHash: value.contentHash,
        topicArtifactId: value.topicArtifactId,
        revision: value.revision,
        publishedAtMs: value.publishedAtMs,
        publishedBy: value.publishedBy,
        ...(value.removedAtMs !== undefined ? { removedAtMs: value.removedAtMs } : {}),
        ...(value.removedBy !== undefined ? { removedBy: value.removedBy } : {}),
        ...(value.removalReason !== undefined ? { removalReason: value.removalReason } : {}),
        ...(value.restoredAtMs !== undefined ? { restoredAtMs: value.restoredAtMs } : {}),
        ...(value.restoredBy !== undefined ? { restoredBy: value.restoredBy } : {}),
    });
}
exports.adminListArenaQuestionPool = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    const input = parseArenaPoolListRequest(request.data);
    let query = admin.firestore().collection('arena_questions');
    if (input.level)
        query = query.where('level', '==', input.level);
    if (input.availability)
        query = query.where('availability', '==', input.availability);
    if (input.topicArtifactId)
        query = query.where('topicArtifactId', '==', input.topicArtifactId);
    const snapshot = await query.orderBy('publishedAtMs', 'desc').limit(input.limit).get();
    return { questions: snapshot.docs.map((doc) => publicArenaPoolQuestion(doc.id, doc.data())) };
});
exports.adminPublishArenaQuestionBatch = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = requirePermission(request, 'content.publish');
    const input = parseArenaPoolPublishRequest(request.data);
    const db = admin.firestore();
    const stageRef = db.collection('content_factory_stages').doc(input.stageId);
    const stageSnapshot = await stageRef.get();
    if (!stageSnapshot.exists)
        throw new https_1.HttpsError('not-found', 'arena_pool_stage_not_found');
    const stage = stageSnapshot.data() ?? {};
    if (stage.kind !== 'arena_questions' || stage.state !== 'approved' || stage.arenaDraftSealed !== true || (0, review_fingerprint_1.contentStageReviewFingerprint)(input.stageId, stage) !== input.expectedReviewFingerprint)
        throw new https_1.HttpsError('failed-precondition', 'arena_pool_stage_not_publishable');
    try {
        const result = await (0, arena_question_pool_1.publishArenaQuestionBatch)({ bucket: admin.storage().bucket(), stage: { artifactId: String(stage.artifactId ?? ''), kind: 'arena_questions', state: String(stage.state ?? ''), count: Number(stage.count ?? 0), objectPath: String(stage.objectPath ?? ''), contentHash: String(stage.contentHash ?? ''), objectGeneration: String(stage.objectGeneration ?? ''), groundingReceipt: stage.groundingReceipt }, stageId: input.stageId, expectedReviewFingerprint: input.expectedReviewFingerprint, requestId: String(stage.requestId ?? ''), actorId: request.auth.uid, actorRole: role, nowMs: Date.now(), repository: (0, arena_question_pool_1.firestoreArenaQuestionPoolRepository)(db) });
        return { ok: true, ...result };
    }
    catch (error) {
        throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_pool_publish_failed');
    }
});
async function mutateArenaPoolQuestion(request, mode) {
    const role = requirePermission(request, 'content.publish');
    const input = parseArenaPoolMutationRequest(request.data, mode === 'remove');
    const db = admin.firestore();
    const ref = db.collection('arena_questions').doc(input.questionId);
    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists)
            throw new https_1.HttpsError('not-found', 'arena_pool_question_not_found');
        const current = snapshot.data();
        if (current.revision !== input.expectedRevision)
            throw new https_1.HttpsError('aborted', 'arena_pool_question_revision_stale');
        const nowMs = Date.now();
        const next = mode === 'remove' ? { availability: 'removed', removalReason: input.reason, removedAtMs: nowMs, removedBy: request.auth.uid, revision: current.revision + 1 } : { availability: 'active', restoredAtMs: nowMs, restoredBy: request.auth.uid, revision: current.revision + 1 };
        tx.update(ref, next);
        const auditRef = db.collection('admin_log').doc();
        tx.create(auditRef, { action: `arena_question_pool.${mode}`, actorUid: request.auth.uid, role, entity: { collection: 'arena_questions', id: input.questionId }, reason: mode === 'remove' ? input.reason : 'Arena question restored', before: { availability: current.availability, revision: current.revision }, after: { availability: next.availability, revision: next.revision }, timestamp: new Date().toISOString() });
        return { ok: true, questionId: input.questionId, revision: next.revision };
    });
}
exports.adminRemoveArenaPoolQuestion = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, (request) => mutateArenaPoolQuestion(request, 'remove'));
exports.adminRestoreArenaPoolQuestion = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, (request) => mutateArenaPoolQuestion(request, 'restore'));
//# sourceMappingURL=admin_arena_question_pool.js.map