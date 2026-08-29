import {
  beginAccountGeneration,
  __resetAccountGenerationForTests,
} from '../app/account_generation';
import * as runes from '../app/runes_system';

const mockReadUnifiedLevelSpinStars = jest.fn();
const mockGetAppSnapshot = jest.fn();

jest.mock('../app/level_spin_star_grants', () => ({
  readUnifiedLevelSpinStars: (...args: unknown[]) => mockReadUnifiedLevelSpinStars(...args),
  peekStoredLevelSpinStarsForBoot: jest.fn(() => null),
}));
jest.mock('../app/app_snapshot_store', () => ({
  getAppSnapshot: () => mockGetAppSnapshot(),
  patchAppSnapshot: jest.fn(),
  subscribeAppSnapshot: jest.fn(() => jest.fn()),
}));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: jest.fn() },
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

describe('rune wallet read quality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('owner-a');
    mockGetAppSnapshot.mockReturnValue({ progress: { stars: 50, starsEarnedTotal: 0 } });
  });

  test('a full local projection is marked durable', async () => {
    mockReadUnifiedLevelSpinStars.mockResolvedValue({ balance: 300, earnedTotal: 10 });

    await expect(runes.getRunesBalanceRead()).resolves.toEqual({
      wallet: { balance: 300, earnedTotal: 10 },
      quality: 'durable',
    });
  });

  test('a projection read failure exposes snapshot data only as fallback', async () => {
    mockReadUnifiedLevelSpinStars.mockRejectedValue(new Error('storage_read_failed'));

    await expect(runes.getRunesBalanceRead()).resolves.toEqual({
      wallet: { balance: 50, earnedTotal: 0 },
      quality: 'fallback',
    });
  });
});
