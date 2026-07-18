"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArtifactEditRequest = parseArtifactEditRequest;
exports.prepareArtifactEdit = prepareArtifactEdit;
const node_crypto_1 = require("node:crypto");
const derived_lesson_artifacts_1 = require("./derived_lesson_artifacts");
const flashcard_artifacts_1 = require("./flashcard_artifacts");
const lesson_artifacts_1 = require("./lesson_artifacts");
const question_artifacts_1 = require("./question_artifacts");
const semantic_diff_1 = require("./semantic_diff");
const theory_generation_1 = require("./theory_generation");
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
const FIELDS = new Set(['baseStageId', 'expectedBaseReviewFingerprint', 'idempotencyKey', 'reason', 'artifact']);
const REFERENCE_KEYS = new Set(['sourcePhraseIds', 'sourceReferences', 'evidenceRefs', 'exemplarIds']);
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function parseArtifactEditRequest(value) {
    if (!record(value) || Object.keys(value).some((key) => !FIELDS.has(key)))
        throw new Error('artifact_edit_invalid');
    const baseStageId = String(value.baseStageId ?? '').trim();
    const expectedBaseReviewFingerprint = String(value.expectedBaseReviewFingerprint ?? '').trim();
    const idempotencyKey = String(value.idempotencyKey ?? '').trim();
    const reason = String(value.reason ?? '').trim();
    let byteSize = Number.POSITIVE_INFINITY;
    try {
        byteSize = Buffer.byteLength(JSON.stringify(value.artifact), 'utf8');
    }
    catch { /* invalid below */ }
    if (!STAGE_ID_RE.test(baseStageId) || !HASH_RE.test(expectedBaseReviewFingerprint) || !TOKEN_RE.test(idempotencyKey) || reason.length < 5 || reason.length > 500 || !record(value.artifact) || byteSize > 512 * 1024)
        throw new Error('artifact_edit_invalid');
    return Object.freeze({ baseStageId, expectedBaseReviewFingerprint, idempotencyKey, reason, artifact: value.artifact });
}
function itemIds(artifact) {
    if (!record(artifact) || !Array.isArray(artifact.items))
        return null;
    return artifact.items.map((item) => record(item) ? String(item.id ?? '') : '');
}
function collectReferences(value, output = new Set(), key = '') {
    if (Array.isArray(value)) {
        if (REFERENCE_KEYS.has(key))
            for (const item of value)
                output.add(String(item));
        else
            for (const item of value)
                collectReferences(item, output);
    }
    else if (record(value))
        for (const [childKey, child] of Object.entries(value))
            collectReferences(child, output, childKey);
    return output;
}
function baseItems(artifact) {
    return record(artifact) && Array.isArray(artifact.items) ? artifact.items.filter(record) : [];
}
function distribution(items) {
    return { easy: items.filter((item) => item.difficulty === 'easy').length, medium: items.filter((item) => item.difficulty === 'medium').length, hard: items.filter((item) => item.difficulty === 'hard').length };
}
function validate(kind, stage, base, candidate) {
    const items = baseItems(base);
    switch (kind) {
        case 'lesson_outline': return (0, lesson_artifacts_1.validateLessonStageArtifact)(candidate, { kind, count: 1, cefr: String(stage.cefr), sourceLocale: String(stage.sourceLocale), studyTarget: String(stage.studyTarget) });
        case 'lesson_phrases': {
            const receipt = record(base) && record(base.coverageReceipt) ? base.coverageReceipt : {};
            return (0, lesson_artifacts_1.validateLessonStageArtifact)(candidate, { kind, count: Number(stage.count), cefr: String(stage.cefr), sourceLocale: String(stage.sourceLocale), studyTarget: String(stage.studyTarget), strictV3: true, grounding: { outline: { coverage: receipt.coveredTags ?? [], exclusions: receipt.respectedExclusions ?? [] } } });
        }
        case 'lesson_vocabulary':
        case 'lesson_irregular_verbs':
        case 'lesson_prepositions':
            return (0, derived_lesson_artifacts_1.validateDerivedLessonArtifact)(candidate, { kind, grounding: { acceptedCandidates: items.map((item) => ({ partOfSpeech: item.partOfSpeech, lemma: item.lemma, sourcePhraseIds: item.sourcePhraseIds })) } });
        case 'lesson_theory': {
            const refs = [...collectReferences(base)];
            return (0, theory_generation_1.validateTheoryArtifact)(candidate, { allowedPhraseIds: refs.filter((id) => id.startsWith('phrase:')).map((id) => id.slice(7)), allowedExemplarFragmentIds: refs.filter((id) => id.startsWith('exemplar:')).map((id) => id.slice(9)) });
        }
        case 'challenge_topic': return (0, question_artifacts_1.validateTopicArtifact)(candidate, { kind, cefr: String(stage.cefr) });
        case 'challenge_questions': {
            const topic = { skillTags: [...new Set(items.map((item) => String(item.skillTag)))], difficultyDistribution: distribution(items) };
            return (0, question_artifacts_1.validateQuestionBatchArtifact)(candidate, { kind, count: Number(stage.count), grounding: { topic, previousQuestionKeys: [] } });
        }
        case 'challenge_question_replacement': {
            const result = record(base) && record(base.result) ? base.result : {};
            const originalQuestion = record(result.item) ? result.item : {};
            return (0, question_artifacts_1.validateQuestionReplacementArtifact)(candidate, { kind, grounding: { replacementForQuestionId: result.replacementForQuestionId, originalQuestion, topic: { skillTags: [originalQuestion.skillTag] }, previousQuestionKeys: [] } });
        }
        case 'flashcard_pack_idea': return (0, flashcard_artifacts_1.validateFlashcardPackIdeaArtifact)(candidate, { cefr: String(stage.cefr) });
        case 'flashcard_items': return (0, flashcard_artifacts_1.validateFlashcardItemsArtifact)(candidate, { count: Number(stage.count), grounding: { packIdea: {}, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] } });
        case 'flashcard_item_replacement': {
            const result = record(base) && record(base.result) ? base.result : {};
            return (0, flashcard_artifacts_1.validateFlashcardReplacementArtifact)(candidate, { grounding: { replacementForCardId: result.replacementForCardId, originalCard: result.item, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] } });
        }
    }
}
function prepareArtifactEdit(stage, baseArtifact, candidateArtifact, operationId) {
    const baseStageId = String(stage.stageId ?? '');
    const revision = Number(stage.revision) + 1;
    if (!STAGE_ID_RE.test(baseStageId) || !Number.isSafeInteger(revision) || revision < 2 || !TOKEN_RE.test(operationId) || !record(baseArtifact) || !record(candidateArtifact))
        throw new Error('artifact_edit_base_invalid');
    if (candidateArtifact.stage !== stage.kind || baseArtifact.stage !== stage.kind)
        throw new Error('artifact_edit_stage_identity_changed');
    const beforeIds = itemIds(baseArtifact);
    const afterIds = itemIds(candidateArtifact);
    if (beforeIds && JSON.stringify(beforeIds) !== JSON.stringify(afterIds))
        throw new Error('artifact_edit_item_identity_changed');
    const allowedReferences = collectReferences(baseArtifact);
    const candidateReferences = collectReferences(candidateArtifact);
    if ([...candidateReferences].some((reference) => !allowedReferences.has(reference)))
        throw new Error('artifact_edit_reference_not_approved');
    const errors = validate(stage.kind, stage, baseArtifact, candidateArtifact);
    if (errors.length)
        throw new Error(`artifact_edit_validation_failed:${errors.join(',')}`);
    const diff = (0, semantic_diff_1.semanticDiff)(stage.kind, baseArtifact, candidateArtifact);
    if (diff.totalDetails === 0)
        throw new Error('artifact_edit_no_changes');
    const newStageId = `${String(stage.requestId)}:${stage.kind}:${String(stage.scopeId)}:r${revision}`;
    const leaseHash = (0, node_crypto_1.createHash)('sha256').update(operationId).digest('hex');
    const objectPath = `content-factory-stages/${(0, node_crypto_1.createHash)('sha256').update(newStageId).digest('hex')}/r${revision}/a1-${leaseHash}.json`;
    return Object.freeze({ baseStageId, newStageId, newArtifactId: `artifact:${newStageId}`, revision, objectPath, artifactAttempt: 1, artifactLeaseTokenHash: leaseHash, diff, candidateArtifact });
}
//# sourceMappingURL=artifact_edit.js.map