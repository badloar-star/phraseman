"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReleaseReviewCandidate = validateReleaseReviewCandidate;
const course_release_contract_1 = require("./course_release_contract");
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function sortedUniqueStrings(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}
function unitKey(surface, lessonId) {
    return `${surface}:${lessonId}`;
}
function validateReleaseReviewCandidate(input) {
    const errors = new Set();
    const expectedLessonIds = [...new Set(input.expectedLessonIds)];
    const expectedKeys = new Set(expectedLessonIds.flatMap((lessonId) => course_release_contract_1.CANONICAL_RELEASE_SURFACES.map((surface) => unitKey(surface, lessonId))));
    const counts = new Map();
    const expectedEvidenceIds = sortedUniqueStrings(input.expectedEvidenceIds);
    for (const unit of input.units) {
        const surface = unit.surface;
        const lessonId = Number(unit.lessonId);
        if (!course_release_contract_1.CANONICAL_RELEASE_SURFACES.includes(String(surface)) || !Number.isInteger(lessonId)) {
            errors.add('unit_scope_invalid');
            continue;
        }
        const key = unitKey(surface, lessonId);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (!expectedKeys.has(key))
            errors.add('unit_scope_invalid');
        if (unit.jobId !== input.jobId || unit.studyTarget !== input.studyTarget || unit.learnerSourceLocale !== input.learnerSourceLocale || unit.releaseId !== input.releaseId)
            errors.add('unit_identity_mismatch');
        if (unit.state !== 'succeeded')
            errors.add('unit_not_succeeded');
        if (typeof unit.contentHash !== 'string' || !/^[a-f0-9]{64}$/i.test(unit.contentHash) || typeof unit.objectGeneration !== 'string' || !unit.objectGeneration.trim() || !Number.isSafeInteger(unit.byteSize) || Number(unit.byteSize) < 1)
            errors.add('artifact_receipt_invalid');
        if (!isRecord(unit.qaReceipt) || unit.qaReceipt.status !== 'passed') {
            errors.add('qa_not_passed');
            continue;
        }
        if (unit.qaReceipt.blueprintHash !== input.expectedBlueprintHash)
            errors.add('qa_blueprint_hash_mismatch');
        const evidenceIds = Array.isArray(unit.qaReceipt.sourceEvidenceIds) ? sortedUniqueStrings(unit.qaReceipt.sourceEvidenceIds.map(String)) : [];
        if (evidenceIds.join('|') !== expectedEvidenceIds.join('|'))
            errors.add('qa_source_evidence_mismatch');
    }
    for (const key of expectedKeys) {
        const count = counts.get(key) ?? 0;
        if (count === 0)
            errors.add('unit_missing');
        if (count > 1)
            errors.add('unit_duplicate');
    }
    return Object.freeze({ ok: errors.size === 0, errors: Object.freeze([...errors]), blueprintHash: input.expectedBlueprintHash, sourceEvidenceIds: Object.freeze(expectedEvidenceIds) });
}
//# sourceMappingURL=release_review.js.map