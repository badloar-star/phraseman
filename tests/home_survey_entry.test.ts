/* eslint-disable import/first */
// зачем (Q90, координатор 01.10): загрузка опроса для строки «Сегодня» — раз за вход в приложение,
// кэш 6 часов (память + диск), «опроса нет» тоже кэшируется, сетевая ошибка — нет.
const mockStore = new Map<string, string>();
const mockFetch = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));
jest.mock('../app/survey_client', () => ({
  fetchActiveSurveyWithRetry: (...args: unknown[]) => mockFetch(...args),
}));

import {
  HOME_SURVEY_STORAGE_KEY,
  HOME_SURVEY_TTL_MS,
  loadHomeSurvey,
  markHomeSurveyCompleted,
  peekHomeSurvey,
  resetHomeSurveyEntryForTests,
} from '../app/home_survey_entry';

const survey = { surveyId: 's1', title: 'Опрос', subtitle: '', rewardShards: 0, questions: [] };
const input = { stableId: 'stable-1', lang: 'ru' as const, platform: 'android' };

beforeEach(() => {
  mockStore.clear();
  mockFetch.mockReset();
  resetHomeSurveyEntryForTests();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('first entry asks the network once and caches the survey in memory and on disk', async () => {
  mockFetch.mockResolvedValue({ survey, completion: null });
  await expect(loadHomeSurvey(input)).resolves.toEqual(survey);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(peekHomeSurvey('stable-1', 'ru')).toEqual(survey);
  await Promise.resolve();
  expect(JSON.parse(mockStore.get(HOME_SURVEY_STORAGE_KEY)!).survey.surveyId).toBe('s1');
});

test('a fresh (< 6 h) disk cache means no network at all after a restart', async () => {
  mockStore.set(HOME_SURVEY_STORAGE_KEY, JSON.stringify({ stableId: 'stable-1', lang: 'ru', fetchedAtMs: Date.now() - 60_000, survey }));
  await expect(loadHomeSurvey(input)).resolves.toEqual(survey);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('a stale (>= 6 h) cache is refreshed once; repeat calls in the same process do not hit the network again', async () => {
  const old = Date.now() - HOME_SURVEY_TTL_MS - 1000;
  mockStore.set(HOME_SURVEY_STORAGE_KEY, JSON.stringify({ stableId: 'stable-1', lang: 'ru', fetchedAtMs: old, survey }));
  mockFetch.mockResolvedValue({ survey: null, completion: null });
  await expect(loadHomeSurvey(input)).resolves.toBeNull();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  await expect(loadHomeSurvey(input)).resolves.toBeNull();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test('"no survey" is cached too, and a completed survey never shows a row', async () => {
  mockFetch.mockResolvedValue({ survey, completion: { completedAtMs: 1 } });
  await expect(loadHomeSurvey(input)).resolves.toBeNull();
  expect(peekHomeSurvey('stable-1', 'ru')).toBeNull();
});

test('another account or language does not reuse the cache', async () => {
  mockFetch.mockResolvedValue({ survey, completion: null });
  await loadHomeSurvey(input);
  expect(peekHomeSurvey('stable-2', 'ru')).toBeUndefined();
  expect(peekHomeSurvey('stable-1', 'en')).toBeUndefined();
});

test('a network error is not cached as "no survey": the next app entry asks again', async () => {
  mockFetch.mockRejectedValueOnce(new Error('offline'));
  await expect(loadHomeSurvey(input)).resolves.toBeNull();
  expect(peekHomeSurvey('stable-1', 'ru')).toBeUndefined();
  resetHomeSurveyEntryForTests(); // новый процесс
  mockFetch.mockResolvedValueOnce({ survey, completion: null });
  await expect(loadHomeSurvey(input)).resolves.toEqual(survey);
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

test('completing the survey writes "no survey" so the row stays hidden after a restart', async () => {
  mockFetch.mockResolvedValue({ survey, completion: null });
  await loadHomeSurvey(input);
  markHomeSurveyCompleted('stable-1', 'ru');
  expect(peekHomeSurvey('stable-1', 'ru')).toBeNull();
  await Promise.resolve();
  expect(JSON.parse(mockStore.get(HOME_SURVEY_STORAGE_KEY)!).survey).toBeNull();
});
