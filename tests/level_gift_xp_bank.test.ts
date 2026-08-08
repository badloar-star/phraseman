import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyGift,
  consumeGiftXpBank,
  GIFT_POOL,
  grantGiftXpBank,
  readGiftMultiplierForBaseXp,
  readGiftXpBank,
} from '../app/level_gift_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({
  primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn(),
  loadOwnedPackIds: jest.fn().mockResolvedValue([]),
  addOwnedPackId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  IS_EXPO_GO: true,
  CLOUD_SYNC_ENABLED: false,
  SPANISH_UI_LOCALE_ENABLED: true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn().mockResolvedValue('account-a') }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

describe('level_gift_system - XP bank', () => {
  it('adds XP bank rewards with a cap', async () => {
    await grantGiftXpBank(1000);
    await grantGiftXpBank(800);

    const bank = await readGiftXpBank();
    expect(bank.remaining).toBe(1500);
  });
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  registerXP.mockReset().mockResolvedValue({ finalDelta: 0 });

  it('converts bank overflow to instant XP instead of silently discarding the gift', async () => {
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    await grantGiftXpBank(1500);
    const gift = GIFT_POOL.find(item => item.id === 'xp_bank_600')!;

    await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:40:f2p',
    })).resolves.toEqual({ success: true });

    expect((await readGiftXpBank()).remaining).toBe(1500);
    expect(registerXP).toHaveBeenCalledWith(
      600,
      'achievement_reward',
      'TestUser',
      'ru',
      undefined,
      expect.objectContaining({ payload: expect.objectContaining({ giftId: 'xp_bank_600' }) }),
    );
  });

  it('applies one XP-bank occurrence once but accepts a distinct occurrence of the same gift', async () => {
    const gift = GIFT_POOL.find(item => item.id === 'xp_bank_600')!;

    await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:40:f2p',
    })).resolves.toEqual({ success: true });
    await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:40:f2p',
    })).resolves.toEqual({ success: true });
    await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:45:f2p',
    })).resolves.toEqual({ success: true });

    expect((await readGiftXpBank()).remaining).toBe(1200);
  });

  it('retries an occurrence overflow without adding the bank amount twice', async () => {
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    registerXP.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ finalDelta: 600 });
    await grantGiftXpBank(1500);
    const gift = GIFT_POOL.find(item => item.id === 'xp_bank_600')!;

    await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:40:f2p',
    })).resolves.toEqual({ success: false });
    await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      occurrenceId: 'level:40:f2p',
    })).resolves.toEqual({ success: true });

    expect((await readGiftXpBank()).remaining).toBe(1500);
    expect(registerXP).toHaveBeenCalledTimes(2);
    expect(registerXP.mock.calls[0][5].eventId).toBe(registerXP.mock.calls[1][5].eventId);
  });

  it('uses partial multiplier and consumes only available base XP', async () => {
    await grantGiftXpBank(30);

    const first = await readGiftMultiplierForBaseXp(100);
    expect(first.multiplier).toBeCloseTo(1.3);
    expect(first.consumeBank).toBe(true);

    const used = await consumeGiftXpBank(100);
    expect(used).toBe(30);
    expect((await readGiftXpBank()).remaining).toBe(0);
  });
});
