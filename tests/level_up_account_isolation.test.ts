import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  beginAccountGeneration,
  invalidateAccountGeneration,
  __resetAccountGenerationForTests,
} from '../app/account_generation';
import { accountLocalDataKeysForToday, wipeLocalAccountData } from '../app/cloud_sync';
import {
  ensureLevelGiftEntitlement,
  getPendingLevelGiftInventoryCache,
  loadPendingLevelGiftInventory,
} from '../app/level_gift_inventory';
import {
  LEVEL_UP_REWARD_CONTEXT_KEY,
  LEVEL_UP_REWARD_FALLBACK_KEY,
  LEVEL_UP_REWARD_OWNER_KEY,
  LEVEL_UP_REWARD_RETRY_KEY,
  PENDING_LEVEL_UP_QUEUE_KEY,
  reconcileLevelUpRewards,
} from '../app/level_up_reward_reconciler';
import {
  LEVEL_UP_ACCOUNT_LOCAL_KEYS,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
} from '../app/level_up_storage_keys';
import { rollF2pLevelGiftForUser, type GiftDef } from '../app/level_gift_system';
import { TOTAL_XP_FOR_LEVEL } from '../constants/theme';
import { getCanonicalUserId } from '../app/user_id_policy';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));
jest.mock('../app/level_gift_system', () => {
  const actual = jest.requireActual('../app/level_gift_system');
  return {
    ...actual,
    rollF2pLevelGiftForUser: jest.fn(),
    rollPremiumLevelGiftForUser: jest.fn(),
  };
});

const store: Record<string, string> = {};
const canonicalUserId = getCanonicalUserId as jest.MockedFunction<typeof getCanonicalUserId>;

const makeGift = (id: string): GiftDef => ({
  id,
  rarity: 'common',
  icon: 'gift',
  titleRU: id,
  titleUK: id,
  titleES: id,
  descRU: id,
  descUK: id,
  descES: id,
  weight: 1,
});

beforeEach(async () => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  Object.keys(store).forEach((key) => delete store[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete store[key];
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) =>
    keys.map((key) => [key, store[key] ?? null]),
  );
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { store[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
  });
  await loadPendingLevelGiftInventory();
});

