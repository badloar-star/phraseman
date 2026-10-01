import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

const callable = jest.fn();
const httpsCallable = jest.fn(() => callable);
const enqueueLevelSpinStarGrant = jest.fn(async (_grant?: unknown, _options?: unknown) => undefined);
const emitAppEvent = jest.fn();
// PM-047 (владелец): grantLocalReportRewardSpins больше не импортируется из
// report_reward_bundle.ts — спин закрывается молча логом [SPIN-RETIRED],
// без вызова local_level_spins. Мок local_level_spins оставлен пустым на
// случай, если модуль всё ещё резолвится транзитивно другими импортами.
let currentUid = 'account-a';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/events', () => ({ emitAppEvent }));
jest.mock('../app/level_spin_star_grants', () => ({ enqueueLevelSpinStarGrant }));
// зачем: D70/D104 — жемчужная часть набора больше не начисляется; модуль экономики
// жемчуга не должен даже импортироваться.
jest.mock('../app/shards_system', () => { throw new Error('report_reward_bundle must not import shards_system'); });
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
  normalizeReportRewardBundle,
  REPORT_REWARD_TIERS,
  REPORT_REWARD_TIERS_V1,
  reportRewardCoins,
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
  enqueueLevelSpinStarGrant.mockResolvedValue(undefined);
});

it('delivers all rune (coin) lanes, never pearls, and retires the spins portion without crediting it', async () => {
  await expect(claimReportRewardBundle('reply-1', REPORT_REWARD_TIERS.minor)).resolves.toEqual({
    status: 'claimed',
    rewardBundle: REPORT_REWARD_TIERS.minor,
  });

  expect(callable).toHaveBeenCalledWith({ messageId: 'reply-1' });
  expect(enqueueLevelSpinStarGrant.mock.calls.map(([grant]) => grant)).toEqual([
    expect.objectContaining({ requestId: 'report_reward_reply-1', lane: 'base', giftId: 'stars_250' }),
    expect.objectContaining({ requestId: 'report_reward_reply-1', lane: 'premium', giftId: 'stars_50' }),
  ]);
  // PM-047: спин больше не начисляется — REPORT_REWARD_TIERS.minor.spins === 1,
  // но claim обязан закрыться без ошибки и без внешнего вызова на выдачу спина.
  expect(Object.keys(storage)).toHaveLength(0);
});

// зачем: Q4 (координатор 01.10) — награда за жалобу в монетах (v2) идёт тем же
// путём выдачи монет; старые v1-награды (неполученные) обязаны забираться как раньше.
it.each([
  ['serious', 600, [['base', 'stars_500'], ['premium', 'stars_100']]],
  ['critical', 1000, [['base', 'stars_1000']]],
] as const)('credits a v2 %s bundle as %d coins through the coin wallet path', async (severity, coins, lanes) => {
  const bundle = REPORT_REWARD_TIERS[severity];
  expect(bundle).toEqual({ version: 2, severity, coins });
  callable.mockResolvedValueOnce({ data: { rewardBundle: bundle, alreadyClaimed: false } });
  await expect(claimReportRewardBundle(`reply-v2-${severity}`, bundle)).resolves.toEqual({ status: 'claimed', rewardBundle: bundle });
  expect(enqueueLevelSpinStarGrant.mock.calls.map(([grant]) => grant)).toEqual(
    lanes.map(([lane, giftId]) => expect.objectContaining({ requestId: `report_reward_reply-v2-${severity}`, lane, giftId })),
  );
  expect(Object.keys(storage)).toHaveLength(0);
});

it('still claims an old unclaimed v1 bundle and credits its runes as coins', async () => {
  const bundle = REPORT_REWARD_TIERS_V1.minor;
  expect(normalizeReportRewardBundle({ ...bundle })).toBe(bundle);
  expect(reportRewardCoins(bundle)).toBe(300);
  callable.mockResolvedValueOnce({ data: { rewardBundle: bundle, alreadyClaimed: false } });
  await expect(claimReportRewardBundle('reply-v1', bundle)).resolves.toEqual({ status: 'claimed', rewardBundle: bundle });
  expect(enqueueLevelSpinStarGrant.mock.calls.map(([grant]) => grant)).toEqual([
    expect.objectContaining({ requestId: 'report_reward_reply-v1', lane: 'base', giftId: 'stars_250' }),
    expect.objectContaining({ requestId: 'report_reward_reply-v1', lane: 'premium', giftId: 'stars_50' }),
  ]);
});

it('rejects tampered v2 coin amounts and mixed fields', () => {
  expect(() => normalizeReportRewardBundle({ version: 2, severity: 'minor', coins: 3000 })).toThrow('report_reward_bundle_invalid');
  expect(() => normalizeReportRewardBundle({ version: 1, severity: 'minor', coins: 300 })).toThrow('report_reward_bundle_invalid');
  expect(normalizeReportRewardBundle({ version: 2, severity: 'serious', coins: 600 })).toBe(REPORT_REWARD_TIERS.serious);
});

it('refuses to credit when the server returns a different bundle version', async () => {
  callable.mockResolvedValueOnce({ data: { rewardBundle: REPORT_REWARD_TIERS.minor, alreadyClaimed: false } });
  await expect(claimReportRewardBundle('reply-mismatch', REPORT_REWARD_TIERS_V1.minor)).rejects.toThrow('report_reward_server_mismatch');
  expect(enqueueLevelSpinStarGrant).not.toHaveBeenCalled();
});

it('resumes after a rune failure without calling the server twice', async () => {
  enqueueLevelSpinStarGrant.mockRejectedValueOnce(new Error('temporary rune failure'));

  await expect(claimReportRewardBundle('reply-retry', REPORT_REWARD_TIERS.minor))
    .rejects.toThrow('temporary rune failure');
  expect(callable).toHaveBeenCalledTimes(1);

  await expect(resumePendingReportRewardBundleClaims()).resolves.toEqual({ resolved: 1, pending: 0 });
  expect(callable).toHaveBeenCalledTimes(1);
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
  expect(enqueueLevelSpinStarGrant).not.toHaveBeenCalled();
  expect(Object.keys(storage)).toEqual(['report_reward_bundle_claims_v1:account-a']);
});
