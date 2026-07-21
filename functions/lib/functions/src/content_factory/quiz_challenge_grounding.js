"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApprovedTopicGrounding = loadApprovedTopicGrounding;
exports.loadQuestionBatchForReview = loadQuestionBatchForReview;
exports.loadQuestionReplacementForReview = loadQuestionReplacementForReview;
const node_crypto_1 = require("node:crypto");
const quiz_challenge_artifacts_1 = require("./quiz_challenge_artifacts");
const quiz_challenge_artifacts_2 = require("./quiz_challenge_artifacts");
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
async function loadApprovedTopicGrounding(bucket, stage) {
    if (stage.state !== 'approved')
        throw new Error('studio_topic_not_approved');
    if (stage.kind !== 'quiz_topic' && stage.kind !== 'challenge_topic')
        throw new Error('studio_topic_kind_invalid');
    if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration)
        throw new Error('studio_topic_receipt_invalid');
    const file = bucket.file(stage.objectPath);
    const metadataResult = await file.getMetadata();
    const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
    if (String(metadata?.generation ?? '') !== stage.objectGeneration)
        throw new Error('studio_topic_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    if ((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase())
        throw new Error('studio_topic_content_hash_mismatch');
    let artifact;
    try {
        artifact = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw new Error('studio_topic_json_invalid');
    }
    const errors = (0, quiz_challenge_artifacts_1.validateTopicArtifact)(artifact, { kind: stage.kind, cefr: stage.cefr });
    if (errors.length)
        throw new Error(`studio_topic_artifact_invalid:${errors.join(',')}`);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, topic: Object.freeze({ ...(record(record(artifact)?.result) ?? {}) }) });
}
async function loadQuestionBatchForReview(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review'))
        throw new Error('question_batch_not_reviewable');
    const groundingReceipt = record(stage.groundingReceipt);
    const topic = record(groundingReceipt?.topic);
    if (!topic)
        throw new Error('question_batch_topic_receipt_required');
    const file = bucket.file(stage.objectPath);
    const metadataResult = await file.getMetadata();
    const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
    if (String(metadata?.generation ?? '') !== stage.objectGeneration)
        throw new Error('question_batch_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    if ((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase())
        throw new Error('question_batch_content_hash_mismatch');
    let artifact;
    try {
        artifact = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw new Error('question_batch_json_invalid');
    }
    const errors = (0, quiz_challenge_artifacts_2.validateQuestionBatchArtifact)(artifact, { kind: stage.kind, count: 10, grounding: { topic } });
    if (errors.length)
        throw new Error(`question_batch_artifact_invalid:${errors.join(',')}`);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, items: Object.freeze([...record(artifact)?.items]), topicArtifactId: String(groundingReceipt?.topicArtifactId ?? ''), topic: Object.freeze({ ...topic }) });
}
async function loadQuestionReplacementForReview(bucket, stage, options = {}) {
    if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review'))
        throw new Error('question_replacement_not_reviewable');
    const grounding = record(stage.groundingReceipt);
    if (!grounding || !record(grounding.topic) || !record(grounding.originalQuestion) || !String(grounding.replacementForQuestionId ?? ''))
        throw new Error('question_replacement_grounding_required');
    const file = bucket.file(stage.objectPath);
    const metadataResult = await file.getMetadata();
    const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
    if (String(metadata?.generation ?? '') !== stage.objectGeneration)
        throw new Error('question_replacement_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    if ((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase())
        throw new Error('question_replacement_content_hash_mismatch');
    let artifact;
    try {
        artifact = JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw new Error('question_replacement_json_invalid');
    }
    const errors = (0, quiz_challenge_artifacts_2.validateQuestionReplacementArtifact)(artifact, { kind: stage.kind, grounding });
    if (errors.length)
        throw new Error(`question_replacement_artifact_invalid:${errors.join(',')}`);
    const result = record(record(artifact)?.result);
    return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, batchArtifactId: String(grounding.batchArtifactId ?? ''), topicArtifactId: String(grounding.topicArtifactId ?? ''), replacementForQuestionId: String(result.replacementForQuestionId), originalQuestion: Object.freeze({ ...record(grounding.originalQuestion) }), item: Object.freeze({ ...record(result.item) }) });
}
//# sourceMappingURL=quiz_challenge_grounding.js.map