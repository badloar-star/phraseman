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
exports.adminRunContentStage = exports.CONTENT_STAGE_OPENAI_API_KEY = exports.flashcardLedgerDocumentId = void 0;
exports.parseRunContentStageRequest = parseRunContentStageRequest;
exports.contentStageLeaseTokenHash = contentStageLeaseTokenHash;
exports.contentStageObjectPathFromHash = contentStageObjectPathFromHash;
exports.contentStageObjectPath = contentStageObjectPath;
exports.flashcardKeysFromLessonPhrases = flashcardKeysFromLessonPhrases;
exports.flashcardKeysFromPublishedPacks = flashcardKeysFromPublishedPacks;
exports.loadPublishedFlashcardKeysWithRegistry = loadPublishedFlashcardKeysWithRegistry;
exports.findPublishedFlashcardDuplicateKeys = findPublishedFlashcardDuplicateKeys;
exports.buildFlashcardItemsWorkerGrounding = buildFlashcardItemsWorkerGrounding;
exports.buildFlashcardPartialRetryGrounding = buildFlashcardPartialRetryGrounding;
exports.flashcardPartialFailureState = flashcardPartialFailureState;
exports.buildFlashcardReplacementWorkerGrounding = buildFlashcardReplacementWorkerGrounding;
exports.resolveContentStageCount = resolveContentStageCount;
exports.contentStageGroundingReceipt = contentStageGroundingReceipt;
exports.generateContentStageArtifact = generateContentStageArtifact;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const openai_jobs_config_1 = require("./openai_jobs_config");
const generation_provider_1 = require("./content_factory/generation_provider");
const prompt_context_1 = require("./content_factory/prompt_context");
const prompt_registry_1 = require("./content_factory/prompt_registry");
const stage_runner_1 = require("./content_factory/stage_runner");
const artifact_storage_1 = require("./content_factory/artifact_storage");
const content_factory_budget_1 = require("./content_factory/content_factory_budget");
const generation_errors_1 = require("./content_factory/generation_errors");
const stage_lease_1 = require("./content_factory/stage_lease");
const prerequisite_grounding_1 = require("./content_factory/prerequisite_grounding");
const dedupe_ledger_1 = require("./content_factory/dedupe_ledger");
const english_theory_exemplars_generated_1 = require("./content_factory/english_theory_exemplars.generated");
const theory_generation_1 = require("./content_factory/theory_generation");
const source_registry_1 = require("./content_factory/source_registry");
const outline_grounding_1 = require("./content_factory/outline_grounding");
const quiz_challenge_grounding_1 = require("./content_factory/quiz_challenge_grounding");
const question_batch_ledger_1 = require("./content_factory/question_batch_ledger");
const quiz_challenge_artifacts_1 = require("./content_factory/quiz_challenge_artifacts");
const flashcard_grounding_1 = require("./content_factory/flashcard_grounding");
const flashcard_artifacts_1 = require("./content_factory/flashcard_artifacts");
const flashcard_semantic_registry_1 = require("./content_factory/flashcard_semantic_registry");
const flashcard_pack_ledger_1 = require("./content_factory/flashcard_pack_ledger");
const flashcard_partial_checkpoint_1 = require("./content_factory/flashcard_partial_checkpoint");
const arena_grounding_1 = require("./content_factory/arena_grounding");
const arena_question_ledger_1 = require("./content_factory/arena_question_ledger");
const arena_artifacts_1 = require("./content_factory/arena_artifacts");
const generation_audit_1 = require("./content_factory/generation_audit");
const generation_execution_1 = require("./content_factory/generation_execution");
const artifact_retention_1 = require("./content_factory/artifact_retention");
const lesson_phrase_generation_1 = require("./content_factory/lesson_phrase_generation");
const shadow_judge_1 = require("./content_factory/shadow_judge");
const shadow_judge_repository_1 = require("./content_factory/shadow_judge_repository");
const review_fingerprint_1 = require("./content_factory/review_fingerprint");
var flashcard_pack_ledger_2 = require("./content_factory/flashcard_pack_ledger");
Object.defineProperty(exports, "flashcardLedgerDocumentId", { enumerable: true, get: function () { return flashcard_pack_ledger_2.flashcardLedgerDocumentId; } });
const REGION = 'us-central1';
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const STAGE_LEASE_MS = 10 * 60 * 1000;
exports.CONTENT_STAGE_OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
function parseRunContentStageRequest(data) {
    const record = typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
    const stageId = String(record.stageId ?? '').trim();
    if (Object.keys(record).some((key) => key !== 'stageId') || !STAGE_ID_RE.test(stageId))
        throw new https_1.HttpsError('invalid-argument', 'content_stage_run_invalid');
    return Object.freeze({ stageId });
}
function contentStageLeaseTokenHash(leaseToken) {
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(leaseToken))
        throw new Error('content_stage_lease_token_invalid');
    return (0, node_crypto_1.createHash)('sha256').update(leaseToken).digest('hex');
}
function contentStageObjectPathFromHash(stageId, revision, attempt, leaseTokenHash) {
    if (!STAGE_ID_RE.test(stageId) || !Number.isSafeInteger(revision) || revision < 1 || !Number.isSafeInteger(attempt) || attempt < 1 || !/^[a-f0-9]{64}$/.test(leaseTokenHash))
        throw new Error('content_stage_object_identity_invalid');
    return `content-factory-stages/${(0, node_crypto_1.createHash)('sha256').update(stageId).digest('hex')}/r${revision}/a${attempt}-${leaseTokenHash}.json`;
}
function contentStageObjectPath(stageId, revision, attempt, leaseToken) {
    return contentStageObjectPathFromHash(stageId, revision, attempt, contentStageLeaseTokenHash(leaseToken));
}
function boundedFlashcardKeys(value) {
    if (!Array.isArray(value))
        return Object.freeze([]);
    if (value.length > 1000)
        throw new Error('flashcard_grounding_keys_too_many');
    const keys = value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 2000);
    return Object.freeze([...new Set(keys)]);
}
function flashcardKeysFromLessonPhrases(phrases) {
    return boundedFlashcardKeys(phrases.map((value) => {
        const phrase = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
        return (0, flashcard_artifacts_1.flashcardSemanticKey)({ front: phrase.targetText, back: phrase.sourceText });
    }).filter((key) => key !== '\u0000'));
}
function flashcardKeysFromPublishedPacks(packs, studyTarget, sourceLocale) {
    if (studyTarget !== 'en')
        return Object.freeze([]);
    const keys = [];
    for (const value of packs) {
        const pack = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
        if (pack.listingStatus !== 'published' || String(pack.studyTarget ?? 'en') !== studyTarget || !Array.isArray(pack.cards))
            continue;
        for (const rawCard of pack.cards) {
            const card = typeof rawCard === 'object' && rawCard !== null && !Array.isArray(rawCard) ? rawCard : {};
            const sourceLocales = typeof card.sourceLocales === 'object' && card.sourceLocales !== null && !Array.isArray(card.sourceLocales) ? card.sourceLocales : {};
            const back = sourceLocale === 'ru' || sourceLocale === 'uk' || sourceLocale === 'es' ? card[sourceLocale] : sourceLocales[sourceLocale];
            const key = (0, flashcard_artifacts_1.flashcardSemanticKey)({ front: card.en, back });
            if (key !== '\u0000')
                keys.push(key);
        }
    }
    return boundedFlashcardKeys(keys);
}
async function loadPublishedFlashcardKeysWithRegistry(db, studyTarget, sourceLocale) {
    const configSnapshot = await db.collection('content_factory_config').doc('flashcard_semantic_registry').get();
    const config = configSnapshot.data() ?? {};
    const catalogGeneration = Number(config.catalogGeneration ?? 0);
    const verifiedGeneration = Number(config.verifiedGeneration ?? -1);
    if (config.mode === 'registry' && config.manifestComplete === true && Number.isSafeInteger(catalogGeneration) && catalogGeneration === verifiedGeneration) {
        return Object.freeze({ authority: 'registry', keys: Object.freeze([]), cutoverEligible: true, comparison: null });
    }
    const publishedSnapshot = await db.collection('community_packs').where('listingStatus', '==', 'published').limit(501).get();
    if (publishedSnapshot.size > 500)
        throw new Error('flashcard_published_catalog_registry_required');
    const legacyKeys = flashcardKeysFromPublishedPacks(publishedSnapshot.docs.map((item) => item.data()), studyTarget, sourceLocale);
    return Object.freeze({ authority: 'legacy', keys: legacyKeys, cutoverEligible: false, comparison: null });
}
async function findPublishedFlashcardDuplicateKeys(db, studyTarget, sourceLocale, items) {
    if (items.length > 20)
        throw new Error('flashcard_candidate_keys_too_many');
    const config = (await db.collection('content_factory_config').doc('flashcard_semantic_registry').get()).data() ?? {};
    if (config.mode !== 'registry' || config.manifestComplete !== true || Number(config.catalogGeneration ?? 0) !== Number(config.verifiedGeneration ?? -1))
        return Object.freeze([]);
    const partition = { surface: 'community_flashcards', studyTarget, sourceLocale };
    const keys = [...new Set(items.map(flashcard_artifacts_1.flashcardSemanticKey).filter((key) => key && key !== '\u0000'))];
    const refs = keys.map((key) => db.collection('content_factory_flashcard_semantic_keys').doc((0, flashcard_semantic_registry_1.flashcardRegistryDocumentId)(partition, key)));
    const snapshots = refs.length ? await db.getAll(...refs) : [];
    return Object.freeze(keys.filter((_key, index) => snapshots[index]?.exists));
}
function buildFlashcardItemsWorkerGrounding(loaded, ledger, stage) {
    return Object.freeze({ ...loaded, previousCardKeys: boundedFlashcardKeys((0, flashcard_pack_ledger_1.previousFlashcardKeys)(ledger)), lessonCardKeys: boundedFlashcardKeys(stage.lessonCardKeys), publishedCardKeys: boundedFlashcardKeys(stage.publishedCardKeys) });
}
function buildFlashcardPartialRetryGrounding(base, checkpoint) {
    const previous = boundedFlashcardKeys([...(Array.isArray(base.previousCardKeys) ? base.previousCardKeys : []), ...checkpoint.acceptedSemanticKeys]);
    return Object.freeze({ ...base, previousCardKeys: previous, acceptedCardIds: checkpoint.acceptedIds, acceptedCardKeys: checkpoint.acceptedSemanticKeys, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount });
}
function flashcardPartialFailureState(active, created) {
    const checkpoint = created ?? active;
    if (!checkpoint)
        return null;
    return Object.freeze({ errorCode: created ? 'provider_schema_partial' : 'provider_schema_partial_refill', errorMessage: created ? 'flashcard_partial_checkpoint_ready' : 'flashcard_partial_refill_failed', retryable: true, checkpoint, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount });
}
function buildFlashcardReplacementWorkerGrounding(loaded, ledger, stage) {
    const replacementForCardId = String(stage.replacementForCardId ?? '').trim();
    const originalCard = loaded.items.find((value) => typeof value === 'object' && value !== null && String(value.id ?? '').trim() === replacementForCardId);
    if (!originalCard)
        throw new Error('flashcard_replacement_original_not_found');
    const originalKey = (0, flashcard_artifacts_1.flashcardSemanticKey)(originalCard);
    const receipt = typeof stage.batchGroundingReceipt === 'object' && stage.batchGroundingReceipt !== null && !Array.isArray(stage.batchGroundingReceipt) ? stage.batchGroundingReceipt : {};
    const withoutOriginal = (keys) => Object.freeze(keys.filter((key) => key !== originalKey));
    const lessonCardKeys = boundedFlashcardKeys([...(Array.isArray(receipt.lessonCardKeys) ? receipt.lessonCardKeys : []), ...(Array.isArray(stage.lessonCardKeys) ? stage.lessonCardKeys : [])]);
    const publishedCardKeys = boundedFlashcardKeys([...(Array.isArray(receipt.publishedCardKeys) ? receipt.publishedCardKeys : []), ...(Array.isArray(stage.publishedCardKeys) ? stage.publishedCardKeys : [])]);
    return Object.freeze({
        batchArtifactId: loaded.artifactId,
        packIdeaArtifactId: loaded.packIdeaArtifactId,
        replacementForCardId,
        originalCard,
        packIdea: typeof receipt.packIdea === 'object' && receipt.packIdea !== null ? receipt.packIdea : {},
        previousCardKeys: withoutOriginal(boundedFlashcardKeys((0, flashcard_pack_ledger_1.previousFlashcardKeys)(ledger))),
        lessonCardKeys: withoutOriginal(lessonCardKeys),
        publishedCardKeys: withoutOriginal(publishedCardKeys),
    });
}
function resolveContentStageCount(kind, requestedCount, grounding = null) {
    if (kind === 'lesson_outline' || kind === 'lesson_theory')
        return 1;
    if (kind === 'lesson_phrases')
        return 50;
    if (kind === 'quiz_questions' || kind === 'challenge_questions')
        return 10;
    if (kind === 'arena_questions')
        return 10;
    if (kind === 'quiz_question_replacement' || kind === 'challenge_question_replacement' || kind === 'arena_question_replacement')
        return 1;
    if (kind === 'flashcard_item_replacement')
        return 1;
    if (kind === 'flashcard_items' && (!Number.isSafeInteger(requestedCount) || requestedCount < 1 || requestedCount > 20))
        throw new Error('flashcard_batch_count_must_be_1_to_20');
    if (kind === 'lesson_vocabulary' || kind === 'lesson_irregular_verbs' || kind === 'lesson_prepositions')
        return Array.isArray(grounding?.acceptedCandidates) ? grounding.acceptedCandidates.length : 0;
    return requestedCount;
}
function contentStageGroundingReceipt(grounding) {
    if (!grounding)
        return null;
    if (typeof grounding.batchArtifactId === 'string' && typeof grounding.replacementForCardId === 'string' && typeof grounding.originalCard === 'object')
        return Object.freeze({ batchArtifactId: grounding.batchArtifactId, packIdeaArtifactId: grounding.packIdeaArtifactId, replacementForCardId: grounding.replacementForCardId, originalCard: grounding.originalCard, packIdea: grounding.packIdea, previousCardKeys: grounding.previousCardKeys, lessonCardKeys: grounding.lessonCardKeys, publishedCardKeys: grounding.publishedCardKeys });
    if (typeof grounding.batchArtifactId === 'string' && typeof grounding.replacementForQuestionId === 'string' && typeof grounding.originalQuestion === 'object')
        return Object.freeze({ batchArtifactId: grounding.batchArtifactId, topicArtifactId: grounding.topicArtifactId, replacementForQuestionId: grounding.replacementForQuestionId, originalQuestion: grounding.originalQuestion, topic: grounding.topic, previousQuestionKeys: grounding.previousQuestionKeys });
    if (typeof grounding.artifactId === 'string' && typeof grounding.contentHash === 'string' && typeof grounding.topic === 'object')
        return Object.freeze({ topicArtifactId: grounding.artifactId, topicContentHash: grounding.contentHash, topic: grounding.topic, previousQuestionKeys: grounding.previousQuestionKeys });
    if (typeof grounding.artifactId === 'string' && typeof grounding.contentHash === 'string' && typeof grounding.packIdea === 'object')
        return Object.freeze({ packIdeaArtifactId: grounding.artifactId, packIdeaContentHash: grounding.contentHash, packIdea: grounding.packIdea, previousCardKeys: grounding.previousCardKeys, lessonCardKeys: grounding.lessonCardKeys, publishedCardKeys: grounding.publishedCardKeys });
    if (typeof grounding.artifactId === 'string' && typeof grounding.contentHash === 'string' && typeof grounding.outline === 'object')
        return Object.freeze({ outlineArtifactId: grounding.artifactId, outlineContentHash: grounding.contentHash, outline: grounding.outline, blueprintGrounding: grounding.blueprintGrounding });
    if (typeof grounding.registryId === 'string' && typeof grounding.blueprintHash === 'string' && typeof grounding.blueprintLesson === 'object')
        return Object.freeze({ registryId: grounding.registryId, blueprintHash: grounding.blueprintHash, blueprintLesson: grounding.blueprintLesson, evidenceIds: grounding.evidenceIds });
    if (Array.isArray(grounding.acceptedCandidates))
        return Object.freeze({
            phraseArtifactId: grounding.phraseArtifactId,
            phraseContentHash: grounding.phraseContentHash,
            extractedCandidates: grounding.extractedCandidates,
            acceptedCandidates: grounding.acceptedCandidates,
            excludedPrevious: grounding.excludedPrevious,
            rejectedCandidates: grounding.rejectedCandidates,
        });
    if (Array.isArray(grounding.exemplars))
        return Object.freeze({
            phraseArtifactId: grounding.phraseArtifactId,
            phraseContentHash: grounding.phraseContentHash,
            theoryRegistryId: grounding.theoryRegistryId,
            theoryRegistryVersion: grounding.theoryRegistryVersion,
            theoryRegistryHash: grounding.theoryRegistryHash,
            exemplarIds: grounding.exemplars.map((value) => typeof value === 'object' && value !== null ? String(value.exemplarId ?? '') : '').filter(Boolean),
        });
    return Object.freeze({});
}
async function generateContentStageArtifact(input) {
    const context = (0, prompt_context_1.buildPromptContext)({ studyTarget: input.stage.studyTarget, sourceLocale: input.stage.sourceLocale, cefr: input.stage.cefr, objective: input.stage.objective, count: input.stage.count, approvedArtifactIds: input.stage.approvedArtifactIds, exemplarIds: input.stage.exemplarIds, previousContentFingerprints: input.stage.previousContentFingerprints });
    const packet = (0, prompt_registry_1.buildStagePromptPacket)(input.stage.kind, input.stage.promptVersion, context, input.stage.grounding ?? null);
    const result = await (0, stage_runner_1.runGenerationStage)({ provider: input.provider, model: input.model, packet });
    return Object.freeze({ ...result, objectPath: contentStageObjectPath(input.stage.stageId, input.stage.revision, input.stage.attempt, input.stage.leaseToken) });
}
exports.adminRunContentStage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, secrets: [exports.CONTENT_STAGE_OPENAI_API_KEY], timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
    // зачем: adminRole в проекте никем не выдаётся — флага admin достаточно, роль по умолчанию owner.
    const stageRole = (0, roles_1.hasAdminRole)(request.auth?.token?.adminRole) ? request.auth.token.adminRole : 'owner';
    if (!request.auth?.token?.admin || !(0, permissions_1.hasPermission)(stageRole, 'content.draft.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot generate content stages');
    const actorUid = request.auth.uid;
    const role = request.auth.token.adminRole;
    const { stageId } = parseRunContentStageRequest(request.data);
    const db = admin.firestore();
    const stageRef = db.collection('content_factory_stages').doc(stageId);
    const nowMs = Date.now();
    const requestedLeaseToken = (0, node_crypto_1.randomUUID)();
    const lease = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(stageRef);
        if (!snapshot.exists)
            throw new https_1.HttpsError('not-found', 'content_stage_not_found');
        const stage = snapshot.data() ?? {};
        const decision = (0, stage_lease_1.acquireStageLease)(stage, { nowMs, leaseMs: STAGE_LEASE_MS, leaseToken: requestedLeaseToken });
        if (decision.action === 'busy')
            throw new https_1.HttpsError('aborted', 'content_stage_already_running');
        if (decision.action === 'blocked')
            throw new https_1.HttpsError('failed-precondition', 'content_stage_not_runnable');
        if (decision.action === 'replay')
            return decision;
        tx.update(stageRef, { state: 'running', attempts: decision.attempt, leaseToken: decision.leaseToken, leaseExpiresAtMs: decision.leaseExpiresAtMs, startedAtMs: nowMs, startedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return decision;
    });
    if (lease.action === 'replay')
        return { ok: true, stageId, replayed: true };
    const attempt = lease.attempt;
    let checkpointToPersist = null;
    let activeFlashcardCheckpoint = null;
    let baseFlashcardGrounding = null;
    try {
        const snapshot = await stageRef.get();
        const stage = snapshot.data() ?? {};
        let grounding = null;
        let resolvedCount = Number(stage.count);
        if (stage.kind === 'lesson_outline') {
            let reference;
            try {
                reference = (0, source_registry_1.parseSourceRegistryReference)(String(stage.blueprintVersion ?? ''));
            }
            catch {
                throw new https_1.HttpsError('failed-precondition', 'source_registry_reference_invalid');
            }
            const registrySnapshot = await db.collection('content_factory_source_registry').doc((0, source_registry_1.sourceRegistryDocId)(reference.blueprintId, reference.version)).get();
            if (!registrySnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'source_registry_not_found');
            try {
                grounding = (0, outline_grounding_1.buildLessonOutlineGrounding)(registrySnapshot.data(), (0, prerequisite_grounding_1.lessonIdFromScopeId)(String(stage.scopeId ?? '')));
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'lesson_blueprint_invalid');
            }
            resolvedCount = resolveContentStageCount('lesson_outline', resolvedCount, grounding);
        }
        if (stage.kind === 'lesson_phrases') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'lesson_outline_prerequisite_required');
            const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!prerequisiteSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'lesson_outline_prerequisite_missing');
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            try {
                grounding = await (0, prerequisite_grounding_1.loadApprovedOutlineGrounding)(admin.storage().bucket(), { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), cefr: String(prerequisite.cefr ?? ''), promptVersion: String(prerequisite.promptVersion ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? ''), groundingReceipt: prerequisite.groundingReceipt });
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'lesson_outline_grounding_invalid');
            }
            resolvedCount = resolveContentStageCount('lesson_phrases', resolvedCount, grounding);
        }
        if (['lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions'].includes(String(stage.kind))) {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'lesson_grounding_prerequisite_required');
            const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!prerequisiteSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'lesson_grounding_prerequisite_missing');
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            const loaded = await (0, prerequisite_grounding_1.loadApprovedLessonGrounding)(admin.storage().bucket(), { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), cefr: String(prerequisite.cefr ?? ''), promptVersion: String(prerequisite.promptVersion ?? ''), groundingReceipt: prerequisite.groundingReceipt, objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
            const ledgerSnapshot = await db.collection('content_factory_lesson_ledgers').doc((0, prerequisite_grounding_1.lessonLedgerDocumentId)(String(stage.requestId ?? ''), String(stage.studyTarget ?? ''))).get();
            const ledger = (0, dedupe_ledger_1.parseLessonLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, String(stage.studyTarget ?? ''));
            grounding = (0, prerequisite_grounding_1.prepareDerivedLessonGrounding)({ kind: String(stage.kind), lessonId: (0, prerequisite_grounding_1.lessonIdFromScopeId)(String(stage.scopeId ?? '')), phraseArtifactId: String(prerequisite.artifactId ?? ''), loaded, ledger });
            resolvedCount = resolveContentStageCount(String(stage.kind), resolvedCount, grounding);
            if (resolvedCount < 1)
                throw new https_1.HttpsError('failed-precondition', 'lesson_no_new_candidates');
        }
        if (stage.kind === 'lesson_theory') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'lesson_grounding_prerequisite_required');
            const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!prerequisiteSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'lesson_grounding_prerequisite_missing');
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            const loaded = await (0, prerequisite_grounding_1.loadApprovedLessonGrounding)(admin.storage().bucket(), { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), cefr: String(prerequisite.cefr ?? ''), promptVersion: String(prerequisite.promptVersion ?? ''), groundingReceipt: prerequisite.groundingReceipt, objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
            const lessonId = (0, prerequisite_grounding_1.lessonIdFromScopeId)(String(stage.scopeId ?? ''));
            const selection = (0, theory_generation_1.retrieveTheoryExemplars)(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY, { objective: String(stage.objective ?? ''), approvedTargetPhrases: loaded.phrases.map((item) => String(item.targetText ?? '')), requiredExemplarIds: [`english-lesson-${lessonId}`] });
            if (selection.state !== 'ready')
                throw new https_1.HttpsError('failed-precondition', 'theory_exemplar_conflict');
            grounding = Object.freeze({ phraseArtifactId: String(prerequisite.artifactId ?? ''), phraseContentHash: loaded.contentHash, phrases: loaded.phrases, theoryRegistryId: english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY.registryId, theoryRegistryVersion: english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY.version, theoryRegistryHash: english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY.registryHash, exemplars: selection.exemplars });
            resolvedCount = resolveContentStageCount('lesson_theory', resolvedCount, grounding);
        }
        if (stage.kind === 'flashcard_items') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length < 1 || prerequisiteStageIds.length > 2)
                throw new https_1.HttpsError('failed-precondition', 'flashcard_pack_idea_prerequisite_required');
            const prerequisiteSnapshots = await Promise.all(prerequisiteStageIds.map((id) => db.collection('content_factory_stages').doc(id).get()));
            if (prerequisiteSnapshots.some((item) => !item.exists))
                throw new https_1.HttpsError('failed-precondition', 'flashcard_prerequisite_missing');
            const ideaSnapshots = prerequisiteSnapshots.filter((item) => item.data()?.kind === 'flashcard_pack_idea');
            const lessonSnapshots = prerequisiteSnapshots.filter((item) => item.data()?.kind === 'lesson_phrases');
            if (ideaSnapshots.length !== 1 || lessonSnapshots.length > 1 || ideaSnapshots.length + lessonSnapshots.length !== prerequisiteSnapshots.length)
                throw new https_1.HttpsError('failed-precondition', 'flashcard_prerequisite_kind_invalid');
            const prerequisiteSnapshot = ideaSnapshots[0];
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            try {
                const loaded = await (0, flashcard_grounding_1.loadApprovedFlashcardPackIdea)(admin.storage().bucket(), { artifactId: String(prerequisite.artifactId ?? ''), kind: 'flashcard_pack_idea', state: String(prerequisite.state ?? ''), cefr: String(prerequisite.cefr ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
                const ledgerSnapshot = await db.collection('content_factory_flashcard_ledgers').doc((0, flashcard_pack_ledger_1.flashcardLedgerDocumentId)(String(stage.requestId ?? ''), loaded.artifactId)).get();
                const ledger = (0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, loaded.artifactId);
                let lessonCardKeys = [];
                if (lessonSnapshots.length === 1) {
                    const lessonSnapshot = lessonSnapshots[0];
                    const lesson = lessonSnapshot.data() ?? {};
                    const loadedLesson = await (0, prerequisite_grounding_1.loadApprovedLessonGrounding)(admin.storage().bucket(), { stageId: lessonSnapshot.id, artifactId: String(lesson.artifactId ?? ''), kind: String(lesson.kind ?? ''), state: String(lesson.state ?? ''), studyTarget: String(lesson.studyTarget ?? ''), cefr: String(lesson.cefr ?? ''), promptVersion: String(lesson.promptVersion ?? ''), groundingReceipt: lesson.groundingReceipt, objectPath: String(lesson.objectPath ?? ''), contentHash: String(lesson.contentHash ?? ''), objectGeneration: String(lesson.objectGeneration ?? '') });
                    lessonCardKeys = flashcardKeysFromLessonPhrases(loadedLesson.phrases);
                }
                const publishedResolution = await loadPublishedFlashcardKeysWithRegistry(db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''));
                const publishedCardKeys = publishedResolution.keys;
                grounding = buildFlashcardItemsWorkerGrounding(loaded, ledger, { lessonCardKeys, publishedCardKeys });
                baseFlashcardGrounding = grounding;
                if (stage.flashcardPartialCheckpoint !== undefined) {
                    activeFlashcardCheckpoint = (0, flashcard_partial_checkpoint_1.parseFlashcardPartialCheckpoint)(stage.flashcardPartialCheckpoint, Number(stage.count));
                    grounding = buildFlashcardPartialRetryGrounding(grounding, activeFlashcardCheckpoint);
                }
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_pack_grounding_invalid');
            }
            resolvedCount = activeFlashcardCheckpoint?.missingCount ?? resolveContentStageCount('flashcard_items', resolvedCount, grounding);
        }
        if (stage.kind === 'flashcard_item_replacement') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'flashcard_batch_prerequisite_required');
            const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!prerequisiteSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'flashcard_batch_prerequisite_missing');
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            if (prerequisite.kind !== 'flashcard_items')
                throw new https_1.HttpsError('failed-precondition', 'flashcard_batch_prerequisite_kind_invalid');
            try {
                const loaded = await (0, flashcard_grounding_1.loadFlashcardBatchForReview)(admin.storage().bucket(), { artifactId: String(prerequisite.artifactId ?? ''), kind: 'flashcard_items', state: String(prerequisite.state ?? ''), count: Number(prerequisite.resolvedCount ?? prerequisite.count), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? ''), groundingReceipt: prerequisite.groundingReceipt });
                const ledgerSnapshot = await db.collection('content_factory_flashcard_ledgers').doc((0, flashcard_pack_ledger_1.flashcardLedgerDocumentId)(String(stage.requestId ?? ''), loaded.packIdeaArtifactId)).get();
                const ledger = (0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, loaded.packIdeaArtifactId);
                const publishedResolution = await loadPublishedFlashcardKeysWithRegistry(db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''));
                const publishedCardKeys = publishedResolution.keys;
                grounding = buildFlashcardReplacementWorkerGrounding(loaded, ledger, { replacementForCardId: String(stage.replacementForCardId ?? ''), batchGroundingReceipt: prerequisite.groundingReceipt, lessonCardKeys: stage.lessonCardKeys, publishedCardKeys });
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'flashcard_replacement_grounding_invalid');
            }
            resolvedCount = resolveContentStageCount('flashcard_item_replacement', resolvedCount, grounding);
        }
        if (stage.kind === 'quiz_questions' || stage.kind === 'challenge_questions') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'studio_topic_prerequisite_required');
            const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!prerequisiteSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'studio_topic_prerequisite_missing');
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            const expectedKind = stage.kind === 'quiz_questions' ? 'quiz_topic' : 'challenge_topic';
            if (prerequisite.kind !== expectedKind)
                throw new https_1.HttpsError('failed-precondition', 'studio_topic_prerequisite_kind_invalid');
            try {
                grounding = await (0, quiz_challenge_grounding_1.loadApprovedTopicGrounding)(admin.storage().bucket(), { stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: expectedKind, state: String(prerequisite.state ?? ''), cefr: String(prerequisite.cefr ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'studio_topic_grounding_invalid');
            }
            const ledgerSnapshot = await db.collection('content_factory_question_ledgers').doc((0, question_batch_ledger_1.questionLedgerDocumentId)(String(stage.requestId ?? ''), String(prerequisite.artifactId ?? ''))).get();
            const ledger = (0, question_batch_ledger_1.parseQuestionBatchLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, String(prerequisite.artifactId ?? ''));
            grounding = Object.freeze({ ...grounding, previousQuestionKeys: (0, question_batch_ledger_1.previousQuestionKeys)(ledger) });
            resolvedCount = resolveContentStageCount(String(stage.kind), resolvedCount, grounding);
        }
        if (stage.kind === 'arena_questions') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'arena_topic_prerequisite_required');
            const prerequisiteSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!prerequisiteSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'arena_topic_prerequisite_missing');
            const prerequisite = prerequisiteSnapshot.data() ?? {};
            if (prerequisite.kind !== 'arena_topic')
                throw new https_1.HttpsError('failed-precondition', 'arena_topic_prerequisite_kind_invalid');
            try {
                const loaded = await (0, arena_grounding_1.loadApprovedArenaTopic)(admin.storage().bucket(), { artifactId: String(prerequisite.artifactId ?? ''), kind: 'arena_topic', state: String(prerequisite.state ?? ''), cefr: String(prerequisite.cefr ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), sourceLocale: String(prerequisite.sourceLocale ?? ''), objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? '') });
                const ledgerSnapshot = await db.collection('content_factory_arena_ledgers').doc((0, arena_question_ledger_1.arenaLedgerDocumentId)(String(stage.requestId ?? ''), loaded.artifactId)).get();
                const ledger = (0, arena_question_ledger_1.parseArenaQuestionLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, loaded.artifactId);
                grounding = Object.freeze({ ...loaded, previousQuestionKeys: (0, arena_question_ledger_1.previousArenaQuestionKeys)(ledger) });
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_topic_grounding_invalid');
            }
            resolvedCount = resolveContentStageCount('arena_questions', resolvedCount, grounding);
        }
        if (stage.kind === 'quiz_question_replacement' || stage.kind === 'challenge_question_replacement') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'question_replacement_batch_required');
            const batchSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!batchSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'question_replacement_batch_missing');
            const batchStage = batchSnapshot.data() ?? {};
            const expectedBatchKind = stage.kind === 'quiz_question_replacement' ? 'quiz_questions' : 'challenge_questions';
            if (batchStage.kind !== expectedBatchKind)
                throw new https_1.HttpsError('failed-precondition', 'question_replacement_batch_kind_invalid');
            const batch = await (0, quiz_challenge_grounding_1.loadQuestionBatchForReview)(admin.storage().bucket(), { stageId: batchSnapshot.id, artifactId: String(batchStage.artifactId ?? ''), kind: expectedBatchKind, state: String(batchStage.state ?? ''), objectPath: String(batchStage.objectPath ?? ''), contentHash: String(batchStage.contentHash ?? ''), objectGeneration: String(batchStage.objectGeneration ?? ''), groundingReceipt: batchStage.groundingReceipt });
            const replacementForQuestionId = String(stage.replacementForQuestionId ?? '');
            const originalQuestion = batch.items.find((value) => typeof value === 'object' && value !== null && String(value.id ?? '') === replacementForQuestionId);
            if (!originalQuestion)
                throw new https_1.HttpsError('failed-precondition', 'question_replacement_original_missing');
            const ledgerSnapshot = await db.collection('content_factory_question_ledgers').doc((0, question_batch_ledger_1.questionLedgerDocumentId)(String(stage.requestId ?? ''), batch.topicArtifactId)).get();
            const ledger = (0, question_batch_ledger_1.parseQuestionBatchLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, batch.topicArtifactId);
            const originalKey = (0, quiz_challenge_artifacts_1.questionSemanticKey)(originalQuestion);
            grounding = Object.freeze({ batchArtifactId: batch.artifactId, topicArtifactId: batch.topicArtifactId, replacementForQuestionId, originalQuestion, topic: batch.topic, previousQuestionKeys: (0, question_batch_ledger_1.previousQuestionKeys)(ledger).filter((key) => key !== originalKey) });
            resolvedCount = resolveContentStageCount(String(stage.kind), resolvedCount, grounding);
        }
        if (stage.kind === 'arena_question_replacement') {
            const prerequisiteStageIds = Array.isArray(stage.prerequisiteStageIds) ? stage.prerequisiteStageIds.map(String) : [];
            if (prerequisiteStageIds.length !== 1)
                throw new https_1.HttpsError('failed-precondition', 'arena_replacement_batch_required');
            const batchSnapshot = await db.collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
            if (!batchSnapshot.exists)
                throw new https_1.HttpsError('failed-precondition', 'arena_replacement_batch_missing');
            const batchStage = batchSnapshot.data() ?? {};
            if (batchStage.kind !== 'arena_questions')
                throw new https_1.HttpsError('failed-precondition', 'arena_replacement_batch_kind_invalid');
            let batch;
            try {
                batch = await (0, arena_grounding_1.loadArenaQuestionBatchForReview)(admin.storage().bucket(), { artifactId: String(batchStage.artifactId ?? ''), kind: 'arena_questions', state: String(batchStage.state ?? ''), count: Number(batchStage.resolvedCount ?? batchStage.count), objectPath: String(batchStage.objectPath ?? ''), contentHash: String(batchStage.contentHash ?? ''), objectGeneration: String(batchStage.objectGeneration ?? ''), groundingReceipt: batchStage.groundingReceipt });
            }
            catch (error) {
                throw new https_1.HttpsError('failed-precondition', error instanceof Error ? error.message : 'arena_replacement_grounding_invalid');
            }
            const locale = typeof batch.topic.localeContract === 'object' && batch.topic.localeContract !== null ? batch.topic.localeContract : {};
            if (String(stage.studyTarget ?? '') !== String(locale.studyTarget ?? '') || String(stage.sourceLocale ?? '') !== String(locale.learnerSourceLocale ?? '') || String(stage.cefr ?? '') !== String(batch.topic.level ?? ''))
                throw new https_1.HttpsError('failed-precondition', 'arena_replacement_identity_mismatch');
            const replacementForQuestionId = String(stage.replacementForQuestionId ?? '');
            const originalQuestion = batch.items.find((value) => typeof value === 'object' && value !== null && String(value.id ?? '') === replacementForQuestionId);
            if (!originalQuestion)
                throw new https_1.HttpsError('failed-precondition', 'arena_replacement_original_missing');
            const ledgerSnapshot = await db.collection('content_factory_arena_ledgers').doc((0, arena_question_ledger_1.arenaLedgerDocumentId)(String(stage.requestId ?? ''), batch.topicArtifactId)).get();
            const ledger = (0, arena_question_ledger_1.parseArenaQuestionLedger)(ledgerSnapshot.exists ? ledgerSnapshot.data() : undefined, batch.topicArtifactId);
            const originalKey = (0, arena_artifacts_1.arenaQuestionSemanticKey)(originalQuestion);
            grounding = Object.freeze({ batchArtifactId: batch.artifactId, topicArtifactId: batch.topicArtifactId, replacementForQuestionId, originalQuestion, topic: batch.topic, previousQuestionKeys: (0, arena_question_ledger_1.previousArenaQuestionKeys)(ledger).filter((key) => key !== originalKey) });
            resolvedCount = resolveContentStageCount('arena_question_replacement', resolvedCount, grounding);
        }
        const config = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'content_factory');
        (0, openai_jobs_config_1.assertJobEnabled)(config, 'content_factory');
        const apiKey = String(exports.CONTENT_STAGE_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
        if (!apiKey)
            throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
        const provider = (0, generation_provider_1.createOpenAiGenerationProvider)(apiKey, { beforeProviderRequest: async (requestIndex) => { await (0, content_factory_budget_1.reserveContentFactoryBudget)(db, `${stageId}:attempt:${attempt}:provider-request:${requestIndex}`, config.globalDailyCap); } });
        let generated;
        try {
            const stageInput = { stageId, kind: String(stage.kind), promptVersion: String(stage.promptVersion), studyTarget: String(stage.studyTarget), sourceLocale: String(stage.sourceLocale), cefr: String(stage.cefr), objective: String(stage.objective), count: resolvedCount, approvedArtifactIds: Array.isArray(stage.prerequisiteArtifactIds) ? stage.prerequisiteArtifactIds.map(String) : [], exemplarIds: Array.isArray(stage.exemplarIds) ? stage.exemplarIds.map(String) : [], previousContentFingerprints: Array.isArray(stage.previousContentFingerprints) ? stage.previousContentFingerprints.map(String) : [], revision: Number(stage.revision), attempt, leaseToken: lease.leaseToken, grounding };
            if (stage.kind === 'lesson_phrases') {
                const context = (0, prompt_context_1.buildPromptContext)({ studyTarget: stageInput.studyTarget, sourceLocale: stageInput.sourceLocale, cefr: stageInput.cefr, objective: stageInput.objective, count: 50, approvedArtifactIds: stageInput.approvedArtifactIds, exemplarIds: stageInput.exemplarIds, previousContentFingerprints: stageInput.previousContentFingerprints });
                const basePacket = (0, prompt_registry_1.buildStagePromptPacket)('lesson_phrases', stageInput.promptVersion, context, grounding);
                const chunked = await (0, lesson_phrase_generation_1.generateLessonPhraseChunks)({ provider, model: config.model, basePacket, identity: { stageId, revision: stageInput.revision }, checkpoint: stage.lessonPhraseCheckpoint, persistCheckpoint: async (checkpoint) => (0, generation_execution_1.runGuardedGenerationTransaction)({ lease, allowedStates: ['running'], runTransaction: (handler) => db.runTransaction(handler), read: async (tx) => { const current = await tx.get(stageRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; }, commit: (tx) => { tx.update(stageRef, { lessonPhraseCheckpoint: checkpoint, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount, checkpointUpdatedAtMs: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }); } }) });
                generated = Object.freeze({ artifact: chunked.artifact, attempts: chunked.attempts, receipt: chunked.receipt, checkpoint: chunked.checkpoint, objectPath: contentStageObjectPath(stageId, stageInput.revision, attempt, lease.leaseToken) });
            }
            else {
                generated = await generateContentStageArtifact({ provider, model: config.model, stage: stageInput });
            }
        }
        catch (error) {
            if (error instanceof lesson_phrase_generation_1.LessonPhraseCheckpointSuperseded)
                return { ok: true, stageId, state: 'superseded', discarded: true, replayed: false };
            if (stage.kind === 'flashcard_items' && !activeFlashcardCheckpoint && error instanceof stage_runner_1.GenerationStageSchemaError) {
                checkpointToPersist = error.candidateArtifacts.map((candidate) => (0, flashcard_partial_checkpoint_1.createFlashcardPartialCheckpoint)(candidate, Number(stage.count), baseFlashcardGrounding)).filter((candidate) => Boolean(candidate)).sort((a, b) => b.acceptedCount - a.acceptedCount)[0] ?? null;
                if (checkpointToPersist)
                    throw new Error('flashcard_partial_checkpoint_ready');
            }
            throw error;
        }
        const artifactForStorage = activeFlashcardCheckpoint
            ? (0, flashcard_partial_checkpoint_1.mergeFlashcardPartialCheckpoint)(activeFlashcardCheckpoint, generated.artifact, baseFlashcardGrounding)
            : generated.artifact;
        if (stage.kind === 'flashcard_items' || stage.kind === 'flashcard_item_replacement') {
            const artifactRecord = typeof artifactForStorage === 'object' && artifactForStorage !== null && !Array.isArray(artifactForStorage) ? artifactForStorage : {};
            const resultRecord = typeof artifactRecord.result === 'object' && artifactRecord.result !== null && !Array.isArray(artifactRecord.result) ? artifactRecord.result : {};
            const candidates = stage.kind === 'flashcard_items' && Array.isArray(artifactRecord.items) ? artifactRecord.items : resultRecord.item ? [resultRecord.item] : [];
            const publishedDuplicates = await findPublishedFlashcardDuplicateKeys(db, String(stage.studyTarget ?? ''), String(stage.sourceLocale ?? ''), candidates);
            if (publishedDuplicates.length)
                throw new Error(stage.kind === 'flashcard_items' ? 'flashcard_batch_published_duplicate' : 'flashcard_replacement_published_duplicate');
        }
        const completedLessonPhraseCheckpoint = stage.kind === 'lesson_phrases' && 'checkpoint' in generated ? generated.checkpoint : null;
        if (activeFlashcardCheckpoint)
            resolvedCount = activeFlashcardCheckpoint.requestedTotal;
        const groundingReceipt = contentStageGroundingReceipt(activeFlashcardCheckpoint ? baseFlashcardGrounding : grounding);
        const mayPersist = await db.runTransaction(async (tx) => {
            const current = await tx.get(stageRef);
            return current.exists && (0, stage_lease_1.canCommitStageLease)(current.data() ?? {}, lease);
        });
        if (!mayPersist)
            return { ok: true, stageId, state: 'superseded', discarded: true, replayed: false };
        const storageReceipt = await (0, artifact_storage_1.writeImmutableObject)(admin.storage().bucket(), generated.objectPath, artifactForStorage);
        const orphanCandidate = () => (0, artifact_retention_1.buildArtifactOrphanCandidate)(storageReceipt, { entityCollection: 'content_factory_stages', entityId: stageId, attempt, detectedAtMs: Date.now() });
        const recordOrphan = async () => { const orphan = orphanCandidate(); await db.collection('content_factory_artifact_orphans').doc(orphan.candidateId).set(orphan, { merge: false }); };
        const committed = await (0, generation_execution_1.runGuardedGenerationTransaction)({
            lease, allowedStates: ['running'],
            runTransaction: (handler) => db.runTransaction(handler),
            read: async (tx) => { const current = await tx.get(stageRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; },
            commit: (tx, current) => {
                const audit = (0, generation_audit_1.buildGenerationTerminalAudit)({ actorUid, role, entity: { collection: 'content_factory_stages', id: stageId }, attempt, leaseToken: lease.leaseToken, outcome: 'needs_review', errorCategory: null, before: { state: current.state ?? null }, after: { state: 'needs_review', objectPath: storageReceipt.objectPath, contentHash: storageReceipt.contentHash } });
                tx.update(stageRef, { state: 'needs_review', objectPath: storageReceipt.objectPath, contentHash: storageReceipt.contentHash, objectGeneration: storageReceipt.objectGeneration, byteSize: storageReceipt.byteSize, artifactReferenceState: 'committed', artifactFinalizationKey: storageReceipt.finalizationKey, resolvedCount, groundingHash: generated.receipt.groundingHash, groundingReceipt, artifactAttempt: attempt, artifactLeaseTokenHash: contentStageLeaseTokenHash(lease.leaseToken), qaReceipt: generated.receipt, generationAttempts: generated.attempts, generatedAt: admin.firestore.FieldValue.serverTimestamp(), completedAtMs: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), retryable: false, flashcardPartialCheckpoint: admin.firestore.FieldValue.delete(), ...(completedLessonPhraseCheckpoint ? { lessonPhraseCheckpoint: completedLessonPhraseCheckpoint, acceptedCount: 50, missingCount: 0, finalCheckpointHash: completedLessonPhraseCheckpoint.contentHash } : { acceptedCount: admin.firestore.FieldValue.delete(), missingCount: admin.firestore.FieldValue.delete() }), leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), errorCode: admin.firestore.FieldValue.delete(), errorMessage: admin.firestore.FieldValue.delete() });
                tx.create(db.collection('admin_log').doc(audit.operationId), audit);
            },
        }).catch(async (error) => { await recordOrphan(); throw error; });
        if (!committed) {
            await recordOrphan();
            return { ok: true, stageId, state: 'superseded', discarded: true, replayed: false };
        }
        try {
            const preJudgeSnapshot = await stageRef.get();
            const preJudgeStage = preJudgeSnapshot.data() ?? {};
            if (preJudgeSnapshot.exists && preJudgeStage.state === 'needs_review' && preJudgeStage.contentHash === storageReceipt.contentHash) {
                const expectedReviewFingerprint = (0, review_fingerprint_1.contentStageReviewFingerprint)(stageId, preJudgeStage);
                const judgeConfig = await (0, shadow_judge_repository_1.loadShadowJudgeConfig)(db);
                let judgeReceipt = judgeConfig.configError ? (0, shadow_judge_1.shadowJudgeConfigErrorReceipt)(storageReceipt.contentHash, generated.receipt.groundingHash, judgeConfig.configError) : (0, shadow_judge_1.disabledShadowJudgeReceipt)(storageReceipt.contentHash, generated.receipt.groundingHash);
                if (judgeConfig.enabled) {
                    const judgeProvider = (0, generation_provider_1.createOpenAiGenerationProvider)(apiKey, { beforeProviderRequest: async (requestIndex) => { const reservation = await (0, shadow_judge_repository_1.reserveShadowJudgeBudget)(db, `${stageId}:${storageReceipt.contentHash}:request:${requestIndex}`, judgeConfig.dailyCap); if (!reservation.reserved)
                            throw new Error('shadow_judge_daily_budget_exceeded'); } });
                    judgeReceipt = await (0, shadow_judge_1.runShadowJudge)({ provider: judgeProvider, model: judgeConfig.model, evidence: { kind: String(stage.kind), studyTarget: String(stage.studyTarget), sourceLocale: String(stage.sourceLocale), cefr: String(stage.cefr), artifact: artifactForStorage, contentHash: storageReceipt.contentHash, groundingHash: generated.receipt.groundingHash, qaStatus: generated.receipt.status, qaErrors: generated.receipt.validation.errors } });
                }
                await (0, shadow_judge_repository_1.commitShadowJudgeReceipt)(db, { stageId, contentHash: storageReceipt.contentHash, expectedRevision: Number(preJudgeStage.revision), expectedReviewFingerprint, receipt: judgeReceipt, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
        }
        catch (judgeError) {
            console.warn('[content_factory] shadow judge receipt persistence failed', stageId, judgeError);
        }
        return { ok: true, stageId, state: 'needs_review', objectPath: storageReceipt.objectPath, contentHash: storageReceipt.contentHash, replayed: false };
    }
    catch (error) {
        const failure = (0, generation_errors_1.buildGenerationFailureRecord)(error, attempt);
        const partialFailure = flashcardPartialFailureState(activeFlashcardCheckpoint, checkpointToPersist);
        await (0, generation_execution_1.runGuardedGenerationTransaction)({
            lease, allowedStates: ['running'],
            runTransaction: (handler) => db.runTransaction(handler),
            read: async (tx) => { const current = await tx.get(stageRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; },
            commit: (tx, current) => {
                const errorCategory = partialFailure?.errorCode ?? failure.code;
                const audit = (0, generation_audit_1.buildGenerationTerminalAudit)({ actorUid, role, entity: { collection: 'content_factory_stages', id: stageId }, attempt, leaseToken: lease.leaseToken, outcome: 'failed', errorCategory, before: { state: current.state ?? null }, after: { state: 'failed', errorCode: errorCategory } });
                tx.update(stageRef, { state: 'failed', errorCode: errorCategory, errorMessage: partialFailure?.errorMessage ?? failure.message, retryable: partialFailure?.retryable ?? failure.retryable, ...(partialFailure ? { flashcardPartialCheckpoint: partialFailure.checkpoint, acceptedCount: partialFailure.acceptedCount, missingCount: partialFailure.missingCount } : {}), attemptHistory: admin.firestore.FieldValue.arrayUnion(failure), leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), completedAtMs: Date.now(), failedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                tx.create(db.collection('admin_log').doc(audit.operationId), audit);
            },
        });
        throw error instanceof https_1.HttpsError ? error : new https_1.HttpsError('unavailable', 'content_stage_generation_failed');
    }
});
//# sourceMappingURL=content_stage_worker.js.map