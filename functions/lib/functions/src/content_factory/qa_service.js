"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLessonQa = runLessonQa;
const node_crypto_1 = require("node:crypto");
const contracts_1 = require("./contracts");
function canonicalArtifact(artifact) {
    return JSON.stringify({ lessonId: artifact.lessonId, phrases: artifact.phrases, vocabulary: artifact.vocabulary, drills: artifact.drills });
}
function runLessonQa(input) {
    const errors = [...(0, contracts_1.validateLessonArtifact)(input.artifact).errors];
    if (!input.blueprintHash.trim())
        errors.push('blueprint_hash_required');
    if (input.sourceEvidence.length === 0)
        errors.push('source_evidence_required');
    input.sourceEvidence.forEach((evidence) => {
        if (!evidence.evidenceId.trim() || !evidence.authority.trim() || !/^https:\/\//.test(evidence.url) || !evidence.claim.trim())
            errors.push('source_evidence_invalid');
    });
    const artifactHash = (0, node_crypto_1.createHash)('sha256').update(canonicalArtifact(input.artifact)).digest('hex');
    const uniqueErrors = [...new Set(errors)];
    const qaResultId = `qa_${input.artifact.lessonId}_${artifactHash.slice(0, 16)}`;
    return Object.freeze({
        qaResultId,
        artifactHash,
        blueprintHash: input.blueprintHash,
        sourceEvidenceIds: Object.freeze(input.sourceEvidence.map((evidence) => evidence.evidenceId)),
        reviewerId: null,
        status: uniqueErrors.length === 0 ? 'passed' : 'failed',
        errors: Object.freeze(uniqueErrors),
        createdAt: input.now ?? new Date().toISOString(),
    });
}
//# sourceMappingURL=qa_service.js.map