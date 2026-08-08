import { buildGenerationStagePlan, requiredPrerequisiteKinds } from './stage_service';

describe('independent generation stage planning', () => {
  it.each([
    ['lesson_phrases', ['lesson_outline']],
    ['lesson_vocabulary', ['lesson_phrases']],
    ['lesson_irregular_verbs', ['lesson_phrases']],
    ['lesson_prepositions', ['lesson_phrases']],
    ['lesson_theory', ['lesson_phrases']],
    ['challenge_questions', ['challenge_topic']],
    ['challenge_question_replacement', ['challenge_questions']],
    ['flashcard_items', ['flashcard_pack_idea']],
    ['flashcard_item_replacement', ['flashcard_items']],
  ] as const)('%s requires only approved %j', (kind, prerequisites) => {
    expect(requiredPrerequisiteKinds(kind)).toEqual(prerequisites);
  });

  it('creates an independently retryable stage from approved prerequisite artifacts', () => {
    const plan = buildGenerationStagePlan({ requestId: 'request-1', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A2', scopeId: 'topic-1', schemaVersion: 1, promptVersion: 'v1', count: 10, qaPolicy: 'content-quality-v1', revision: 2, approvedPrerequisites: [{ kind: 'challenge_topic', artifactId: 'topic-artifact-1', state: 'approved' }] });
    expect(plan.unit).toMatchObject({ kind: 'challenge_questions', count: 10, revision: 2, prerequisiteArtifactIds: ['topic-artifact-1'] });
    expect(plan.prerequisiteKinds).toEqual(['challenge_topic']);
  });

  it('blocks missing or unapproved prerequisites without creating a unit', () => {
    expect(() => buildGenerationStagePlan({ requestId: 'request-1', kind: 'lesson_theory', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A2', scopeId: 'lesson-1', schemaVersion: 1, promptVersion: 'v1', count: 1, qaPolicy: 'content-quality-v1', revision: 1, approvedPrerequisites: [] })).toThrow('generation_stage_prerequisite_missing:lesson_phrases');
    expect(() => buildGenerationStagePlan({ requestId: 'request-1', kind: 'lesson_vocabulary', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A2', scopeId: 'lesson-1', schemaVersion: 1, promptVersion: 'v1', count: 20, qaPolicy: 'content-quality-v1', revision: 1, approvedPrerequisites: [{ kind: 'lesson_phrases', artifactId: 'phrases-1', state: 'needs_review' }] })).toThrow('generation_stage_prerequisite_unapproved:lesson_phrases');
  });

  it('requires the canonical lesson phrase artifact to contain exactly 50 phrases', () => {
    const approvedPrerequisites = [{ kind: 'lesson_outline' as const, artifactId: 'outline-1', state: 'approved' as const }];
    expect(() => buildGenerationStagePlan({ requestId: 'request-1', kind: 'lesson_phrases', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', scopeId: 'lesson-1', schemaVersion: 2, promptVersion: 'v2', count: 49, qaPolicy: 'lesson-quality-v2', revision: 1, approvedPrerequisites })).toThrow('stage_capability_count_unsupported');
  });

  it.each(['challenge_questions'] as const)('requires %s batches to contain exactly 10 questions', (kind) => {
    const prerequisiteKind = 'challenge_topic' as const;
    expect(() => buildGenerationStagePlan({ requestId: 'request-1', kind, studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', scopeId: 'topic-1', schemaVersion: 2, promptVersion: 'v2', count: 9, qaPolicy: 'question-studio-quality-v2', revision: 1, approvedPrerequisites: [{ kind: prerequisiteKind, artifactId: 'topic-1', state: 'approved' }] })).toThrow('stage_capability_count_unsupported');
  });

  it('requires a replacement stage to contain exactly one result', () => {
    expect(() => buildGenerationStagePlan({ requestId: 'request-1', kind: 'challenge_question_replacement', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', scopeId: 'replace-q1', schemaVersion: 2, promptVersion: 'v2', count: 2, qaPolicy: 'question-studio-quality-v2', revision: 1, approvedPrerequisites: [{ kind: 'challenge_questions', artifactId: 'batch-1', state: 'approved' }] })).toThrow('stage_capability_count_unsupported');
  });

});
