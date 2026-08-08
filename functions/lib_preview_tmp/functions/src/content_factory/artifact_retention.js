"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifactOrphanCandidateId = artifactOrphanCandidateId;
exports.buildArtifactOrphanCandidate = buildArtifactOrphanCandidate;
exports.buildArtifactRetentionManifest = buildArtifactRetentionManifest;
const MAX_SCAN = 500;
const DEFAULT_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;
function artifactOrphanCandidateId(receipt) {
    return (0, node_crypto_1.createHash)('sha256').update(`${receipt.objectPath}\n${receipt.objectGeneration}\n${receipt.contentHash}`).digest('hex');
}
function buildArtifactOrphanCandidate(receipt, context) {
    if (!receipt.objectPath || !receipt.objectGeneration || !/^[a-f0-9]{64}$/i.test(receipt.contentHash) || !/^[a-f0-9]{64}$/i.test(receipt.finalizationKey) || !Number.isSafeInteger(receipt.byteSize) || receipt.byteSize < 1 || !context.entityCollection || !context.entityId || !Number.isSafeInteger(context.attempt) || context.attempt < 1 || !Number.isSafeInteger(context.detectedAtMs) || context.detectedAtMs < 1)
        throw new Error('artifact_orphan_candidate_invalid');
    return Object.freeze({ candidateId: artifactOrphanCandidateId(receipt), state: 'orphan_candidate', reason: 'terminal_lease_lost', objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, contentHash: receipt.contentHash, byteSize: receipt.byteSize, finalizationKey: receipt.finalizationKey, entityCollection: context.entityCollection, entityId: context.entityId, attempt: context.attempt, detectedAtMs: context.detectedAtMs });
}
function identity(objectPath, objectGeneration) {
    return `${objectPath}\n${objectGeneration}`;
}
function buildArtifactRetentionManifest(input) {
    if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 1)
        throw new Error('artifact_retention_time_invalid');
    if (input.candidates.length > MAX_SCAN || input.references.length > 10000)
        throw new Error('artifact_retention_scan_limit_exceeded');
    const mode = input.mode ?? 'dry-run';
    if (mode === 'delete' && input.allowDelete !== true)
        throw new Error('artifact_retention_delete_not_authorized');
    const minAgeMs = input.minAgeMs ?? DEFAULT_MIN_AGE_MS;
    if (!Number.isSafeInteger(minAgeMs) || minAgeMs < 60000)
        throw new Error('artifact_retention_age_invalid');
    const protectedObjects = new Set(input.references.map((item) => identity(item.objectPath, item.objectGeneration)));
    const eligible = [];
    let referencedCount = 0;
    let skippedYoungCount = 0;
    for (const candidate of input.candidates) {
        if (!candidate.objectPath || !candidate.objectGeneration || !Number.isSafeInteger(candidate.createdAtMs) || candidate.createdAtMs < 0 || candidate.createdAtMs > input.nowMs)
            throw new Error('artifact_retention_candidate_invalid');
        if (protectedObjects.has(identity(candidate.objectPath, candidate.objectGeneration))) {
            referencedCount += 1;
            continue;
        }
        if (input.nowMs - candidate.createdAtMs < minAgeMs) {
            skippedYoungCount += 1;
            continue;
        }
        eligible.push({ objectPath: candidate.objectPath, objectGeneration: candidate.objectGeneration });
    }
    eligible.sort((left, right) => left.objectPath.localeCompare(right.objectPath) || left.objectGeneration.localeCompare(right.objectGeneration));
    return Object.freeze({ mode, scanned: input.candidates.length, minAgeMs, referencedCount, skippedYoungCount, eligibleCount: eligible.length, eligible: Object.freeze(eligible.map(Object.freeze)) });
}
const node_crypto_1 = require("node:crypto");
//# sourceMappingURL=artifact_retention.js.map