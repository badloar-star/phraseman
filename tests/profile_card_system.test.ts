import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import { getShardsBalance, spendShards } from '../app/shards_system';
import {
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
  PROFILE_CARD_LEVEL_COSTS,
  PROFILE_CARD_UPGRADE_COST,
  getNextProfileCardLevel,
  getProfileCardSnapshot,
  normalizeProfileCardLevel,
  upgradeProfileCardLevel,
} from '../app/profile_card_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

const mockGetShardsBalance = getShardsBalance as jest.MockedFunction<typeof getShardsBalance>;
const mockSpendShards = spendShards as jest.MockedFunction<typeof spendShards>;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockGetShardsBalance.mockResolvedValue(0);
  mockSpendShards.mockResolvedValue(true);
});

describe('profile_card_system', () => {
  it('normalizes to the 5-level ladder and walks it strictly one step at a time', () => {
    expect(normalizeProfileCardLevel(-3)).toBe(0);
    expect(normalizeProfileCardLevel(0.9)).toBe(0);
    expect(normalizeProfileCardLevel(2.9)).toBe(2);
    expect(normalizeProfileCardLevel(99)).toBe(5);
    expect(getNextProfileCardLevel(0)).toBe(1);
    expect(getNextProfileCardLevel(1)).toBe(2);
    expect(getNextProfileCardLevel(4)).toBe(5);
    expect(getNextProfileCardLevel(5)).toBeNull();
  });

  it('reads a normalized snapshot from legacy storage and derives the theme from the level', async () => {
    await AsyncStorage.multiSet([
      [PROFILE_CARD_LEVEL_KEY, '99'],
      [PROFILE_CARD_THEME_KEY, 'aurora'],
      [PROFILE_CARD_MOTION_KEY, 'elite'],
      [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'arena'],
    ]);

    await expect(getProfileCardSnapshot()).resolves.toEqual({
      level: 5,
      theme: 'legend',
      motion: 'none',
      publicFocus: 'balanced',
    });
  });

  it('returns needed shards without spending when balance is too low', async () => {
    mockGetShardsBalance.mockResolvedValue(20);

    await expect(upgradeProfileCardLevel()).resolves.toEqual({
      ok: false,
      reason: 'insufficient',
      need: PROFILE_CARD_UPGRADE_COST - 20,
      balance: 20,
    });
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('spends 200 shards and upgrades the base card to Phraseman Pro', async () => {
    mockGetShardsBalance.mockResolvedValueOnce(PROFILE_CARD_UPGRADE_COST).mockResolvedValueOnce(0);

    await expect(upgradeProfileCardLevel()).resolves.toEqual({
      ok: true,
      level: 1,
      balance: 0,
    });
    expect(mockSpendShards).toHaveBeenCalledWith(PROFILE_CARD_UPGRADE_COST, 'profile_card_upgrade');
    await expect(AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY)).resolves.toBe('1');
    await expect(AsyncStorage.getItem(PROFILE_CARD_THEME_KEY)).resolves.toBe('gold');
    await expect(AsyncStorage.getItem(PROFILE_CARD_MOTION_KEY)).resolves.toBe('none');
    await expect(AsyncStorage.getItem(PROFILE_CARD_PUBLIC_FOCUS_KEY)).resolves.toBe('balanced');
    expect(emitAppEvent).toHaveBeenCalledWith('xp_changed');
  });

  it('charges the ladder price of the NEXT level, not the first one', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '1');
    mockGetShardsBalance.mockResolvedValueOnce(PROFILE_CARD_LEVEL_COSTS[2]).mockResolvedValueOnce(0);

    await expect(upgradeProfileCardLevel()).resolves.toEqual({
      ok: true,
      level: 2,
      balance: 0,
    });
    expect(mockSpendShards).toHaveBeenCalledWith(PROFILE_CARD_LEVEL_COSTS[2], 'profile_card_upgrade');
    await expect(AsyncStorage.getItem(PROFILE_CARD_THEME_KEY)).resolves.toBe('emerald');
  });

  it('does not offer a paid upgrade after Legend (V)', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '5');

    await expect(upgradeProfileCardLevel()).resolves.toEqual({ ok: false, reason: 'max' });
    expect(mockSpendShards).not.toHaveBeenCalled();
  });
});
