import { approveQuestionBatch, approveQuestionReplacement, parseQuestionBatchLedger, replaceLedgerQuestion, rollbackQuestionBatch, rollbackQuestionReplacement, type QuestionBatchLedger } from './question_batch_ledger';

describe('question batch coverage/dedup ledger', () => {
  const question = (id: string, prompt: string) => ({ id, prompt, choices: ['Correct', 'Wrong A', 'Wrong B', 'Wrong C'], correctIndex: 0, optionExplanations: ['Yes', 'No A', 'No B', 'No C'], skillTag: 'travel', difficulty: 'medium', sourcePhraseIds: [] });
  const empty: QuestionBatchLedger = { topicArtifactId: 'topic-1', revision: 0, batches: {} };

  it('records immutable batch coverage and rejects duplicates across batches', () => {
    const first = approveQuestionBatch(empty, { batchArtifactId: 'batch-1', items: [question('q1', 'Как сказать привет?')] });
    expect(first.ledger.revision).toBe(1);
    expect(() => approveQuestionBatch(first.ledger, { batchArtifactId: 'batch-2', items: [question('q2', 'Как сказать привет?')] })).toThrow('question_batch_previous_duplicate');
  });

  it('replaces one question without changing other accepted questions', () => {
    const first = approveQuestionBatch(empty, { batchArtifactId: 'batch-1', items: [question('q1', 'Question one?'), question('q2', 'Question two?')] });
    const replaced = replaceLedgerQuestion(first.ledger, { batchArtifactId: 'batch-1', questionId: 'q1', replacement: question('q1', 'Replacement question?') });
    expect(replaced.ledger.batches['batch-1'].items.map((item) => item.id)).toEqual(['q1', 'q2']);
    expect(replaced.replacedQuestionId).toBe('q1');
  });

  it('parses missing state as empty and rejects another topic identity', () => {
    expect(parseQuestionBatchLedger(undefined, 'topic-1')).toEqual(empty);
    expect(() => parseQuestionBatchLedger({ topicArtifactId: 'topic-2', revision: 0, batches: {} }, 'topic-1')).toThrow('question_batch_ledger_invalid');
  });

  it('rolls back only the selected batch', () => {
    const first = approveQuestionBatch(empty, { batchArtifactId: 'batch-1', items: [question('q1', 'One?')] });
    const second = approveQuestionBatch(first.ledger, { batchArtifactId: 'batch-2', items: [question('q2', 'Two?')] });
    expect(Object.keys(rollbackQuestionBatch(second.ledger, 'batch-1').batches)).toEqual(['batch-2']);
  });

  it('uses CAS semantics for A -> B -> rollback A and rollback B', () => {
    const base = approveQuestionBatch(empty, { batchArtifactId: 'batch-1', items: [question('q1', 'Base?'), question('q2', 'Other?')] }).ledger;
    const a = approveQuestionReplacement(base, { batchArtifactId: 'batch-1', questionId: 'q1', replacementArtifactId: 'replacement-a', replacement: question('q1', 'Replacement A?') });
    expect(a.supersededReplacementArtifactId).toBeNull();
    const b = approveQuestionReplacement(a.ledger, { batchArtifactId: 'batch-1', questionId: 'q1', replacementArtifactId: 'replacement-b', replacement: question('q1', 'Replacement B?') });
    expect(b.supersededReplacementArtifactId).toBe('replacement-a');
    expect(() => rollbackQuestionReplacement(b.ledger, { batchArtifactId: 'batch-1', questionId: 'q1', replacementArtifactId: 'replacement-a' })).toThrow('question_replacement_not_active');
    const rollbackB = rollbackQuestionReplacement(b.ledger, { batchArtifactId: 'batch-1', questionId: 'q1', replacementArtifactId: 'replacement-b' });
    expect(rollbackB.restoredReplacementArtifactId).toBe('replacement-a');
    expect(rollbackB.ledger.batches['batch-1'].items[0].semanticKey).toContain('replacement a');
  });

  it('batch rollback removes its active replacement stack with the batch', () => {
    const base = approveQuestionBatch(empty, { batchArtifactId: 'batch-1', items: [question('q1', 'Base?')] }).ledger;
    const replaced = approveQuestionReplacement(base, { batchArtifactId: 'batch-1', questionId: 'q1', replacementArtifactId: 'replacement-a', replacement: question('q1', 'Replacement A?') }).ledger;
    expect(Object.keys(replaced.batches['batch-1'].replacements)).toEqual(['q1']);
    expect(rollbackQuestionBatch(replaced, 'batch-1').batches['batch-1']).toBeUndefined();
  });
});
