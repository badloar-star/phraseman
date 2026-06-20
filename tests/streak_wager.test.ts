import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEffectiveWagerStake, loadWager, placeWager } from '../app/streak_wager';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { spendShards } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/shards_system', () => ({
  spendShards: jest.fn().mockResolvedValue(true),
  addShardsRaw: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/app_activity', () => ({ trackActivity: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/app_health', () => ({ logAppWarning: jest.fn().mockResolvedValue(undefined) }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(false);
  (spendShards as jest.Mock).mockResolvedValue(true);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
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

describe('streak_wager effective stake', () => {
  it('uses nominal stake by default', async () => {
    await expect(getEffectiveWagerStake(1)).resolves.toEqual({
      nominalStake: 2,
      stakeToSpend: 2,
      hasDiscount: false,
      premiumFree: false,
    });
  });

  it('applies the level-gift wager discount to the visible stake', async () => {
    mockStorage.wager_discount = '0.25';

    await expect(getEffectiveWagerStake(3)).resolves.toEqual({
      nominalStake: 5,
      stakeToSpend: 3,
      hasDiscount: true,
      premiumFree: false,
    });
  });

  it('still charges the discounted stake even with a legacy premium wager token (premium-free path removed)', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    mockStorage.premium_wager_free_after_levelup_v1 = '1';
    mockStorage.wager_discount = '0.25';

    // Premium-free ставки больше нет: токен игнорируется, действует только скидка 25%.
    await expect(getEffectiveWagerStake(3)).resolves.toEqual({
      nominalStake: 5,
      stakeToSpend: 3,
      hasDiscount: true,
      premiumFree: false,
    });
  });

  it('stores the actual charged stake after placing a discounted wager', async () => {
    mockStorage.wager_discount = '0.25';

    await expect(placeWager(12, 3)).resolves.toBe(true);

    expect(spendShards).toHaveBeenCalledWith(3, 'wager_bet');
    expect(mockStorage.wager_discount).toBeUndefined();
    expect(JSON.parse(mockStorage.streak_wager_v2)).toEqual(expect.objectContaining({
      active: true,
      tierIdx: 3,
      betShards: 3,
      rewardShards: 20,
    }));
  });

  it('keeps the gift discount when shard spending fails', async () => {
    mockStorage.wager_discount = '0.25';
    (spendShards as jest.Mock).mockResolvedValue(false);

    await expect(placeWager(12, 3)).resolves.toBe(false);

    expect(spendShards).toHaveBeenCalledWith(3, 'wager_bet');
    expect(mockStorage.wager_discount).toBe('0.25');
    expect(mockStorage.streak_wager_v2).toBeUndefined();
  });

  it('charges the discounted stake and clears the legacy premium token when placing a wager', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    mockStorage.premium_wager_free_after_levelup_v1 = '1';
    mockStorage.wager_discount = '0.25';

    await expect(placeWager(12, 3)).resolves.toBe(true);

    // Премиум-токен больше не делает ставку бесплатной — списываем со скидкой 25%.
    expect(spendShards).toHaveBeenCalledWith(3, 'wager_bet');
    expect(JSON.parse(mockStorage.streak_wager_v2)).toEqual(expect.objectContaining({
      active: true,
      tierIdx: 3,
      betShards: 3,
      rewardShards: 20,
    }));
  });

  it('loadWager is a pure read and never spends shards (no silent legacy charge)', async () => {
    // Регрессия багов «осколки списались сами за ночь»: чтение состояния пари
    // не должно тратить осколки. Legacy zero-stake пари грандфазерятся как есть.
    mockStorage.streak_wager_v2 = JSON.stringify({
      active: true,
      startDate: '2026-01-01',
      startStreak: 5,
      tierIdx: 4,
      betShards: 0,
      daysRequired: 50,
      rewardShards: 32,
      rewardXP: 7500,
      daysKept: 10,
      lastChecked: '2026-01-10',
      result: 'pending',
    });

    const w = await loadWager();

    expect(spendShards).not.toHaveBeenCalled();
    expect(w?.betShards).toBe(0);
    // Маркер не перезаписан чтением.
    expect(JSON.parse(mockStorage.streak_wager_v2).betShards).toBe(0);
  });
});
