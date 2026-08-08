import { buildPromptContext } from './prompt_context';
import { buildStagePromptPacket } from './prompt_registry';
import { runGenerationStage, type StageGenerationProvider } from './stage_runner';
import { approveQuestionBatch, approveQuestionReplacement, previousQuestionKeys, type QuestionBatchLedger } from './question_batch_ledger';
import { questionSemanticKey } from './question_artifacts';

const providerFor = (payload: unknown): StageGenerationProvider => ({ generate: async () => JSON.stringify(payload) });
const context = (count: number) => buildPromptContext({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Random practical travel situations', count, approvedArtifactIds: [], exemplarIds: [], previousContentFingerprints: [] });
const topicResult = { topicId: 'travel-random', title: 'Travel decisions', learningPromise: 'Choose natural English in common travel situations.', skillTags: ['travel', 'requests'], inclusions: ['transport', 'directions'], exclusions: ['rare aviation law'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 } };
const items = (batch: number) => Array.from({ length: 10 }, (_, index) => ({ id: `b${batch}-q${index + 1}`, prompt: `Как сказать ситуацию ${batch}-${index + 1}?`, choices: [`Natural answer ${batch}-${index + 1}`, `Wrong tense ${batch}-${index + 1}`, `Wrong word ${batch}-${index + 1}`, `Wrong order ${batch}-${index + 1}`], correctIndex: 0, optionExplanations: ['Так говорят естественно.', 'Неверное время.', 'Неверное слово.', 'Неверный порядок слов.'], skillTag: index % 2 ? 'travel' : 'requests', difficulty: index < 3 ? 'easy' : index < 7 ? 'medium' : 'hard', sourcePhraseIds: [] }));

describe('R4 quiz/challenge fake-provider smoke', () => {
  it('runs an accepted challenge through two independently deduplicated batches', async () => {
    const topicKind = 'challenge_topic' as const;
    const questionKind = 'challenge_questions' as const;
    const topic = { stage: topicKind, result: topicResult };
    await expect(runGenerationStage({ provider: providerFor(topic), model: 'fake', packet: buildStagePromptPacket(topicKind, 'v2', context(1)) })).resolves.toMatchObject({ attempts: 1 });
    let ledger: QuestionBatchLedger = { topicArtifactId: `${topicKind}-artifact`, revision: 0, batches: {} };
    for (const batchNumber of [1, 2]) {
      const grounding = { artifactId: `${topicKind}-artifact`, contentHash: 'a'.repeat(64), topic: topicResult, previousQuestionKeys: previousQuestionKeys(ledger) };
      const artifact = { stage: questionKind, items: items(batchNumber) };
      await expect(runGenerationStage({ provider: providerFor(artifact), model: 'fake', packet: buildStagePromptPacket(questionKind, 'v2', context(10), grounding) })).resolves.toMatchObject({ attempts: 1 });
      ledger = approveQuestionBatch(ledger, { batchArtifactId: `${questionKind}-batch-${batchNumber}`, items: artifact.items }).ledger;
    }
    expect(Object.keys(ledger.batches)).toHaveLength(2);
    expect(previousQuestionKeys(ledger)).toHaveLength(20);
    const originalQuestion = items(1)[0];
    const replacementItem = { ...originalQuestion, prompt: 'Как сказать полностью новую ситуацию?', choices: ['A completely new answer', 'Wrong replacement A', 'Wrong replacement B', 'Wrong replacement C'] };
    const replacementKind = 'challenge_question_replacement' as const;
    const replacementGrounding = { batchArtifactId: `${questionKind}-batch-1`, topicArtifactId: `${topicKind}-artifact`, replacementForQuestionId: originalQuestion.id, originalQuestion, topic: topicResult, previousQuestionKeys: previousQuestionKeys(ledger).filter((key) => key !== questionSemanticKey(originalQuestion)) };
    const replacementArtifact = { stage: replacementKind, result: { replacementForQuestionId: originalQuestion.id, item: replacementItem } };
    await expect(runGenerationStage({ provider: providerFor(replacementArtifact), model: 'fake', packet: buildStagePromptPacket(replacementKind, 'v2', context(1), replacementGrounding) })).resolves.toMatchObject({ attempts: 1 });
    const replaced = approveQuestionReplacement(ledger, { batchArtifactId: `${questionKind}-batch-1`, questionId: originalQuestion.id, replacementArtifactId: `${replacementKind}-artifact-1`, replacement: replacementItem });
    expect(replaced.ledger.batches[`${questionKind}-batch-1`].items[0].semanticKey).toBe(questionSemanticKey(replacementItem));
    expect(replaced.ledger.batches[`${questionKind}-batch-1`].items[1].id).toBe('b1-q2');
  });
});
