import AsyncStorage from '@react-native-async-storage/async-storage';
import { addShardsLocalOnlyForPendingServerClaim, addShardsRaw, awardOneTime, getShardAchievementEligibleBalance, getShardsBalance, keepShardsBalanceLocalAtLeast, replaceShardsBalanceForAccountGeneration, replaceShardsBalanceLocal, spendShards } from '../app/shards_system';
import { __resetAccountGenerationForTests, beginAccountGeneration, captureAccountGeneration, invalidateAccountGeneration, withAccountTransitionLock } from '../app/account_generation';
import { emitAppEvent } from '../app/events';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
  __resetAccountGenerationForTests();
  beginAccountGeneration('test-owner');
});

describe('shards_system guards and one-time awards', () => {
  it('serializes stale A commit, account wipe, and B hydration without restoring A over B', async () => {
    mockStorage.shards_balance = '7';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({ updatedAtMs: 1, op: 'earn', reason: 'old' });
    beginAccountGeneration('account-a');
    const token = captureAccountGeneration();
    let release!: () => void;
    const pendingEligibleRead = new Promise<void>((resolve) => { release = resolve; });
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async () => {
      await pendingEligibleRead;
      return null;
    });

    const reconcile = replaceShardsBalanceForAccountGeneration(13, token, 'account-a', {
      updatedAtMs: 42, op: 'earn', reason: 'survey_completed',
    });
    await Promise.resolve(); await Promise.resolve();
    invalidateAccountGeneration();
    const transition = withAccountTransitionLock(async () => {
      delete mockStorage.shards_balance;
      delete mockStorage.shards_balance_meta_v1;
    });
    release();

    await expect(reconcile).resolves.toBe('stale-generation');
    expect(emitAppEvent).not.toHaveBeenCalledWith('shards_balance_updated', expect.anything());
    await transition;
    beginAccountGeneration('account-b');
    await replaceShardsBalanceLocal(22, { updatedAtMs: 50, op: 'replace', reason: 'account_b_hydration' });
    expect(mockStorage.shards_balance).toBe('22');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1)).toMatchObject({ updatedAtMs: 50, reason: 'account_b_hydration' });
  });

  it('returns already-newer without replacing a newer wallet', async () => {
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({ updatedAtMs: 100, op: 'earn', reason: 'newer' });
    beginAccountGeneration('account-a');
    await expect(replaceShardsBalanceForAccountGeneration(13, captureAccountGeneration(), 'account-a', {
      updatedAtMs: 42, op: 'earn', reason: 'survey_completed',
    })).resolves.toBe('already-newer');
    expect(mockStorage.shards_balance).toBe('80');
  });
  it('rejects non-positive spend values', async () => {
    mockStorage.shards_balance = '10';
    await expect(spendShards(0)).resolves.toBe(false);
    await expect(spendShards(-3)).resolves.toBe(false);
    await expect(spendShards(Number.NaN)).resolves.toBe(false);
    await expect(getShardsBalance()).resolves.toBe(10);
  });

  it('does not allow spending above balance', async () => {
    mockStorage.shards_balance = '2';
    await expect(spendShards(3)).resolves.toBe(false);
    await expect(getShardsBalance()).resolves.toBe(2);
  });

  it('awards one-time source only once', async () => {
    await expect(awardOneTime('diagnostic_test')).resolves.toBe(1);
    await expect(awardOneTime('diagnostic_test')).resolves.toBe(0);
    await expect(getShardsBalance()).resolves.toBe(1);
  });

  it('excludes store-purchased shards from achievement balance', async () => {
    await expect(addShardsRaw(80, 'shards_store_purchase', { skipServerAwait: true })).resolves.toBe(80);
    await expect(addShardsRaw(5, 'daily_tasks_all', { skipServerAwait: true })).resolves.toBe(5);

    await expect(getShardsBalance()).resolves.toBe(85);
    await expect(getShardAchievementEligibleBalance()).resolves.toBe(5);
  });

  it('can credit a pending server-owned claim locally without using the generic cloud earn path', async () => {
    mockStorage.shards_balance = '7';
    const token = captureAccountGeneration();
    await expect(addShardsLocalOnlyForPendingServerClaim(
      2,
      'report_reply_claim',
      token,
      'test-owner',
    )).resolves.toBe(2);
    await expect(getShardsBalance()).resolves.toBe(9);
    expect(JSON.parse(mockStorage.shards_balance_meta_v1)).toMatchObject({
      op: 'earn',
      reason: 'report_reply_claim',
    });
  });

  it('keeps a newer local wallet above a lower server-owned claim mirror', async () => {
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'offline_reward',
    });

    const token = captureAccountGeneration();
    await expect(keepShardsBalanceLocalAtLeast(
      10,
      'report_reply_claim',
      token,
      'test-owner',
    )).resolves.toBe(80);
    await expect(getShardsBalance()).resolves.toBe(80);
    expect(JSON.parse(mockStorage.shards_balance_meta_v1)).toMatchObject({
      updatedAtMs: expect.any(Number),
      op: 'replace',
      reason: 'report_reply_claim',
    });
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBeGreaterThan(2_000);
  });

  it.each([
    ['optimistic add', async (token: ReturnType<typeof captureAccountGeneration>) =>
      addShardsLocalOnlyForPendingServerClaim(5, 'report_reply_claim', token, 'account-a')],
    ['server merge', async (token: ReturnType<typeof captureAccountGeneration>) =>
      keepShardsBalanceLocalAtLeast(50, 'report_reply_claim', token, 'account-a')],
  ] as const)('does not write account A %s after a delayed read crosses to B', async (_name, run) => {
    beginAccountGeneration('account-a');
    const token = captureAccountGeneration();
    mockStorage.shards_balance = '10';
    let releaseRead!: () => void;
    const delayedRead = new Promise<void>((resolve) => { releaseRead = resolve; });
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async (key: string) => {
      await delayedRead;
      return mockStorage[key] ?? null;
    });

    const pending = run(token);
    await Promise.resolve();
    invalidateAccountGeneration();
    beginAccountGeneration('account-b');
    mockStorage.shards_balance = '7';
    releaseRead();

    await pending;
    await expect(getShardsBalance()).resolves.toBe(7);
    expect(emitAppEvent).not.toHaveBeenCalledWith('shards_balance_updated', expect.anything());
  });

  it('does not keep spent store shards excluded forever', async () => {
    await expect(addShardsRaw(80, 'shards_store_purchase', { skipServerAwait: true })).resolves.toBe(80);
    await expect(spendShards(80, 'card_pack')).resolves.toBe(true);
    await expect(addShardsRaw(100, 'daily_tasks_all', { skipServerAwait: true })).resolves.toBe(100);

    await expect(getShardsBalance()).resolves.toBe(100);
    await expect(getShardAchievementEligibleBalance()).resolves.toBe(100);
  });

  it('ignores an older server replace over a newer local shard operation', async () => {
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'daily_tasks_all',
    });

    await replaceShardsBalanceLocal(30, {
      updatedAtMs: 1_000,
      op: 'earn',
      reason: 'friend_quest_reward',
    });

    await expect(getShardsBalance()).resolves.toBe(80);
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBe(2_000);
  });

  it('applies a newer server replace even when the balance decreases after a spend', async () => {
    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'daily_tasks_all',
    });

    await replaceShardsBalanceLocal(30, {
      updatedAtMs: 3_000,
      op: 'spend',
      reason: 'friend_gift',
    });

    await expect(getShardsBalance()).resolves.toBe(30);
    expect(JSON.parse(mockStorage.shards_balance_meta_v1)).toMatchObject({
      updatedAtMs: 3_000,
      op: 'spend',
      reason: 'friend_gift',
    });
  });
});
