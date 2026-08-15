import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEffectiveWagerStake, loadWager, placeWager } from '../app/streak_wager';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { commitShardCompositeOperation } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/shards_system', () => ({
  commitShardCompositeOperation: jest.fn(),
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
  (commitShardCompositeOperation as jest.Mock).mockImplementation(async (input) => {
    input.localWrites.forEach(([key, value]: readonly [string, string]) => {
      mockStorage[key] = value;
    });
    return { status: 'applied', balanceBefore: 10, balanceAfter: 10 - input.amount };
  });
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

    expect(commitShardCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: 3,
      reason: 'wager_bet',
    }));
    expect(mockStorage.wager_discount).toBe('0');
    expect(JSON.parse(mockStorage.streak_wager_v2)).toEqual(expect.objectContaining({
      active: true,
      tierIdx: 3,
      betShards: 3,
      rewardShards: 0, // §7: монетная выплата пари обнулена
    }));
  });

  it('consumes one queued gift discount per successful wager and accepts the legacy single-use key', async () => {
    mockStorage.wager_discount = '0.25';
    mockStorage.wager_discount_uses_v1 = '2';

    await expect(placeWager(12, 3)).resolves.toBe(true);
    expect(mockStorage.wager_discount).toBe('0.25');
    expect(mockStorage.wager_discount_uses_v1).toBe('1');

    delete mockStorage.streak_wager_v2;
    await expect(placeWager(12, 3)).resolves.toBe(true);
    expect(mockStorage.wager_discount).toBe('0');
    expect(mockStorage.wager_discount_uses_v1).toBe('0');

    delete mockStorage.streak_wager_v2;
    mockStorage.wager_discount = '0.25';
    await expect(placeWager(12, 3)).resolves.toBe(true);
    expect(mockStorage.wager_discount).toBe('0');
  });

  it('keeps the gift discount when shard spending fails', async () => {
    mockStorage.wager_discount = '0.25';
    (commitShardCompositeOperation as jest.Mock).mockResolvedValue({ status: 'failed', reason: 'disk_full' });

    await expect(placeWager(12, 3)).resolves.toBe(false);

    expect(commitShardCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: 3,
      reason: 'wager_bet',
    }));
    expect(mockStorage.wager_discount).toBe('0.25');
    expect(mockStorage.streak_wager_v2).toBeUndefined();
  });

  it('charges the discounted stake and clears the legacy premium token when placing a wager', async () => {
    (getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
    mockStorage.premium_wager_free_after_levelup_v1 = '1';
    mockStorage.wager_discount = '0.25';

    await expect(placeWager(12, 3)).resolves.toBe(true);

    // Премиум-токен больше не делает ставку бесплатной — списываем со скидкой 25%.
    expect(commitShardCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: 3,
      reason: 'wager_bet',
    }));
    expect(JSON.parse(mockStorage.streak_wager_v2)).toEqual(expect.objectContaining({
      active: true,
      tierIdx: 3,
      betShards: 3,
      rewardShards: 0, // §7: монетная выплата пари обнулена
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
      rewardShards: 0, // §7: монетная выплата пари обнулена
      rewardXP: 7500,
      daysKept: 10,
      lastChecked: '2026-01-10',
      result: 'pending',
    });

    const w = await loadWager();

    expect(commitShardCompositeOperation).not.toHaveBeenCalled();
    expect(w?.betShards).toBe(0);
    // Маркер не перезаписан чтением.
    expect(JSON.parse(mockStorage.streak_wager_v2).betShards).toBe(0);
  });
});
