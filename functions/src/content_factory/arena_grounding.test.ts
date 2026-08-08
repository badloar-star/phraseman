import { createHash } from 'node:crypto';
import { loadApprovedArenaTopic, loadArenaQuestionBatchForReview, type ArenaGroundingBucketLike } from './arena_grounding';

const topic = { stage: 'arena_topic', result: { topicId: 'city-a2', title: 'City speed', learningPromise: 'Answer quickly.', level: 'A2', skillTags: ['city'], inclusions: ['requests'], exclusions: ['trivia'], allowedTypes: ['translate'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500, targetAnswerTimeMs: 8000, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' }, localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' }, fairnessRules: ['one answer'] } };

function stored(value: unknown, generation = '7') { const bytes = Buffer.from(JSON.stringify(value)); return { hash: createHash('sha256').update(bytes).digest('hex'), bucket: { file: () => ({ getMetadata: async () => [{ generation }], download: async () => [bytes] }) } as ArenaGroundingBucketLike }; }

describe('verified Arena grounding', () => {
  it('loads only an approved hash/generation-pinned topic', async () => {
    const value = stored(topic); const stage = { artifactId: 'topic-artifact', kind: 'arena_topic', state: 'approved', cefr: 'A2', studyTarget: 'en', sourceLocale: 'ru', objectPath: 'topic.json', contentHash: value.hash, objectGeneration: '7' } as const;
    await expect(loadApprovedArenaTopic(value.bucket, stage)).resolves.toMatchObject({ artifactId: 'topic-artifact', topic: { topicId: 'city-a2' } });
    await expect(loadApprovedArenaTopic(value.bucket, { ...stage, state: 'needs_review' })).rejects.toThrow('arena_topic_not_approved');
  });

  it('revalidates all ten questions before ledger approval', async () => {
    const items = Array.from({ length: 10 }, (_, raw) => { const index = raw + 1; const correct = `Correct ${index}`; const options = [correct, `A ${index}`, `B ${index}`, `C ${index}`]; const correctIndex = raw % 4; [options[0], options[correctIndex]] = [options[correctIndex], options[0]]; return { id: `a${index}`, level: 'A2', type: 'translate', task: 'Выберите ответ.', question: `Вопрос ${index}?`, options, correctIndex, correct, rule: 'Краткое правило.', skillTag: 'city', difficulty: index <= 3 ? 'easy' : index <= 7 ? 'medium' : 'hard', expectedAnswerTimeMs: 5000, sourceReferences: [] }; });
    const value = stored({ stage: 'arena_questions', items }, '8');
    await expect(loadArenaQuestionBatchForReview(value.bucket, { artifactId: 'batch-artifact', kind: 'arena_questions', state: 'needs_review', count: 10, objectPath: 'batch.json', contentHash: value.hash, objectGeneration: '8', groundingReceipt: { topicArtifactId: 'topic-artifact', topic: topic.result, previousQuestionKeys: [] } }, { allowNeedsReview: true })).resolves.toMatchObject({ artifactId: 'batch-artifact', topicArtifactId: 'topic-artifact', items });
  });
});
