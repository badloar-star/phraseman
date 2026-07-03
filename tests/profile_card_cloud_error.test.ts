import AsyncStorage from '@react-native-async-storage/async-storage';

// Cloud ENABLED for these tests, so upgradeProfileCardLevel takes the server path.
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const spendShards = jest.fn();
const getShardsBalance = jest.fn();
jest.mock('../app/shards_system', () => ({
  getShardsBalance: (...a: unknown[]) => getShardsBalance(...a),
  spendShards: (...a: unknown[]) => spendShards(...a),
  forceSyncShardsToCloud: jest.fn(async () => {}),
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

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getShardsBalance.mockResolvedValue(1000);
  spendShards.mockResolvedValue(true);
});

describe('upgradeProfileCardLevel — cloud error must not double-charge', () => {
  it('returns cloud_error and never calls local spendShards when the CF throws', async () => {
    // CF committed-or-not is unknown (network/timeout). Local spend would double-charge.
    callCf.mockRejectedValue(new Error('deadline-exceeded'));

    const res = await upgradeProfileCardLevel();

    expect(res).toEqual({ ok: false, reason: 'cloud_error' });
    expect(spendShards).not.toHaveBeenCalled();
  });

  it('returns cloud_error and does not spend locally when the CF returns no data', async () => {
    callCf.mockResolvedValue({ data: undefined });

    const res = await upgradeProfileCardLevel();

    expect(res).toEqual({ ok: false, reason: 'cloud_error' });
    expect(spendShards).not.toHaveBeenCalled();
  });

  it('applies the server result (and never spends locally) on a successful CF call', async () => {
    callCf.mockResolvedValue({ data: { ok: true, alreadyApplied: false, level: 1, balance: 800, spent: 200 } });

    const res = await upgradeProfileCardLevel();

    expect(res).toEqual({ ok: true, level: 1, balance: 800 });
    expect(spendShards).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem('profile_card_level')).resolves.toBe('1');
    // Must forward the client's stableId so the CF reads the same shard doc.
    expect(callCf).toHaveBeenCalledWith(expect.objectContaining({ stableId: 'stable-test' }));
    // Must push local shards to cloud first, so the server sees the real balance
    // (fixes "shop opens despite having shards" when wallets drifted).
    const { forceSyncShardsToCloud } = require('../app/shards_system');
    expect(forceSyncShardsToCloud).toHaveBeenCalled();
  });

  it('surfaces server insufficient without spending locally', async () => {
    callCf.mockResolvedValue({ data: { ok: false, reason: 'insufficient', level: 0, balance: 20, cost: 200 } });

    const res = await upgradeProfileCardLevel();

    expect(res).toMatchObject({ ok: false, reason: 'insufficient', need: 180, balance: 20 });
    expect(spendShards).not.toHaveBeenCalled();
  });
});
