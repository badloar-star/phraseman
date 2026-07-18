"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_artifacts_1 = require("./arena_artifacts");
const arena_question_ledger_1 = require("./arena_question_ledger");
const arena_release_runtime_1 = require("./arena_release_runtime");
const generation_errors_1 = require("./generation_errors");
const topic = { topicId: 'city-speed-a2', title: 'City Speed', learningPromise: 'React quickly in common city situations.', level: 'A2', skillTags: ['directions', 'services'], inclusions: ['short requests'], exclusions: ['trivia'], allowedTypes: ['translate', 'choose'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500, targetAnswerTimeMs: 8000, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' }, localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' }, fairnessRules: ['one clear answer'] };
const batch = (number) => Array.from({ length: 10 }, (_, raw) => { const index = raw + 1; const correct = `Correct ${number}-${index}`; const options = [correct, `Wrong A ${number}-${index}`, `Wrong B ${number}-${index}`, `Wrong C ${number}-${index}`]; const correctIndex = raw % 4; [options[0], options[correctIndex]] = [options[correctIndex], options[0]]; return { id: `b${number}-a${index}`, level: 'A2', type: index % 2 ? 'translate' : 'choose', task: 'Выберите ответ.', question: `Быстрая ситуация ${number}-${index}?`, options, correctIndex, correct, rule: 'Есть только один естественный ответ.', skillTag: index % 2 ? 'directions' : 'services', difficulty: index <= 3 ? 'easy' : index <= 7 ? 'medium' : 'hard', expectedAnswerTimeMs: 5000, sourceReferences: [] }; });
describe('Arena Studio fake-provider smoke', () => {
    it('runs topic -> batch1 -> failed whole batch -> retry -> 20 unique -> runtime preview -> draft seal', () => {
        expect((0, arena_artifacts_1.validateArenaTopicArtifact)({ stage: 'arena_topic', result: topic }, { cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru' })).toEqual([]);
        const first = batch(1);
        const grounding1 = { topic, previousQuestionKeys: [] };
        expect((0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: first }, { count: 10, grounding: grounding1 })).toEqual([]);
        let ledger = (0, arena_question_ledger_1.approveArenaQuestionBatch)((0, arena_question_ledger_1.parseArenaQuestionLedger)(null, 'topic-artifact'), { batchArtifactId: 'batch-1', items: first }).ledger;
        const malformed = batch(2).slice(0, 9);
        expect((0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: malformed }, { count: 10, grounding: { topic, previousQuestionKeys: (0, arena_question_ledger_1.previousArenaQuestionKeys)(ledger) } })).toContain('arena_question_count_expected_10');
        expect((0, generation_errors_1.classifyGenerationError)(new Error('generation_stage_schema_failed'))).toEqual({ code: 'provider_schema', retryable: true });
        expect((0, arena_question_ledger_1.planArenaWholeBatchRetry)(ledger, 'batch-2')).toMatchObject({ count: 10, topicArtifactId: 'topic-artifact' });
        const second = batch(2);
        const grounding2 = { topic, previousQuestionKeys: (0, arena_question_ledger_1.previousArenaQuestionKeys)(ledger) };
        expect((0, arena_artifacts_1.validateArenaQuestionBatchArtifact)({ stage: 'arena_questions', items: second }, { count: 10, grounding: grounding2 })).toEqual([]);
        ledger = (0, arena_question_ledger_1.approveArenaQuestionBatch)(ledger, { batchArtifactId: 'batch-2', items: second }).ledger;
        expect((0, arena_question_ledger_1.arenaLedgerCoverage)(ledger)).toMatchObject({ total: 20, byDifficulty: { easy: 6, medium: 8, hard: 6 } });
        const runtime = (0, arena_release_runtime_1.arenaQuestionsFromCourseSurfaceEntries)({ studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: 'en-ru-r1' }, [{ lessonId: 9, payload: { lessonId: 9, surface: 'arena', items: [...first, ...second] } }]);
        expect(runtime).toHaveLength(20);
        expect(runtime.every((item) => item.options[item.correctIndex] === item.correct && item.rand >= 0 && item.rand < 1)).toBe(true);
    });
});
//# sourceMappingURL=arena_studio_smoke.test.js.map