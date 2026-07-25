"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptLegacyGenerationUnit = adaptLegacyGenerationUnit;
const KIND_MAP = Object.freeze({ lesson: 'lesson_phrases', quiz: 'quiz_questions', flashcard: 'flashcard_items', arena: 'arena_questions' });
function adaptLegacyGenerationUnit(unit) {
    const state = unit.state === 'succeeded' ? 'approved' : unit.state === 'running' ? 'running' : unit.state === 'failed' ? 'failed' : unit.state === 'generated' ? 'needs_review' : 'queued';
    return Object.freeze({
        legacy: true,
        legacyUnitId: unit.unitId,
        stageKind: KIND_MAP[unit.surface],
        scopeId: `lesson-${unit.lessonId}`,
        state,
        bundledSections: Object.freeze(unit.surface === 'lesson' ? ['vocabulary', 'drills'] : []),
    });
}
//# sourceMappingURL=legacy_stage_adapter.js.map