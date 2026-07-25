"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const flashcard_pack_ledger_1 = require("./flashcard_pack_ledger");
const card = (id, front, back = `Перевод ${front}`) => ({ id, front, back, example: `Example: ${front}`, note: 'Usage note', sourcePhraseIds: [] });
describe('flashcard pack ledger', () => {
    it('normalizes semantic identity and binds an empty ledger to one approved pack idea', () => {
        expect((0, flashcard_pack_ledger_1.flashcardSemanticKey)(card('a', '  Check IN!  ', ' Зарегистрироваться '))).toBe('check in\0зарегистрироваться');
        expect((0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(null, 'idea-1')).toEqual({ packIdeaArtifactId: 'idea-1', revision: 0, batches: {} });
        expect(() => (0, flashcard_pack_ledger_1.parseFlashcardPackLedger)({ packIdeaArtifactId: 'idea-2', revision: 0, batches: {} }, 'idea-1')).toThrow('flashcard_pack_ledger_invalid');
        expect((0, flashcard_pack_ledger_1.flashcardLedgerDocumentId)('request-1', 'idea-1')).toMatch(/^[a-f0-9]{64}$/);
    });
    it('approves batches of 1..20, rejects internal/prior duplicates, and rollback releases keys', () => {
        const empty = (0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(null, 'idea-1');
        expect(() => (0, flashcard_pack_ledger_1.approveFlashcardBatch)(empty, { batchArtifactId: 'bad-0', items: [] })).toThrow('flashcard_batch_count_out_of_range');
        expect(() => (0, flashcard_pack_ledger_1.approveFlashcardBatch)(empty, { batchArtifactId: 'bad-21', items: Array.from({ length: 21 }, (_, i) => card(`x${i}`, `front ${i}`)) })).toThrow('flashcard_batch_count_out_of_range');
        expect((0, flashcard_pack_ledger_1.approveFlashcardBatch)(empty, { batchArtifactId: 'max-20', items: Array.from({ length: 20 }, (_, i) => card(`m${i}`, `max front ${i}`)) }).ledger.batches['max-20'].items).toHaveLength(20);
        expect(() => (0, flashcard_pack_ledger_1.approveFlashcardBatch)(empty, { batchArtifactId: 'dupes', items: [card('a', 'Ticket'), card('b', ' ticket ')] })).toThrow('flashcard_batch_internal_duplicate');
        const first = (0, flashcard_pack_ledger_1.approveFlashcardBatch)(empty, { batchArtifactId: 'batch-1', items: [card('a', 'Ticket')] }).ledger;
        expect((0, flashcard_pack_ledger_1.previousFlashcardKeys)(first)).toEqual([(0, flashcard_pack_ledger_1.flashcardSemanticKey)(card('a', 'Ticket'))]);
        expect(() => (0, flashcard_pack_ledger_1.approveFlashcardBatch)(first, { batchArtifactId: 'batch-2', items: [card('b', 'ticket')] })).toThrow('flashcard_batch_previous_duplicate');
        const rolledBack = (0, flashcard_pack_ledger_1.rollbackFlashcardBatch)(first, 'batch-1');
        expect((0, flashcard_pack_ledger_1.previousFlashcardKeys)(rolledBack)).toEqual([]);
        expect((0, flashcard_pack_ledger_1.approveFlashcardBatch)(rolledBack, { batchArtifactId: 'batch-2', items: [card('b', 'ticket')] }).ledger.batches['batch-2']).toBeDefined();
    });
    it('uses versioned CAS replacement safety for A -> B, stale rollback A, and rollback B restores A', () => {
        const base = (0, flashcard_pack_ledger_1.approveFlashcardBatch)((0, flashcard_pack_ledger_1.parseFlashcardPackLedger)(null, 'idea-1'), { batchArtifactId: 'batch-1', items: [card('c1', 'Base')] }).ledger;
        const a = (0, flashcard_pack_ledger_1.approveFlashcardReplacement)(base, { batchArtifactId: 'batch-1', cardId: 'c1', replacementArtifactId: 'replacement-a', replacement: card('c1', 'Replacement A') });
        const b = (0, flashcard_pack_ledger_1.approveFlashcardReplacement)(a.ledger, { batchArtifactId: 'batch-1', cardId: 'c1', replacementArtifactId: 'replacement-b', replacement: card('c1', 'Replacement B') });
        expect(b.supersededReplacementArtifactId).toBe('replacement-a');
        expect(() => (0, flashcard_pack_ledger_1.rollbackFlashcardReplacement)(b.ledger, { batchArtifactId: 'batch-1', cardId: 'c1', replacementArtifactId: 'replacement-a' })).toThrow('flashcard_replacement_not_active');
        const rollbackB = (0, flashcard_pack_ledger_1.rollbackFlashcardReplacement)(b.ledger, { batchArtifactId: 'batch-1', cardId: 'c1', replacementArtifactId: 'replacement-b' });
        expect(rollbackB.restoredReplacementArtifactId).toBe('replacement-a');
        expect(rollbackB.ledger.batches['batch-1'].items[0].semanticKey).toContain('replacement a');
    });
    it('plans a partial retry without changing accepted ids', () => {
        const accepted = [card('c1', 'One'), card('c2', 'Two')];
        expect((0, flashcard_pack_ledger_1.planFlashcardPartialRetry)({ acceptedItems: accepted, requestedTotal: 5 })).toEqual({ acceptedItems: accepted, acceptedIds: ['c1', 'c2'], missingCount: 3, requestedTotal: 5 });
        expect(() => (0, flashcard_pack_ledger_1.planFlashcardPartialRetry)({ acceptedItems: accepted, requestedTotal: 1 })).toThrow('flashcard_partial_accepted_exceeds_total');
        expect(() => (0, flashcard_pack_ledger_1.planFlashcardPartialRetry)({ acceptedItems: accepted, requestedTotal: 21 })).toThrow('flashcard_partial_total_out_of_range');
        expect(() => (0, flashcard_pack_ledger_1.planFlashcardPartialRetry)({ acceptedItems: [card('c1', 'One'), card('c1', 'Other')], requestedTotal: 2 })).toThrow('flashcard_partial_id_duplicate');
    });
});
//# sourceMappingURL=flashcard_pack_ledger.test.js.map