import {
  flashcardSemanticKey,
  validateFlashcardItemsArtifact,
  validateFlashcardPackIdeaArtifact,
  validateFlashcardReplacementArtifact,
} from './flashcard_artifacts';

const idea = {
  stage: 'flashcard_pack_idea',
  result: {
    packId: 'city-small-talk-a2',
    title: 'City Small Talk',
    learningPromise: 'Handle ten everyday conversations in the city.',
    audience: 'Adult A2 learners travelling independently',
    cefr: 'A2',
    tags: ['city', 'small-talk'],
    inclusions: ['short reusable phrases'],
    exclusions: ['specialist vocabulary'],
    uniquenessFingerprint: 'city-small-talk-a2-short-reusable-phrases',
  },
};

const card = (id: string, front: string, back = 'перевод') => ({
  id,
  front,
  back,
  exampleTarget: `${front} today.`,
  exampleSource: `${back} сегодня.`,
  note: 'Нейтральная разговорная фраза.',
  sourceReferences: ['pack:city-small-talk-a2'],
});

describe('flashcard studio artifact contracts', () => {
  it('accepts a complete editable pack idea and rejects a missing fingerprint', () => {
    expect(validateFlashcardPackIdeaArtifact(idea, { cefr: 'A2' })).toEqual([]);
    expect(validateFlashcardPackIdeaArtifact({ ...idea, result: { ...idea.result, uniquenessFingerprint: '' } }, { cefr: 'A2' }))
      .toContain('flashcard_pack_uniqueness_fingerprint_required');
  });

  it.each([1, 10, 20])('accepts an exact card batch of %s items', (count) => {
    const items = Array.from({ length: count }, (_, index) => card(`c${index + 1}`, `Phrase ${index + 1}`));
    expect(validateFlashcardItemsArtifact(
      { stage: 'flashcard_items', items },
      { count, grounding: { packIdea: idea.result, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] } },
    )).toEqual([]);
  });

  it('rejects out-of-range counts and duplicates from pack, lesson, or catalog', () => {
    const duplicate = card('c1', 'Where is the station?');
    for (const key of ['previousCardKeys', 'lessonCardKeys', 'publishedCardKeys'] as const) {
      const errors = validateFlashcardItemsArtifact(
        { stage: 'flashcard_items', items: [duplicate] },
        { count: 1, grounding: { packIdea: idea.result, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [], [key]: [flashcardSemanticKey(duplicate)] } },
      );
      expect(errors).toContain(`flashcard_${key.replace('CardKeys', '').replace('previous', 'pack')}_duplicate`);
    }
    expect(validateFlashcardItemsArtifact(
      { stage: 'flashcard_items', items: Array.from({ length: 21 }, (_, index) => card(`c${index}`, `P${index}`)) },
      { count: 21, grounding: { packIdea: idea.result } },
    )).toContain('flashcard_batch_count_out_of_range');
  });

  it('validates a one-card replacement against all accepted semantic keys', () => {
    const original = card('c1', 'Old phrase');
    const replacement = card('c1', 'Better phrase');
    const grounding = { packIdea: idea.result, replacementForCardId: 'c1', originalCard: original, previousCardKeys: [flashcardSemanticKey(original)], lessonCardKeys: [], publishedCardKeys: [] };
    expect(validateFlashcardReplacementArtifact(
      { stage: 'flashcard_item_replacement', result: { replacementForCardId: 'c1', item: replacement } },
      { grounding },
    )).toEqual([]);
    expect(validateFlashcardReplacementArtifact(
      { stage: 'flashcard_item_replacement', result: { replacementForCardId: 'c1', item: original } },
      { grounding },
    )).toContain('flashcard_replacement_duplicate');
  });
});
