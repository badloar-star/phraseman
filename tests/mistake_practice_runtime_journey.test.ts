import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { captureObjectiveAttempt } from '../app/mistake_practice_capture';
import { prepareMistakePracticeSession } from '../app/mistake_practice_session_runtime';
import {
  loadMistakeEventJournal,
  type MistakePracticeStorage,
} from '../app/mistake_practice_store';
import { loadMistakePracticeSession } from '../app/mistake_practice_session_store';
import { projectMistakes } from '../modules/mistake-practice/projection';

function createStorage(): MistakePracticeStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    getAllKeys: async () => [...values.keys()],
  };
}

describe('Cards Errors composed runtime journey', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test('saved five-item session is cleared when a custom card is deleted before reopen', async () => {
    const storage = createStorage();
    const accountScope = 'owner-a';
    beginAccountGeneration(accountScope);
    const cards = Array.from({ length: 5 }, (_, index) => ({
      id: `custom_${index}`, en: `word ${index}`, ru: `слово ${index}`,
    }));
    for (const [index, card] of cards.entries()) {
      await captureObjectiveAttempt({
        accountScope, attemptId: `wrong-${index}`, studyTarget: 'en',
        verdict: 'wrong', objective: true,
        content: {
          sourceKind: 'flashcard', sourceId: card.id,
          canonicalTarget: card.en, sourceMeaning: card.ru,
        },
        facet: { kind: 'meaning', expected: card.en },
      }, { storage });
    }

    const started = await prepareMistakePracticeSession({
      accountScope, studyTarget: 'en', requestedLength: '5', persistSession: true, storage,
    }, { loadCustomCards: async () => cards });
    expect(started).toMatchObject({ resumed: false, unavailableCount: 0 });
    expect(started.session.initialCount).toBe(5);

    await expect(prepareMistakePracticeSession({
      accountScope, studyTarget: 'en', requestedLength: '5', persistSession: true, storage,
    }, { loadCustomCards: async () => cards.slice(1) }))
      .rejects.toThrow('mistake_practice_minimum_five_required');

    await expect(loadMistakePracticeSession({ accountScope, studyTarget: 'en', storage })).resolves.toBeNull();
    const journal = await loadMistakeEventJournal({ accountScope, studyTarget: 'en', storage });
    expect([...projectMistakes(journal.events).items.values()].filter((item) =>
      item.status === 'unavailable',
    )).toHaveLength(1);
  });
});
