import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAiMistakeLimitNoticeMemoryForTests,
  FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT,
  getAiMistakeExplainsLeftToday,
  hasShownAiMistakeLimitNoticeToday,
  markAiMistakeExplainUsed,
  markAiMistakeLimitNoticeShownToday,
  peekAiMistakeLimitNoticeShownToday,
} from '../app/ai_mistake_explain_limit_session';

jest.mock('@react-native-async-storage/async-storage');

const store: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAiMistakeLimitNoticeMemoryForTests();
  Object.keys(store).forEach((key) => delete store[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
  jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-12T08:00:00.000Z');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ai mistake explain client limit', () => {
  it('defaults to three free explanations per day', async () => {
    expect(FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT).toBe(3);
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(3);
  });

  it('decrements locally only when marked used and resets by date', async () => {
    await markAiMistakeExplainUsed();
    await markAiMistakeExplainUsed();
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(1);

    (Date.prototype.toISOString as jest.Mock).mockReturnValue('2026-06-13T08:00:00.000Z');
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(3);
  });

  it('tracks the once-per-day limit notice separately from the usage counter', async () => {
    expect(peekAiMistakeLimitNoticeShownToday()).toBe(false);
    await expect(hasShownAiMistakeLimitNoticeToday()).resolves.toBe(false);

    await markAiMistakeLimitNoticeShownToday();

    expect(peekAiMistakeLimitNoticeShownToday()).toBe(true);
    await expect(hasShownAiMistakeLimitNoticeToday()).resolves.toBe(true);
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(3);

    (Date.prototype.toISOString as jest.Mock).mockReturnValue('2026-06-13T08:00:00.000Z');
    expect(peekAiMistakeLimitNoticeShownToday()).toBe(false);
    await expect(hasShownAiMistakeLimitNoticeToday()).resolves.toBe(false);
  });
});
