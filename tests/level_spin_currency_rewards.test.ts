import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { ALL_LEVEL_GIFT_DEFS, applyGift } from '../app/level_gift_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/community_packs/functionsClient', () => ({
  callLevelGiftReservationAction: jest.fn(), callLevelSpinDeliveryAction: jest.fn(),
  callLevelSpinActivatePackGift: jest.fn(), callLevelGiftReserve: jest.fn(),
  callLevelGiftActivatePackGift: jest.fn(), callFlashcardPackGiftRedeem: jest.fn(),
}));
jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }),
  withXpAccountOperationQueue: jest.fn(async (_token, work) => work({})),
}));
jest.mock('../app/shards_system', () => ({
  commitShardCreditOperation: jest.fn().mockResolvedValue({
    status: 'applied', balanceBefore: 0, balanceAfter: 5, operation: { ownerStableId: 'account-a' },
  }),
}));
jest.mock('../app/level_spin_star_grants', () => ({
  enqueueLevelSpinStarGrant: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({
  primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn(), loadOwnedPackIds: jest.fn().mockResolvedValue([]),
  addOwnedPackId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false, SPANISH_UI_LOCALE_ENABLED: true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const storage: Record<string, string> = {};

function gift(id: string) {
  const value = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`missing gift ${id}`);
  return value;
}

async function applyLocal(id: string, occurrenceId = `level-spin:request-${id}:base`) {
  return applyGift(gift(id), 'Test', 3, 5, jest.fn(), {
    localOnly: true,
    accountToken: captureAccountGeneration(),
    occurrenceId,
  });
}

async function applyServer(id: string) {
  const requestId = 'request0000000001';
  return applyGift({
    ...gift(id),
    spinRewardReceipt: { requestId, lane: 'base', giftId: id },
  }, 'Test', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => keys.map((key) => [key, storage[key] ?? null]));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const { callLevelSpinDeliveryAction } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinDeliveryAction: jest.Mock;
  };
  callLevelSpinDeliveryAction.mockImplementation(async (input: { action: string; selectedGiftId: string }) => (
    input.action === 'begin_delivery'
      ? { status: 'acquired', giftId: input.selectedGiftId }
      : input.action === 'complete_delivery'
        ? { status: 'claimed' }
        : { status: 'released' }
  ));
});

test.each([
  ['xp_500', 'registerXP', '../app/xp_manager'],
  ['pearls_5', 'commitShardCreditOperation', '../app/shards_system'],
  ['stars_10', 'enqueueLevelSpinStarGrant', '../app/level_spin_star_grants'],
] as const)('server-backed %s propagates the active transition lease to %s', async (giftId, method, modulePath) => {
  const target = (jest.requireMock(modulePath) as Record<string, jest.Mock>)[method];
  await expect(applyServer(giftId)).resolves.toMatchObject({ success: true });
  expect(target).toHaveBeenCalledTimes(1);
  const call = target.mock.calls[0];
  const lease = method === 'registerXP'
    ? call[5]?.accountTransitionLockLease
    : method === 'commitShardCreditOperation'
      ? call[0]?.accountTransitionLockLease
      : call[1]?.accountTransitionLockLease;
  expect(lease).toBeDefined();
});

test('server-backed delivery cannot apply account A reward after switching to B during network await', async () => {
  let resolveBegin!: (value: unknown) => void;
  const { callLevelSpinDeliveryAction } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinDeliveryAction: jest.Mock;
  };
  callLevelSpinDeliveryAction.mockImplementationOnce(() => new Promise((resolve) => { resolveBegin = resolve; }));
  const pending = applyServer('xp_500');
  for (let index = 0; index < 10 && callLevelSpinDeliveryAction.mock.calls.length === 0; index += 1) await Promise.resolve();
  beginAccountGeneration('account-b');
  resolveBegin({ status: 'acquired', giftId: 'xp_500' });
  await expect(pending).resolves.toMatchObject({ success: false });
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  expect(registerXP).not.toHaveBeenCalled();
});

test.each([250, 500, 1_000, 3_000, 5_000, 10_000, 25_000, 50_000])(
  'spin XP %i uses the exact occurrence-bound XP event',
  async (amount) => {
    const result = await applyLocal(`xp_${amount}`);
    const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
    expect(result.success).toBe(true);
    expect(registerXP).toHaveBeenCalledWith(
      amount, 'achievement_reward', 'Test', 'ru', undefined,
      expect.objectContaining({
        eventId: expect.stringContaining(`xp_${amount}`),
        payload: expect.objectContaining({ giftId: `xp_${amount}`, occurrenceId: `level-spin:request-xp_${amount}:base` }),
      }),
    );
  },
);

test.each([5, 10, 20, 50, 100, 250, 500])(
  'spin pearl reward %i is one client-authoritative composite credit',
  async (amount) => {
    const occurrenceId = `level-spin:pearl-${amount}:base`;
    expect((await applyLocal(`pearls_${amount}`, occurrenceId)).success).toBe(true);
    expect((await applyLocal(`pearls_${amount}`, occurrenceId)).success).toBe(true);
    const { commitShardCreditOperation } = jest.requireMock('../app/shards_system') as { commitShardCreditOperation: jest.Mock };
    expect(commitShardCreditOperation).toHaveBeenCalledTimes(2);
    const first = commitShardCreditOperation.mock.calls[0][0];
    const second = commitShardCreditOperation.mock.calls[1][0];
    expect(first).toEqual(expect.objectContaining({
      amount,
      reason: 'level_spin_pearls',
      operationId: expect.stringMatching(/^level-spin-pearl:[a-f0-9]{40}$/),
      grant: expect.objectContaining({
        kind: 'level_spin_reward',
        payload: { giftId: `pearls_${amount}`, amount, occurrenceId },
      }),
    }));
    expect(second.operationId).toBe(first.operationId);
  },
);

test.each([3, 7] as const)(
  'spin Plus %i days stacks once per occurrence and replays safely',
  async (days) => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const occurrenceId = `level-spin:plus-${days}:base`;
    expect((await applyLocal(`plus_days_${days}`, occurrenceId)).success).toBe(true);
    const firstUntil = Number(storage.vip_until);
    expect(firstUntil).toBe(1_800_000_000_000 + days * 86_400_000);
    expect((await applyLocal(`plus_days_${days}`, occurrenceId)).success).toBe(true);
    expect(Number(storage.vip_until)).toBe(firstUntil);
    expect((await applyLocal(`plus_days_${days}`, `${occurrenceId}-second`)).success).toBe(true);
    expect(Number(storage.vip_until)).toBe(firstUntil + days * 86_400_000);
  },
);

