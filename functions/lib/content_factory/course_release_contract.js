"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_RELEASE_SURFACES = void 0;
exports.validateCourseRelease = validateCourseRelease;
exports.assertCourseRelease = assertCourseRelease;
exports.CANONICAL_RELEASE_SURFACES = ['lesson', 'flashcard'];
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasIsoDate(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function validateCourseRelease(value) {
    const errors = [];
    if (!isRecord(value))
        return { ok: false, errors: ['release_required'] };
    if (typeof value.releaseId !== 'string' || !TOKEN_RE.test(value.releaseId))
        errors.push('release_id_invalid');
    if (typeof value.studyTarget !== 'string' || !CODE_RE.test(value.studyTarget))
        errors.push('study_target_invalid');
    if (typeof value.learnerSourceLocale !== 'string' || !CODE_RE.test(value.learnerSourceLocale))
        errors.push('learner_source_locale_invalid');
    if (typeof value.blueprintId !== 'string' || !TOKEN_RE.test(value.blueprintId))
        errors.push('blueprint_id_invalid');
    if (value.blueprintLocale !== 'en')
        errors.push('blueprint_locale_must_be_en');
    if (typeof value.blueprintHash !== 'string' || !HASH_RE.test(value.blueprintHash))
        errors.push('blueprint_hash_invalid');
    if (typeof value.schemaVersion !== 'string' || !TOKEN_RE.test(value.schemaVersion))
        errors.push('schema_version_invalid');
    if (typeof value.contentVersion !== 'string' || !TOKEN_RE.test(value.contentVersion))
        errors.push('content_version_invalid');
    if (!hasIsoDate(value.createdAt))
        errors.push('created_at_invalid');
    if (typeof value.minAppVersion !== 'string' || !TOKEN_RE.test(value.minAppVersion))
        errors.push('min_app_version_invalid');
    if (!isRecord(value.artifacts)) {
        errors.push('artifacts_required');
        return { ok: false, errors };
    }
    const supportedSurfaces = new Set(exports.CANONICAL_RELEASE_SURFACES);
    if (Object.keys(value.artifacts).some((surface) => !supportedSurfaces.has(surface))) {
        errors.push('artifact_surface_unsupported');
    }
    for (const surface of exports.CANONICAL_RELEASE_SURFACES) {
        const artifact = value.artifacts[surface];
        if (!isRecord(artifact)) {
            errors.push(`artifact_missing_${surface}`);
            continue;
        }
        if (artifact.releaseId !== value.releaseId || artifact.studyTarget !== value.studyTarget || artifact.learnerSourceLocale !== value.learnerSourceLocale || artifact.surface !== surface)
            errors.push('artifact_identity_mismatch');
        if (typeof artifact.contentHash !== 'string' || !HASH_RE.test(artifact.contentHash))
            errors.push('artifact_hash_invalid');
        if (typeof artifact.objectGeneration !== 'string' || !artifact.objectGeneration.trim())
            errors.push('artifact_generation_invalid');
        if (!Number.isSafeInteger(artifact.byteSize) || Number(artifact.byteSize) < 1)
            errors.push('artifact_byte_size_invalid');
        if (typeof artifact.entryIndex !== 'string' || !artifact.entryIndex.trim() || artifact.entryIndex.includes('..') || artifact.entryIndex.startsWith('/'))
            errors.push('artifact_entry_index_invalid');
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
function assertCourseRelease(value) {
    const result = validateCourseRelease(value);
    if (!result.ok)
        throw new Error(`course_release_invalid:${result.errors.join(',')}`);
    return value;
}
//# sourceMappingURL=course_release_contract.js.map