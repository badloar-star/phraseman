"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const arena_artifacts_1 = require("./arena_artifacts");
const arena_grounding_1 = require("./arena_grounding");
const arena_question_ledger_1 = require("./arena_question_ledger");
const topic = { level: 'A2', skillTags: ['city'], allowedTypes: ['translate'], taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500, targetAnswerTimeMs: 8000, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: 40000, scoringPolicy: 'arena-scoring-v1' }, localeContract: { studyTarget: 'en', learnerSourceLocale: 'ru' } };
const item = (id, question) => ({ id, level: 'A2', type: 'translate', task: 'Choose the answer.', question, options: ['Correct', 'Wrong A', 'Wrong B', 'Wrong C'], correctIndex: 0, correct: 'Correct', rule: 'Use the approved phrase.', skillTag: 'city', difficulty: 'medium', expectedAnswerTimeMs: 5000, sourceReferences: [] });
function stored(value, generation = '7') {
    const bytes = Buffer.from(JSON.stringify(value));
    return { hash: (0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex'), bucket: { file: () => ({ getMetadata: async () => [{ generation }], download: async () => [bytes] }) } };
}
describe('Arena question replacement', () => {
    it('accepts one grounded replacement and rejects a duplicate or changed identity', () => {
        const original = item('arena-1', 'Original question?');
        const grounding = { batchArtifactId: 'batch-1', topicArtifactId: 'topic-1', replacementForQuestionId: 'arena-1', originalQuestion: original, topic, previousQuestionKeys: [] };
        expect((0, arena_artifacts_1.validateArenaQuestionReplacementArtifact)({ stage: 'arena_question_replacement', result: { replacementForQuestionId: 'arena-1', item: item('arena-1', 'Replacement question?') } }, { grounding })).toEqual([]);
        expect((0, arena_artifacts_1.validateArenaQuestionReplacementArtifact)({ stage: 'arena_question_replacement', result: { replacementForQuestionId: 'arena-1', item: original } }, { grounding })).toContain('arena_replacement_duplicate');
        expect((0, arena_artifacts_1.validateArenaQuestionReplacementArtifact)({ stage: 'arena_question_replacement', result: { replacementForQuestionId: 'other', item: item('other', 'Replacement question?') } }, { grounding })).toContain('arena_replacement_identity_mismatch');
    });
    it('revalidates hash-pinned replacement grounding before review', async () => {
        const original = item('arena-1', 'Original question?');
        const artifact = { stage: 'arena_question_replacement', result: { replacementForQuestionId: 'arena-1', item: item('arena-1', 'Replacement question?') } };
        const value = stored(artifact, '8');
        await expect((0, arena_grounding_1.loadArenaQuestionReplacementForReview)(value.bucket, { artifactId: 'replacement-1', kind: 'arena_question_replacement', state: 'needs_review', objectPath: 'replacement.json', contentHash: value.hash, objectGeneration: '8', groundingReceipt: { batchArtifactId: 'batch-1', topicArtifactId: 'topic-1', replacementForQuestionId: 'arena-1', originalQuestion: original, topic, previousQuestionKeys: [] } }, { allowNeedsReview: true })).resolves.toMatchObject({ batchArtifactId: 'batch-1', replacementForQuestionId: 'arena-1' });
    });
    it('replaces only the selected approved Arena question and retains the other nine', () => {
        const batch = Array.from({ length: 10 }, (_, index) => item(`arena-${index + 1}`, `Question ${index + 1}?`));
        const approved = (0, arena_question_ledger_1.approveArenaQuestionBatch)((0, arena_question_ledger_1.parseArenaQuestionLedger)(undefined, 'topic-1'), { batchArtifactId: 'batch-1', items: batch }).ledger;
        const replaced = (0, arena_question_ledger_1.approveArenaQuestionReplacement)(approved, { batchArtifactId: 'batch-1', questionId: 'arena-1', replacementArtifactId: 'replacement-1', replacement: item('arena-1', 'Replacement question?') });
        expect(replaced.ledger.batches['batch-1'].items.map((value) => value.id)).toEqual(batch.map((value) => value.id));
        expect(replaced.ledger.batches['batch-1'].items.slice(1)).toEqual(approved.batches['batch-1'].items.slice(1));
    });
});
//# sourceMappingURL=arena_question_replacement.test.js.map