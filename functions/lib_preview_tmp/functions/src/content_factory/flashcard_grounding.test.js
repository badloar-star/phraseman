"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const flashcard_grounding_1 = require("./flashcard_grounding");
const ideaArtifact = { stage: 'flashcard_pack_idea', result: { packId: 'travel-a2', title: 'Travel A2', learningPromise: 'Travel independently.', audience: 'Adult travellers', cefr: 'A2', tags: ['travel'], inclusions: ['daily phrases'], exclusions: ['technical terms'], uniquenessFingerprint: 'travel-a2-daily' } };
const card = { id: 'c1', front: 'Where is the station?', back: 'Где вокзал?', exampleTarget: 'Where is the station, please?', exampleSource: 'Подскажите, где вокзал?', note: 'Вежливый вопрос.', sourceReferences: ['pack:travel-a2'] };
function stored(value, generation = '7') {
    const bytes = Buffer.from(JSON.stringify(value));
    return {
        hash: (0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex'),
        bucket: { file: () => ({ getMetadata: async () => [{ generation }], download: async () => [bytes] }) },
    };
}
describe('verified flashcard grounding', () => {
    it('loads only an approved, generation-pinned, hash-verified pack idea', async () => {
        const value = stored(ideaArtifact);
        const stage = { artifactId: 'idea-artifact', kind: 'flashcard_pack_idea', state: 'approved', cefr: 'A2', objectPath: 'idea.json', contentHash: value.hash, objectGeneration: '7' };
        await expect((0, flashcard_grounding_1.loadApprovedFlashcardPackIdea)(value.bucket, stage)).resolves.toMatchObject({ artifactId: 'idea-artifact', packIdea: { packId: 'travel-a2' } });
        await expect((0, flashcard_grounding_1.loadApprovedFlashcardPackIdea)(value.bucket, { ...stage, state: 'needs_review' })).rejects.toThrow('flashcard_pack_idea_not_approved');
        await expect((0, flashcard_grounding_1.loadApprovedFlashcardPackIdea)(value.bucket, { ...stage, contentHash: 'f'.repeat(64) })).rejects.toThrow('flashcard_pack_idea_content_hash_mismatch');
    });
    it('revalidates a rich exact-count batch before review or ledger mutation', async () => {
        const value = stored({ stage: 'flashcard_items', items: [card] }, '8');
        const groundingReceipt = { packIdeaArtifactId: 'idea-artifact', packIdea: ideaArtifact.result, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] };
        await expect((0, flashcard_grounding_1.loadFlashcardBatchForReview)(value.bucket, { artifactId: 'batch-artifact', kind: 'flashcard_items', state: 'needs_review', count: 1, objectPath: 'batch.json', contentHash: value.hash, objectGeneration: '8', groundingReceipt }, { allowNeedsReview: true }))
            .resolves.toMatchObject({ artifactId: 'batch-artifact', packIdeaArtifactId: 'idea-artifact', items: [card] });
    });
    it('revalidates one immutable card replacement before ledger mutation', async () => {
        const replacement = { ...card, front: 'How do I get to the station?', exampleTarget: 'How do I get to the station from here?' };
        const value = stored({ stage: 'flashcard_item_replacement', result: { replacementForCardId: 'c1', item: replacement } }, '9');
        const groundingReceipt = { batchArtifactId: 'batch-artifact', packIdeaArtifactId: 'idea-artifact', packIdea: ideaArtifact.result, replacementForCardId: 'c1', originalCard: card, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] };
        await expect((0, flashcard_grounding_1.loadFlashcardReplacementForReview)(value.bucket, { artifactId: 'replacement-artifact', kind: 'flashcard_item_replacement', state: 'needs_review', objectPath: 'replacement.json', contentHash: value.hash, objectGeneration: '9', groundingReceipt }, { allowNeedsReview: true }))
            .resolves.toMatchObject({ batchArtifactId: 'batch-artifact', packIdeaArtifactId: 'idea-artifact', replacementForCardId: 'c1', item: replacement });
    });
});
//# sourceMappingURL=flashcard_grounding.test.js.map