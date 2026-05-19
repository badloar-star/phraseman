const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage[key] = value; }),
}));

describe('quiz_daily_limit', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    jest.useFakeTimers().setSystemTime(new Date('2026-05-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows exactly three free quizzes per day', async () => {
    const {
      FREE_DAILY_QUIZ_LIMIT,
      getFreeDailyQuizState,
      hasFreeDailyQuizzesLeft,
      incrementFreeDailyQuizCount,
    } = await import('../app/quiz_daily_limit');

    expect(FREE_DAILY_QUIZ_LIMIT).toBe(3);
    await expect(getFreeDailyQuizState()).resolves.toMatchObject({ count: 0, left: 3, exhausted: false });

    await incrementFreeDailyQuizCount();
    await incrementFreeDailyQuizCount();
    await expect(hasFreeDailyQuizzesLeft()).resolves.toBe(true);

    await incrementFreeDailyQuizCount();
    await expect(getFreeDailyQuizState()).resolves.toMatchObject({ count: 3, left: 0, exhausted: true });
    await expect(hasFreeDailyQuizzesLeft()).resolves.toBe(false);
  });

  it('resets the free quiz counter on a new day', async () => {
    mockStorage.quiz_daily_free_limit_v1 = JSON.stringify({ date: '2026-05-14', count: 3 });
    const { getFreeDailyQuizState } = await import('../app/quiz_daily_limit');

    await expect(getFreeDailyQuizState()).resolves.toMatchObject({
      date: '2026-05-15',
      count: 0,
      left: 3,
      exhausted: false,
    });
  });

  it('consumes one free quiz when a free-tier quiz session starts', async () => {
    const { consumeFreeDailyQuizStart, getFreeDailyQuizState } = await import('../app/quiz_daily_limit');

    await expect(consumeFreeDailyQuizStart()).resolves.toMatchObject({
      count: 1,
      left: 2,
      exhausted: false,
    });
    await expect(getFreeDailyQuizState()).resolves.toMatchObject({ count: 1, left: 2 });
  });

  it('does not consume beyond the daily free quiz limit', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockStorage.quiz_daily_free_limit_v1 = JSON.stringify({ date: today, count: 3 });
    const { consumeFreeDailyQuizStart, getFreeDailyQuizState } = await import('../app/quiz_daily_limit');

    await expect(consumeFreeDailyQuizStart()).resolves.toBeNull();
    await expect(getFreeDailyQuizState()).resolves.toMatchObject({ count: 3, left: 0, exhausted: true });
  });
});
