import { createFlashcardPartialCheckpoint, mergeFlashcardPartialCheckpoint, parseFlashcardPartialCheckpoint } from './flashcard_partial_checkpoint';

const card = (id: string, front: string) => ({ id, front, back: `Перевод ${front}`, exampleTarget: `Example ${front}`, exampleSource: `Пример ${front}`, note: 'Useful note', sourceReferences: ['pack:test'] });
const grounding = { packIdea: { packId: 'test' }, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] };

describe('flashcard partial checkpoint', () => {
  it('checkpoints 7/10 and merges a retry of exactly 3 into the original order', () => {
    const accepted = Array.from({ length: 7 }, (_, index) => card(`c${index + 1}`, `Front ${index + 1}`));
    const checkpoint = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: accepted }, 10, grounding);
    expect(checkpoint).not.toBeNull();
    expect(checkpoint).toMatchObject({ requestedTotal: 10, acceptedCount: 7, missingCount: 3, acceptedIds: accepted.map((item) => item.id) });
    const merged = mergeFlashcardPartialCheckpoint(checkpoint!, { stage: 'flashcard_items', items: [card('c8', 'Front 8'), card('c9', 'Front 9'), card('c10', 'Front 10')] }, grounding);
    expect(merged.items).toHaveLength(10);
    expect(merged.items.map((item) => item.id)).toEqual(Array.from({ length: 10 }, (_, index) => `c${index + 1}`));
  });

  it('rejects retry ID and semantic conflicts', () => {
    const checkpoint = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1', 'One'), card('c2', 'Two')] }, 3, grounding)!;
    expect(() => mergeFlashcardPartialCheckpoint(checkpoint, { stage: 'flashcard_items', items: [card('c1', 'Three')] }, grounding)).toThrow('flashcard_partial_retry_id_conflict');
    expect(() => mergeFlashcardPartialCheckpoint(checkpoint, { stage: 'flashcard_items', items: [card('c3', 'One')] }, grounding)).toThrow('flashcard_partial_retry_semantic_conflict');
  });

  it('does not checkpoint malformed, empty, exact, over-limit or duplicate partials', () => {
    expect(createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [] }, 10, grounding)).toBeNull();
    expect(createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1', 'One')] }, 1, grounding)).toBeNull();
    expect(createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1', 'One'), { id: 'bad' }] }, 10, grounding)).toBeNull();
    expect(createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1', 'One'), card('c2', 'One')] }, 10, grounding)).toBeNull();
    expect(createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1', 'One')] }, 21, grounding)).toBeNull();
  });

  it('parses only bounded hash-valid stored checkpoints', () => {
    const checkpoint = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1', 'One')] }, 2, grounding)!;
    expect(parseFlashcardPartialCheckpoint(checkpoint, 2)).toEqual(checkpoint);
    expect(() => parseFlashcardPartialCheckpoint({ ...checkpoint, requestedTotal: 3 }, 2)).toThrow('flashcard_partial_checkpoint_identity_mismatch');
    expect(() => parseFlashcardPartialCheckpoint({ ...checkpoint, contentHash: 'a'.repeat(64) }, 2)).toThrow('flashcard_partial_checkpoint_hash_mismatch');
  });
});
