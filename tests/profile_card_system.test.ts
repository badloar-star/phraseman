import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import { getShardsBalance, spendShards } from '../app/shards_system';
import {
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
  canUseProfileCardMotion,
  canUseProfileCardPublicFocus,
  canUseProfileCardTheme,
  getNextProfileCardLevel,
  getProfileCardSnapshot,
  normalizeProfileCardLevel,
  setProfileCardTheme,
  upgradeProfileCardLevel,
} from '../app/profile_card_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
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
  it('normalizes levels and reports next upgrade level', () => {
    expect(normalizeProfileCardLevel(-3)).toBe(0);
    expect(normalizeProfileCardLevel(2.9)).toBe(2);
    expect(normalizeProfileCardLevel(99)).toBe(5);
    expect(getNextProfileCardLevel(0)).toBe(1);
    expect(getNextProfileCardLevel(5)).toBeNull();
  });

  it('enforces feature gates by card level', () => {
    expect(canUseProfileCardTheme(1, 'gold')).toBe(false);
    expect(canUseProfileCardTheme(2, 'gold')).toBe(true);
    expect(canUseProfileCardMotion(2, 'gleam')).toBe(false);
    expect(canUseProfileCardMotion(3, 'gleam')).toBe(true);
    expect(canUseProfileCardPublicFocus(3, 'xp')).toBe(false);
    expect(canUseProfileCardPublicFocus(4, 'xp')).toBe(true);
  });

  it('reads a normalized snapshot from storage', async () => {
    await AsyncStorage.multiSet([
      [PROFILE_CARD_LEVEL_KEY, '99'],
      [PROFILE_CARD_THEME_KEY, 'aurora'],
      [PROFILE_CARD_MOTION_KEY, 'elite'],
      [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'arena'],
    ]);

    await expect(getProfileCardSnapshot()).resolves.toEqual({
      level: 5,
      theme: 'aurora',
      motion: 'elite',
      publicFocus: 'arena',
    });
  });

  it('rejects locked theme changes below CARD II', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '1');

    await expect(setProfileCardTheme('gold')).rejects.toThrow('profile_card_theme_locked');
    await expect(AsyncStorage.getItem(PROFILE_CARD_THEME_KEY)).resolves.toBeNull();
  });

  it('returns needed shards without spending when balance is too low', async () => {
    mockGetShardsBalance.mockResolvedValue(20);

    await expect(upgradeProfileCardLevel()).resolves.toEqual({
      ok: false,
      reason: 'insufficient',
      need: 30,
      balance: 20,
    });
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('spends shards and upgrades CARD 0 to CARD I', async () => {
    mockGetShardsBalance.mockResolvedValueOnce(50).mockResolvedValueOnce(0);

    await expect(upgradeProfileCardLevel()).resolves.toEqual({
      ok: true,
      level: 1,
      balance: 0,
    });
    expect(mockSpendShards).toHaveBeenCalledWith(50, 'profile_card_upgrade');
    await expect(AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY)).resolves.toBe('1');
    expect(emitAppEvent).toHaveBeenCalledWith('xp_changed');
  });

  it('unlocks the default gold theme when upgrading to CARD II', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '1');
    mockGetShardsBalance.mockResolvedValueOnce(100).mockResolvedValueOnce(0);

    await expect(upgradeProfileCardLevel()).resolves.toMatchObject({ ok: true, level: 2 });
    await expect(AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY)).resolves.toBe('2');
    await expect(AsyncStorage.getItem(PROFILE_CARD_THEME_KEY)).resolves.toBe('gold');
  });
});
