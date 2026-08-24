"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeArtifactPayload = serializeArtifactPayload;
exports.artifactObjectPath = artifactObjectPath;
exports.buildArtifactReceipt = buildArtifactReceipt;
const node_crypto_1 = require("node:crypto");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const course_release_contract_1 = require("./course_release_contract");
function serializeArtifactPayload(payload) {
    return (0, decision_registry_1.canonicalJsonV1)(payload);
}
function artifactObjectPath(releaseId, surface, lessonId) {
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(releaseId) || !course_release_contract_1.CANONICAL_RELEASE_SURFACES.includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100)
        throw new Error('artifact_path_invalid');
    return `course-releases/${releaseId}/${surface}/${lessonId}.json`;
}
function buildArtifactReceipt(input) {
    const serialized = serializeArtifactPayload(input.payload);
    const contentHash = (0, decision_registry_1.hashCanonicalBody)(input.payload);
    const byteSize = input.byteSize ?? Buffer.byteLength(serialized, 'utf8');
    if (!input.objectGeneration.trim() || !Number.isSafeInteger(byteSize) || byteSize < 1)
        throw new Error('artifact_receipt_invalid');
    const objectPath = artifactObjectPath(input.releaseId, input.surface, input.lessonId);
    const finalizationKey = (0, node_crypto_1.createHash)('sha256').update(`${objectPath}\n${input.objectGeneration}\n${contentHash}`).digest('hex');
    return Object.freeze({ objectPath, contentHash, objectGeneration: input.objectGeneration, byteSize, referenceState: 'pending_commit', finalizationKey });
}
//# sourceMappingURL=artifact_repository.js.map