"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAdaptiveGenerationRequest = validateAdaptiveGenerationRequest;
exports.adaptiveGenerationStoragePath = adaptiveGenerationStoragePath;
function validateAdaptiveGenerationRequest(input) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(input.userId) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(input.studyTarget) || input.sourceLessonIds.length === 0 || input.sourceLessonIds.some((id) => !Number.isInteger(id) || id < 1))
        throw new Error('validation_failed');
    if (!Number.isInteger(input.maxItems) || input.maxItems < 1 || input.maxItems > 20)
        throw new Error('max_items_exceeded');
    if (!Number.isInteger(input.activePackRevision) || input.activePackRevision < 1)
        throw new Error('active_pack_required');
    const expiresAt = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 24 * 60 * 60 * 1000)
        throw new Error('ttl_invalid');
    if (!['practice', 'quiz', 'cards'].includes(input.surface) || !['repeated_mistakes', 'spaced_repetition', 'arena_review'].includes(input.reason))
        throw new Error('surface_or_reason_invalid');
}
/** User-adaptive generation is ephemeral practice only; it cannot publish lessons or theory. */
function adaptiveGenerationStoragePath(input) {
    validateAdaptiveGenerationRequest(input);
    return `users/${input.userId}/adaptive_content/${input.studyTarget}/${input.surface}/r${input.activePackRevision}`;
}
//# sourceMappingURL=adaptive_contract.js.map