test('spin Plus preserves lifetime VIP instead of replacing it with a finite expiry', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  storage.vip_active = 'true';
  storage.vip_plan = 'lifetime';
  storage.vip_until = '0';
  const { vipSnapshotStorageKey } = jest.requireActual('../app/premium_vip_storage') as typeof import('../app/premium_vip_storage');
  storage[vipSnapshotStorageKey('account-a')] = JSON.stringify({
    version: 1,
    ownerStableId: 'account-a',
    updatedAt: 1_799_000_000_000,
    values: {
      vip_active: 'true', vip_plan: 'lifetime', vip_from: '0', vip_until: '0',
      vip_admin_override: 'true', vip_admin_grant_at: '',
    },
  });

  expect((await applyLocal('plus_days_3', 'level-spin:lifetime-plus:base')).success).toBe(true);
  expect(storage.vip_plan).toBe('lifetime');
  expect(storage.vip_until).toBe('0');
});

test('spin Plus repairs a lifetime plan that carries a stale finite expiry', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  storage.vip_active = 'true';
  storage.vip_plan = 'lifetime';
  storage.vip_until = '1800604800000';
  const { vipSnapshotStorageKey } = jest.requireActual('../app/premium_vip_storage') as typeof import('../app/premium_vip_storage');
  storage[vipSnapshotStorageKey('account-a')] = JSON.stringify({
    version: 1,
    ownerStableId: 'account-a',
    updatedAt: 1_799_000_000_000,
    values: {
      vip_active: 'true', vip_plan: 'lifetime', vip_from: '0', vip_until: '1800604800000',
      vip_admin_override: 'true', vip_admin_grant_at: '',
    },
  });

  expect((await applyLocal('plus_days_3', 'level-spin:lifetime-repair:base')).success).toBe(true);
  expect(storage.vip_plan).toBe('lifetime');
  expect(storage.vip_until).toBe('0');
});

test('prepared finite Plus replay cannot overwrite lifetime granted after the crash', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  const occurrenceId = 'level-spin:finite-before-lifetime:base';
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('fault_before_vip_write'));
  await expect(applyLocal('plus_days_3', occurrenceId)).resolves.toMatchObject({ success: false });

  const { vipSnapshotStorageKey } = jest.requireActual('../app/premium_vip_storage') as typeof import('../app/premium_vip_storage');
  storage[vipSnapshotStorageKey('account-a')] = JSON.stringify({
    version: 1, ownerStableId: 'account-a', updatedAt: 1_800_000_000_001,
    values: {
      vip_active: 'true', vip_plan: 'lifetime', vip_from: '0', vip_until: '0',
      vip_admin_override: 'true', vip_admin_grant_at: '',
    },
  });
  storage.vip_active = 'true';
  storage.vip_plan = 'lifetime';
  storage.vip_until = '0';
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });

  await expect(applyLocal('plus_days_3', occurrenceId)).resolves.toMatchObject({ success: true });
  expect(storage.vip_plan).toBe('lifetime');
  expect(storage.vip_until).toBe('0');
});
