import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAccountGeneration } from '../app/account_generation';
import { unlockRandomCustomAvatarGift } from '../app/level_gift_system';
import { applySeasonRewardLocal } from '../app/season_reward_apply';
import { SEASON_COSMETICS_KEY } from '../app/season_cosmetics';
import { CUSTOM_AVATAR_OWNED_KEY } from '../constants/custom_avatars';
import { CUSTOM_AVATAR_GIFT_REPLAY_KEY } from '../constants/customization_storage_keys';

jest.mock('../app/cloud_sync', () => ({ syncToCloud: jest.fn(async () => {}) }));

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

describe('Season custom-avatar reward idempotency', () => {
  beforeEach(() => {
    storage.__reset?.();
    jest.clearAllMocks();
  });

  it('replays the same avatar for the same gift without writing a second grant', async () => {
    const token = ensureAccountGeneration('season-avatar-idempotency-user');
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const options = { idempotencyKey: 'season:season-1:12:free' };
      const first = await unlockRandomCustomAvatarGift(token, options);
      const second = await unlockRandomCustomAvatarGift(token, options);

      expect(first?.id).toBeTruthy();
      expect(second?.id).toBe(first?.id);
      expect(first?.replayed).toBe(false);
      expect(second?.replayed).toBe(true);
      const owned = JSON.parse(String(await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY)));
      expect(Object.keys(owned)).toEqual([first?.id]);
      expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
    } finally {
      random.mockRestore();
    }
  });

  it('does not replay another account result for the same season gift id', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const accountA = ensureAccountGeneration('season-avatar-account-a');
      const first = await unlockRandomCustomAvatarGift(accountA, { idempotencyKey: 'season:same-gift' });
      const accountB = ensureAccountGeneration('season-avatar-account-b');
      const second = await unlockRandomCustomAvatarGift(accountB, { idempotencyKey: 'season:same-gift' });

      expect(first?.replayed).toBe(false);
      expect(second?.replayed).toBe(false);
      expect(second?.id).not.toBe(first?.id);
      expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(2);
    } finally {
      random.mockRestore();
    }
  });

  it('keeps both avatar ownership and the season grant count at one on retry', async () => {
    ensureAccountGeneration('season-avatar-reward-user');
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const first = await applySeasonRewardLocal({ kind: 'custom_avatar' }, 'season-1:12:free');
      const retry = await applySeasonRewardLocal({ kind: 'custom_avatar' }, 'season-1:12:free');

      expect(first.ok).toBe(true);
      expect(retry.ok).toBe(true);
      expect(retry.avatarUnlock?.id).toBe(first.avatarUnlock?.id);
      expect(retry.avatarUnlock?.replayed).toBe(true);
      const state = JSON.parse(String(await AsyncStorage.getItem(SEASON_COSMETICS_KEY)));
      const owned = JSON.parse(String(await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY)));
      expect(state.customAvatarGrants).toBe(1);
      expect(Object.keys(owned)).toEqual([first.avatarUnlock?.id]);
      const firstAtomicPairs = (AsyncStorage.multiSet as jest.Mock).mock.calls[0]?.[0] as [string, string][];
      expect(firstAtomicPairs.map(([key]) => key)).toEqual(expect.arrayContaining([
        CUSTOM_AVATAR_OWNED_KEY,
        CUSTOM_AVATAR_GIFT_REPLAY_KEY,
        SEASON_COSMETICS_KEY,
      ]));
    } finally {
      random.mockRestore();
    }
  });
});