describe('level-up reward account isolation', () => {
  it('includes every inventory and recovery key in the normal account-local wipe', async () => {
    expect(accountLocalDataKeysForToday('2026-07-11')).toEqual(
      expect.arrayContaining([...LEVEL_UP_ACCOUNT_LOCAL_KEYS]),
    );
    await AsyncStorage.multiSet(LEVEL_UP_ACCOUNT_LOCAL_KEYS.map((key) => [key, 'sentinel']));

    await wipeLocalAccountData();

    await expect(AsyncStorage.multiGet([...LEVEL_UP_ACCOUNT_LOCAL_KEYS])).resolves.toEqual(
      LEVEL_UP_ACCOUNT_LOCAL_KEYS.map((key) => [key, null]),
    );
  });

  it('gives account B its own same-level entitlement after a normal wipe and switch', async () => {
    (rollF2pLevelGiftForUser as jest.Mock)
      .mockResolvedValueOnce(makeGift('account_a_gift'))
      .mockResolvedValueOnce(makeGift('account_b_gift'));
    beginAccountGeneration('account-a');
    await expect(ensureLevelGiftEntitlement(12)).resolves.toMatchObject({
      status: 'persisted',
      gift: { id: 'account_a_gift' },
    });
    await loadPendingLevelGiftInventory();
    expect(getPendingLevelGiftInventoryCache()).toHaveLength(1);

    await wipeLocalAccountData();
    beginAccountGeneration('account-b');

    expect(getPendingLevelGiftInventoryCache()).toEqual([]);
    await expect(ensureLevelGiftEntitlement(12)).resolves.toMatchObject({
      status: 'persisted',
      gift: { id: 'account_b_gift' },
    });
    expect(rollF2pLevelGiftForUser).toHaveBeenCalledTimes(2);
  });

  it('does not publish account A inventory when its delayed load finishes after switching to B', async () => {
    beginAccountGeneration('account-a');
    store[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 12: makeGift('account_a_gift') });
    store[UNCLAIMED_DUAL_GIFTS_KEY] = '{}';
    let releaseReads!: () => void;
    const readsReleased = new Promise<void>((resolve) => { releaseReads = resolve; });
    const originalGetItem = AsyncStorage.getItem as jest.Mock;
    originalGetItem.mockImplementation(async (key: string) => {
      const captured = store[key] ?? null;
      if (key === UNCLAIMED_GIFTS_KEY || key === UNCLAIMED_DUAL_GIFTS_KEY) await readsReleased;
      return captured;
    });

    const delayedLoad = loadPendingLevelGiftInventory();
    beginAccountGeneration('account-b');
    releaseReads();

    await expect(delayedLoad).resolves.toEqual([]);
    expect(getPendingLevelGiftInventoryCache()).toEqual([]);
  });

  it('drops an in-flight account A reconcile after wipe and lets B earn the same level', async () => {
    let owner = 'account-a';
    canonicalUserId.mockImplementation(async () => owner);
    let releaseAccountARoll!: () => void;
    let accountARollStarted!: () => void;
    const accountARollWasStarted = new Promise<void>((resolve) => { accountARollStarted = resolve; });
    const accountARollCanFinish = new Promise<void>((resolve) => { releaseAccountARoll = resolve; });
    (rollF2pLevelGiftForUser as jest.Mock)
      .mockImplementationOnce(async () => {
        accountARollStarted();
        await accountARollCanFinish;
        return makeGift('account_a_gift');
      })
      .mockResolvedValueOnce(makeGift('account_b_gift'));
    const previousXp = TOTAL_XP_FOR_LEVEL(2) - 1;
    const nextXp = TOTAL_XP_FOR_LEVEL(2);

    beginAccountGeneration(owner);
    const reconcileA = reconcileLevelUpRewards(previousXp, nextXp);
    await accountARollWasStarted;

    invalidateAccountGeneration();
    await wipeLocalAccountData();
    owner = 'account-b';
    beginAccountGeneration(owner);
    releaseAccountARoll();
    await expect(reconcileA).resolves.toEqual([]);

    expect(store[UNCLAIMED_GIFTS_KEY]).toBeUndefined();
    expect(store[UNCLAIMED_DUAL_GIFTS_KEY]).toBeUndefined();
    expect(store[PENDING_LEVEL_UP_QUEUE_KEY]).toBeUndefined();
    expect(store[LEVEL_UP_REWARD_RETRY_KEY]).toBeUndefined();
    expect(store[LEVEL_UP_REWARD_CONTEXT_KEY]).toBeUndefined();
    expect(store[LEVEL_UP_REWARD_FALLBACK_KEY]).toBeUndefined();
    expect(store[LEVEL_UP_REWARD_OWNER_KEY]).toBeUndefined();

    await expect(reconcileLevelUpRewards(previousXp, nextXp)).resolves.toMatchObject([
      { status: 'persisted', level: 2, gift: { id: 'account_b_gift' } },
    ]);
    expect(JSON.parse(store[UNCLAIMED_GIFTS_KEY])).toMatchObject({
      2: { id: 'account_b_gift' },
    });
    expect(JSON.parse(store[PENDING_LEVEL_UP_QUEUE_KEY])).toEqual([2]);
    expect(store[LEVEL_UP_REWARD_OWNER_KEY]).toBe('account-b');
  });

  it('does not reconcile while account identity is transitioning', async () => {
    canonicalUserId.mockResolvedValue('account-a');
    beginAccountGeneration('account-a');
    invalidateAccountGeneration();

    await expect(reconcileLevelUpRewards(
      TOTAL_XP_FOR_LEVEL(2) - 1,
      TOTAL_XP_FOR_LEVEL(2),
    )).resolves.toEqual([]);

    expect(rollF2pLevelGiftForUser).not.toHaveBeenCalled();
    expect(store[UNCLAIMED_GIFTS_KEY]).toBeUndefined();
    expect(store[PENDING_LEVEL_UP_QUEUE_KEY]).toBeUndefined();
    expect(store[LEVEL_UP_REWARD_OWNER_KEY]).toBeUndefined();
  });
});
