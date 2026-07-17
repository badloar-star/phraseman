import { createHash } from 'node:crypto';
import {
  publishArenaQuestionBatch,
  removeArenaPoolQuestion,
  restoreArenaPoolQuestion,
  type ArenaQuestionPoolRepository,
} from './arena_question_pool';
import type { ArenaGroundingBucketLike } from './content_factory/arena_grounding';

const topic = {
  topicId: 'city-a2', title: 'City speed', learningPromise: 'Answer quickly.', level: 'A2', skillTags: ['city'], inclusions: ['requests'], exclusions: ['trivia'], allowedTypes: ['translate'],
  difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500, targetAnswerTimeMs: 8000,
  runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' }, localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' }, fairnessRules: ['one answer'],
};

function bucketFor(value: unknown): { bucket: ArenaGroundingBucketLike; hash: string } {
  const bytes = Buffer.from(JSON.stringify(value));
  return {
    hash: createHash('sha256').update(bytes).digest('hex'),
    bucket: { file: () => ({ getMetadata: async () => [{ generation: '1' }], download: async () => [bytes] }) },
  };
}

function stageFixture() {
  const items = Array.from({ length: 10 }, (_, index) => {
    const correct = `Correct ${index}`; const options = [correct, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`];
    const correctIndex = index % 4; [options[0], options[correctIndex]] = [options[correctIndex]!, options[0]!];
    return { id: `q-${index}`, level: 'A2', type: 'translate', difficulty: index < 3 ? 'easy' : index < 7 ? 'medium' : 'hard', task: 'Выберите ответ.', question: `Вопрос ${index}?`, options, correctIndex, correct, rule: 'Короткое правило.', skillTag: 'city', expectedAnswerTimeMs: 5000, sourceReferences: [] };
  });
  const stored = bucketFor({ stage: 'arena_questions', items });
  return { bucket: stored.bucket, stage: { artifactId: 'batch-1', kind: 'arena_questions' as const, state: 'approved', count: 10, objectPath: 'batch.json', contentHash: stored.hash, objectGeneration: '1', groundingReceipt: { topicArtifactId: 'topic-1', topic, previousQuestionKeys: [] } } };
}

function repository(): ArenaQuestionPoolRepository & { rows: Map<string, any> } {
  const rows = new Map<string, any>();
  return { rows, findByArtifactId: async (artifactId) => [...rows.values()].filter((row) => row.artifactId === artifactId), put: async (row) => { rows.set(row.id, row); }, get: async (id) => rows.get(id) ?? null };
}

describe('Arena runtime question pool', () => {
  it('publishes an approved en/ru batch as exactly ten strict runtime questions', async () => {
    const fixture = stageFixture(); const store = repository();
    const result = await publishArenaQuestionBatch({ bucket: fixture.bucket, stage: fixture.stage, requestId: 'request-1', actorId: 'admin-1', nowMs: 1000, repository: store });
    expect(result).toMatchObject({ published: 10, idempotent: false });
    expect([...store.rows.values()]).toHaveLength(10);
    expect([...store.rows.values()][0]).toMatchObject({ studyTarget: 'en', learnerSourceLocale: 'ru', availability: 'active', sourceStageId: 'artifact:request-1:arena_questions:topic-1:r1', artifactId: 'batch-1' });
    expect([...store.rows.values()][0].options).toHaveLength(4);
  });

  it('is idempotent for the same approved artifact and rejects an artifact hash mutation', async () => {
    const fixture = stageFixture(); const store = repository(); const input = { bucket: fixture.bucket, stage: fixture.stage, requestId: 'request-1', actorId: 'admin-1', nowMs: 1000, repository: store };
    await publishArenaQuestionBatch(input);
    await expect(publishArenaQuestionBatch(input)).resolves.toMatchObject({ published: 0, idempotent: true });
    await expect(publishArenaQuestionBatch({ ...input, stage: { ...fixture.stage, contentHash: 'f'.repeat(64) } })).rejects.toThrow('arena_pool_artifact_content_conflict');
  });

  it('removes and restores without hard deletion', async () => {
    const fixture = stageFixture(); const store = repository();
    const result = await publishArenaQuestionBatch({ bucket: fixture.bucket, stage: fixture.stage, requestId: 'request-1', actorId: 'admin-1', nowMs: 1000, repository: store }); const id = result.questionIds[0]!;
    await removeArenaPoolQuestion({ repository: store, id, reason: 'Needs editorial review', actorId: 'admin-2', nowMs: 2000 });
    expect(store.rows.get(id)).toMatchObject({ availability: 'removed', removalReason: 'Needs editorial review' });
    await restoreArenaPoolQuestion({ repository: store, id, actorId: 'admin-3', nowMs: 3000 });
    expect(store.rows.get(id)).toMatchObject({ availability: 'active', restoredBy: 'admin-3' });
  });
});
