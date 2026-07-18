import { createGenerationStageUnit, type GenerationStageKind } from './stage_contracts';

describe('versioned content generation stages', () => {
  it.each<GenerationStageKind>([
    'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
    'challenge_topic', 'challenge_questions', 'challenge_question_replacement', 'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement',
  ])('creates an immutable, independently addressable %s unit', (kind) => {
    const unit = createGenerationStageUnit({
      requestId: 'request-1', kind, studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'lesson-1',
      schemaVersion: 1, promptVersion: 'v1', count: kind.endsWith('_questions') ? 10 : 1,
      prerequisiteArtifactIds: [], qaPolicy: 'content-quality-v1', revision: 1,
    });

    expect(unit.stageId).toBe(`request-1:${kind}:lesson-1:r1`);
    expect(unit.artifactId).toBe(`artifact:request-1:${kind}:lesson-1:r1`);
    expect(unit.idempotencyKey).toBe(unit.stageId);
    expect(Object.isFrozen(unit)).toBe(true);
  });

  it('rejects invalid counts and unversioned contracts', () => {
    expect(() => createGenerationStageUnit({ requestId: 'r', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1', schemaVersion: 0, promptVersion: '', count: 0, prerequisiteArtifactIds: [], qaPolicy: '', revision: 0 })).toThrow('generation_stage_invalid');
  });
});
