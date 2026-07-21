import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { addShardsRaw, claimDailyTasksAllShardsReward, getShardAchievementEligibleBalance, getShardsBalance, loadShardsFromCloud, SHARD_REWARDS, spendShards } from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn((_functions, name: string) => {
    // K3: shardsApplyDelta симулирует серверную атомарную транзакцию над
    // fs.__testState.userShards — единственный источник истины. Клиент присылает
    // положительную величину + type; знак ставит «сервер».
    if (name === 'shardsApplyDelta') {
      return jest.fn(async (payload: { delta: number; type: 'earn' | 'spend'; opId: string }) => {
        const fs = require('@react-native-firebase/firestore').default as any;
        fs.__testState.appliedOpIds = fs.__testState.appliedOpIds || new Set<string>();
        const current = fs.__testState.userShards ?? 0;
        if (fs.__testState.appliedOpIds.has(payload.opId)) {
          return { data: { ok: true, alreadyApplied: true, insufficient: false, balance: current, shardsUpdatedAtMs: fs.__testState.userShardsUpdatedAtMs } };
        }
        const signed = payload.type === 'earn' ? payload.delta : -payload.delta;
        const next = current + signed;
        if (next < 0) {
          return { data: { ok: false, alreadyApplied: false, insufficient: true, balance: current, shardsUpdatedAtMs: fs.__testState.userShardsUpdatedAtMs } };
        }
        const shardsUpdatedAtMs = Date.now();
        fs.__testState.appliedOpIds.add(payload.opId);
        fs.__testState.userShards = next;
        fs.__testState.userShardsUpdatedAtMs = shardsUpdatedAtMs;
        fs.__testState.userShardsUpdatedOp = payload.type;
        return { data: { ok: true, alreadyApplied: false, insufficient: false, balance: next, shardsUpdatedAtMs } };
      });
    }
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
const pendingKey = (dayKey: string) => `daily_tasks_all_shards_pending_${dayKey}`;
const flushAsync = async (turns = 6) => {
  for (let i = 0; i < turns; i += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  (firestore as any).__resetTestState?.();
  __resetAccountGenerationForTests();
  // stableId поколения должен совпадать с моком getCanonicalUserId ('uid-1') —
  // иначе applyShardDeltaToCloud резолвит 'stale-generation' и earn/spend дают 0.
  beginAccountGeneration('uid-1');
  // Экономика «Монеты и Звёзды» (docs/plans/2026-07-20) обнулила игровые начисления
  // монет (в проде daily_tasks_all = 0). Тесты проверяют механику claim, а не каталог,
  // поэтому поднимаем награду до 1, как было до миграции.
  SHARD_REWARDS.daily_tasks_all = 1;
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
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

afterEach(() => {
  SHARD_REWARDS.daily_tasks_all = 0;
});

describe('claimDailyTasksAllShardsReward (optimistic claim + Cloud Function sync)', () => {
  it('marks claim locally at once, then reconciles balance with the server; second call is no-op', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 4;

    mockStorage.shards_balance = '2';

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(true);
    expect(mockStorage['daily_tasks_all_shards_2026-08-10']).toBe('1');
    expect(mockStorage[pendingKey('2026-08-10')]).toBe('1');
    expect(mockStorage.shards_balance).toBe('3');

    await flushAsync();
    expect(mockStorage.shards_balance).toBe('5');
    expect(mockStorage[pendingKey('2026-08-10')]).toBeUndefined();

    await expect(claimDailyTasksAllShardsReward('2026-08-10')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('5');
  });

  it('still gives immediate local success when the server already has the claim, then aligns to server balance', async () => {
    // Регрессия: без локального маркера кнопка «Забрать» зависала активной и
    // каждый повтор показывал «Осколки не загрузились» (баг-репорты daily_tasks).
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = true;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;

    mockStorage.shards_balance = '1';

    await expect(claimDailyTasksAllShardsReward('2026-08-11')).resolves.toBe(true);
    // Маркер выставлен → UI садится в «получено», повторов больше нет.
    expect(mockStorage['daily_tasks_all_shards_2026-08-11']).toBe('1');
    expect(mockStorage[pendingKey('2026-08-11')]).toBe('1');
    expect(mockStorage.shards_balance).toBe('2');
    await flushAsync();
    // Баланс ПОДТЯГИВАЕТСЯ к серверному значению (10), а не остаётся локальным (1).
    // Это фикс рассинхрона «осколки уменьшились/не совпадают» из баг-репортов:
    // при alreadyClaimed сервер — источник правды, локальный баланс выравнивается.
    expect(mockStorage.shards_balance).toBe('10');
    expect(mockStorage[pendingKey('2026-08-11')]).toBeUndefined();
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

    await expect(claimDailyTasksAllShardsReward('2026-08-12')).resolves.toBe(true);

    expect(mockStorage['daily_tasks_all_shards_2026-08-12']).toBe('1');
    expect(mockStorage.shards_balance).toBe('81');
    await flushAsync();
    expect(mockStorage.shards_balance).toBe('81');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBeGreaterThan(2_000);
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
    expect(mockStorage.shards_balance).toBe('81');
    await flushAsync();
    expect(mockStorage.shards_balance).toBe('81');
    expect(JSON.parse(mockStorage.shards_balance_meta_v1).updatedAtMs).toBeGreaterThan(9_000_000_000_000);
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

  // Регресс: пропажа осколков после restore/обновления (баг Vitalii, shard_log 540→501).
  // restoreFromCloud (cloud_sync.ts) кладёт СТАРОЕ теневое `progress.shards_balance`
  // в локаль, НЕ трогая метку. Метка остаётся «свежей» (op:'replace', ts новее облака),
  // из-за чего обычный timestamp-guard пропускал восстановление, и заниженное число
  // закреплялось. Авторитетный облачный баланс (канал A) СТРОГО ВЫШЕ → должен победить.
  it('restores authoritative higher cloud balance over a restore-clobbered local value', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 540; // канал A: реальный заработанный баланс
    fs.__testState.userShardsUpdatedAtMs = 1_000; // облачная метка отстала (фоновый sync)
    fs.__testState.userShardsUpdatedOp = 'earn';
    fs.__testState.userShardsUpdatedReason = 'arena_win';

    // Локаль испорчена restore'ом: старое теневое число + метка-артефакт (op:'replace').
    mockStorage.shards_balance = '501';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 9_999, // «новее» облака, но это не реальная операция
      op: 'replace',
      reason: 'cloud_restore',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('540');
    expect(fs.__testState.userShards).toBe(540); // и в облако заниженное НЕ записали
  });

  // Обратная защита: настоящую свежую локальную трату (op:'spend') НЕ роняем,
  // даже если облако выше (облако просто ещё не догнало списание).
  it('keeps a genuine newer local spend even when cloud balance is higher', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 100;
    fs.__testState.userShardsUpdatedAtMs = 1_000;
    fs.__testState.userShardsUpdatedOp = 'earn';
    fs.__testState.userShardsUpdatedReason = 'legacy';

    mockStorage.shards_balance = '70';
    mockStorage.shards_balance_meta_v1 = JSON.stringify({
      updatedAtMs: 2_000,
      op: 'spend',
      reason: 'card_pack',
    });

    await loadShardsFromCloud();

    expect(mockStorage.shards_balance).toBe('70');
    expect(fs.__testState.userShards).toBe(70); // локальная трата ушла в облако
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

describe('core shard cloud mirror: server transaction is authoritative (K3)', () => {
  // K3: прежний «стале-облако vs свежая локаль» рассинхрон устранён структурно.
  // Нет двух путей записи (canonical `shards` + теневой progress.shards_balance
  // наперегонки) — earn/spend идут ЕДИНОЙ атомарной транзакцией shardsApplyDelta.
  // Сервер читает свой баланс и прибавляет дельту; клиент зеркалит результат.
  // Прежний client-side max(cloud, local)-guard больше не нужен и не участвует.
  it('earn applies the delta atomically on the server balance and mirrors it locally', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    // Серверный (авторитетный) баланс = 80. Локальный кэш неважен — сервер решает.
    fs.__testState.userShards = 80;
    mockStorage.shards_balance = '80';

    await expect(addShardsRaw(2, 'achievement:test')).resolves.toBe(2);

    // Транзакция: 80 + 2 = 82. Локаль зеркалит.
    expect(fs.__testState.userShards).toBe(82);
    expect(mockStorage.shards_balance).toBe('82');
  });

  it('spend applies the delta atomically on the server balance and mirrors it locally', async () => {
    const fs = firestore as any;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 80;
    mockStorage.shards_balance = '80';

    await expect(spendShards(10, 'card_pack')).resolves.toBe(true);

    // Транзакция: 80 − 10 = 70. Локаль зеркалит.
    expect(fs.__testState.userShards).toBe(70);
    expect(mockStorage.shards_balance).toBe('70');
  });
});
