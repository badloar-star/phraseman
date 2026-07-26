"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishedArtifactDocId = publishedArtifactDocId;
exports.validatePublishedLessonArtifact = validatePublishedLessonArtifact;
exports.assertPublishedArtifactMatchesPointer = assertPublishedArtifactMatchesPointer;
const contracts_1 = require("./contracts");
function publishedArtifactDocId(packId, lessonId) {
    if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(packId) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) {
        throw new Error('published_artifact_id_invalid');
    }
    return `${packId}:${lessonId}`;
}
function validatePublishedLessonArtifact(value) {
    const errors = [];
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { ok: false, errors: ['artifact_required'] };
    const artifact = value;
    if (typeof artifact.packId !== 'string' || !artifact.packId.trim())
        errors.push('pack_id_required');
    if (typeof artifact.studyTarget !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(artifact.studyTarget))
        errors.push('study_target_mismatch');
    if (typeof artifact.sourceLocale !== 'string' || !artifact.sourceLocale.trim())
        errors.push('source_locale_required');
    if (artifact.surface !== 'lessons')
        errors.push('surface_mismatch');
    if (!Number.isInteger(artifact.revision) || Number(artifact.revision) < 1)
        errors.push('revision_required');
    if (typeof artifact.contentHash !== 'string' || !artifact.contentHash.trim())
        errors.push('content_hash_required');
    if (!Number.isInteger(artifact.lessonId) || Number(artifact.lessonId) < 1)
        errors.push('lesson_id_required');
    if (!Array.isArray(artifact.phrases) || !Array.isArray(artifact.vocabulary) || !Array.isArray(artifact.drills)) {
        errors.push('lesson_payload_required');
    }
    else {
        errors.push(...(0, contracts_1.validateLessonArtifact)(artifact).errors);
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
function assertPublishedArtifactMatchesPointer(artifact, pointer) {
    if (artifact.packId !== pointer.packId
        || artifact.studyTarget !== pointer.studyTarget
        || artifact.sourceLocale !== pointer.sourceLocale
        || artifact.revision !== pointer.revision
        || artifact.contentHash !== pointer.contentHash) {
        throw new Error('published_artifact_identity_mismatch');
    }
}
//# sourceMappingURL=published_artifact.js.map