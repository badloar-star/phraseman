import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { addShardsRaw, claimDailyTasksAllShardsReward, getShardAchievementEligibleBalance, getShardsBalance, loadShardsFromCloud, spendShards } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn((_functions, name: string) => {
    if (name !== 'dailyTasksAllShardsClaim') {
      return jest.fn(async () => ({ data: {} }));
    }
    return jest.fn(async () => {
      const fs = require('@react-native-firebase/firestore').default as any;
      if (fs.__testState.rewardClaimExists) {
        return {
          data: {
            alreadyClaimed: true,
            newBalance: fs.__testState.userShards ?? 0,
            shardsUpdatedAtMs: fs.__testState.userShardsUpdatedAtMs,
          },
        };
      }
      const next = (fs.__testState.userShards ?? 0) + 1;
      const shardsUpdatedAtMs = Date.now();
      fs.__testState.rewardClaimExists = true;
      fs.__testState.userShards = next;
      fs.__testState.userShardsUpdatedAtMs = shardsUpdatedAtMs;
      fs.__testState.userShardsUpdatedOp = 'earn';
      fs.__testState.userShardsUpdatedReason = 'daily_tasks_all';
      return { data: { alreadyClaimed: false, newBalance: next, shardsUpdatedAtMs } };
    });
  }),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'uid-1'),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  (firestore as any).__resetTestState?.();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('claimDailyTasksAllShardsReward (Firestore transaction)', () => {
  it('commits claim + balance once; second call is no-op', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 4;

    mockStorage.shards_balance = '2';

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(true);
    expect(mockStorage['daily_tasks_all_shards_2026-08-10']).toBe('1');
    expect(mockStorage.shards_balance).toBe('5');

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('5');
  });

  it('returns false but writes the local marker when the server already has the claim', async () => {
    // Регрессия: без локального маркера кнопка «Забрать» зависала активной и
    // каждый повтор показывал «Осколки не загрузились» (баг-репорты daily_tasks).
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = true;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;

    mockStorage.shards_balance = '1';

    await expect(claimDailyTasksAllShardsReward('2026-08-11')).resolves.toBe(false);
    // Маркер выставлен → UI садится в «получено», повторов больше нет.
    expect(mockStorage['daily_tasks_all_shards_2026-08-11']).toBe('1');
    // Баланс ПОДТЯГИВАЕТСЯ к серверному значению (10), а не остаётся локальным (1).
    // Это фикс рассинхрона «осколки уменьшились/не совпадают» из баг-репортов:
    // при alreadyClaimed сервер — источник правды, локальный баланс выравнивается.
    expect(mockStorage.shards_balance).toBe('10');
  });

  it('does not let an older already-claimed server mirror lower a newer local wallet', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = true;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;
    fs.__testState.userShardsUpdatedAtMs = 1_000;

    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'newer_local_reward',
    });

    await expect(claimDailyTasksAllShardsReward('2026-08-12')).resolves.toBe(false);

    expect(mockStorage['daily_tasks_all_shards_2026-08-12']).toBe('1');
    expect(mockStorage.shards_balance).toBe('80');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBe(2_000);
  });

  it('does not let an older granted server mirror lower a newer local wallet', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;

    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 9_000_000_000_000,
      op: 'earn',
      reason: 'newer_local_reward',
    });

    await expect(claimDailyTasksAllShardsReward('2026-08-13')).resolves.toBe(true);

    expect(mockStorage['daily_tasks_all_shards_2026-08-13']).toBe('1');
    expect(mockStorage.shards_balance).toBe('80');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBe(9_000_000_000_000);
  });
});

describe('loadShardsFromCloud balance freshness', () => {
  it('does not restore an older cloud balance over a newer local spend', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 100;
    fs.__testState.userShardsUpdatedAtMs = 1_000;
    fs.__testState.userShardsUpdatedOp = 'earn';
    fs.__testState.userShardsUpdatedReason = 'legacy';

    mockStorage.shards_balance = '50';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'spend',
      reason: 'card_pack',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('50');
    expect(fs.__testState.userShards).toBe(50);
    expect(fs.__testState.userShardsUpdatedOp).toBe('spend');
  });

  it('applies a newer cloud balance to local storage', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 20;
    fs.__testState.userShardsUpdatedAtMs = 3_000;
    fs.__testState.userShardsUpdatedOp = 'spend';
    fs.__testState.userShardsUpdatedReason = 'lesson_replay';

    mockStorage.shards_balance = '50';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'earn',
      reason: 'lesson_perfect',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('20');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBe(3_000);
  });

  it('tracks webhook-granted store purchase shards as non-achievement balance', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 80;
    fs.__testState.userShardsUpdatedAtMs = 3_000;
    fs.__testState.userShardsUpdatedOp = 'earn';
    fs.__testState.userShardsUpdatedReason = 'shards_store_purchase';

    mockStorage.shards_balance = '0';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'replace',
      reason: 'server_replace',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('80');
    await expect(getShardAchievementEligibleBalance()).resolves.toBe(0);
  });
});

describe('spendShards local-vs-cloud reconciliation', () => {
  it('reconciles an inflated local balance down to cloud when cloud is insufficient', async () => {
    // Баг «есть осколки, но не купить карточки»: локально показывалось 30,
    // на сервере реально 2. Покупка за 10 должна отклониться, а локальный
    // баланс выровняться под облачный, чтобы UI не показывал фантомные осколки.
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 2;

    mockStorage.shards_balance = '30';

    await expect(spendShards(10, 'card_pack')).resolves.toBe(false);
    // Облако не тронуто.
    expect(fs.__testState.userShards).toBe(2);
    // Локальный баланс выровнен под облачный.
    expect(mockStorage.shards_balance).toBe('2');
    await expect(getShardsBalance()).resolves.toBe(2);
  });

  it('spends against cloud when cloud has enough, ignoring a stale-low local balance', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 50;

    mockStorage.shards_balance = '5';

    await expect(spendShards(10, 'card_pack')).resolves.toBe(true);
    expect(fs.__testState.userShards).toBe(40);
    expect(mockStorage.shards_balance).toBe('40');
  });
});

describe('addShardsRaw local-first mode', () => {
  it('uses the local balance immediately when skipServerAwait is requested', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 99;
    mockStorage.shards_balance = '4';

    await expect(addShardsRaw(2, 'achievement:test', { skipServerAwait: true })).resolves.toBe(2);

    expect(mockStorage.shards_balance).toBe('6');
  });
});

describe('core shard cloud mirror freshness', () => {
  it('does not let an older cloud earn response lower a newer local wallet', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;

    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 9_000_000_000_000,
      op: 'earn',
      reason: 'newer_local_reward',
    });

    await expect(addShardsRaw(2, 'achievement:test')).resolves.toBe(2);

    expect(fs.__testState.userShards).toBe(12);
    expect(mockStorage.shards_balance).toBe('80');
  });

  it('does not let an older cloud spend response lower a newer local wallet', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 50;

    mockStorage.shards_balance = '80';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 9_000_000_000_000,
      op: 'earn',
      reason: 'newer_local_reward',
    });

    await expect(spendShards(10, 'card_pack')).resolves.toBe(true);

    expect(fs.__testState.userShards).toBe(40);
    expect(mockStorage.shards_balance).toBe('80');
  });
});
