"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stage_capabilities_1 = require("./stage_capabilities");
const kinds = [
    'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
    'challenge_topic', 'challenge_questions', 'challenge_question_replacement',
    'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement',
];
describe('server-authoritative stage capability matrix', () => {
    test('represents every stage kind exactly once', () => {
        expect(Object.keys(stage_capabilities_1.generationStageCapabilities).sort()).toEqual([...kinds].sort());
        expect(new Set(Object.keys(stage_capabilities_1.generationStageCapabilities)).size).toBe(kinds.length);
    });
    test.each([
        ['lesson_outline', 1, 'A1', []],
        ['lesson_phrases', 50, 'A2', ['lesson_outline']],
        ['challenge_questions', 10, 'B2', ['challenge_topic']],
        ['flashcard_items', 20, 'C1', ['flashcard_pack_idea']],
    ])('accepts preserved R1-R9 combination %s', (kind, count, cefr, prerequisites) => {
        expect(() => (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind, count, cefr, studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: prerequisites })).not.toThrow();
    });
    test('rejects unsupported levels, locale pairs, counts and prerequisite shapes', () => {
        expect(() => (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind: 'challenge_topic', count: 1, cefr: 'C3', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_cefr_unsupported');
        expect(() => (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind: 'lesson_outline', count: 1, cefr: 'A1', studyTarget: 'xx', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_locale_pair_unsupported');
        expect(() => (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind: 'lesson_phrases', count: 49, cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: ['lesson_outline'] })).toThrow('stage_capability_count_unsupported');
        expect(() => (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind: 'challenge_questions', count: 10, cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru', prerequisiteKinds: [] })).toThrow('stage_capability_prerequisites_invalid');
    });
    test('keeps cross-scope lesson phrases explicit only for flashcard items', () => {
        expect((0, stage_capabilities_1.stageCapability)('flashcard_items').dependencyScopePolicy).toBe('same_scope_or_lesson_phrases');
        expect((0, stage_capabilities_1.stageCapability)('lesson_theory').dependencyScopePolicy).toBe('same_scope');
    });
    test('exposes the gated rich flashcard runtime consumer without publishing the editorial idea', () => {
        expect((0, stage_capabilities_1.stageCapability)('flashcard_pack_idea')).toMatchObject({ publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false });
        expect((0, stage_capabilities_1.stageCapability)('flashcard_items')).toMatchObject({ publicationPolicy: 'standard', runtimeConsumer: true });
        expect((0, stage_capabilities_1.stageCapability)('flashcard_item_replacement')).toMatchObject({ publicationPolicy: 'standard', runtimeConsumer: true });
    });
    test('exposes language and exact prerequisite cardinality to Admin', () => {
        expect(stage_capabilities_1.stageLanguagePolicy).toMatchObject({ studyTargets: expect.arrayContaining(['en', 'fr', 'de']), sourceLocales: expect.arrayContaining(['ru', 'en']), sameLanguageAllowed: false });
        expect((0, stage_capabilities_1.stageCapability)('challenge_questions').prerequisiteCardinality).toEqual({ min: 1, max: 1 });
    });
});
//# sourceMappingURL=stage_capabilities.test.js.map