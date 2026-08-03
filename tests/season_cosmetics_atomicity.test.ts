import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';
import {
  grantSeasonAuraStage,
  SEASON_COSMETICS_KEY,
} from '../app/season_cosmetics';
import {
  AVATAR_AURA_OWNED_KEY,
  USER_AVATAR_AURA_KEY,
} from '../constants/avatar_auras';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

describe('season cosmetics account-safe persistence', () => {
  beforeEach(async () => {
    storage.__reset?.();
    jest.clearAllMocks();
    ensureAccountGeneration('season-cosmetics-test-user');
  });

  it('serializes concurrent aura grants without losing ownership', async () => {
    await Promise.all([grantSeasonAuraStage(1), grantSeasonAuraStage(2)]);

    const state = JSON.parse(String(await AsyncStorage.getItem(SEASON_COSMETICS_KEY)));
    const owned = JSON.parse(String(await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY)));
    expect(state.auraStages).toEqual([1, 2]);
    expect(owned['aura-season-1-stage-1']).toBe(true);
    expect(owned['aura-season-1-stage-2']).toBe(true);
    expect(await AsyncStorage.getItem(USER_AVATAR_AURA_KEY)).toBe('aura-season-1-stage-2');
  });

  it('rejects a write if the account generation changes during the read', async () => {
    const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
    getItem.mockImplementationOnce(async () => {
      invalidateAccountGeneration();
      return null;
    });

    await expect(grantSeasonAuraStage(3)).rejects.toThrow('season_cosmetics_account_changed');
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it('propagates storage failure instead of pretending the reward was saved', async () => {
    const multiSet = AsyncStorage.multiSet as jest.MockedFunction<typeof AsyncStorage.multiSet>;
    multiSet.mockRejectedValueOnce(new Error('disk-full'));

    await expect(grantSeasonAuraStage(4)).rejects.toThrow('disk-full');
    expect(await AsyncStorage.getItem(SEASON_COSMETICS_KEY)).toBeNull();
  });
});
