import { createHash } from 'node:crypto';
import { validateArenaQuestionReplacementArtifact } from './arena_artifacts';
import { loadArenaQuestionReplacementForReview, type ArenaGroundingBucketLike } from './arena_grounding';
import { approveArenaQuestionBatch, approveArenaQuestionReplacement, parseArenaQuestionLedger } from './arena_question_ledger';

const topic = { level: 'A2', skillTags: ['city'], allowedTypes: ['translate'], taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500, targetAnswerTimeMs: 8000, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' }, localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' } };
const item = (id: string, question: string) => ({ id, level: 'A2', type: 'translate', task: 'Choose the answer.', question, options: ['Correct', 'Wrong A', 'Wrong B', 'Wrong C'], correctIndex: 0, correct: 'Correct', rule: 'Use the approved phrase.', skillTag: 'city', difficulty: 'medium', expectedAnswerTimeMs: 5000, sourceReferences: [] });

function stored(value: unknown, generation = '7') {
  const bytes = Buffer.from(JSON.stringify(value));
  return { hash: createHash('sha256').update(bytes).digest('hex'), bucket: { file: () => ({ getMetadata: async () => [{ generation }], download: async () => [bytes] }) } as ArenaGroundingBucketLike };
}

describe('Arena question replacement', () => {
  it('accepts one grounded replacement and rejects a duplicate or changed identity', () => {
    const original = item('arena-1', 'Original question?');
    const grounding = { batchArtifactId: 'batch-1', topicArtifactId: 'topic-1', replacementForQuestionId: 'arena-1', originalQuestion: original, topic, previousQuestionKeys: [] };
    expect(validateArenaQuestionReplacementArtifact({ stage: 'arena_question_replacement', result: { replacementForQuestionId: 'arena-1', item: item('arena-1', 'Replacement question?') } }, { grounding })).toEqual([]);
    expect(validateArenaQuestionReplacementArtifact({ stage: 'arena_question_replacement', result: { replacementForQuestionId: 'arena-1', item: original } }, { grounding })).toContain('arena_replacement_duplicate');
    expect(validateArenaQuestionReplacementArtifact({ stage: 'arena_question_replacement', result: { replacementForQuestionId: 'other', item: item('other', 'Replacement question?') } }, { grounding })).toContain('arena_replacement_identity_mismatch');
  });

  it('revalidates hash-pinned replacement grounding before review', async () => {
    const original = item('arena-1', 'Original question?');
    const artifact = { stage: 'arena_question_replacement', result: { replacementForQuestionId: 'arena-1', item: item('arena-1', 'Replacement question?') } };
    const value = stored(artifact, '8');
    await expect(loadArenaQuestionReplacementForReview(value.bucket, { artifactId: 'replacement-1', kind: 'arena_question_replacement', state: 'needs_review', objectPath: 'replacement.json', contentHash: value.hash, objectGeneration: '8', groundingReceipt: { batchArtifactId: 'batch-1', topicArtifactId: 'topic-1', replacementForQuestionId: 'arena-1', originalQuestion: original, topic, previousQuestionKeys: [] } }, { allowNeedsReview: true })).resolves.toMatchObject({ batchArtifactId: 'batch-1', replacementForQuestionId: 'arena-1' });
  });

  it('replaces only the selected approved Arena question and retains the other nine', () => {
    const batch = Array.from({ length: 10 }, (_, index) => item(`arena-${index + 1}`, `Question ${index + 1}?`));
    const approved = approveArenaQuestionBatch(parseArenaQuestionLedger(undefined, 'topic-1'), { batchArtifactId: 'batch-1', items: batch }).ledger;
    const replaced = approveArenaQuestionReplacement(approved, { batchArtifactId: 'batch-1', questionId: 'arena-1', replacementArtifactId: 'replacement-1', replacement: item('arena-1', 'Replacement question?') });
    expect(replaced.ledger.batches['batch-1'].items.map((value) => value.id)).toEqual(batch.map((value) => value.id));
    expect(replaced.ledger.batches['batch-1'].items.slice(1)).toEqual(approved.batches['batch-1'].items.slice(1));
  });
});
