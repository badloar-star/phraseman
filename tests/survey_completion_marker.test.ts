jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_: string, value: string) => `hash-${value}` }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_SURVEY_DONE_KEY, isSurveyOfferDone, markSurveyOfferDone, migrateLegacySurveyCompletion } from '../app/survey_completion_marker';

beforeEach(async () => AsyncStorage.clear());

it('isolates markers by account and overwrites the captured day in one account key', async () => {
  await markSurveyOfferDone({ stableId: 'a', dayKey: 'day-1', summary: { surveyId: 's', title: 'T' } });
  expect(await isSurveyOfferDone({ stableId: 'a', dayKey: 'day-1' })).toBe(true);
  expect(await isSurveyOfferDone({ stableId: 'b', dayKey: 'day-1' })).toBe(false);
  await markSurveyOfferDone({ stableId: 'a', dayKey: 'day-2', summary: { surveyId: 's', title: 'T' } });
  expect(await isSurveyOfferDone({ stableId: 'a', dayKey: 'day-1' })).toBe(false);
  expect(await isSurveyOfferDone({ stableId: 'a', dayKey: 'day-2' })).toBe(true);
});

it('never attributes an unowned legacy marker without matching authenticated server completion', async () => {
  await AsyncStorage.setItem(LEGACY_SURVEY_DONE_KEY, '2026-07-11');
  expect(await isSurveyOfferDone({ stableId: 'account-b', dayKey: '2026-07-11' })).toBe(false);
  expect(await migrateLegacySurveyCompletion({ stableId: 'account-b', dayKey: '2026-07-11', completion: null, lang: 'ru' })).toBe(false);
});

it('migrates only a server timestamp matching the captured client day and deletes legacy', async () => {
  await AsyncStorage.setItem(LEGACY_SURVEY_DONE_KEY, '2026-07-11');
  expect(await migrateLegacySurveyCompletion({ stableId: 'a', dayKey: '2026-07-11', completion: { completedAtMs: Date.UTC(2026, 6, 11, 12) }, lang: 'ru' })).toBe(true);
  expect(await isSurveyOfferDone({ stableId: 'a', dayKey: '2026-07-11' })).toBe(true);
  await expect(AsyncStorage.getItem(LEGACY_SURVEY_DONE_KEY)).resolves.toBeNull();
});

it('matches completion days by UTC across midnight boundaries and rejects invalid timestamps', async () => {
  await AsyncStorage.setItem(LEGACY_SURVEY_DONE_KEY, '2026-01-01');
  expect(await migrateLegacySurveyCompletion({ stableId: 'a', dayKey: '2026-01-01', completion: { completedAtMs: Date.UTC(2026, 0, 1, 0, 5) }, lang: 'ru' })).toBe(true);
  expect(await migrateLegacySurveyCompletion({ stableId: 'b', dayKey: '2025-12-31', completion: { completedAtMs: Date.UTC(2026, 0, 1, 0, 5) }, lang: 'ru' })).toBe(false);
  expect(await migrateLegacySurveyCompletion({ stableId: 'b', dayKey: '2026-01-01', completion: { completedAtMs: Number.NaN }, lang: 'ru' })).toBe(false);
  expect(await migrateLegacySurveyCompletion({ stableId: 'c', dayKey: '2026-07-11', completion: { completedAtMs: Date.UTC(2026, 6, 11, 23, 30) }, lang: 'ru' })).toBe(true);
});
