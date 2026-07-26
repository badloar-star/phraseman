"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLessonArtifact = validateLessonArtifact;
exports.validatePackManifest = validatePackManifest;
exports.createGenerationJob = createGenerationJob;
function validateLessonArtifact(lesson) {
    const errors = [];
    if (!Number.isInteger(lesson.lessonId) || lesson.lessonId < 1)
        errors.push('lessonId_invalid');
    if (lesson.phrases.length !== 50)
        errors.push('phrase_count_expected_50');
    const seenTargets = new Set();
    for (const phrase of lesson.phrases) {
        if (!phrase.sourceText.trim() || !phrase.targetText.trim())
            errors.push('phrase_text_required');
        const normalized = phrase.targetText.trim().toLocaleLowerCase();
        if (seenTargets.has(normalized))
            errors.push('phrase_duplicate');
        seenTargets.add(normalized);
    }
    if (lesson.vocabulary.length === 0)
        errors.push('vocabulary_required');
    lesson.vocabulary.forEach(item => {
        if (!item.lemma.trim() || !item.partOfSpeech.trim() || !item.targetText.trim()) {
            errors.push('vocabulary_field_required');
        }
    });
    lesson.drills.forEach(drill => {
        if (!drill.applicable && drill.itemCount > 0)
            errors.push('non_applicable_drill_has_items');
        if (drill.applicable && drill.itemCount < 1)
            errors.push('applicable_drill_empty');
    });
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
function validatePackManifest(manifest) {
    const errors = [];
    if (!manifest.packId.trim())
        errors.push('packId_required');
    if (!manifest.studyTarget.trim())
        errors.push('studyTarget_required');
    if (!manifest.sourceLocale.trim())
        errors.push('sourceLocale_required');
    if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1)
        errors.push('schemaVersion_invalid');
    if (!Number.isInteger(manifest.contentVersion) || manifest.contentVersion < 1)
        errors.push('contentVersion_invalid');
    if (!manifest.sourceBlueprintVersion.trim())
        errors.push('sourceBlueprintVersion_required');
    if (!manifest.contentHash.trim())
        errors.push('contentHash_required');
    if (!manifest.createdAt.trim())
        errors.push('createdAt_required');
    if (!manifest.createdBy.trim())
        errors.push('createdBy_required');
    if (manifest.reviewStatus !== 'approved' && manifest.activationStatus !== 'draft')
        errors.push('review_required');
    if (manifest.activationStatus === 'published' && manifest.reviewStatus !== 'approved')
        errors.push('published_requires_review');
    return { ok: errors.length === 0, errors };
}
function createGenerationJob(input) {
    if (!input.projectId.trim()
        || !input.studyTarget.trim()
        || !input.sourceLocale.trim()
        || input.lessonIds.length === 0
        || input.lessonIds.some(id => !Number.isInteger(id) || id < 1)
        || input.surfaces.length === 0
        || !input.idempotencyKey.trim()
        || !input.requestedBy.trim()
        || !input.blueprintVersion.trim()) {
        throw new Error('validation_failed');
    }
    const total = input.lessonIds.length * input.surfaces.length;
    return Object.freeze({
        projectId: input.projectId.trim(),
        studyTarget: input.studyTarget.trim(),
        sourceLocale: input.sourceLocale.trim(),
        lessonIds: Object.freeze([...input.lessonIds]),
        surfaces: Object.freeze([...input.surfaces]),
        idempotencyKey: input.idempotencyKey.trim(),
        requestedBy: input.requestedBy.trim(),
        blueprintVersion: input.blueprintVersion.trim(),
        state: 'queued',
        progress: Object.freeze({ total, completed: 0, failed: 0 }),
        createdAt: input.now ?? new Date().toISOString(),
    });
}
//# sourceMappingURL=contracts.js.map