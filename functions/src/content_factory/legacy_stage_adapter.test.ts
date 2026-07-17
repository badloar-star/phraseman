import { adaptLegacyGenerationUnit } from './legacy_stage_adapter';

describe('legacy content factory stage compatibility', () => {
  it.each([
    ['lesson', 'lesson_phrases', ['vocabulary', 'drills']],
    ['quiz', 'quiz_questions', []],
    ['flashcard', 'flashcard_items', []],
    ['arena', 'arena_questions', []],
  ] as const)('adapts legacy %s without changing its stored identity', (surface, kind, bundledSections) => {
    expect(adaptLegacyGenerationUnit({ unitId: `job-1:${surface}:1`, jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface, lessonId: 1, state: 'succeeded', attempts: 1 })).toEqual({
      legacy: true,
      legacyUnitId: `job-1:${surface}:1`,
      stageKind: kind,
      scopeId: 'lesson-1',
      state: 'approved',
      bundledSections,
    });
  });
});
