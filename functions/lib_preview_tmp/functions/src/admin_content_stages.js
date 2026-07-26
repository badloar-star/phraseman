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
exports.adminReviewContentStage = exports.adminPreviewContentStage = exports.adminGetContentStageCapabilities = exports.adminListContentStageDependencies = exports.adminListContentStages = exports.adminControlContentStage = exports.adminCreateContentStage = void 0;
exports.flashcardPublishedDuplicateIds = flashcardPublishedDuplicateIds;
exports.parseContentStageCreateRequest = parseContentStageCreateRequest;
exports.parseContentStageListRequest = parseContentStageListRequest;
exports.buildContentStageListQuery = buildContentStageListQuery;
exports.buildContentStageDependencyQuery = buildContentStageDependencyQuery;
exports.stagePlanFromStoredPrerequisites = stagePlanFromStoredPrerequisites;
exports.contentStagePlanFingerprint = contentStagePlanFingerprint;
exports.parseContentStageControlRequest = parseContentStageControlRequest;
exports.parseContentStagePreviewRequest = parseContentStagePreviewRequest;
exports.parseContentStageReviewRequest = parseContentStageReviewRequest;
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const stage_service_1 = require("./content_factory/stage_service");
const stage_control_repository_1 = require("./content_factory/stage_control_repository");
const prompt_promotion_registry_1 = require("./content_factory/prompt_promotion_registry");
const release_surface_delivery_1 = require("./content_factory/release_surface_delivery");
const content_stage_worker_1 = require("./content_stage_worker");
const prerequisite_grounding_1 = require("./content_factory/prerequisite_grounding");
const dedupe_ledger_1 = require("./content_factory/dedupe_ledger");
const lesson_review_planner_1 = require("./content_factory/lesson_review_planner");
const quiz_challenge_grounding_1 = require("./content_factory/quiz_challenge_grounding");
const question_batch_ledger_1 = require("./content_factory/question_batch_ledger");
const flashcard_grounding_1 = require("./content_factory/flashcard_grounding");
const flashcard_pack_ledger_1 = require("./content_factory/flashcard_pack_ledger");
const flashcard_artifacts_1 = require("./content_factory/flashcard_artifacts");
const flashcard_semantic_registry_1 = require("./content_factory/flashcard_semantic_registry");
const arena_grounding_1 = require("./content_factory/arena_grounding");
const arena_question_ledger_1 = require("./content_factory/arena_question_ledger");
const arena_stage_consumer_adapter_1 = require("./content_factory/arena_stage_consumer_adapter");
const stage_capabilities_1 = require("./content_factory/stage_capabilities");
const dependency_catalog_1 = require("./content_factory/dependency_catalog");
const review_fingerprint_1 = require("./content_factory/review_fingerprint");
const REGION = 'us-central1';
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const KINDS = ['lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory', 'quiz_topic', 'quiz_questions', 'challenge_topic', 'challenge_questions', 'quiz_question_replacement', 'challenge_question_replacement', 'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement', 'arena_topic', 'arena_questions', 'arena_question_replacement'];
const CREATE_FIELDS = new Set(['requestId', 'kind', 'studyTarget', 'sourceLocale', 'cefr', 'objective', 'scopeId', 'count', 'revision', 'prerequisiteStageIds', 'replacementForQuestionId', 'replacementForCardId']);
const DERIVED_LESSON_KINDS = new Set(['lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory']);
function stageIdFromArtifactId(artifactId) {
    const stageId = artifactId.startsWith('artifact:') ? artifactId.slice('artifact:'.length) : '';
    if (!STAGE_ID_RE.test(stageId))
        throw new https_1.HttpsError('failed-precondition', 'question_replacement_artifact_identity_invalid');
    return stageId;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function flashcardPublishedDuplicateIds(items, packs, studyTarget, sourceLocale) {
    const publishedKeys = new Set((0, content_stage_worker_1.flashcardKeysFromPublishedPacks)(packs, studyTarget, sourceLocale));
    return Object.freeze(items.filter((item) => publishedKeys.has((0, flashcard_artifacts_1.flashcardSemanticKey)(item))).map((item) => isRecord(item) ? String(item.id ?? '') : '').filter(Boolean));
}
function flashcardDuplicateIdsFromKeys(items, keys) {
    const publishedKeys = new Set(keys);
    return Object.freeze(items.filter((item) => publishedKeys.has((0, flashcard_artifacts_1.flashcardSemanticKey)(item))).map((item) => isRecord(item) ? String(item.id ?? '') : '').filter(Boolean));
}
async function resolvePublishedFlashcardKeysForReview(tx, db, studyTarget, sourceLocale, items) {
    if (items.length > 20)
        throw new https_1.HttpsError('failed-precondition', 'flashcard_candidate_keys_too_many');
    const configSnapshot = await tx.get(db.collection('content_factory_config').doc('flashcard_semantic_registry'));
    const config = configSnapshot.data() ?? {};
    const catalogGeneration = Number(config.catalogGeneration ?? 0);
    const verifiedGeneration = Number(config.verifiedGeneration ?? -1);
    if (config.mode === 'registry' && config.manifestComplete === true && Number.isSafeInteger(catalogGeneration) && catalogGeneration === verifiedGeneration) {
        const partition = { surface: 'community_flashcards', studyTarget, sourceLocale };
        const keys = [...new Set(items.map(flashcard_artifacts_1.flashcardSemanticKey).filter((key) => key && key !== '\u0000'))];
        const snapshots = await Promise.all(keys.map((key) => tx.get(db.collection('content_factory_flashcard_semantic_keys').doc((0, flashcard_semantic_registry_1.flashcardRegistryDocumentId)(partition, key)))));
        return Object.freeze({ authority: 'registry', keys: Object.freeze(keys.filter((_key, index) => snapshots[index].exists)) });
    }
    const publishedSnapshot = await tx.get(db.collection('community_packs').where('listingStatus', '==', 'published').limit(501));
    if (publishedSnapshot.size > 500)
        throw new https_1.HttpsError('failed-precondition', 'flashcard_published_catalog_registry_required');
    const legacyKeys = (0, content_stage_worker_1.flashcardKeysFromPublishedPacks)(publishedSnapshot.docs.map((item) => item.data()), studyTarget, sourceLocale);
    return Object.freeze({ authority: 'legacy', keys: legacyKeys, comparison: null });
}
function roleFromToken(token) {
    return /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : 'owner';
}
function requirePermission(request, permission) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return role;
}
function parseContentStageCreateRequest(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => !CREATE_FIELDS.has(key)))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_create_invalid');
    const requestId = String(data.requestId ?? '').trim();
    const kind = String(data.kind ?? '');
    const studyTarget = String(data.studyTarget ?? '').trim();
    const sourceLocale = String(data.sourceLocale ?? '').trim();
    const cefr = String(data.cefr ?? '');
    const objective = String(data.objective ?? '').trim();
    const scopeId = String(data.scopeId ?? '').trim();
    const count = Number(data.count);
    const revision = Number(data.revision);
    const prerequisiteStageIds = Array.isArray(data.prerequisiteStageIds) ? data.prerequisiteStageIds.map(String) : [];
    const replacementForQuestionId = String(data.replacementForQuestionId ?? '').trim();
    const replacementForCardId = String(data.replacementForCardId ?? '').trim();
    if (!TOKEN_RE.test(requestId) || !KINDS.includes(kind) || !LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(sourceLocale) || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(cefr) || !objective || objective.length > 1000 || !TOKEN_RE.test(scopeId) || !Number.isSafeInteger(count) || (count < 1 && kind !== 'flashcard_items') || count > 1000 || !Number.isSafeInteger(revision) || revision < 1 || revision > 10000 || prerequisiteStageIds.some((id) => !STAGE_ID_RE.test(id)) || new Set(prerequisiteStageIds).size !== prerequisiteStageIds.length) {
        throw new https_1.HttpsError('invalid-argument', 'content_stage_create_invalid');
    }
    try {
        const capability = (0, stage_capabilities_1.stageCapability)(kind);
        (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind, count, cefr, studyTarget, sourceLocale, prerequisiteKinds: capability.prerequisiteKinds });
    }
    catch (error) {
        throw new https_1.HttpsError('invalid-argument', error instanceof Error ? error.message : 'stage_capability_invalid');
    }
    const replacementKind = kind === 'quiz_question_replacement' || kind === 'challenge_question_replacement' || kind === 'arena_question_replacement';
    if ((replacementKind && (!TOKEN_RE.test(replacementForQuestionId) || count !== 1)) || (!replacementKind && replacementForQuestionId))
        throw new https_1.HttpsError('invalid-argument', 'question_replacement_identity_invalid');
    const cardReplacementKind = kind === 'flashcard_item_replacement';
    if ((cardReplacementKind && (!TOKEN_RE.test(replacementForCardId) || count !== 1)) || (!cardReplacementKind && replacementForCardId))
        throw new https_1.HttpsError('invalid-argument', 'flashcard_replacement_identity_invalid');
    return Object.freeze({ requestId, kind, studyTarget, sourceLocale, cefr, objective, scopeId, count, revision, prerequisiteStageIds: Object.freeze(prerequisiteStageIds), ...(replacementKind ? { replacementForQuestionId } : {}), ...(cardReplacementKind ? { replacementForCardId } : {}) });
}
function parseContentStageListRequest(data) {
    const record = isRecord(data) ? data : {};
    const requestId = String(record.requestId ?? '').trim();
    const cursor = String(record.cursor ?? '').trim();
    const kind = String(record.kind ?? '').trim();
    const state = String(record.state ?? '').trim();
    const studyTarget = String(record.studyTarget ?? '').trim();
    const sourceLocale = String(record.sourceLocale ?? '').trim();
    const scopeId = String(record.scopeId ?? '').trim();
    const requestedLimit = Number(record.limit ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
    const states = ['queued', 'running', 'paused', 'failed', 'needs_review', 'approved', 'rejected', 'cancelled', 'superseded'];
    if (!TOKEN_RE.test(requestId) || (cursor && !STAGE_ID_RE.test(cursor)) || (kind && !KINDS.includes(kind)) || (state && !states.includes(state)) || (studyTarget && !LOCALE_RE.test(studyTarget)) || (sourceLocale && !LOCALE_RE.test(sourceLocale)) || (scopeId && !TOKEN_RE.test(scopeId)))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_list_invalid');
    return Object.freeze({ requestId, limit, cursor, kind, state, studyTarget, sourceLocale, scopeId });
}
function buildContentStageListQuery(db, input) {
    let query = db.collection('content_factory_stages').where('requestId', '==', input.requestId);
    if (input.kind)
        query = query.where('kind', '==', input.kind);
    if (input.state)
        query = query.where('state', '==', input.state);
    if (input.studyTarget)
        query = query.where('studyTarget', '==', input.studyTarget);
    if (input.sourceLocale)
        query = query.where('sourceLocale', '==', input.sourceLocale);
    if (input.scopeId)
        query = query.where('scopeId', '==', input.scopeId);
    query = query.orderBy(admin.firestore.FieldPath.documentId());
    if (input.cursor)
        query = query.startAfter(input.cursor);
    return query.limit(input.limit + 1);
}
function buildContentStageDependencyQuery(db, input) {
    let query = db.collection('content_factory_stages')
        .where('requestId', '==', input.requestId)
        .where('studyTarget', '==', input.studyTarget)
        .where('sourceLocale', '==', input.sourceLocale)
        .where('state', '==', 'approved')
        .where('kind', 'in', input.allowedKinds);
    if (input.scopeId && input.consumerKind !== 'flashcard_items')
        query = query.where('scopeId', '==', input.scopeId);
    query = query.orderBy(admin.firestore.FieldPath.documentId());
    if (input.cursor)
        query = query.startAfter(input.cursor);
    return query.limit(input.limit + 1);
}
function stagePlanFromStoredPrerequisites(input, stored) {
    const byId = new Map(stored.map((item) => [String(item.stageId ?? ''), item]));
    const prerequisites = input.prerequisiteStageIds.map((stageId) => {
        const item = byId.get(stageId);
        if (!item)
            throw new https_1.HttpsError('failed-precondition', 'generation_stage_prerequisite_document_missing', { stageId });
        const selectedLessonForCards = input.kind === 'flashcard_items' && item.kind === 'lesson_phrases';
        if (item.requestId !== input.requestId || item.studyTarget !== input.studyTarget || item.sourceLocale !== input.sourceLocale || (!selectedLessonForCards && item.scopeId !== input.scopeId))
            throw new https_1.HttpsError('failed-precondition', 'generation_stage_prerequisite_identity_mismatch', { stageId });
        return { kind: String(item.kind ?? ''), artifactId: String(item.artifactId ?? ''), state: String(item.state ?? '') };
    });
    const activePrompt = (0, prompt_promotion_registry_1.activePromptProfile)(input.kind);
    const schemaVersion = activePrompt.schemaVersion;
    const promptVersion = activePrompt.promptVersion;
    const qaPolicy = activePrompt.qaPolicy;
    try {
        const { replacementForQuestionId: _replacementForQuestionId, replacementForCardId: _replacementForCardId, ...planningInput } = input;
        return (0, stage_service_1.buildGenerationStagePlan)({ ...planningInput, schemaVersion, promptVersion, qaPolicy, approvedPrerequisites: prerequisites });
    }
    catch (error) {
        throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'generation_stage_prerequisite_invalid');
    }
}
function contentStagePlanFingerprint(input, prerequisiteArtifactIds) {
    const activePrompt = (0, prompt_promotion_registry_1.activePromptProfile)(input.kind);
    const payload = JSON.stringify({
        requestId: input.requestId, kind: input.kind, studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, cefr: input.cefr, objective: input.objective, scopeId: input.scopeId, count: input.count, revision: input.revision, replacementForQuestionId: input.replacementForQuestionId ?? null, replacementForCardId: input.replacementForCardId ?? null,
        prerequisiteStageIds: [...input.prerequisiteStageIds].sort(), prerequisiteArtifactIds: [...prerequisiteArtifactIds].sort(), schemaVersion: activePrompt.schemaVersion, promptVersion: activePrompt.promptVersion, qaPolicy: activePrompt.qaPolicy,
    });
    return (0, node_crypto_1.createHash)('sha256').update(payload).digest('hex');
}
function parseContentStageControlRequest(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => key !== 'stageId' && key !== 'action'))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_control_invalid');
    const stageId = String(data.stageId ?? '').trim();
    const action = String(data.action ?? '');
    if (!STAGE_ID_RE.test(stageId) || !['pause', 'resume', 'cancel'].includes(action))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_control_invalid');
    return Object.freeze({ stageId, action });
}
function parseContentStagePreviewRequest(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => key !== 'stageId'))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_preview_invalid');
    const stageId = String(data.stageId ?? '').trim();
    if (!STAGE_ID_RE.test(stageId))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_preview_invalid');
    return Object.freeze({ stageId });
}
function parseContentStageReviewRequest(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => !['stageId', 'status', 'reason', 'expectedReviewFingerprint'].includes(key)))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_review_invalid');
    const stageId = String(data.stageId ?? '').trim();
    const status = String(data.status ?? '');
    const reason = String(data.reason ?? '').trim();
    const expectedReviewFingerprint = String(data.expectedReviewFingerprint ?? '').trim();
    if (!STAGE_ID_RE.test(stageId) || !['approved', 'rejected'].includes(status) || reason.length < 5 || reason.length > 500 || !/^[a-f0-9]{64}$/i.test(expectedReviewFingerprint))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_review_invalid');
    return Object.freeze({ stageId, status, reason, expectedReviewFingerprint });
}
exports.adminCreateContentStage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = requirePermission(request, 'content.draft.write');
    const input = parseContentStageCreateRequest(request.data);
    const db = admin.firestore();
    const expectedStageId = `${input.requestId}:${input.kind}:${input.scopeId}:r${input.revision}`;
    const stageRef = db.collection('content_factory_stages').doc(expectedStageId);
    return db.runTransaction(async (tx) => {
        const existing = await tx.get(stageRef);
        const prerequisiteSnapshots = await Promise.all(input.prerequisiteStageIds.map((stageId) => tx.get(db.collection('content_factory_stages').doc(stageId))));
        const plan = stagePlanFromStoredPrerequisites(input, prerequisiteSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => ({ stageId: snapshot.id, ...(snapshot.data() ?? {}) })));
        const planFingerprint = contentStagePlanFingerprint(input, plan.unit.prerequisiteArtifactIds);
        if (existing.exists) {
            const current = existing.data() ?? {};
            if (current.planFingerprint !== planFingerprint)
                throw new https_1.HttpsError('already-exists', 'content_stage_idempotency_conflict');
            return { ok: true, stageId: expectedStageId, state: current.state ?? 'queued', replayed: true };
        }
        tx.create(stageRef, { ...plan.unit, cefr: input.cefr, objective: input.objective, prerequisiteStageIds: input.prerequisiteStageIds, ...(input.replacementForQuestionId ? { replacementForQuestionId: input.replacementForQuestionId } : {}), ...(input.replacementForCardId ? { replacementForCardId: input.replacementForCardId } : {}), ...(input.kind.startsWith('lesson_') ? { blueprintVersion: 'english-core-32:v1' } : {}), ...(input.kind.startsWith('challenge_') || input.kind === 'flashcard_pack_idea' ? { publicationPolicy: 'draft_only_no_consumer' } : {}), ...(input.kind === 'flashcard_items' || input.kind === 'flashcard_item_replacement' ? { publicationPolicy: 'standard' } : {}), planFingerprint, createdBy: request.auth.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.create(db.collection('admin_log').doc(), { action: 'content_factory.stage.create', actorUid: request.auth.uid, role, entity: { collection: 'content_factory_stages', id: plan.unit.stageId }, operationId: plan.unit.idempotencyKey, reason: 'Content generation stage created', before: null, after: { state: plan.unit.state, artifactId: plan.unit.artifactId }, timestamp: new Date().toISOString() });
        return { ok: true, stageId: plan.unit.stageId, state: plan.unit.state, replayed: false };
    });
});
exports.adminControlContentStage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = requirePermission(request, 'content.draft.write');
    const input = parseContentStageControlRequest(request.data);
    try {
        return await (0, stage_control_repository_1.controlContentStage)(admin.firestore(), { stageId: input.stageId, action: input.action, actorUid: request.auth.uid, role, nowIso: new Date().toISOString(), serverTimestamp: admin.firestore.FieldValue.serverTimestamp(), deleteValue: admin.firestore.FieldValue.delete() });
    }
    catch (error) {
        const code = error instanceof Error ? error.message : 'content_stage_control_failed';
        if (code === 'content_stage_not_found')
            throw new https_1.HttpsError('not-found', code);
        if (code === 'generation_stage_transition_invalid')
            throw new https_1.HttpsError('failed-precondition', code);
        throw new https_1.HttpsError('aborted', code);
    }
});
exports.adminListContentStages = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    const input = parseContentStageListRequest(request.data);
    const db = admin.firestore();
    const snapshot = await buildContentStageListQuery(db, input).get();
    const docs = snapshot.docs.slice(0, input.limit);
    return { ok: true, stages: docs.map((doc) => ({ id: doc.id, ...doc.data() })), nextCursor: snapshot.size > input.limit ? docs.at(-1)?.id ?? null : null, isPartial: snapshot.size > input.limit };
});
exports.adminListContentStageDependencies = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    let input;
    try {
        input = (0, dependency_catalog_1.parseDependencyCatalogRequest)(request.data);
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'dependency_catalog_invalid');
    }
    const snapshot = await buildContentStageDependencyQuery(admin.firestore(), input).get();
    const result = (0, dependency_catalog_1.dependencyCatalogItems)(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })), input.limit);
    return { ok: true, ...result };
});
exports.adminGetContentStageCapabilities = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    return { ok: true, version: 'content-stage-capabilities-r10a-v1', languagePolicy: stage_capabilities_1.stageLanguagePolicy, capabilities: stage_capabilities_1.generationStageCapabilities };
});
exports.adminPreviewContentStage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    const { stageId } = parseContentStagePreviewRequest(request.data);
    const snapshot = await admin.firestore().collection('content_factory_stages').doc(stageId).get();
    if (!snapshot.exists)
        throw new https_1.HttpsError('not-found', 'content_stage_not_found');
    const stage = snapshot.data() ?? {};
    const revision = Number(stage.revision);
    const objectPath = String(stage.objectPath ?? '');
    const contentHash = String(stage.contentHash ?? '');
    const objectGeneration = String(stage.objectGeneration ?? '');
    const artifactAttempt = Number(stage.artifactAttempt);
    const artifactLeaseTokenHash = String(stage.artifactLeaseTokenHash ?? '');
    if (!['needs_review', 'approved', 'rejected'].includes(String(stage.state)) || objectPath !== (0, content_stage_worker_1.contentStageObjectPathFromHash)(stageId, revision, artifactAttempt, artifactLeaseTokenHash) || !/^[a-f0-9]{64}$/i.test(contentHash) || !objectGeneration)
        throw new https_1.HttpsError('failed-precondition', 'content_stage_not_previewable');
    const file = admin.storage().bucket().file(objectPath);
    const [metadata] = await file.getMetadata();
    if (String(metadata.generation ?? '') !== objectGeneration)
        throw new https_1.HttpsError('data-loss', 'content_stage_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    let payload;
    try {
        payload = (0, release_surface_delivery_1.parseHashedJsonBytes)(bytes, contentHash);
    }
    catch (error) {
        throw new https_1.HttpsError('data-loss', error instanceof Error ? error.message : 'content_stage_payload_invalid');
    }
    return { ok: true, stage: { id: snapshot.id, ...stage }, payload, qaReceipt: isRecord(stage.qaReceipt) ? stage.qaReceipt : null, judgeReceipt: isRecord(stage.judgeReceipt) ? stage.judgeReceipt : null, reviewFingerprint: (0, review_fingerprint_1.contentStageReviewFingerprint)(snapshot.id, stage) };
});
exports.adminReviewContentStage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = requirePermission(request, 'content.publish');
    const input = parseContentStageReviewRequest(request.data);
    const db = admin.firestore();
    const stageRef = db.collection('content_factory_stages').doc(input.stageId);
    const preliminarySnapshot = await stageRef.get();
    if (!preliminarySnapshot.exists)
        throw new https_1.HttpsError('not-found', 'content_stage_not_found');
    const preliminary = preliminarySnapshot.data() ?? {};
    let phraseGrounding = null;
    let questionBatch = null;
    let questionReplacement = null;
    let flashcardBatch = null;
    let flashcardReplacement = null;
    let arenaBatch = null;
    let arenaReplacement = null;
    let arenaRuntimeDraft = null;
    if (input.status === 'approved' && preliminary.kind === 'lesson_phrases') {
        try {
            phraseGrounding = await (0, prerequisite_grounding_1.loadApprovedLessonGrounding)(admin.storage().bucket(), {
                stageId: input.stageId, artifactId: String(preliminary.artifactId ?? ''), kind: String(preliminary.kind ?? ''), state: String(preliminary.state ?? ''), studyTarget: String(preliminary.studyTarget ?? ''), cefr: String(preliminary.cefr ?? ''), promptVersion: String(preliminary.promptVersion ?? ''), groundingReceipt: preliminary.groundingReceipt, objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''),
            }, { allowNeedsReviewForApproval: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'lesson_phrase_grounding_invalid');
        }
        if (phraseGrounding.extraction.state !== 'ready')
            throw new https_1.HttpsError('failed-precondition', 'lesson_extraction_review_required');
    }
    if (input.status === 'approved' && (preliminary.kind === 'quiz_questions' || preliminary.kind === 'challenge_questions')) {
        try {
            questionBatch = await (0, quiz_challenge_grounding_1.loadQuestionBatchForReview)(admin.storage().bucket(), { stageId: input.stageId, artifactId: String(preliminary.artifactId ?? ''), kind: preliminary.kind, state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_batch_review_invalid');
        }
    }
    if (preliminary.kind === 'quiz_question_replacement' || preliminary.kind === 'challenge_question_replacement') {
        try {
            questionReplacement = await (0, quiz_challenge_grounding_1.loadQuestionReplacementForReview)(admin.storage().bucket(), { artifactId: String(preliminary.artifactId ?? ''), kind: preliminary.kind, state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_replacement_review_invalid');
        }
    }
    if (input.status === 'approved' && preliminary.kind === 'flashcard_items') {
        try {
            flashcardBatch = await (0, flashcard_grounding_1.loadFlashcardBatchForReview)(admin.storage().bucket(), { artifactId: String(preliminary.artifactId ?? ''), kind: 'flashcard_items', state: String(preliminary.state ?? ''), count: Number(preliminary.resolvedCount ?? preliminary.count), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_batch_review_invalid');
        }
    }
    if (preliminary.kind === 'flashcard_item_replacement') {
        try {
            flashcardReplacement = await (0, flashcard_grounding_1.loadFlashcardReplacementForReview)(admin.storage().bucket(), { artifactId: String(preliminary.artifactId ?? ''), kind: 'flashcard_item_replacement', state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_review_invalid');
        }
    }
    if (input.status === 'approved' && preliminary.kind === 'arena_questions') {
        try {
            arenaBatch = await (0, arena_grounding_1.loadArenaQuestionBatchForReview)(admin.storage().bucket(), { artifactId: String(preliminary.artifactId ?? ''), kind: 'arena_questions', state: String(preliminary.state ?? ''), count: 10, objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_batch_review_invalid');
        }
        try {
            arenaRuntimeDraft = (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ requestId: String(preliminary.requestId ?? ''), topicArtifactId: arenaBatch.topicArtifactId, topic: arenaBatch.topic, batches: [{ artifactId: arenaBatch.artifactId, items: arenaBatch.items }] });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_runtime_draft_invalid');
        }
    }
    if (preliminary.kind === 'arena_question_replacement') {
        try {
            arenaReplacement = await (0, arena_grounding_1.loadArenaQuestionReplacementForReview)(admin.storage().bucket(), { artifactId: String(preliminary.artifactId ?? ''), kind: 'arena_question_replacement', state: String(preliminary.state ?? ''), objectPath: String(preliminary.objectPath ?? ''), contentHash: String(preliminary.contentHash ?? ''), objectGeneration: String(preliminary.objectGeneration ?? ''), groundingReceipt: preliminary.groundingReceipt }, { allowNeedsReview: true });
        }
        catch (error) {
            throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_replacement_review_invalid');
        }
    }
    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(stageRef);
        if (!snapshot.exists)
            throw new https_1.HttpsError('not-found', 'content_stage_not_found');
        const stage = snapshot.data() ?? {};
        if ((0, review_fingerprint_1.contentStageReviewFingerprint)(snapshot.id, stage) !== input.expectedReviewFingerprint)
            throw new https_1.HttpsError('aborted', 'content_stage_review_fingerprint_stale');
        if (stage.state === input.status)
            return { ok: true, stageId: input.stageId, state: input.status, replayed: true };
        if (stage.state !== 'needs_review' && !(stage.state === 'approved' && input.status === 'rejected'))
            throw new https_1.HttpsError('failed-precondition', 'content_stage_review_state_invalid');
        if (!stage.objectPath || !stage.contentHash || !stage.objectGeneration || !stage.qaReceipt)
            throw new https_1.HttpsError('failed-precondition', 'content_stage_review_evidence_missing');
        const updates = { state: input.status, reviewReason: input.reason, reviewedBy: request.auth.uid, reviewedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        const editOperationId = String(stage.editOperationId ?? '');
        const correctionEventRef = /^[a-f0-9]{64}$/i.test(editOperationId) ? db.collection('content_factory_correction_events').doc(editOperationId) : null;
        const correctionEventSnapshot = correctionEventRef ? await tx.get(correctionEventRef) : null;
        if (correctionEventRef) {
            if (!correctionEventSnapshot?.exists || correctionEventSnapshot.data()?.newStageId !== input.stageId || correctionEventSnapshot.data()?.newContentHash !== stage.contentHash)
                throw new https_1.HttpsError('failed-precondition', 'content_stage_correction_event_mismatch');
            updates.correctionStatus = input.status === 'approved' ? 'collected_accepted' : 'collected_rejected';
        }
        if (stage.kind === 'lesson_phrases') {
            if (input.status === 'approved')
                updates.linguisticReview = { status: 'human_approved', reviewerUid: request.auth.uid, reason: input.reason, automatedJudgeStatus: isRecord(stage.judgeReceipt) ? String(stage.judgeReceipt.status ?? 'not_collected') : 'not_collected' };
            const lessonId = (0, prerequisite_grounding_1.lessonIdFromScopeId)(String(stage.scopeId ?? ''));
            const ledgerRef = db.collection('content_factory_lesson_ledgers').doc((0, prerequisite_grounding_1.lessonLedgerDocumentId)(String(stage.requestId ?? ''), String(stage.studyTarget ?? '')));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, dedupe_ledger_1.parseLessonLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, String(stage.studyTarget ?? ''));
            let nextLedger;
            let staleLessonIds;
            if (input.status === 'approved') {
                if (!phraseGrounding || phraseGrounding.contentHash !== stage.contentHash || phraseGrounding.artifactId !== stage.artifactId)
                    throw new https_1.HttpsError('aborted', 'lesson_phrase_grounding_changed');
                const candidates = [...phraseGrounding.extraction.vocabulary, ...phraseGrounding.extraction.irregularVerbs, ...phraseGrounding.extraction.prepositions];
                const planned = (0, lesson_review_planner_1.planLessonPhraseLedgerReview)({ status: 'approved', ledger, lessonId, phraseArtifactId: String(stage.artifactId), candidates });
                nextLedger = planned.ledger;
                staleLessonIds = planned.staleLessonIds;
                updates.extractionReceipt = JSON.parse(JSON.stringify(phraseGrounding.extraction));
                updates.ledgerRevision = nextLedger.revision;
                updates.ledgerFingerprint = nextLedger.lessons[lessonId]?.fingerprint;
            }
            else {
                const planned = (0, lesson_review_planner_1.planLessonPhraseLedgerReview)({ status: 'rejected', ledger, lessonId, phraseArtifactId: String(stage.artifactId), candidates: [] });
                nextLedger = planned.ledger;
                staleLessonIds = planned.staleLessonIds;
                updates.ledgerRevision = nextLedger.revision;
            }
            const related = await tx.get(db.collection('content_factory_stages').where('requestId', '==', stage.requestId));
            const staleScopes = new Set(staleLessonIds.map((id) => `lesson-${id}`));
            for (const relatedStage of related.docs) {
                const data = relatedStage.data();
                if (relatedStage.id !== input.stageId && DERIVED_LESSON_KINDS.has(data.kind) && staleScopes.has(String(data.scopeId)) && ['needs_review', 'approved', 'rejected'].includes(String(data.state)))
                    tx.update(relatedStage.ref, { state: 'superseded', staleReason: 'lesson_ledger_fingerprint_changed', staleAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            tx.set(ledgerRef, nextLedger);
        }
        if (stage.kind === 'quiz_questions' || stage.kind === 'challenge_questions') {
            const topicArtifactIds = Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [];
            if (topicArtifactIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'question_topic_artifact_required');
            const ledgerRef = db.collection('content_factory_question_ledgers').doc((0, question_batch_ledger_1.questionLedgerDocumentId)(String(stage.requestId ?? ''), topicArtifactIds[0]));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, question_batch_ledger_1.parseQuestionBatchLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, topicArtifactIds[0]);
            if (input.status === 'approved') {
                if (!questionBatch || questionBatch.artifactId !== stage.artifactId || questionBatch.contentHash !== stage.contentHash || questionBatch.topicArtifactId !== topicArtifactIds[0])
                    throw new https_1.HttpsError('aborted', 'question_batch_review_changed');
                try {
                    const approved = (0, question_batch_ledger_1.approveQuestionBatch)(ledger, { batchArtifactId: String(stage.artifactId), items: questionBatch.items });
                    tx.set(ledgerRef, approved.ledger);
                    updates.questionLedgerRevision = approved.ledger.revision;
                    updates.questionLedgerContentHash = approved.ledger.batches[String(stage.artifactId)]?.contentHash;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_batch_ledger_invalid');
                }
            }
            else {
                const activeReplacementArtifacts = Object.values(ledger.batches[String(stage.artifactId)]?.replacements ?? {}).map((history) => history[history.length - 1]?.artifactId).filter((artifactId) => Boolean(artifactId));
                const activeReplacementSnapshots = await Promise.all(activeReplacementArtifacts.map((artifactId) => tx.get(db.collection('content_factory_stages').doc(stageIdFromArtifactId(artifactId)))));
                const rolledBack = (0, question_batch_ledger_1.rollbackQuestionBatch)(ledger, String(stage.artifactId));
                tx.set(ledgerRef, rolledBack);
                for (const replacementSnapshot of activeReplacementSnapshots)
                    if (replacementSnapshot.exists)
                        tx.update(replacementSnapshot.ref, { state: 'superseded', staleReason: 'question_batch_rollback', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                updates.questionLedgerRevision = rolledBack.revision;
            }
        }
        if (stage.kind === 'quiz_question_replacement' || stage.kind === 'challenge_question_replacement') {
            if (!questionReplacement || questionReplacement.artifactId !== stage.artifactId || questionReplacement.contentHash !== stage.contentHash)
                throw new https_1.HttpsError('aborted', 'question_replacement_review_changed');
            const ledgerRef = db.collection('content_factory_question_ledgers').doc((0, question_batch_ledger_1.questionLedgerDocumentId)(String(stage.requestId ?? ''), questionReplacement.topicArtifactId));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, question_batch_ledger_1.parseQuestionBatchLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, questionReplacement.topicArtifactId);
            if (input.status === 'approved') {
                try {
                    const replaced = (0, question_batch_ledger_1.approveQuestionReplacement)(ledger, { batchArtifactId: questionReplacement.batchArtifactId, questionId: questionReplacement.replacementForQuestionId, replacementArtifactId: String(stage.artifactId), replacement: questionReplacement.item });
                    const supersededRef = replaced.supersededReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(replaced.supersededReplacementArtifactId)) : null;
                    const supersededSnapshot = supersededRef ? await tx.get(supersededRef) : null;
                    tx.set(ledgerRef, replaced.ledger);
                    if (supersededSnapshot?.exists)
                        tx.update(supersededSnapshot.ref, { state: 'superseded', supersededByArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    updates.questionLedgerRevision = replaced.ledger.revision;
                    updates.replacedQuestionId = questionReplacement.replacementForQuestionId;
                    updates.activeReplacementArtifactId = stage.artifactId;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_replacement_ledger_invalid');
                }
            }
            else if (stage.state === 'approved') {
                try {
                    const restored = (0, question_batch_ledger_1.rollbackQuestionReplacement)(ledger, { batchArtifactId: questionReplacement.batchArtifactId, questionId: questionReplacement.replacementForQuestionId, replacementArtifactId: String(stage.artifactId) });
                    const restoredRef = restored.restoredReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(restored.restoredReplacementArtifactId)) : null;
                    const restoredSnapshot = restoredRef ? await tx.get(restoredRef) : null;
                    tx.set(ledgerRef, restored.ledger);
                    if (restoredSnapshot?.exists)
                        tx.update(restoredSnapshot.ref, { state: 'approved', restoredAfterRollbackArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    updates.questionLedgerRevision = restored.ledger.revision;
                    updates.activeReplacementArtifactId = restored.restoredReplacementArtifactId;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'question_replacement_rollback_invalid');
                }
            }
        }
        if (stage.kind === 'flashcard_items') {
            const ideaArtifactIds = Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [];
            if (ideaArtifactIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'flashcard_pack_idea_artifact_required');
            const ledgerRef = db.collection('content_factory_flashcard_ledgers').doc((0, flashcard_pack_ledger_1.flashcardLedgerDocumentId)(String(stage.requestId ?? ''), ideaArtifactIds[0]));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, ideaArtifactIds[0]);
            if (input.status === 'approved') {
                if (!flashcardBatch || flashcardBatch.artifactId !== stage.artifactId || flashcardBatch.contentHash !== stage.contentHash || flashcardBatch.packIdeaArtifactId !== ideaArtifactIds[0])
                    throw new https_1.HttpsError('aborted', 'flashcard_batch_review_changed');
                const publishedResolution = await resolvePublishedFlashcardKeysForReview(tx, db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''), flashcardBatch.items);
                if (flashcardDuplicateIdsFromKeys(flashcardBatch.items, publishedResolution.keys).length)
                    throw new https_1.HttpsError('failed-precondition', 'flashcard_batch_published_duplicate');
                try {
                    const approved = (0, flashcard_pack_ledger_1.approveFlashcardBatch)(ledger, { batchArtifactId: String(stage.artifactId), items: flashcardBatch.items });
                    tx.set(ledgerRef, approved.ledger);
                    updates.flashcardLedgerRevision = approved.ledger.revision;
                    updates.flashcardLedgerContentHash = approved.ledger.batches[String(stage.artifactId)]?.contentHash;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_batch_ledger_invalid');
                }
            }
            else {
                const activeReplacementArtifacts = Object.values(ledger.batches[String(stage.artifactId)]?.replacements ?? {}).map((history) => history[history.length - 1]?.artifactId).filter((artifactId) => Boolean(artifactId));
                const activeReplacementSnapshots = await Promise.all(activeReplacementArtifacts.map((artifactId) => tx.get(db.collection('content_factory_stages').doc(stageIdFromArtifactId(artifactId)))));
                const rolledBack = (0, flashcard_pack_ledger_1.rollbackFlashcardBatch)(ledger, String(stage.artifactId));
                tx.set(ledgerRef, rolledBack);
                for (const replacementSnapshot of activeReplacementSnapshots)
                    if (replacementSnapshot.exists)
                        tx.update(replacementSnapshot.ref, { state: 'superseded', staleReason: 'flashcard_batch_rollback', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                updates.flashcardLedgerRevision = rolledBack.revision;
            }
        }
        if (stage.kind === 'flashcard_item_replacement') {
            if (!flashcardReplacement || flashcardReplacement.artifactId !== stage.artifactId || flashcardReplacement.contentHash !== stage.contentHash)
                throw new https_1.HttpsError('aborted', 'flashcard_replacement_review_changed');
            const ledgerRef = db.collection('content_factory_flashcard_ledgers').doc((0, flashcard_pack_ledger_1.flashcardLedgerDocumentId)(String(stage.requestId ?? ''), flashcardReplacement.packIdeaArtifactId));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, flashcardReplacement.packIdeaArtifactId);
            if (input.status === 'approved') {
                const publishedResolution = await resolvePublishedFlashcardKeysForReview(tx, db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''), [flashcardReplacement.item]);
                if (flashcardDuplicateIdsFromKeys([flashcardReplacement.item], publishedResolution.keys).length)
                    throw new https_1.HttpsError('failed-precondition', 'flashcard_replacement_published_duplicate');
                try {
                    const replaced = (0, flashcard_pack_ledger_1.approveFlashcardReplacement)(ledger, { batchArtifactId: flashcardReplacement.batchArtifactId, cardId: flashcardReplacement.replacementForCardId, replacementArtifactId: String(stage.artifactId), replacement: flashcardReplacement.item });
                    const supersededRef = replaced.supersededReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(replaced.supersededReplacementArtifactId)) : null;
                    const supersededSnapshot = supersededRef ? await tx.get(supersededRef) : null;
                    tx.set(ledgerRef, replaced.ledger);
                    if (supersededSnapshot?.exists)
                        tx.update(supersededSnapshot.ref, { state: 'superseded', supersededByArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    updates.flashcardLedgerRevision = replaced.ledger.revision;
                    updates.replacedCardId = flashcardReplacement.replacementForCardId;
                    updates.activeReplacementArtifactId = stage.artifactId;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_ledger_invalid');
                }
            }
            else if (stage.state === 'approved') {
                try {
                    const restored = (0, flashcard_pack_ledger_1.rollbackFlashcardReplacement)(ledger, { batchArtifactId: flashcardReplacement.batchArtifactId, cardId: flashcardReplacement.replacementForCardId, replacementArtifactId: String(stage.artifactId) });
                    const restoredRef = restored.restoredReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(restored.restoredReplacementArtifactId)) : null;
                    const restoredSnapshot = restoredRef ? await tx.get(restoredRef) : null;
                    tx.set(ledgerRef, restored.ledger);
                    if (restoredSnapshot?.exists)
                        tx.update(restoredSnapshot.ref, { state: 'approved', restoredAfterRollbackArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    updates.flashcardLedgerRevision = restored.ledger.revision;
                    updates.activeReplacementArtifactId = restored.restoredReplacementArtifactId;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_rollback_invalid');
                }
            }
        }
        if (stage.kind === 'arena_questions') {
            const topicArtifactIds = Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [];
            if (topicArtifactIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'arena_topic_artifact_required');
            const ledgerRef = db.collection('content_factory_arena_ledgers').doc((0, arena_question_ledger_1.arenaLedgerDocumentId)(String(stage.requestId ?? ''), topicArtifactIds[0]));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, arena_question_ledger_1.parseArenaQuestionLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, topicArtifactIds[0]);
            if (input.status === 'approved') {
                if (!arenaBatch || !arenaRuntimeDraft || arenaBatch.artifactId !== stage.artifactId || arenaBatch.contentHash !== stage.contentHash || arenaBatch.topicArtifactId !== topicArtifactIds[0])
                    throw new https_1.HttpsError('aborted', 'arena_batch_review_changed');
                try {
                    const approved = (0, arena_question_ledger_1.approveArenaQuestionBatch)(ledger, { batchArtifactId: String(stage.artifactId), items: arenaBatch.items });
                    tx.set(ledgerRef, approved.ledger);
                    updates.arenaLedgerRevision = approved.ledger.revision;
                    updates.arenaCoverage = (0, arena_question_ledger_1.arenaLedgerCoverage)(approved.ledger);
                    updates.arenaDraftSealed = true;
                    updates.arenaRuntimeDraftHash = arenaRuntimeDraft.contentHash;
                    updates.arenaRuntimeQuestionCount = arenaRuntimeDraft.questionCount;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_batch_ledger_invalid');
                }
            }
            else {
                const rolledBack = (0, arena_question_ledger_1.rollbackArenaQuestionBatch)(ledger, String(stage.artifactId));
                tx.set(ledgerRef, rolledBack);
                updates.arenaLedgerRevision = rolledBack.revision;
                updates.arenaCoverage = (0, arena_question_ledger_1.arenaLedgerCoverage)(rolledBack);
                updates.arenaDraftSealed = false;
            }
        }
        if (stage.kind === 'arena_question_replacement') {
            if (!arenaReplacement || arenaReplacement.artifactId !== stage.artifactId || arenaReplacement.contentHash !== stage.contentHash)
                throw new https_1.HttpsError('aborted', 'arena_replacement_review_changed');
            const ledgerRef = db.collection('content_factory_arena_ledgers').doc((0, arena_question_ledger_1.arenaLedgerDocumentId)(String(stage.requestId ?? ''), arenaReplacement.topicArtifactId));
            const ledgerSnapshot = await tx.get(ledgerRef);
            const ledger = (0, arena_question_ledger_1.parseArenaQuestionLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, arenaReplacement.topicArtifactId);
            if (input.status === 'approved') {
                try {
                    const replaced = (0, arena_question_ledger_1.approveArenaQuestionReplacement)(ledger, { batchArtifactId: arenaReplacement.batchArtifactId, questionId: arenaReplacement.replacementForQuestionId, replacementArtifactId: String(stage.artifactId), replacement: arenaReplacement.item });
                    const supersededRef = replaced.supersededReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(replaced.supersededReplacementArtifactId)) : null;
                    const supersededSnapshot = supersededRef ? await tx.get(supersededRef) : null;
                    tx.set(ledgerRef, replaced.ledger);
                    if (supersededSnapshot?.exists)
                        tx.update(supersededSnapshot.ref, { state: 'superseded', supersededByArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    updates.arenaLedgerRevision = replaced.ledger.revision;
                    updates.replacedQuestionId = arenaReplacement.replacementForQuestionId;
                    updates.activeReplacementArtifactId = stage.artifactId;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_replacement_ledger_invalid');
                }
            }
            else if (stage.state === 'approved') {
                try {
                    const restored = (0, arena_question_ledger_1.rollbackArenaQuestionReplacement)(ledger, { batchArtifactId: arenaReplacement.batchArtifactId, questionId: arenaReplacement.replacementForQuestionId, replacementArtifactId: String(stage.artifactId) });
                    const restoredRef = restored.restoredReplacementArtifactId ? db.collection('content_factory_stages').doc(stageIdFromArtifactId(restored.restoredReplacementArtifactId)) : null;
                    const restoredSnapshot = restoredRef ? await tx.get(restoredRef) : null;
                    tx.set(ledgerRef, restored.ledger);
                    if (restoredSnapshot?.exists)
                        tx.update(restoredSnapshot.ref, { state: 'approved', restoredAfterRollbackArtifactId: stage.artifactId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    updates.arenaLedgerRevision = restored.ledger.revision;
                    updates.activeReplacementArtifactId = restored.restoredReplacementArtifactId;
                }
                catch (error) {
                    throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_replacement_rollback_invalid');
                }
            }
        }
        tx.update(stageRef, updates);
        if (correctionEventRef)
            tx.update(correctionEventRef, { status: input.status === 'approved' ? 'accepted' : 'rejected', reviewedBy: request.auth.uid, reviewReason: input.reason, reviewedAt: admin.firestore.FieldValue.serverTimestamp() });
        const operationId = (0, node_crypto_1.createHash)('sha256').update(`${input.stageId}:review:${input.status}:${String(stage.revision ?? '')}:${String(stage.state ?? '')}`).digest('hex');
        tx.create(db.collection('admin_log').doc(), { action: `content_factory.stage.${input.status}`, actorUid: request.auth.uid, role, entity: { collection: 'content_factory_stages', id: input.stageId }, operationId, reason: input.reason, before: { state: stage.state ?? null }, after: { state: input.status, artifactId: stage.artifactId ?? null }, timestamp: new Date().toISOString() });
        return { ok: true, stageId: input.stageId, state: input.status, replayed: false };
    });
});
//# sourceMappingURL=admin_content_stages.js.map