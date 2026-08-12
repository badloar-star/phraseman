import { assertStageCapabilityRequest, generationStageCapabilities, stageCapability, stageLanguagePolicy } from './stage_capabilities';
import { type GenerationStageKind } from './stage_contracts';

const kinds: readonly GenerationStageKind[] = [
  'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
  'challenge_topic', 'challenge_questions', 'challenge_question_replacement',
  'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement',
  'learning_v2_research', 'learning_v2_curriculum', 'learning_v2_lesson_outline', 'learning_v2_localized_course',
  'learning_v2_audio', 'learning_v2_quality_assurance', 'learning_v2_release',
];

describe('server-authoritative stage capability matrix', () => {
  test('represents every stage kind exactly once', () => {
    expect(Object.keys(generationStageCapabilities).sort()).toEqual([...kinds].sort());
    expect(new Set(Object.keys(generationStageCapabilities)).size).toBe(kinds.length);
  });

  test.each([
    ['lesson_outline', 1, 'A1', []],
    ['lesson_phrases', 50, 'A2', ['lesson_outline']],
    ['challenge_questions', 10, 'B2', ['challenge_topic']],
    ['flashcard_items', 20, 'C1', ['flashcard_pack_idea']],
  ] as const)('accepts preserved R1-R9 combination %s', (kind, count, cefr, prerequisites) => {
    expect(() => assertStageCapabilityRequest({ kind, count, cefr, studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: prerequisites })).not.toThrow();
  });

  test('rejects unsupported levels, locale pairs, counts and prerequisite shapes', () => {
    expect(() => assertStageCapabilityRequest({ kind: 'lesson_outline', count: 1, cefr: 'Z9', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_cefr_unsupported');
    expect(() => assertStageCapabilityRequest({ kind: 'lesson_outline', count: 1, cefr: 'A1', studyTarget: 'xx', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_locale_pair_unsupported');
    expect(() => assertStageCapabilityRequest({ kind: 'lesson_phrases', count: 49, cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: ['lesson_outline'] })).toThrow('stage_capability_count_unsupported');
    expect(() => assertStageCapabilityRequest({ kind: 'challenge_questions', count: 10, cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_prerequisites_invalid');
  });

  test('keeps cross-scope lesson phrases explicit only for flashcard items', () => {
    expect(stageCapability('flashcard_items').dependencyScopePolicy).toBe('same_scope_or_lesson_phrases');
    expect(stageCapability('lesson_theory').dependencyScopePolicy).toBe('same_scope');
  });

  test('exposes the gated rich flashcard runtime consumer without publishing the editorial idea', () => {
    expect(stageCapability('flashcard_pack_idea')).toMatchObject({ publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false });
    expect(stageCapability('flashcard_items')).toMatchObject({ publicationPolicy: 'standard', runtimeConsumer: true });
    expect(stageCapability('flashcard_item_replacement')).toMatchObject({ publicationPolicy: 'standard', runtimeConsumer: true });
  });

  test('exposes language and exact prerequisite cardinality to Admin', () => {
    expect(stageLanguagePolicy).toMatchObject({ studyTargets: expect.arrayContaining(['en', 'fr', 'de']), sourceLocales: expect.arrayContaining(['ru', 'en', 'multi']), sameLanguageAllowed: false });
    expect(stageCapability('challenge_questions').prerequisiteCardinality).toEqual({ min: 1, max: 1 });
  });

  test('keeps Learning V2 in the same queue while requiring the atomic all-interface-locale source policy', () => {
    expect(() => assertStageCapabilityRequest({ kind: 'learning_v2_research', count: 1, cefr: 'PRE_A1', studyTarget: 'en', sourceLocale: 'multi', prerequisiteKinds: [] })).not.toThrow();
    expect(() => assertStageCapabilityRequest({ kind: 'learning_v2_research', count: 1, cefr: 'PRE_A1', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_locale_pair_unsupported');
    expect(stageCapability('learning_v2_release')).toMatchObject({ publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false, scopeType: 'course' });
  });
});
