"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewFingerprint = reviewFingerprint;
exports.contentStageReviewFingerprint = contentStageReviewFingerprint;
const node_crypto_1 = require("node:crypto");
function canonical(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    const record = value;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}
function reviewFingerprint(evidence) {
    return (0, node_crypto_1.createHash)('sha256').update(`content-stage-review-v1\n${canonical(evidence)}`).digest('hex');
}
function contentStageReviewFingerprint(stageId, stage) {
    return reviewFingerprint({
        stageId, kind: stage.kind ?? null, revision: stage.revision ?? null, artifactId: stage.artifactId ?? null,
        objectPath: stage.objectPath ?? null, objectGeneration: stage.objectGeneration ?? null, contentHash: stage.contentHash ?? null,
        groundingReceipt: stage.groundingReceipt ?? null, qaReceipt: stage.qaReceipt ?? null,
        promptVersion: stage.promptVersion ?? null, schemaVersion: stage.schemaVersion ?? null,
        promptHash: stage.promptHash ?? null, schemaHash: stage.schemaHash ?? null, contextHash: stage.contextHash ?? null,
        baseRevisionIdentity: stage.baseRevisionIdentity ?? null,
        judgeReceipt: stage.judgeReceipt ?? null,
    });
}
//# sourceMappingURL=review_fingerprint.js.map