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

function stageFixture(overrides: { artifactId?: string; questionSuffix?: string } = {}) {
  const items = Array.from({ length: 10 }, (_, index) => {
    const correct = `Correct ${index}`; const options = [correct, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`];
    const correctIndex = index % 4; [options[0], options[correctIndex]] = [options[correctIndex]!, options[0]!];
    return { id: `q-${index}`, level: 'A2', type: 'translate', difficulty: index < 3 ? 'easy' : index < 7 ? 'medium' : 'hard', task: 'Выберите ответ.', question: `Вопрос ${index}${overrides.questionSuffix ?? ''}?`, options, correctIndex, correct, rule: 'Короткое правило.', skillTag: 'city', expectedAnswerTimeMs: 5000, sourceReferences: [] };
  });
  const stored = bucketFor({ stage: 'arena_questions', items });
  return { bucket: stored.bucket, stage: { artifactId: overrides.artifactId ?? 'batch-1', kind: 'arena_questions' as const, state: 'approved', count: 10, objectPath: 'batch.json', contentHash: stored.hash, objectGeneration: '1', groundingReceipt: { topicArtifactId: 'topic-1', topic, previousQuestionKeys: [] } } };
}

function repository(): ArenaQuestionPoolRepository & { rows: Map<string, any>; auditLogs: any[] } {
  const rows = new Map<string, any>();
  const auditLogs: any[] = [];
  let publication: { artifactId: string; contentHash: string; sourceStageId: string; questionIds: readonly string[] } | null = null;
  let transactionTail = Promise.resolve();
  return {
    rows,
    auditLogs,
    put: async (row) => { rows.set(row.id, row); },
    get: async (id) => rows.get(id) ?? null,
    publishAtomic: async (input: any) => {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        if (publication) {
          if (publication.artifactId !== input.artifactId || publication.contentHash !== input.contentHash || publication.sourceStageId !== input.sourceStageId) throw new Error('arena_pool_artifact_content_conflict');
          return { published: 0, idempotent: true, questionIds: publication.questionIds };
        }
        const nextRows = new Map(rows);
        for (const question of input.questions) {
          if (nextRows.has(question.id)) throw new Error('arena_pool_question_id_conflict');
          nextRows.set(question.id, question);
        }
        publication = { artifactId: input.artifactId, contentHash: input.contentHash, sourceStageId: input.sourceStageId, questionIds: input.questions.map((question: any) => question.id) };
        rows.clear();
        nextRows.forEach((value, key) => rows.set(key, value));
        auditLogs.push(input.audit);
        return { published: input.questions.length, idempotent: false, questionIds: publication.questionIds };
      } finally {
        release();
      }
    },
  } as ArenaQuestionPoolRepository & { rows: Map<string, any>; auditLogs: any[] };
}

describe('Arena runtime question pool', () => {
  it('publishes an approved en/ru batch as exactly ten strict runtime questions', async () => {
    const fixture = stageFixture(); const store = repository();
    const result = await publishArenaQuestionBatch({ bucket: fixture.bucket, stage: fixture.stage, stageId: 'stage-doc-1', expectedReviewFingerprint: 'a'.repeat(64), requestId: 'request-1', actorId: 'admin-1', actorRole: 'owner', nowMs: 1000, repository: store } as any);
    expect(result).toMatchObject({ published: 10, idempotent: false });
    expect([...store.rows.values()]).toHaveLength(10);
    expect([...store.rows.values()][0]).toMatchObject({ studyTarget: 'en', learnerSourceLocale: 'ru', availability: 'active', sourceStageId: 'stage-doc-1', artifactId: 'batch-1' });
    expect([...store.rows.values()][0].options).toHaveLength(4);
    expect(store.auditLogs).toHaveLength(1);
  });

  it('serializes concurrent identical publishes into one atomic write and one idempotent result', async () => {
    const fixture = stageFixture(); const store = repository();
    const input = { bucket: fixture.bucket, stage: fixture.stage, stageId: 'stage-doc-1', expectedReviewFingerprint: 'a'.repeat(64), requestId: 'request-1', actorId: 'admin-1', actorRole: 'owner', nowMs: 1000, repository: store } as any;
    const results = await Promise.all([publishArenaQuestionBatch(input), publishArenaQuestionBatch(input)]);
    expect(results.map((result) => ({ published: result.published, idempotent: result.idempotent }))).toEqual(expect.arrayContaining([
      { published: 10, idempotent: false },
      { published: 0, idempotent: true },
    ]));
    expect(store.rows.size).toBe(10);
    expect(store.auditLogs).toHaveLength(1);
  });

  it('rejects a concurrent same-artifact hash conflict without mixing or partially publishing rows', async () => {
    const first = stageFixture({ questionSuffix: '-first' });
    const conflicting = stageFixture({ questionSuffix: '-conflict' });
    const store = repository();
    const base = { stageId: 'stage-doc-1', expectedReviewFingerprint: 'a'.repeat(64), requestId: 'request-1', actorId: 'admin-1', actorRole: 'owner', nowMs: 1000, repository: store } as any;
    const settled = await Promise.allSettled([
      publishArenaQuestionBatch({ ...base, bucket: first.bucket, stage: first.stage }),
      publishArenaQuestionBatch({ ...base, bucket: conflicting.bucket, stage: conflicting.stage }),
    ]);
    expect(settled.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(settled.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.rows.size).toBe(10);
    expect(new Set([...store.rows.values()].map((row) => row.contentHash)).size).toBe(1);
    expect(store.auditLogs).toHaveLength(1);
  });

  it('removes and restores without hard deletion', async () => {
    const fixture = stageFixture(); const store = repository();
    const result = await publishArenaQuestionBatch({ bucket: fixture.bucket, stage: fixture.stage, stageId: 'stage-doc-1', expectedReviewFingerprint: 'a'.repeat(64), requestId: 'request-1', actorId: 'admin-1', actorRole: 'owner', nowMs: 1000, repository: store } as any); const id = result.questionIds[0]!;
    await removeArenaPoolQuestion({ repository: store, id, reason: 'Needs editorial review', actorId: 'admin-2', nowMs: 2000 });
    expect(store.rows.get(id)).toMatchObject({ availability: 'removed', removalReason: 'Needs editorial review' });
    await restoreArenaPoolQuestion({ repository: store, id, actorId: 'admin-3', nowMs: 3000 });
    expect(store.rows.get(id)).toMatchObject({ availability: 'active', restoredBy: 'admin-3' });
  });
});
