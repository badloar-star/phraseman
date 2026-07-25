"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_stage_consumer_adapter_1 = require("./arena_stage_consumer_adapter");
describe('Arena stage runtime adapter', () => {
    it('seals strict stage items into backward-compatible ArenaQuestion documents', () => {
        const options = ['I need help.', 'I helps.', 'Me need help.', 'I need helping.'];
        const result = (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ requestId: 'request-1', topicArtifactId: 'topic-1', topic: { level: 'A2', localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' }, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' } }, batches: [{ artifactId: 'batch-1', items: Array.from({ length: 10 }, (_, index) => ({ id: `a${index}`, level: 'A2', type: 'choose', task: 'Выберите ответ.', question: `Вопрос ${index}?`, options, correctIndex: 0, correct: options[0], rule: 'После I используется need.', expectedAnswerTimeMs: 5000, sourceReferences: [] })) }] });
        expect(result).toMatchObject({ schemaVersion: 'arena-runtime-draft-v1', questionTimeoutMs: 40000, questionCount: 10 });
        expect(result.questions[0]).toMatchObject({ level: 'A2', type: 'choose', question: 'Вопрос 0?', options, correct: 'I need help.', rule: 'После I используется need.', studyTarget: 'en', learnerSourceLocale: 'ru' });
        expect(result.questions[0].id).toMatch(/^as_[a-f0-9]{40}$/);
        expect(result.questions[0].rand).toBeGreaterThanOrEqual(0);
        expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });
    it('fails closed on wrong count, answer identity, locales or runtime timeout', () => {
        const base = { requestId: 'r', topicArtifactId: 't', topic: { level: 'A2', localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' }, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' } }, batches: [] };
        expect(() => (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)(base)).toThrow('arena_runtime_draft_question_count_invalid');
        expect(() => (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ ...base, topic: { ...base.topic, runtimePolicy: { ...base.topic.runtimePolicy, questionTimeoutMs: 10000 } } })).toThrow('arena_runtime_draft_policy_invalid');
        expect(() => (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ ...base, topic: { ...base.topic, localeContract: { studyTarget: '', learnerSourceLocale: 'ru' } } })).toThrow('arena_runtime_draft_policy_invalid');
        const item = { id: 'same', level: 'A2', type: 'choose', task: 'Choose.', question: 'Question?', options: ['Good.', 'Bad one.', 'Bad two.', 'Bad three.'], correctIndex: 0, correct: 'Good.', rule: 'Rule.', expectedAnswerTimeMs: 5000, sourceReferences: [] };
        expect(() => (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ ...base, batches: [{ artifactId: 'batch', items: Array.from({ length: 10 }, () => item) }] })).toThrow('arena_runtime_draft_item_duplicate');
        expect(() => (0, arena_stage_consumer_adapter_1.buildArenaRuntimeDraft)({ ...base, batches: [{ artifactId: 'batch', items: Array.from({ length: 10 }, (_, index) => ({ ...item, id: String(index), expectedAnswerTimeMs: 1500 })) }] })).toThrow('arena_runtime_draft_item_invalid');
    });
});
//# sourceMappingURL=arena_stage_consumer_adapter.test.js.map