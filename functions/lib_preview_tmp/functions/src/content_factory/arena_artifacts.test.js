"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_artifacts_1 = require("./arena_artifacts");
const topic = {
    stage: 'arena_topic',
    result: {
        topicId: 'fast-city-a2', title: 'Fast City English', learningPromise: 'Answer practical city prompts quickly and fairly.', level: 'A2',
        skillTags: ['directions', 'services'], inclusions: ['short requests'], exclusions: ['regional trivia'], allowedTypes: ['translate', 'choose'],
        difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500,
        targetAnswerTimeMs: 8000, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' },
        localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' }, fairnessRules: ['one unambiguous answer', 'no trick punctuation'],
    },
};
const item = (index) => ({
    id: `a${index}`, level: 'A2', type: index % 2 ? 'translate' : 'choose', task: 'Выберите единственный правильный ответ.', question: `Как сказать короткую ситуацию ${index}?`,
    options: [`Correct ${index}`, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`],
    correctIndex: index % 4, correct: '', rule: `Правило ${index}.`, skillTag: index % 2 ? 'directions' : 'services',
    difficulty: index <= 3 ? 'easy' : index <= 7 ? 'medium' : 'hard', expectedAnswerTimeMs: 6000 + index * 100, sourceReferences: [],
});
function items() { return Array.from({ length: 10 }, (_, raw) => { const value = item(raw + 1); return { ...value, correct: value.options[value.correctIndex] }; }); }
describe('Arena Studio artifacts', () => {
    it('validates a topic with explicit speed, limits, locales and fixed runtime policy', () => {
        expect((0, arena_artifacts_1.validateArenaTopicArtifact)(topic, { cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru' })).toEqual([]);
        expect((0, arena_artifacts_1.validateArenaTopicArtifact)({ ...topic, result: { ...topic.result, runtimePolicy: { ...topic.result.runtimePolicy, questionTimeoutMs: 10000 } } }, { cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru' })).toContain('arena_topic_runtime_timeout_must_be_40000');
        expect((0, arena_artifacts_1.validateArenaTopicArtifact)({ ...topic, result: { ...topic.result, level: 'C1' } }, { cefr: 'C1', studyTarget: 'en', sourceLocale: 'ru' })).toContain('arena_topic_level_not_supported');
    });
    it('accepts an exact-ten fair batch with string/index answer identity', () => {
        expect((0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: items() }, { count: 10, grounding: { topic: topic.result, previousQuestionKeys: [] } })).toEqual([]);
    });
    it('rejects long text, answer mismatch, duplicate options, speed violations and cross-batch duplicates', () => {
        const invalid = items();
        invalid[0] = { ...invalid[0], question: 'x'.repeat(181), correct: 'not-an-option', expectedAnswerTimeMs: 13000 };
        invalid[1] = { ...invalid[1], options: ['same', 'same', 'other', 'last'], correctIndex: 0, correct: 'same' };
        const errors = (0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: invalid }, { count: 10, grounding: { topic: topic.result, previousQuestionKeys: [(0, arena_artifacts_1.arenaQuestionSemanticKey)(invalid[2])] } });
        expect(errors).toEqual(expect.arrayContaining(['arena_question_too_long', 'arena_correct_identity_mismatch', 'arena_expected_answer_time_invalid', 'arena_options_not_unique', 'arena_previous_batch_duplicate']));
    });
    it('fails closed when correct answer positions are unbalanced or repeat more than twice', () => {
        const unbalanced = items().map((value, index) => ({ ...value, correctIndex: index < 4 ? 0 : value.correctIndex }));
        const alignedUnbalanced = unbalanced.map((value) => ({ ...value, correct: value.options[value.correctIndex] }));
        expect((0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: alignedUnbalanced }, { count: 10, grounding: { topic: topic.result, previousQuestionKeys: [] } })).toContain('arena_correct_position_distribution_invalid');
        const run = items();
        for (const index of [0, 1, 2])
            run[index] = { ...run[index], correctIndex: 0, correct: run[index].options[0] };
        expect((0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: run }, { count: 10, grounding: { topic: topic.result, previousQuestionKeys: [] } })).toContain('arena_correct_position_run_too_long');
    });
});
//# sourceMappingURL=arena_artifacts.test.js.map