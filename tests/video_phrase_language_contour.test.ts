import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetFlashcardCacheForTests,
  alignSavedVideoFlashcardsWithChannel,
  loadAllSavedFlashcards,
  saveFlashcards,
  type Flashcard,
} from '../hooks/use-flashcards';
import { filterCardsByPackLanguage } from '../app/flashcards/pack_languages';

jest.mock('../app/account_scope_key', () => ({
  accountScopeKey: () => 'test-user',
}));

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'test-user', generation: 1, phase: 'active' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (fn: () => unknown) => fn(),
}));

const legacyGermanVideoCard: Flashcard = {
  id: 'video_phrase_legacy_de',
  en: 'Ich habe es eilig.',
  ru: 'Я спешу.',
  uk: 'Я поспішаю.',
  source: 'video_phrase',
  sourceId: 'germanVid1:1',
  addedAt: 1,
  studyTarget: 'en',
};

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear(): Promise<void> }).clear();
  __resetFlashcardCacheForTests();
});

describe('video phrase language contour', () => {
  it('moves an already saved video phrase into the source channel contour', async () => {
    await saveFlashcards([legacyGermanVideoCard], 'en');

    await alignSavedVideoFlashcardsWithChannel({
      videoId: 'germanVid1',
      packLanguage: 'de',
      sourceTitle: 'Phraseman Deutsch',
    });

    const saved = await loadAllSavedFlashcards();
    expect(filterCardsByPackLanguage(saved, 'en')).toHaveLength(0);
    expect(filterCardsByPackLanguage(saved, 'de')).toEqual([
      expect.objectContaining({
        id: legacyGermanVideoCard.id,
        packLanguage: 'de',
        sourceTitle: 'Phraseman Deutsch',
      }),
    ]);
  });
});
