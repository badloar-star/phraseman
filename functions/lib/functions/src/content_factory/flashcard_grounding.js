"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApprovedFlashcardPackIdea = loadApprovedFlashcardPackIdea;
exports.loadFlashcardBatchForReview = loadFlashcardBatchForReview;
exports.loadFlashcardReplacementForReview = loadFlashcardReplacementForReview;
const node_crypto_1 = require("node:crypto");
const flashcard_artifacts_1 = require("./flashcard_artifacts");
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
async function verifiedArtifact(bucket, stage, prefix) {
    if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration)
        throw new Error(`${prefix}_receipt_invalid`);
    const file = bucket.file(stage.objectPath);
    const metadataResult = await file.getMetadata();
    const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
    if (String(metadata?.generation ?? '') !== stage.objectGeneration)
        throw new Error(`${prefix}_generation_mismatch`);
    const [bytes] = await file.download({ validation: false });
    if ((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase())
        throw new Error(`${prefix}_content_hash_mismatch`);
    try {
        const parsed = JSON.parse(bytes.toString('utf8'));
        if (!record(parsed))
            throw new Error('invalid');
        return parsed;
    }
    catch {
        throw new Error(`${prefix}_json_invalid`);
    }
}
async function loadApprovedFlashcardPackIdea(bucket, stage) {
    if (stage.state !== 'approved')
        throw new Error('flashcard_pack_idea_not_approved');
    const artifact = await verifiedArtifact(bucket, stage, 'flashcard_pack_idea');
    const errors = (0, flashcard_artifacts_1.validateFlashcardPackIdeaArtifact)(artifact, { cefr: stage.cefr });
    if (errors.length)
        throw new Error(`flashcard_pack_idea_artifact_invalid:${errors.join(',')}`);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, packIdea: Object.freeze({ ...record(artifact.result) }) });
}
async function loadFlashcardBatchForReview(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review'))
        throw new Error('flashcard_batch_not_reviewable');
    const grounding = record(stage.groundingReceipt);
    if (!record(grounding?.packIdea) || !String(grounding?.packIdeaArtifactId ?? ''))
        throw new Error('flashcard_batch_grounding_required');
    const verifiedGrounding = grounding;
    const artifact = await verifiedArtifact(bucket, stage, 'flashcard_batch');
    const errors = (0, flashcard_artifacts_1.validateFlashcardItemsArtifact)(artifact, { count: stage.count, grounding: verifiedGrounding });
    if (errors.length)
        throw new Error(`flashcard_batch_artifact_invalid:${errors.join(',')}`);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, packIdeaArtifactId: String(verifiedGrounding.packIdeaArtifactId), items: Object.freeze([...artifact.items]) });
}
async function loadFlashcardReplacementForReview(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review'))
        throw new Error('flashcard_replacement_not_reviewable');
    const grounding = record(stage.groundingReceipt);
    if (!grounding || !record(grounding.packIdea) || !record(grounding.originalCard) || !String(grounding.replacementForCardId ?? '') || !String(grounding.batchArtifactId ?? '') || !String(grounding.packIdeaArtifactId ?? ''))
        throw new Error('flashcard_replacement_grounding_required');
    const artifact = await verifiedArtifact(bucket, stage, 'flashcard_replacement');
    const errors = (0, flashcard_artifacts_1.validateFlashcardReplacementArtifact)(artifact, { grounding });
    if (errors.length)
        throw new Error(`flashcard_replacement_artifact_invalid:${errors.join(',')}`);
    const result = record(artifact.result);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, batchArtifactId: String(grounding.batchArtifactId), packIdeaArtifactId: String(grounding.packIdeaArtifactId), replacementForCardId: String(result.replacementForCardId), originalCard: Object.freeze({ ...record(grounding.originalCard) }), item: Object.freeze({ ...record(result.item) }) });
}
//# sourceMappingURL=flashcard_grounding.js.map