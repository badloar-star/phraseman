const mockProfilesCallable = jest.fn();

jest.mock('../app/referral_flags', () => ({
  isReferralCloudEnabled: () => true,
}));

jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockProfilesCallable),
}));

function profile(uid: string) {
  return {
    uid,
    displayName: uid,
    totalXp: 0,
    level: 1,
    avatar: '',
    frame: '',
    aura: '',
    profileCardLevel: 0,
    isPremium: false,
    isVip: false,
    isLifetime: false,
  };
}

describe('friends profile batch cache retention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfilesCallable.mockImplementation(async ({ uids }: { uids: string[] }) => ({
      data: {
        profiles: Object.fromEntries(uids.map((uid) => [uid, profile(uid)])),
      },
    }));
    const { invalidateFriendsProfilesBatchCache } = require('../app/friends_profiles_batch');
    invalidateFriendsProfilesBatchCache();
  });

  it('keeps at most 256 recently used public profiles instead of retaining every encountered uid', async () => {
    const { fetchFriendProfilesBatch } = require('../app/friends_profiles_batch');
    const initialUids = Array.from({ length: 256 }, (_, index) => `friend-${index}`);

    await fetchFriendProfilesBatch(initialUids);
    await fetchFriendProfilesBatch(['friend-0']); // refresh the oldest entry's recency
    await fetchFriendProfilesBatch(['friend-256']);
    await fetchFriendProfilesBatch(['friend-1']);

    // 256 initial UIDs = 3 chunks, then one new UID, then the evicted friend-1.
    expect(mockProfilesCallable).toHaveBeenCalledTimes(5);
  });
});
