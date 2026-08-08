import { applyFlashcardRegistryDocumentMutation, planFlashcardRegistryPackMutation } from './flashcard_registry_mutations';

const pack = (id: string, en: string, ru: string) => ({ id, studyTarget: 'en', cards: [{ id: 'c1', en, ru }] });
describe('flashcard registry catalog mutations', () => {
  it('plans additive publish and exact unpublish membership changes', () => {
    const added = planFlashcardRegistryPackMutation(null, pack('p1', 'Station', 'Вокзал'));
    expect(added).toHaveLength(1); expect(added[0].addSources).toEqual([{ packId: 'p1', cardId: 'c1' }]); expect(added[0].removeSources).toEqual([]);
    const removed = planFlashcardRegistryPackMutation(pack('p1', 'Station', 'Вокзал'), null);
    expect(removed[0].removeSources).toEqual([{ packId: 'p1', cardId: 'c1' }]);
  });

  it('removes one pack membership without deleting another pack using the same key', () => {
    const remove = planFlashcardRegistryPackMutation(pack('p1', 'Station', 'Вокзал'), null)[0];
    const current = { docId: remove.docId, partitionKey: remove.partitionKey, canonicalKey: remove.canonicalKey, sources: [{ packId: 'p1', cardId: 'c1' }, { packId: 'p2', cardId: 'c9' }] };
    expect(applyFlashcardRegistryDocumentMutation(current, remove)?.sources).toEqual([{ packId: 'p2', cardId: 'c9' }]);
    expect(applyFlashcardRegistryDocumentMutation({ ...current, sources: [{ packId: 'p1', cardId: 'c1' }] }, remove)).toBeNull();
  });

  it('moves a source from the old semantic document to the edited one', () => {
    const plan = planFlashcardRegistryPackMutation(pack('p1', 'Station', 'Вокзал'), pack('p1', 'Airport', 'Аэропорт'));
    expect(plan).toHaveLength(2);
    expect(plan.filter((item) => item.removeSources.length)).toHaveLength(1);
    expect(plan.filter((item) => item.addSources.length)).toHaveLength(1);
  });

  it('partitions the same card by every available source locale', () => {
    const plan = planFlashcardRegistryPackMutation(null, { id: 'p1', studyTarget: 'en', cards: [{ id: 'c1', en: 'Hi', ru: 'Привет', es: 'Hola', sourceLocales: { vi: 'Xin chào' } }] });
    expect(plan.map((item) => item.partitionKey)).toEqual(expect.arrayContaining(['community_flashcards:en:ru', 'community_flashcards:en:es', 'community_flashcards:en:vi']));
  });

  it('retains every card source when one pack contains a legacy duplicate', () => {
    const plan = planFlashcardRegistryPackMutation(null, { id: 'p1', cards: [{ id: 'c1', en: 'Hi', ru: 'Привет' }, { id: 'c2', en: ' hi! ', ru: ' привет ' }] });
    expect(plan).toHaveLength(1);
    expect(plan[0].addSources).toEqual([{ packId: 'p1', cardId: 'c1' }, { packId: 'p1', cardId: 'c2' }]);
  });
});
