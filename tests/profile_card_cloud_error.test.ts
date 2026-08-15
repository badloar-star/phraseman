import AsyncStorage from '@react-native-async-storage/async-storage';

// Cloud ENABLED for these tests, so upgradeProfileCardLevel takes the server path.
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const commitShardCompositeOperation = jest.fn();
const getShardsBalance = jest.fn();
jest.mock('../app/shards_system', () => ({
  getShardsBalance: (...a: unknown[]) => getShardsBalance(...a),
  commitShardCompositeOperation: (...a: unknown[]) => commitShardCompositeOperation(...a),
}));

// Firebase callable — overridable per test.
const callCf = jest.fn();
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => callCf,
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
// Deterministic stableId so the CF call payload is predictable.
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-test') }));

import { upgradeProfileCardLevel } from '../app/profile_card_system';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import { emitAppEvent } from '../app/events';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-test');
  getShardsBalance.mockResolvedValue(1000);
  commitShardCompositeOperation.mockResolvedValue({ status: 'applied', balanceBefore: 1000, balanceAfter: 800 });
});

it('does not continue an old profile purchase into a newly active account', async () => {
  let release!: (value: unknown) => void;
  commitShardCompositeOperation.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const pending = upgradeProfileCardLevel();
  for (let i = 0; i < 10 && !commitShardCompositeOperation.mock.calls.length; i += 1) await Promise.resolve();
  beginAccountGeneration('other-owner');
  release({
    status: 'applied',
    balanceBefore: 1000,
    balanceAfter: 800,
    operation: { ownerStableId: 'stable-test' },
  });

  await expect(pending).resolves.toEqual({ ok: false, reason: 'spend_failed' });
  expect(emitAppEvent).not.toHaveBeenCalled();
  expect(callCf).not.toHaveBeenCalled();
});

describe('upgradeProfileCardLevel — server is outside the ordinary purchase boundary', () => {
  it('returns a local persistence failure without calling the obsolete CF', async () => {
    callCf.mockRejectedValue(new Error('deadline-exceeded'));
    commitShardCompositeOperation.mockResolvedValue({ status: 'failed', reason: 'disk_full' });

    const res = await upgradeProfileCardLevel();

    expect(res).toEqual({ ok: false, reason: 'spend_failed', balance: 1000 });
    expect(callCf).not.toHaveBeenCalled();
  });

  it('ignores missing cloud data because cloud does not authorize the purchase', async () => {
    callCf.mockResolvedValue({ data: undefined });

    const res = await upgradeProfileCardLevel();

    expect(res).toEqual({ ok: true, level: 1, balance: 800 });
    expect(callCf).not.toHaveBeenCalled();
  });

  it('applies the exact local composite result even if a legacy CF mock exists', async () => {
    callCf.mockResolvedValue({ data: { ok: true, alreadyApplied: false, level: 1, balance: 800, spent: 200 } });

    const res = await upgradeProfileCardLevel();

    expect(res).toEqual({ ok: true, level: 1, balance: 800 });
    expect(commitShardCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: 200,
      reason: 'profile_card_upgrade',
    }));
    expect(callCf).not.toHaveBeenCalled();
  });

  it('surfaces only the local ledger insufficient result', async () => {
    commitShardCompositeOperation.mockResolvedValue({ status: 'insufficient', balance: 20 });

    const res = await upgradeProfileCardLevel();

    expect(res).toMatchObject({ ok: false, reason: 'insufficient', need: 180, balance: 20 });
    expect(callCf).not.toHaveBeenCalled();
  });
});
