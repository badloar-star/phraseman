"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_context_1 = require("./prompt_context");
const prompt_registry_1 = require("./prompt_registry");
const stage_runner_1 = require("./stage_runner");
const question_batch_ledger_1 = require("./question_batch_ledger");
const question_artifacts_1 = require("./question_artifacts");
const providerFor = (payload) => ({ generate: async () => JSON.stringify(payload) });
const context = (count) => (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Random practical travel situations', count, approvedArtifactIds: [], exemplarIds: [], previousContentFingerprints: [] });
const topicResult = { topicId: 'travel-random', title: 'Travel decisions', learningPromise: 'Choose natural English in common travel situations.', skillTags: ['travel', 'requests'], inclusions: ['transport', 'directions'], exclusions: ['rare aviation law'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 } };
const items = (batch) => Array.from({ length: 10 }, (_, index) => ({ id: `b${batch}-q${index + 1}`, prompt: `Как сказать ситуацию ${batch}-${index + 1}?`, choices: [`Natural answer ${batch}-${index + 1}`, `Wrong tense ${batch}-${index + 1}`, `Wrong word ${batch}-${index + 1}`, `Wrong order ${batch}-${index + 1}`], correctIndex: 0, optionExplanations: ['Так говорят естественно.', 'Неверное время.', 'Неверное слово.', 'Неверный порядок слов.'], skillTag: index % 2 ? 'travel' : 'requests', difficulty: index < 3 ? 'easy' : index < 7 ? 'medium' : 'hard', sourcePhraseIds: [] }));
describe('R4 quiz/challenge fake-provider smoke', () => {
    it('runs an accepted challenge through two independently deduplicated batches', async () => {
        const topicKind = 'challenge_topic';
        const questionKind = 'challenge_questions';
        const topic = { stage: topicKind, result: topicResult };
        await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor(topic), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)(topicKind, 'v2', context(1)) })).resolves.toMatchObject({ attempts: 1 });
        let ledger = { topicArtifactId: `${topicKind}-artifact`, revision: 0, batches: {} };
        for (const batchNumber of [1, 2]) {
            const grounding = { artifactId: `${topicKind}-artifact`, contentHash: 'a'.repeat(64), topic: topicResult, previousQuestionKeys: (0, question_batch_ledger_1.previousQuestionKeys)(ledger) };
            const artifact = { stage: questionKind, items: items(batchNumber) };
            await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor(artifact), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)(questionKind, 'v2', context(10), grounding) })).resolves.toMatchObject({ attempts: 1 });
            ledger = (0, question_batch_ledger_1.approveQuestionBatch)(ledger, { batchArtifactId: `${questionKind}-batch-${batchNumber}`, items: artifact.items }).ledger;
        }
        expect(Object.keys(ledger.batches)).toHaveLength(2);
        expect((0, question_batch_ledger_1.previousQuestionKeys)(ledger)).toHaveLength(20);
        const originalQuestion = items(1)[0];
        const replacementItem = { ...originalQuestion, prompt: 'Как сказать полностью новую ситуацию?', choices: ['A completely new answer', 'Wrong replacement A', 'Wrong replacement B', 'Wrong replacement C'] };
        const replacementKind = 'challenge_question_replacement';
        const replacementGrounding = { batchArtifactId: `${questionKind}-batch-1`, topicArtifactId: `${topicKind}-artifact`, replacementForQuestionId: originalQuestion.id, originalQuestion, topic: topicResult, previousQuestionKeys: (0, question_batch_ledger_1.previousQuestionKeys)(ledger).filter((key) => key !== (0, question_artifacts_1.questionSemanticKey)(originalQuestion)) };
        const replacementArtifact = { stage: replacementKind, result: { replacementForQuestionId: originalQuestion.id, item: replacementItem } };
        await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor(replacementArtifact), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)(replacementKind, 'v2', context(1), replacementGrounding) })).resolves.toMatchObject({ attempts: 1 });
        const replaced = (0, question_batch_ledger_1.approveQuestionReplacement)(ledger, { batchArtifactId: `${questionKind}-batch-1`, questionId: originalQuestion.id, replacementArtifactId: `${replacementKind}-artifact-1`, replacement: replacementItem });
        expect(replaced.ledger.batches[`${questionKind}-batch-1`].items[0].semanticKey).toBe((0, question_artifacts_1.questionSemanticKey)(replacementItem));
        expect(replaced.ledger.batches[`${questionKind}-batch-1`].items[1].id).toBe('b1-q2');
    });
});
//# sourceMappingURL=question_studio_smoke.test.js.map