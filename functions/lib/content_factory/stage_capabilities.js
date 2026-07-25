"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generationStageCapabilities = exports.stageLanguagePolicy = void 0;
exports.stageCapability = stageCapability;
exports.allowedDependencyKinds = allowedDependencyKinds;
exports.assertStageCapabilityRequest = assertStageCapabilityRequest;
const ALL_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const ARENA_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2']);
const SUPPORTED_TARGETS = new Set(['en', 'fr', 'de', 'es', 'it', 'pt']);
const SUPPORTED_SOURCES = new Set(['ru', 'en']);
exports.stageLanguagePolicy = Object.freeze({ studyTargets: Object.freeze([...SUPPORTED_TARGETS]), sourceLocales: Object.freeze([...SUPPORTED_SOURCES]), sameLanguageAllowed: false });
const fixed = (value) => Object.freeze({ min: value, max: value, fixed: value });
const range = (min, max) => Object.freeze({ min, max });
function capability(kind, input) {
    return Object.freeze({
        kind,
        cefr: input.cefr ?? ALL_LEVELS,
        count: input.count,
        prerequisiteKinds: Object.freeze([...input.prerequisiteKinds]),
        prerequisiteCardinality: Object.freeze({ min: input.prerequisiteKinds.length, max: input.prerequisiteKinds.length }),
        dependencyScopePolicy: input.dependencyScopePolicy ?? 'same_scope',
        scopeType: input.scopeType,
        editableFields: Object.freeze([...input.editableFields]),
        publicationPolicy: input.publicationPolicy ?? 'standard',
        runtimeConsumer: input.runtimeConsumer ?? true,
    });
}
exports.generationStageCapabilities = Object.freeze({
    lesson_outline: capability('lesson_outline', { count: fixed(1), prerequisiteKinds: [], scopeType: 'lesson', editableFields: ['title', 'goal', 'coverage'] }),
    lesson_phrases: capability('lesson_phrases', { count: fixed(50), prerequisiteKinds: ['lesson_outline'], scopeType: 'lesson', editableFields: ['items'] }),
    lesson_vocabulary: capability('lesson_vocabulary', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['items'] }),
    lesson_irregular_verbs: capability('lesson_irregular_verbs', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['items'] }),
    lesson_prepositions: capability('lesson_prepositions', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['items'] }),
    lesson_theory: capability('lesson_theory', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['rules', 'examples', 'commonMistakes', 'miniCheck'] }),
    quiz_topic: capability('quiz_topic', { count: fixed(1), prerequisiteKinds: [], scopeType: 'topic', editableFields: ['title', 'idea', 'constraints'] }),
    quiz_questions: capability('quiz_questions', { count: fixed(10), prerequisiteKinds: ['quiz_topic'], scopeType: 'topic', editableFields: ['items'] }),
    challenge_topic: capability('challenge_topic', { count: fixed(1), prerequisiteKinds: [], scopeType: 'topic', editableFields: ['title', 'idea', 'constraints'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
    challenge_questions: capability('challenge_questions', { count: fixed(10), prerequisiteKinds: ['challenge_topic'], scopeType: 'topic', editableFields: ['items'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
    quiz_question_replacement: capability('quiz_question_replacement', { count: fixed(1), prerequisiteKinds: ['quiz_questions'], scopeType: 'topic', editableFields: ['item'] }),
    challenge_question_replacement: capability('challenge_question_replacement', { count: fixed(1), prerequisiteKinds: ['challenge_questions'], scopeType: 'topic', editableFields: ['item'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
    flashcard_pack_idea: capability('flashcard_pack_idea', { count: fixed(1), prerequisiteKinds: [], scopeType: 'pack', editableFields: ['title', 'idea', 'constraints'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
    flashcard_items: capability('flashcard_items', { count: range(1, 20), prerequisiteKinds: ['flashcard_pack_idea'], dependencyScopePolicy: 'same_scope_or_lesson_phrases', scopeType: 'pack', editableFields: ['items'], publicationPolicy: 'standard', runtimeConsumer: true }),
    flashcard_item_replacement: capability('flashcard_item_replacement', { count: fixed(1), prerequisiteKinds: ['flashcard_items'], scopeType: 'pack', editableFields: ['item'], publicationPolicy: 'standard', runtimeConsumer: true }),
    arena_topic: capability('arena_topic', { cefr: ARENA_LEVELS, count: fixed(1), prerequisiteKinds: [], scopeType: 'arena', editableFields: ['title', 'idea', 'runtimePolicy'] }),
    arena_questions: capability('arena_questions', { cefr: ARENA_LEVELS, count: fixed(10), prerequisiteKinds: ['arena_topic'], scopeType: 'arena', editableFields: ['items'] }),
});
function stageCapability(kind) {
    const result = exports.generationStageCapabilities[kind];
    if (!result)
        throw new Error('stage_capability_kind_unsupported');
    return result;
}
function allowedDependencyKinds(kind) {
    const result = stageCapability(kind);
    return result.dependencyScopePolicy === 'same_scope_or_lesson_phrases'
        ? Object.freeze([...result.prerequisiteKinds, 'lesson_phrases'])
        : result.prerequisiteKinds;
}
function assertStageCapabilityRequest(input) {
    const result = stageCapability(input.kind);
    if (!result.cefr.includes(input.cefr))
        throw new Error('stage_capability_cefr_unsupported');
    if (!SUPPORTED_TARGETS.has(input.studyTarget) || !SUPPORTED_SOURCES.has(input.sourceLocale) || input.studyTarget === input.sourceLocale)
        throw new Error('stage_capability_locale_pair_unsupported');
    if (!Number.isSafeInteger(input.count) || input.count < result.count.min || input.count > result.count.max || (result.count.fixed !== undefined && input.count !== result.count.fixed))
        throw new Error('stage_capability_count_unsupported');
    if (input.prerequisiteKinds.length !== result.prerequisiteKinds.length || result.prerequisiteKinds.some((kind, index) => input.prerequisiteKinds[index] !== kind))
        throw new Error('stage_capability_prerequisites_invalid');
    return result;
}
//# sourceMappingURL=stage_capabilities.js.map