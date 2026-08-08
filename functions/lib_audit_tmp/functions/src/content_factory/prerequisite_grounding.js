"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lessonLedgerDocumentId = lessonLedgerDocumentId;
exports.loadApprovedLessonGrounding = loadApprovedLessonGrounding;
exports.loadApprovedOutlineGrounding = loadApprovedOutlineGrounding;
exports.lessonIdFromScopeId = lessonIdFromScopeId;
exports.prepareDerivedLessonGrounding = prepareDerivedLessonGrounding;
const node_crypto_1 = require("node:crypto");
const lesson_extractors_1 = require("./lesson_extractors");
const dedupe_ledger_1 = require("./dedupe_ledger");
const lesson_artifacts_1 = require("./lesson_artifacts");
function lessonLedgerDocumentId(requestId, studyTarget) {
    if (!requestId || !studyTarget)
        throw new Error('lesson_ledger_identity_invalid');
    return (0, node_crypto_1.createHash)('sha256').update(`${requestId}\u0000${studyTarget}`).digest('hex');
}
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
async function loadApprovedLessonGrounding(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReviewForApproval === true && stage.state === 'needs_review'))
        throw new Error('grounding_prerequisite_not_approved');
    if (stage.kind !== 'lesson_phrases')
        throw new Error('grounding_prerequisite_kind_invalid');
    if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration)
        throw new Error('grounding_prerequisite_receipt_invalid');
    const file = bucket.file(stage.objectPath);
    const metadataResult = await file.getMetadata();
    const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
    if (String(metadata?.generation ?? '') !== stage.objectGeneration)
        throw new Error('grounding_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    if ((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase())
        throw new Error('grounding_content_hash_mismatch');
    let parsed;
    try {
        parsed = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw new Error('grounding_json_invalid');
    }
    const artifact = record(parsed);
    if (artifact?.stage !== 'lesson_phrases' || !Array.isArray(artifact.items))
        throw new Error('grounding_phrase_artifact_invalid');
    const storedGroundingReceipt = record(stage.groundingReceipt);
    const artifactErrors = (0, lesson_artifacts_1.validateLessonStageArtifact)(artifact, { kind: 'lesson_phrases', count: 50, cefr: stage.cefr, strictV3: stage.promptVersion === 'v3', grounding: storedGroundingReceipt ? { outline: storedGroundingReceipt.outline } : undefined });
    if (artifactErrors.length)
        throw new Error(`grounding_phrase_artifact_invalid:${artifactErrors.join(',')}`);
    const phrases = artifact.items.map(record);
    if (phrases.some((item) => !item || typeof item.id !== 'string' || typeof item.sourceText !== 'string' || typeof item.targetText !== 'string'))
        throw new Error('grounding_phrase_artifact_invalid');
    const safePhrases = phrases;
    const extraction = (0, lesson_extractors_1.extractLessonCandidates)({ studyTarget: stage.studyTarget, phrases: safePhrases.map((item) => ({ id: item.id, targetText: item.targetText })) });
    const groundingHash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ artifactId: stage.artifactId, contentHash: stage.contentHash, extraction })).digest('hex');
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, phrases: Object.freeze(safePhrases.map((item) => Object.freeze({ ...item }))), extraction, groundingHash });
}
async function loadApprovedOutlineGrounding(bucket, stage) {
    if (stage.state !== 'approved')
        throw new Error('outline_grounding_not_approved');
    if (stage.kind !== 'lesson_outline')
        throw new Error('outline_grounding_kind_invalid');
    if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration)
        throw new Error('outline_grounding_receipt_invalid');
    const groundingReceipt = record(stage.groundingReceipt);
    if (!groundingReceipt || !record(groundingReceipt.blueprintLesson))
        throw new Error('outline_blueprint_receipt_required');
    const file = bucket.file(stage.objectPath);
    const metadataResult = await file.getMetadata();
    const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
    if (String(metadata?.generation ?? '') !== stage.objectGeneration)
        throw new Error('outline_grounding_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    if ((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase())
        throw new Error('outline_grounding_content_hash_mismatch');
    let artifact;
    try {
        artifact = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw new Error('outline_grounding_json_invalid');
    }
    const errors = (0, lesson_artifacts_1.validateLessonStageArtifact)(artifact, { kind: 'lesson_outline', count: 1, cefr: stage.cefr, grounding: groundingReceipt });
    if (errors.length)
        throw new Error(`outline_grounding_artifact_invalid:${errors.join(',')}`);
    const output = record(artifact);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, outline: Object.freeze({ ...(record(output?.result) ?? {}) }), blueprintGrounding: Object.freeze({ ...groundingReceipt }) });
}
function lessonIdFromScopeId(scopeId) {
    const match = /^lesson-(\d+)$/.exec(scopeId);
    const lessonId = Number(match?.[1]);
    if (!Number.isSafeInteger(lessonId) || lessonId < 1)
        throw new Error('lesson_scope_id_invalid');
    return lessonId;
}
function prepareDerivedLessonGrounding(input) {
    if (input.loaded.extraction.state !== 'ready')
        throw new Error('lesson_extraction_review_required');
    const candidates = input.kind === 'lesson_vocabulary' ? input.loaded.extraction.vocabulary : input.kind === 'lesson_irregular_verbs' ? input.loaded.extraction.irregularVerbs : input.loaded.extraction.prepositions;
    const receipt = (0, dedupe_ledger_1.dedupeLessonCandidates)(input.ledger, { lessonId: input.lessonId, phraseArtifactId: input.phraseArtifactId, candidates });
    if (receipt.state !== 'ready')
        throw new Error(`lesson_dedupe_review_required:${receipt.missingPreviousLessonIds.join(',')}`);
    return Object.freeze({ phraseArtifactId: input.phraseArtifactId, phraseContentHash: input.loaded.contentHash, phrases: input.loaded.phrases, extractedCandidates: receipt.extracted, acceptedCandidates: receipt.accepted, excludedPrevious: receipt.excludedPrevious, rejectedCandidates: receipt.rejected, groundingHash: input.loaded.groundingHash });
}
//# sourceMappingURL=prerequisite_grounding.js.map