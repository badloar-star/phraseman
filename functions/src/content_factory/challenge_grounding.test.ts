import { createHash } from 'node:crypto';
import { loadApprovedTopicGrounding, loadQuestionBatchForReview, loadQuestionReplacementForReview, type StudioGroundingBucketLike } from './challenge_grounding';

describe('approved challenge topic grounding', () => {
  const artifact = { stage: 'challenge_topic', result: { topicId: 'travel', title: 'Travel basics', learningPromise: 'Handle common travel choices.', skillTags: ['travel'], inclusions: ['transport'], exclusions: ['rare terms'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 } } };
  const bytes = Buffer.from(JSON.stringify(artifact));
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const bucket: StudioGroundingBucketLike = { file: () => ({ getMetadata: async () => [{ generation: '5' }], download: async () => [bytes] }) };
  const metadata = { stageId: 'topic-stage', artifactId: 'topic-artifact', kind: 'challenge_topic', state: 'approved', cefr: 'A2', objectPath: 'topic.json', contentHash, objectGeneration: '5' } as const;

  it('loads the full verified topic for question generation', async () => {
    await expect(loadApprovedTopicGrounding(bucket, metadata)).resolves.toMatchObject({ artifactId: 'topic-artifact', topic: { topicId: 'travel', skillTags: ['travel'] } });
  });

  it.each([
    [{ state: 'needs_review' }, 'studio_topic_not_approved'],
    [{ objectGeneration: '6' }, 'studio_topic_generation_mismatch'],
    [{ contentHash: 'b'.repeat(64) }, 'studio_topic_content_hash_mismatch'],
  ])('fails closed for invalid topic evidence %#', async (override, code) => {
    await expect(loadApprovedTopicGrounding(bucket, { ...metadata, ...override })).rejects.toThrow(code);
  });

  it('revalidates all ten questions before ledger approval', async () => {
    const item = (index: number) => ({ id: `q${index}`, prompt: `Prompt ${index}`, choices: [`Correct ${index}`, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`], correctIndex: 0, optionExplanations: ['Correct reason', 'Wrong A', 'Wrong B', 'Wrong C'], skillTag: 'travel', difficulty: index <= 3 ? 'easy' : index <= 7 ? 'medium' : 'hard', sourcePhraseIds: [] });
    const questionArtifact = { stage: 'challenge_questions', items: Array.from({ length: 10 }, (_, index) => item(index + 1)) };
    const questionBytes = Buffer.from(JSON.stringify(questionArtifact)); const questionHash = createHash('sha256').update(questionBytes).digest('hex');
    const questionBucket: StudioGroundingBucketLike = { file: () => ({ getMetadata: async () => [{ generation: '9' }], download: async () => [questionBytes] }) };
    await expect(loadQuestionBatchForReview(questionBucket, { stageId: 'batch-stage', artifactId: 'batch-artifact', kind: 'challenge_questions', state: 'needs_review', objectPath: 'batch.json', contentHash: questionHash, objectGeneration: '9', groundingReceipt: { topicArtifactId: 'topic-artifact', topic: artifact.result } }, { allowNeedsReview: true })).resolves.toMatchObject({ artifactId: 'batch-artifact', topicArtifactId: 'topic-artifact' });
  });

  it('revalidates one immutable replacement before ledger mutation', async () => {
    const original = { id: 'q1', prompt: 'Old prompt', choices: ['Old correct', 'A', 'B', 'C'], correctIndex: 0, optionExplanations: ['Yes', 'No A', 'No B', 'No C'], skillTag: 'travel', difficulty: 'medium', sourcePhraseIds: [] };
    const replacement = { ...original, prompt: 'New prompt', choices: ['New correct', 'New A', 'New B', 'New C'] };
    const replacementArtifact = { stage: 'challenge_question_replacement', result: { replacementForQuestionId: 'q1', item: replacement } };
    const replacementBytes = Buffer.from(JSON.stringify(replacementArtifact)); const replacementHash = createHash('sha256').update(replacementBytes).digest('hex');
    const replacementBucket: StudioGroundingBucketLike = { file: () => ({ getMetadata: async () => [{ generation: '10' }], download: async () => [replacementBytes] }) };
    const groundingReceipt = { batchArtifactId: 'batch-1', topicArtifactId: 'topic-artifact', replacementForQuestionId: 'q1', originalQuestion: original, topic: artifact.result, previousQuestionKeys: [] };
    await expect(loadQuestionReplacementForReview(replacementBucket, { artifactId: 'replacement-1', kind: 'challenge_question_replacement', state: 'needs_review', objectPath: 'replacement.json', contentHash: replacementHash, objectGeneration: '10', groundingReceipt }, { allowNeedsReview: true })).resolves.toMatchObject({ batchArtifactId: 'batch-1', replacementForQuestionId: 'q1' });
  });
});
