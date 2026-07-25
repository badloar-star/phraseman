"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const legacy_stage_adapter_1 = require("./legacy_stage_adapter");
describe('legacy content factory stage compatibility', () => {
    it.each([
        ['lesson', 'lesson_phrases', ['vocabulary', 'drills']],
        ['quiz', 'quiz_questions', []],
        ['flashcard', 'flashcard_items', []],
        ['arena', 'arena_questions', []],
    ])('adapts legacy %s without changing its stored identity', (surface, kind, bundledSections) => {
        expect((0, legacy_stage_adapter_1.adaptLegacyGenerationUnit)({ unitId: `job-1:${surface}:1`, jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface, lessonId: 1, state: 'succeeded', attempts: 1 })).toEqual({
            legacy: true,
            legacyUnitId: `job-1:${surface}:1`,
            stageKind: kind,
            scopeId: 'lesson-1',
            state: 'approved',
            bundledSections,
        });
    });
});
//# sourceMappingURL=legacy_stage_adapter.test.js.map