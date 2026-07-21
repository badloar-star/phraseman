"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGeneratedSurfaceItem = validateGeneratedSurfaceItem;
exports.assertSurfaceMatchesPack = assertSurfaceMatchesPack;
function validateGeneratedSurfaceItem(item) {
    if (!item.id.trim() || !item.packId.trim() || !item.studyTarget.trim() || !item.sourceLocale.trim() || !item.contentHash.trim() || !Number.isInteger(item.revision) || item.revision < 1 || !Number.isInteger(item.lessonId) || item.lessonId < 1) {
        throw new Error('validation_failed');
    }
    if (!['quizzes', 'cards', 'arena_questions'].includes(item.surface))
        throw new Error('surface_not_publishable');
}
function assertSurfaceMatchesPack(item, activePack) {
    if (item.packId !== activePack.packId || item.studyTarget !== activePack.studyTarget || item.revision !== activePack.revision || item.contentHash !== activePack.contentHash || item.sourceLocale !== activePack.sourceLocale)
        throw new Error('cross_language_or_revision_mismatch');
}
//# sourceMappingURL=surface_contract.js.map