import { validateFlashcardItemsArtifact, validateFlashcardPackIdeaArtifact, validateFlashcardReplacementArtifact } from './flashcard_artifacts';
import { approveFlashcardBatch, approveFlashcardReplacement, parseFlashcardPackLedger, planFlashcardPartialRetry, previousFlashcardKeys, rollbackFlashcardReplacement } from './flashcard_pack_ledger';
import { buildEnglishFlashcardDraft, assertFlashcardCommunityPublishSupported } from './flashcard_consumer_adapter';
import { createFlashcardPartialCheckpoint, mergeFlashcardPartialCheckpoint } from './flashcard_partial_checkpoint';

const idea = { packId: 'random-city-a2', title: 'City Conversations', learningPromise: 'Speak confidently in everyday city situations.', audience: 'Independent adult travellers', cefr: 'A2', tags: ['city', 'conversation'], inclusions: ['directions', 'small talk'], exclusions: ['technical transport terms'], uniquenessFingerprint: 'city-a2-directions-small-talk' };
const card = (id: string, index: number) => ({ id, front: `Useful city phrase ${index}`, back: `Полезная городская фраза ${index}`, exampleTarget: `I used useful city phrase ${index} today.`, exampleSource: `Сегодня я использовал полезную городскую фразу ${index}.`, note: `Нейтральная фраза для ситуации ${index}.`, sourceReferences: [`pack:${idea.packId}`] });

describe('flashcard studio fake-provider smoke', () => {
  it('runs random idea -> edit -> two batches -> duplicate rejection -> partial repair -> replacement -> rich draft preview', () => {
    const randomIdeaArtifact = { stage: 'flashcard_pack_idea', result: idea };
    expect(validateFlashcardPackIdeaArtifact(randomIdeaArtifact, { cefr: 'A2' })).toEqual([]);
    const editedIdea = { ...idea, title: 'City Confidence', inclusions: [...idea.inclusions, 'asking for help'] };
    expect(validateFlashcardPackIdeaArtifact({ stage: 'flashcard_pack_idea', result: editedIdea }, { cefr: 'A2' })).toEqual([]);

    const batch1 = Array.from({ length: 10 }, (_, index) => card(`c${index + 1}`, index + 1));
    const grounding1 = { packIdea: editedIdea, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] };
    expect(validateFlashcardItemsArtifact({ stage: 'flashcard_items', items: batch1 }, { count: 10, grounding: grounding1 })).toEqual([]);
    let ledger = approveFlashcardBatch(parseFlashcardPackLedger(null, 'idea-artifact'), { batchArtifactId: 'batch-1', items: batch1 }).ledger;

    const batch2 = Array.from({ length: 10 }, (_, index) => card(`c${index + 11}`, index + 11));
    const grounding2 = { ...grounding1, previousCardKeys: previousFlashcardKeys(ledger) };
    expect(validateFlashcardItemsArtifact({ stage: 'flashcard_items', items: batch2 }, { count: 10, grounding: grounding2 })).toEqual([]);
    ledger = approveFlashcardBatch(ledger, { batchArtifactId: 'batch-2', items: batch2 }).ledger;
    expect(Object.values(ledger.batches).flatMap((batch) => batch.items)).toHaveLength(20);
    expect(() => approveFlashcardBatch(ledger, { batchArtifactId: 'duplicate', items: [card('c21', 1)] })).toThrow('flashcard_batch_previous_duplicate');

    const partial = planFlashcardPartialRetry({ acceptedItems: batch2.slice(0, 7), requestedTotal: 10 });
    expect(partial).toMatchObject({ missingCount: 3, acceptedIds: batch2.slice(0, 7).map((item) => item.id) });
    const checkpoint = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: batch2.slice(0, 7) }, 10, grounding2)!;
    const mergedRetry = mergeFlashcardPartialCheckpoint(checkpoint, { stage: 'flashcard_items', items: batch2.slice(7) }, grounding2);
    expect(mergedRetry.items).toEqual(batch2);

    const replacement = { ...card('c1', 101), front: 'Could you show me on the map?' };
    const replacementGrounding = { packIdea: editedIdea, replacementForCardId: 'c1', originalCard: batch1[0], previousCardKeys: previousFlashcardKeys(ledger).filter((key) => key !== ledger.batches['batch-1'].items[0].semanticKey), lessonCardKeys: [], publishedCardKeys: [] };
    expect(validateFlashcardReplacementArtifact({ stage: 'flashcard_item_replacement', result: { replacementForCardId: 'c1', item: replacement } }, { grounding: replacementGrounding })).toEqual([]);
    ledger = approveFlashcardReplacement(ledger, { batchArtifactId: 'batch-1', cardId: 'c1', replacementArtifactId: 'replacement-1', replacement }).ledger;
    expect(ledger.batches['batch-1'].items[0].id).toBe('c1');

    const draft = buildEnglishFlashcardDraft({ studyTarget: 'en', sourceLocale: 'ru', idea: editedIdea, items: [replacement, ...batch1.slice(1)] });
    expect(draft.cards).toHaveLength(10);
    expect(draft.cards[0]).toMatchObject({ description: replacement.note, exampleEn: replacement.exampleTarget, exampleRu: replacement.exampleSource, richSchemaVersion: 1, sourceReferences: replacement.sourceReferences });
    expect(assertFlashcardCommunityPublishSupported()).toBe(true);
    const rolledBack = rollbackFlashcardReplacement(ledger, { batchArtifactId: 'batch-1', cardId: 'c1', replacementArtifactId: 'replacement-1' });
    expect(rolledBack.ledger.batches['batch-1'].items[0].semanticKey).toContain('useful city phrase 1');
  });
});
