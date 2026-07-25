"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const review_fingerprint_1 = require("./review_fingerprint");
const stage_contracts_1 = require("./stage_contracts");
const evidence = {
    stageId: 'r:lesson_phrases:lesson-1:r1', kind: 'lesson_phrases', revision: 1,
    artifactId: 'artifact:r:lesson_phrases:lesson-1:r1', objectPath: 'content/a.json', objectGeneration: '7', contentHash: 'a'.repeat(64),
    groundingHash: 'b'.repeat(64), qaReceiptHash: 'c'.repeat(64), promptHash: 'd'.repeat(64), schemaHash: 'e'.repeat(64), contextHash: 'f'.repeat(64),
    baseRevisionIdentity: null,
};
describe('exact review fingerprint', () => {
    test('is canonical across property insertion order', () => {
        const reversed = Object.fromEntries(Object.entries(evidence).reverse());
        expect((0, review_fingerprint_1.reviewFingerprint)(evidence)).toBe((0, review_fingerprint_1.reviewFingerprint)(reversed));
    });
    test.each(['contentHash', 'objectGeneration', 'groundingHash', 'qaReceiptHash', 'promptHash', 'schemaHash', 'contextHash', 'revision'])('changes when %s changes', (field) => {
        const changed = { ...evidence, [field]: field === 'revision' ? 2 : '9'.repeat(64) };
        expect((0, review_fingerprint_1.reviewFingerprint)(changed)).not.toBe((0, review_fingerprint_1.reviewFingerprint)(evidence));
    });
    test('binds edited revisions to their base identity', () => {
        expect((0, review_fingerprint_1.reviewFingerprint)({ ...evidence, baseRevisionIdentity: 'base:1:abc' })).not.toBe((0, review_fingerprint_1.reviewFingerprint)(evidence));
    });
    test('binds stored stage identity, immutable receipt and QA evidence', () => {
        const stage = { kind: 'quiz_topic', revision: 1, artifactId: 'a1', objectPath: 'p', objectGeneration: '1', contentHash: 'a'.repeat(64), groundingReceipt: { hash: 'g1' }, qaReceipt: { status: 'passed' }, promptVersion: 'v2', schemaVersion: 2 };
        expect((0, review_fingerprint_1.contentStageReviewFingerprint)('s1', { ...stage, qaReceipt: { status: 'failed' } })).not.toBe((0, review_fingerprint_1.contentStageReviewFingerprint)('s1', stage));
        expect((0, review_fingerprint_1.contentStageReviewFingerprint)('s2', stage)).not.toBe((0, review_fingerprint_1.contentStageReviewFingerprint)('s1', stage));
    });
    test.each(stage_contracts_1.GENERATION_STAGE_KINDS)('covers review evidence for %s', (kind) => {
        const stage = { kind, revision: 1, artifactId: `artifact:${kind}`, objectPath: `${kind}.json`, objectGeneration: '1', contentHash: 'a'.repeat(64), groundingReceipt: { hash: 'g1' }, qaReceipt: { status: 'passed' }, promptVersion: 'v3', schemaVersion: 3, promptHash: 'b'.repeat(64), schemaHash: 'c'.repeat(64), contextHash: 'd'.repeat(64), judgeReceipt: { policyVersion: 'judge-v1', status: 'human_review_required', inputHash: 'e'.repeat(64) } };
        const baseline = (0, review_fingerprint_1.contentStageReviewFingerprint)(`stage:${kind}`, stage);
        expect((0, review_fingerprint_1.contentStageReviewFingerprint)(`stage:${kind}`, { ...stage, judgeReceipt: { ...stage.judgeReceipt, inputHash: 'f'.repeat(64) } })).not.toBe(baseline);
        expect((0, review_fingerprint_1.contentStageReviewFingerprint)(`stage:${kind}`, { ...stage, qaReceipt: { status: 'failed' } })).not.toBe(baseline);
    });
});
//# sourceMappingURL=review_fingerprint.test.js.map