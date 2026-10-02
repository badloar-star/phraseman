import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests } from '../app/account_generation';
import { lessonProgressKey, lessonWordsKey } from '../app/target_storage_keys';

// зачем (PM-121-A3): «За всё время» — сумма по ВСЕМ языкам аккаунта, и каждая цифра обязана
// нести язык. До правки считались только en+fr: испанский/немецкий/итальянский молча терялись.
const mockReadCustomCards = jest.fn(async (target?: string) => (target === 'es' ? [{ id: 'a' }, { id: 'b' }] : []));
jest.mock('../app/flashcards/storage', () => ({
  readCustomCards: (target?: string) => mockReadCustomCards(target),
}));
jest.mock('../app/foreground_usage_ms', () => ({ getForegroundDailyMsMap: jest.fn(async () => ({})) }));
jest.mock('../app/lesson_words', () => ({ LESSONS_WITH_WORDS: [1, 2, 3] }));
jest.mock('../app/cloud_sync', () => ({ syncToCloud: jest.fn(async () => undefined) }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

beforeEach(() => {
  storage.__reset?.();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('lifetime sums every learning language and labels each part by language', async () => {
  await storage.setItem(lessonProgressKey(1, 'en'), JSON.stringify(['correct', 'wrong', 'replay_correct']));
  await storage.setItem(lessonProgressKey(1, 'es'), JSON.stringify(['correct', 'correct']));
  await storage.setItem(lessonProgressKey(2, 'de'), JSON.stringify(['correct']));
  await storage.setItem(lessonWordsKey(1, 'es'), JSON.stringify({ hola: 3, adios: 1, gracias: 5 }));
  await storage.setItem(lessonWordsKey(1, 'it'), JSON.stringify(['ciao', 'grazie']));

  const { loadLifetimeProfileStats } = await import('../app/lifetime_profile_stats');
  const stats = await loadLifetimeProfileStats();

  expect(stats.phrasesLearned).toBe(5);
  expect(stats.wordsLearned).toBe(4);
  expect(stats.flashcardsSaved).toBe(2);
  expect(stats.byTarget).toEqual({
    en: { wordsLearned: 0, phrasesLearned: 2, flashcardsSaved: 0 },
    es: { wordsLearned: 2, phrasesLearned: 2, flashcardsSaved: 2 },
    fr: { wordsLearned: 0, phrasesLearned: 0, flashcardsSaved: 0 },
    de: { wordsLearned: 0, phrasesLearned: 1, flashcardsSaved: 0 },
    it: { wordsLearned: 2, phrasesLearned: 0, flashcardsSaved: 0 },
  });
});

test('the per-language parts always add up to the headline totals', async () => {
  await storage.setItem(lessonProgressKey(3, 'fr'), JSON.stringify(['correct', 'correct', 'correct']));
  await storage.setItem(lessonWordsKey(1, 'en'), JSON.stringify(['a', 'b', 'c']));
  const { loadLifetimeProfileStats } = await import('../app/lifetime_profile_stats');
  const stats = await loadLifetimeProfileStats();
  const parts = Object.values(stats.byTarget ?? {});
  expect(parts).toHaveLength(5);
  expect(parts.reduce((s, p) => s + p.phrasesLearned, 0)).toBe(stats.phrasesLearned);
  expect(parts.reduce((s, p) => s + p.wordsLearned, 0)).toBe(stats.wordsLearned);
  expect(parts.reduce((s, p) => s + p.flashcardsSaved, 0)).toBe(stats.flashcardsSaved);
});

test('an old cached snapshot without the breakdown is still readable (no migration needed)', async () => {
  await storage.setItem('lifetime_profile_stats_snapshot_v1', JSON.stringify({
    wordsLearned: 7, flashcardsSaved: 1, phrasesLearned: 9, englishLevel: null, appDaysUnion: 3, longestStreakDays: 2,
  }));
  const { readLifetimeProfileStatsCache } = await import('../app/lifetime_profile_stats');
  expect(await readLifetimeProfileStatsCache()).toMatchObject({ wordsLearned: 7, phrasesLearned: 9 });
});

test('a snapshot with a broken breakdown is rejected instead of labelling the sum with wrong numbers', async () => {
  await storage.setItem('lifetime_profile_stats_snapshot_v1', JSON.stringify({
    wordsLearned: 7, flashcardsSaved: 1, phrasesLearned: 9, englishLevel: null, appDaysUnion: 3, longestStreakDays: 2,
    byTarget: { en: { wordsLearned: 1 } },
  }));
  const { readLifetimeProfileStatsCache } = await import('../app/lifetime_profile_stats');
  expect(await readLifetimeProfileStatsCache()).toBeNull();
});
