"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptLegacyGenerationUnit = adaptLegacyGenerationUnit;
const KIND_MAP = Object.freeze({
    lesson: 'lesson_phrases',
    flashcard: 'flashcard_items',
});
function adaptLegacyGenerationUnit(unit) {
    const stageKind = KIND_MAP[unit.surface];
    if (!stageKind)
        throw new Error('legacy_stage_surface_retired');
    const state = unit.state === 'succeeded' ? 'approved' : unit.state === 'running' ? 'running' : unit.state === 'failed' ? 'failed' : unit.state === 'generated' ? 'needs_review' : 'queued';
    return Object.freeze({
        legacy: true,
        legacyUnitId: unit.unitId,
        stageKind,
        scopeId: `lesson-${unit.lessonId}`,
        state,
        bundledSections: Object.freeze(unit.surface === 'lesson' ? ['vocabulary', 'drills'] : []),
    });
}
//# sourceMappingURL=legacy_stage_adapter.js.map