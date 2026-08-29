import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

const callable = jest.fn();
const httpsCallable = jest.fn(() => callable);
const commitConfirmedExternalShardEvent = jest.fn(async (_event?: unknown) => ({ status: 'applied' }));
const enqueueLevelSpinStarGrant = jest.fn(async (_grant?: unknown, _options?: unknown) => undefined);
const grantLocalReportRewardSpins = jest.fn(async (_messageId?: string, _count?: number, _token?: unknown) => true);
const emitAppEvent = jest.fn();
let currentUid = 'account-a';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/events', () => ({ emitAppEvent }));
jest.mock('../app/level_spin_star_grants', () => ({ enqueueLevelSpinStarGrant }));
jest.mock('../app/local_level_spins', () => ({ grantLocalReportRewardSpins }));
jest.mock('../app/shards_system', () => ({ commitConfirmedExternalShardEvent }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => currentUid),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable,
}));

import {
  claimReportRewardBundle,
  REPORT_REWARD_TIERS,
  resumePendingReportRewardBundleClaims,
} from '../app/report_reward_bundle';

const storage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('account-a');
  currentUid = 'account-a';
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  callable.mockResolvedValue({
    data: { rewardBundle: REPORT_REWARD_TIERS.minor, alreadyClaimed: false },
  });
  commitConfirmedExternalShardEvent.mockResolvedValue({ status: 'applied' });
  enqueueLevelSpinStarGrant.mockResolvedValue(undefined);
  grantLocalReportRewardSpins.mockResolvedValue(true);
});

it('delivers pearls, all rune lanes and spins only after the server confirms the exact bundle', async () => {
  await expect(claimReportRewardBundle('reply-1', REPORT_REWARD_TIERS.minor)).resolves.toEqual({
    status: 'claimed',
    rewardBundle: REPORT_REWARD_TIERS.minor,
  });

  expect(callable).toHaveBeenCalledWith({ messageId: 'reply-1' });
  expect(commitConfirmedExternalShardEvent).toHaveBeenCalledWith(expect.objectContaining({
    source: 'report_reply',
    eventId: 'reply-1',
    delta: 1,
    expectedOwnerStableId: 'account-a',
  }));
  expect(enqueueLevelSpinStarGrant.mock.calls.map(([grant]) => grant)).toEqual([
    expect.objectContaining({ requestId: 'report_reward_reply-1', lane: 'base', giftId: 'stars_250' }),
    expect.objectContaining({ requestId: 'report_reward_reply-1', lane: 'premium', giftId: 'stars_50' }),
  ]);
  expect(grantLocalReportRewardSpins).toHaveBeenCalledWith('reply-1', 1, expect.any(Object));
  expect(Object.keys(storage)).toHaveLength(0);
});

it('resumes after a rune failure without calling the server or crediting pearls twice', async () => {
  enqueueLevelSpinStarGrant.mockRejectedValueOnce(new Error('temporary rune failure'));

  await expect(claimReportRewardBundle('reply-retry', REPORT_REWARD_TIERS.minor))
    .rejects.toThrow('temporary rune failure');
  expect(callable).toHaveBeenCalledTimes(1);
  expect(commitConfirmedExternalShardEvent).toHaveBeenCalledTimes(1);
  expect(grantLocalReportRewardSpins).not.toHaveBeenCalled();

  await expect(resumePendingReportRewardBundleClaims()).resolves.toEqual({ resolved: 1, pending: 0 });
  expect(callable).toHaveBeenCalledTimes(1);
  expect(commitConfirmedExternalShardEvent).toHaveBeenCalledTimes(1);
  expect(grantLocalReportRewardSpins).toHaveBeenCalledTimes(1);
  expect(Object.keys(storage)).toHaveLength(0);
});

it('never credits account A after the server responds to a claim while account B is active', async () => {
  let resolveCallable!: (value: { data: unknown }) => void;
  callable.mockImplementationOnce(() => new Promise((resolve) => {
    resolveCallable = resolve;
  }));

  const claim = claimReportRewardBundle('reply-switch', REPORT_REWARD_TIERS.minor);
  for (let index = 0; index < 20 && callable.mock.calls.length === 0; index += 1) await Promise.resolve();
  expect(callable).toHaveBeenCalledWith({ messageId: 'reply-switch' });

  invalidateAccountGeneration();
  currentUid = 'account-b';
  beginAccountGeneration('account-b');
  resolveCallable({ data: { rewardBundle: REPORT_REWARD_TIERS.minor, alreadyClaimed: false } });

  await expect(claim).rejects.toThrow('report_reward_account_changed');
  expect(commitConfirmedExternalShardEvent).not.toHaveBeenCalled();
  expect(enqueueLevelSpinStarGrant).not.toHaveBeenCalled();
  expect(grantLocalReportRewardSpins).not.toHaveBeenCalled();
  expect(Object.keys(storage)).toEqual(['report_reward_bundle_claims_v1:account-a']);
});
