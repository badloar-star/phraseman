import { buyLeagueGroupBoost } from '../app/league_group_boosts';
import { httpsCallable } from '@react-native-firebase/functions';
import { setClubGiftFreeBoostCountFromAuthority } from '../app/club_boosts';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock('@react-native-firebase/auth', () => ({
  default: () => ({ currentUser: { uid: 'auth-a', getIdToken: jest.fn().mockResolvedValue('token') } }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn().mockResolvedValue('account-a'),
  ensureStableAuthLink: jest.fn().mockResolvedValue(true),
  getCurrentUid: jest.fn(() => 'auth-a'),
}));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/club_boosts', () => ({
  setClubGiftFreeBoostCountFromAuthority: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/shards_system', () => ({ replaceShardsBalanceLocal: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/friend_activity_likes', () => ({
  sendFriendActivityLike: jest.fn(),
  fetchTodayActivityLikeState: jest.fn().mockResolvedValue(null),
}));

const response = {
  ok: true,
  groupId: 'group-1',
  boost: {
    groupId: 'group-1', weekId: '2026-W32', leagueId: 2, multiplier: 2,
    startedAt: 1_900_000_000_000, expiresAt: 1_900_010_800_000, buyerUid: 'account-a', buyerName: 'A',
    likeEventId: 'like-1', likeCount: 0,
  },
  shardsBalance: 0,
  shardsUpdatedAtMs: 123,
  usedGiftVoucher: true,
  clubGiftFreeBoostCountAfter: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  (httpsCallable as jest.Mock).mockReturnValue(jest.fn().mockResolvedValue({ data: response }));
  (setClubGiftFreeBoostCountFromAuthority as jest.Mock).mockResolvedValue(undefined);
});

test('hydrates the exact authoritative remaining voucher count instead of decrementing stale local state', async () => {
  await expect(buyLeagueGroupBoost()).resolves.toMatchObject({ ok: true, usedGiftVoucher: true });
  expect(setClubGiftFreeBoostCountFromAuthority).toHaveBeenCalledWith(1);
});

test('surfaces local hydration failure and safely replays the active server receipt', async () => {
  (setClubGiftFreeBoostCountFromAuthority as jest.Mock)
    .mockRejectedValueOnce(new Error('disk full'))
    .mockResolvedValueOnce(undefined);

  await expect(buyLeagueGroupBoost()).resolves.toEqual({ ok: false, reason: 'unknown' });
  await expect(buyLeagueGroupBoost()).resolves.toMatchObject({ ok: true, usedGiftVoucher: true });
  expect(setClubGiftFreeBoostCountFromAuthority).toHaveBeenCalledTimes(2);
  expect(setClubGiftFreeBoostCountFromAuthority).toHaveBeenNthCalledWith(1, 1);
  expect(setClubGiftFreeBoostCountFromAuthority).toHaveBeenNthCalledWith(2, 1);
});
