import { contentStageReviewFingerprint, reviewFingerprint } from './review_fingerprint';
import { GENERATION_STAGE_KINDS } from './stage_contracts';

const evidence = {
  stageId: 'r:lesson_phrases:lesson-1:r1', kind: 'lesson_phrases', revision: 1,
  artifactId: 'artifact:r:lesson_phrases:lesson-1:r1', objectPath: 'content/a.json', objectGeneration: '7', contentHash: 'a'.repeat(64),
  groundingHash: 'b'.repeat(64), qaReceiptHash: 'c'.repeat(64), promptHash: 'd'.repeat(64), schemaHash: 'e'.repeat(64), contextHash: 'f'.repeat(64),
  baseRevisionIdentity: null,
} as const;

describe('exact review fingerprint', () => {
  test('is canonical across property insertion order', () => {
    const reversed = Object.fromEntries(Object.entries(evidence).reverse());
    expect(reviewFingerprint(evidence)).toBe(reviewFingerprint(reversed));
  });

  test.each(['contentHash', 'objectGeneration', 'groundingHash', 'qaReceiptHash', 'promptHash', 'schemaHash', 'contextHash', 'revision'] as const)('changes when %s changes', (field) => {
    const changed = { ...evidence, [field]: field === 'revision' ? 2 : '9'.repeat(64) };
    expect(reviewFingerprint(changed)).not.toBe(reviewFingerprint(evidence));
  });

  test('binds edited revisions to their base identity', () => {
    expect(reviewFingerprint({ ...evidence, baseRevisionIdentity: 'base:1:abc' })).not.toBe(reviewFingerprint(evidence));
  });

  test('binds stored stage identity, immutable receipt and QA evidence', () => {
    const stage = { kind: 'quiz_topic', revision: 1, artifactId: 'a1', objectPath: 'p', objectGeneration: '1', contentHash: 'a'.repeat(64), groundingReceipt: { hash: 'g1' }, qaReceipt: { status: 'passed' }, promptVersion: 'v2', schemaVersion: 2 };
    expect(contentStageReviewFingerprint('s1', { ...stage, qaReceipt: { status: 'failed' } })).not.toBe(contentStageReviewFingerprint('s1', stage));
    expect(contentStageReviewFingerprint('s2', stage)).not.toBe(contentStageReviewFingerprint('s1', stage));
  });

  test.each(GENERATION_STAGE_KINDS)('covers review evidence for %s', (kind) => {
    const stage = { kind, revision: 1, artifactId: `artifact:${kind}`, objectPath: `${kind}.json`, objectGeneration: '1', contentHash: 'a'.repeat(64), groundingReceipt: { hash: 'g1' }, qaReceipt: { status: 'passed' }, promptVersion: 'v3', schemaVersion: 3, promptHash: 'b'.repeat(64), schemaHash: 'c'.repeat(64), contextHash: 'd'.repeat(64), judgeReceipt: { policyVersion: 'judge-v1', status: 'human_review_required', inputHash: 'e'.repeat(64) } };
    const baseline = contentStageReviewFingerprint(`stage:${kind}`, stage);
    expect(contentStageReviewFingerprint(`stage:${kind}`, { ...stage, judgeReceipt: { ...stage.judgeReceipt, inputHash: 'f'.repeat(64) } })).not.toBe(baseline);
    expect(contentStageReviewFingerprint(`stage:${kind}`, { ...stage, qaReceipt: { status: 'failed' } })).not.toBe(baseline);
  });
});
