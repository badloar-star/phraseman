import {
  approveArenaQuestionBatch,
  arenaLedgerDocumentId,
  arenaLedgerCoverage,
  assertArenaBatchApprovalIdempotent,
  parseArenaQuestionLedger,
  planArenaWholeBatchRetry,
  previousArenaQuestionKeys,
  rollbackArenaQuestionBatch,
} from './arena_question_ledger';

const question = (id: string, skillTag: string, difficulty: 'easy' | 'medium' | 'hard', suffix = id) => ({
  id,
  skillTag,
  difficulty,
  question: `Question ${suffix}`,
  options: [`Answer ${suffix}`, `Wrong one ${suffix}`, `Wrong two ${suffix}`, `Wrong three ${suffix}`],
  correct: `Answer ${suffix}`,
});

const batch = (prefix: string) => Array.from({ length: 10 }, (_, index) =>
  question(`${prefix}-${index}`, index < 5 ? 'grammar' : 'vocabulary', index < 3 ? 'easy' : index < 7 ? 'medium' : 'hard'),
);

describe('arena question ledger', () => {
  it('binds the ledger and deterministic document id to the approved arena topic artifact', () => {
    expect(parseArenaQuestionLedger(null, 'arena-topic-1')).toEqual({ topicArtifactId: 'arena-topic-1', revision: 0, batches: {} });
    expect(() => parseArenaQuestionLedger({ topicArtifactId: 'other', revision: 0, batches: {} }, 'arena-topic-1')).toThrow('arena_question_ledger_invalid');
    expect(arenaLedgerDocumentId('request-1', 'arena-topic-1')).toBe(arenaLedgerDocumentId('request-1', 'arena-topic-1'));
    expect(arenaLedgerDocumentId('request-1', 'arena-topic-1')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('approves exactly ten unique questions and tracks skill and difficulty coverage', () => {
    const empty = parseArenaQuestionLedger(null, 'arena-topic-1');
    expect(() => approveArenaQuestionBatch(empty, { batchArtifactId: 'short', items: batch('x').slice(0, 9) })).toThrow('arena_question_batch_count_expected_10');
    const approved = approveArenaQuestionBatch(empty, { batchArtifactId: 'batch-1', items: batch('a') }).ledger;
    expect(arenaLedgerCoverage(approved)).toEqual({ bySkill: { grammar: 5, vocabulary: 5 }, byDifficulty: { easy: 3, medium: 4, hard: 3 }, total: 10 });
  });

  it('uses arena semantic identity and rejects duplicate ids, internal content, and prior content', () => {
    const empty = parseArenaQuestionLedger(null, 'arena-topic-1');
    const duplicateId = batch('ids'); duplicateId[9] = { ...duplicateId[9], id: duplicateId[0].id };
    expect(() => approveArenaQuestionBatch(empty, { batchArtifactId: 'duplicate-id', items: duplicateId })).toThrow('arena_question_batch_id_duplicate');
    const internal = batch('internal'); internal[9] = { ...internal[0], id: 'different-id' };
    expect(() => approveArenaQuestionBatch(empty, { batchArtifactId: 'internal', items: internal })).toThrow('arena_question_batch_internal_duplicate');
    const first = approveArenaQuestionBatch(empty, { batchArtifactId: 'batch-1', items: batch('first') }).ledger;
    const prior = batch('second'); prior[0] = { ...batch('first')[0], id: 'new-id' };
    expect(() => approveArenaQuestionBatch(first, { batchArtifactId: 'batch-2', items: prior })).toThrow('arena_question_batch_previous_duplicate');
  });

  it('rolls back the whole batch and releases its semantic keys', () => {
    const approved = approveArenaQuestionBatch(parseArenaQuestionLedger(null, 'arena-topic-1'), { batchArtifactId: 'batch-1', items: batch('a') }).ledger;
    expect(previousArenaQuestionKeys(approved)).toHaveLength(10);
    const rolledBack = rollbackArenaQuestionBatch(approved, 'batch-1');
    expect(previousArenaQuestionKeys(rolledBack)).toEqual([]);
    expect(arenaLedgerCoverage(rolledBack).total).toBe(0);
  });

  it('treats identical approval for the same artifact as idempotent and rejects changed content', () => {
    const items = batch('same');
    const first = approveArenaQuestionBatch(parseArenaQuestionLedger(null, 'arena-topic-1'), { batchArtifactId: 'batch-1', items }).ledger;
    const retry = approveArenaQuestionBatch(first, { batchArtifactId: 'batch-1', items });
    expect(retry.ledger).toBe(first);
    expect(retry.idempotent).toBe(true);
    expect(() => assertArenaBatchApprovalIdempotent(first, { batchArtifactId: 'batch-1', items: batch('changed') })).toThrow('arena_question_batch_artifact_content_conflict');
  });

  it('plans a whole failed-batch retry at the same artifact stage without mutating the ledger', () => {
    const ledger = parseArenaQuestionLedger(null, 'arena-topic-1');
    expect(planArenaWholeBatchRetry(ledger, 'batch-1')).toEqual({ stage: 'arena_questions', batchArtifactId: 'batch-1', topicArtifactId: 'arena-topic-1', count: 10 });
    expect(ledger).toEqual({ topicArtifactId: 'arena-topic-1', revision: 0, batches: {} });
  });
});
