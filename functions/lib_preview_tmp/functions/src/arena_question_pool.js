"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestoreArenaQuestionPoolRepository = firestoreArenaQuestionPoolRepository;
exports.publishArenaQuestionBatch = publishArenaQuestionBatch;
exports.removeArenaPoolQuestion = removeArenaPoolQuestion;
exports.restoreArenaPoolQuestion = restoreArenaPoolQuestion;
const node_crypto_1 = require("node:crypto");
const arena_stage_consumer_adapter_1 = require("./content_factory/arena_stage_consumer_adapter");
const arena_grounding_1 = require("./content_factory/arena_grounding");
const review_fingerprint_1 = require("./content_factory/review_fingerprint");
function firestoreArenaQuestionPoolRepository(db) {
    const collection = db.collection('arena_questions');
    const map = (snapshot) => snapshot.exists ? snapshot.data() : null;
    return Object.freeze({
        publishAtomic: async (input) => db.runTransaction(async (tx) => {
            const stageRef = db.collection('content_factory_stages').doc(input.stageId);
            const publicationRef = db.collection('arena_question_pool_publications').doc((0, node_crypto_1.createHash)('sha256').update(input.artifactId).digest('hex'));
            const questionRefs = input.questions.map((question) => collection.doc(question.id));
            const stageSnapshot = await tx.get(stageRef);
            const publicationSnapshot = await tx.get(publicationRef);
            const questionSnapshots = await tx.getAll(...questionRefs);
            const stage = stageSnapshot.data() ?? {};
            if (!stageSnapshot.exists
                || stage.kind !== 'arena_questions'
                || stage.state !== 'approved'
                || stage.arenaDraftSealed !== true
                || String(stage.artifactId ?? '') !== input.artifactId
                || String(stage.contentHash ?? '') !== input.contentHash
                || String(stage.objectGeneration ?? '') !== input.objectGeneration
                || (0, review_fingerprint_1.contentStageReviewFingerprint)(input.stageId, stage) !== input.expectedReviewFingerprint) {
                throw new Error('arena_pool_stage_not_publishable');
            }
            const questionIds = Object.freeze(input.questions.map((question) => question.id));
            if (publicationSnapshot.exists) {
                const publication = publicationSnapshot.data() ?? {};
                const publishedQuestionIds = Array.isArray(publication.questionIds) ? publication.questionIds.map(String) : [];
                const sameQuestionIds = publishedQuestionIds.length === questionIds.length && publishedQuestionIds.every((id, index) => id === questionIds[index]);
                const rowsMatch = questionSnapshots.every((snapshot) => {
                    const question = (snapshot.data() ?? {});
                    return snapshot.exists
                        && question.artifactId === input.artifactId
                        && question.contentHash === input.contentHash
                        && question.sourceStageId === input.sourceStageId;
                });
                if (publication.artifactId !== input.artifactId
                    || publication.contentHash !== input.contentHash
                    || publication.sourceStageId !== input.sourceStageId
                    || !sameQuestionIds
                    || !rowsMatch) {
                    throw new Error('arena_pool_artifact_content_conflict');
                }
                return Object.freeze({ published: 0, idempotent: true, questionIds });
            }
            if (questionSnapshots.some((snapshot) => snapshot.exists))
                throw new Error('arena_pool_question_id_conflict');
            for (let index = 0; index < input.questions.length; index += 1)
                tx.create(questionRefs[index], input.questions[index]);
            tx.create(publicationRef, {
                artifactId: input.artifactId,
                contentHash: input.contentHash,
                sourceStageId: input.sourceStageId,
                questionIds,
                publishedAtMs: input.questions[0]?.publishedAtMs ?? null,
                publishedBy: input.audit.actorUid,
            });
            tx.create(db.collection('admin_log').doc(), {
                action: 'arena_question_pool.publish',
                actorUid: input.audit.actorUid,
                role: input.audit.role,
                entity: { collection: 'content_factory_stages', id: input.stageId },
                reason: 'Approved Arena batch published to runtime pool',
                before: null,
                after: { published: input.questions.length, idempotent: false, questionCount: questionIds.length },
                timestamp: input.audit.timestamp,
            });
            return Object.freeze({ published: input.questions.length, idempotent: false, questionIds });
        }),
        get: async (id) => map(await collection.doc(id).get()),
        put: async (question) => { await collection.doc(question.id).set(question); },
    });
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function ensureActor(actorId) {
    const actor = actorId.trim();
    if (!actor)
        throw new Error('arena_pool_actor_required');
    return actor;
}
async function publishArenaQuestionBatch(input) {
    const actorId = ensureActor(input.actorId);
    const sourceStageId = input.stageId.trim();
    const actorRole = input.actorRole.trim();
    if (!input.requestId.trim() || !sourceStageId || !actorRole || !/^[a-f0-9]{64}$/.test(input.expectedReviewFingerprint) || !Number.isSafeInteger(input.nowMs))
        throw new Error('arena_pool_publish_input_invalid');
    const batch = await (0, arena_grounding_1.loadArenaQuestionBatchForReview)(input.bucket, input.stage);
    const draft = (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ requestId: input.requestId, topicArtifactId: batch.topicArtifactId, topic: batch.topic, batches: [{ artifactId: batch.artifactId, items: batch.items }] });
    if (draft.questionCount !== 10 || draft.questions.length !== 10 || draft.questions.some((question) => question.studyTarget !== 'en' || question.learnerSourceLocale !== 'ru' || question.options.length !== 4 || new Set(question.options).size !== 4 || question.options[question.correctIndex] !== question.correct))
        throw new Error('arena_pool_runtime_contract_invalid');
    const questions = draft.questions.map((question, index) => {
        const item = record(batch.items[index]);
        const skillTag = String(item?.skillTag ?? '').trim();
        if (!skillTag)
            throw new Error('arena_pool_skill_tag_invalid');
        return Object.freeze({
            id: question.id, studyTarget: 'en', learnerSourceLocale: 'ru', level: question.level, availability: 'active', skillTag, difficulty: question.difficulty, rand: question.rand,
            question: question.question, options: question.options, correct: question.correct, correctIndex: question.correctIndex,
            sourceStageId, artifactId: batch.artifactId, contentHash: input.stage.contentHash, topicArtifactId: batch.topicArtifactId, revision: 1, publishedAtMs: input.nowMs, publishedBy: actorId,
        });
    });
    return input.repository.publishAtomic({
        stageId: sourceStageId,
        expectedReviewFingerprint: input.expectedReviewFingerprint,
        artifactId: batch.artifactId,
        contentHash: input.stage.contentHash,
        objectGeneration: input.stage.objectGeneration,
        sourceStageId,
        questions: Object.freeze(questions),
        audit: Object.freeze({ actorUid: actorId, role: actorRole, timestamp: new Date(input.nowMs).toISOString() }),
    });
}
async function removeArenaPoolQuestion(input) {
    const reason = input.reason.trim();
    const actorId = ensureActor(input.actorId);
    const current = await input.repository.get(input.id);
    if (!current)
        throw new Error('arena_pool_question_not_found');
    if (!reason)
        throw new Error('arena_pool_removal_reason_required');
    if (!Number.isSafeInteger(input.nowMs))
        throw new Error('arena_pool_mutation_input_invalid');
    await input.repository.put(Object.freeze({ ...current, availability: 'removed', removalReason: reason, removedAtMs: input.nowMs, removedBy: actorId, revision: current.revision + 1 }));
}
async function restoreArenaPoolQuestion(input) {
    const actorId = ensureActor(input.actorId);
    const current = await input.repository.get(input.id);
    if (!current)
        throw new Error('arena_pool_question_not_found');
    if (!Number.isSafeInteger(input.nowMs))
        throw new Error('arena_pool_mutation_input_invalid');
    await input.repository.put(Object.freeze({ ...current, availability: 'active', restoredAtMs: input.nowMs, restoredBy: actorId, revision: current.revision + 1 }));
}
//# sourceMappingURL=arena_question_pool.js.map