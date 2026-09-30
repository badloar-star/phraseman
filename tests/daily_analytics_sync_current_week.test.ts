jest.mock('../app/foreground_usage_ms', () => ({
  getForegroundDailyMsMap: jest.fn(async () => ({
    '2026-05-25': 120_000,
    '2026-05-18': 90_000,
  })),
}));

describe('local weekly study time', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-25T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses only on-device foreground minutes from the last seven days', async () => {
    const { loadPercentileData } = require('../app/daily_analytics_sync');
    await expect(loadPercentileData()).resolves.toEqual({
      myTime7ms: 120_000,
      percentiles: { daily7timeMs: null },
    });
  });
});
