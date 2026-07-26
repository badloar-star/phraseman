"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApprovedArenaTopic = loadApprovedArenaTopic;
exports.loadArenaQuestionBatchForReview = loadArenaQuestionBatchForReview;
exports.loadArenaQuestionReplacementForReview = loadArenaQuestionReplacementForReview;
const node_crypto_1 = require("node:crypto");
const arena_artifacts_1 = require("./arena_artifacts");
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
async function verified(bucket, stage, prefix) {
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
        const value = JSON.parse(bytes.toString('utf8'));
        if (!record(value))
            throw new Error('invalid');
        return value;
    }
    catch {
        throw new Error(`${prefix}_json_invalid`);
    }
}
async function loadApprovedArenaTopic(bucket, stage) {
    if (stage.state !== 'approved')
        throw new Error('arena_topic_not_approved');
    const artifact = await verified(bucket, stage, 'arena_topic');
    const errors = (0, arena_artifacts_1.validateArenaTopicArtifact)(artifact, { cefr: stage.cefr, studyTarget: stage.studyTarget, sourceLocale: stage.sourceLocale });
    if (errors.length)
        throw new Error(`arena_topic_artifact_invalid:${errors.join(',')}`);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, topic: Object.freeze({ ...record(artifact.result) }) });
}
async function loadArenaQuestionBatchForReview(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review'))
        throw new Error('arena_batch_not_reviewable');
    const grounding = record(stage.groundingReceipt);
    if (!record(grounding?.topic) || !String(grounding?.topicArtifactId ?? ''))
        throw new Error('arena_batch_grounding_required');
    const verifiedGrounding = grounding;
    const artifact = await verified(bucket, stage, 'arena_batch');
    const errors = (0, arena_artifacts_1.validateArenaQuestionBatchArtifact)(artifact, { count: stage.count, grounding: verifiedGrounding });
    if (errors.length)
        throw new Error(`arena_batch_artifact_invalid:${errors.join(',')}`);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, topicArtifactId: String(verifiedGrounding.topicArtifactId), topic: Object.freeze({ ...record(verifiedGrounding.topic) }), items: Object.freeze([...artifact.items]) });
}
async function loadArenaQuestionReplacementForReview(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review'))
        throw new Error('arena_replacement_not_reviewable');
    const grounding = record(stage.groundingReceipt);
    if (!grounding || !record(grounding.topic) || !record(grounding.originalQuestion) || !String(grounding.batchArtifactId ?? '') || !String(grounding.topicArtifactId ?? '') || !String(grounding.replacementForQuestionId ?? ''))
        throw new Error('arena_replacement_grounding_required');
    const artifact = await verified(bucket, stage, 'arena_replacement');
    const errors = (0, arena_artifacts_1.validateArenaQuestionReplacementArtifact)(artifact, { grounding });
    if (errors.length)
        throw new Error(`arena_replacement_artifact_invalid:${errors.join(',')}`);
    const result = record(artifact.result);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, batchArtifactId: String(grounding.batchArtifactId), topicArtifactId: String(grounding.topicArtifactId), replacementForQuestionId: String(result.replacementForQuestionId), originalQuestion: Object.freeze({ ...record(grounding.originalQuestion) }), topic: Object.freeze({ ...record(grounding.topic) }), item: Object.freeze({ ...record(result.item) }) });
}
//# sourceMappingURL=arena_grounding.js.map