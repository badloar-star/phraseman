/**
 * PM-059 (D15): миграция «остаток жемчуга → монеты 1:10» поверх НАСТОЯЩИХ
 * журнала жемчуга (client_shard_operation_ledger через shards_system) и рунного
 * кошелька (level_spin_star_grants). Фейк не докажет главное: жемчуг списан
 * ровно один раз, монеты зачислены ровно один раз — при повторе, крахе,
 * офлайне, смене аккаунта и параллельной миграции подарков.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import { clientShardLedgerStateStorageKey, CLIENT_SHARD_OPERATION_PREFIX } from '../app/economy/client_shard_operation_ledger';
import {
  __giftsToCoinsTestHooks,
  runGiftsToCoinsMigration,
  type GiftsToCoinsDeps,
} from '../app/gifts_to_coins_migration_v1';
import {
  enqueueLevelSpinStarGrant,
  levelSpinStarGrantOutboxKey,
  readUnifiedLevelSpinStars,
} from '../app/level_spin_star_grants';
import {
  __pearlsToCoinsTestHooks,
  defaultPearlsToCoinsDeps,
  pearlsToCoins,
  pearlsToCoinsReceiptKey,
  pearlsToCoinsWalKey,
  runPearlsToCoinsMigration,
  type PearlsToCoinsDeps,
  type PearlsToCoinsReportPayload,
  type PearlsToCoinsWal,
} from '../app/pearls_to_coins_migration_v1';

let mockOwner = 'owner-real';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => mockOwner) }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(async () => {}),
  bumpLifetimeShardsSpent: jest.fn(async () => {}),
}));
jest.mock('../app/economy/economy_daily_stats_reporter', () => ({ reportEconomyOperationApplied: jest.fn() }));
jest.mock('../app/phone_state_economy_bridge', () => ({
  ...jest.requireActual('../app/phone_state_economy_bridge'),
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};
let visibleProgress: { stars: number; starsEarnedTotal: number };
const NOW = Date.parse('2026-09-24T12:00:00.000Z');

function wireStorage(): void {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
}

type DepsOptions = Readonly<{
  enabled?: boolean;
  reports?: PearlsToCoinsReportPayload[];
  offline?: boolean;
  crashAfterDebit?: boolean;
  crashAtCreditOp?: number;
  switchAccountAtCreditOp?: number;
  staleBalanceOnce?: number;
}>;

/** Боевые зависимости (реальные журнал жемчуга и кошелёк) + управляемые сбои. */
function deps(options: DepsOptions = {}): PearlsToCoinsDeps {
  const real = defaultPearlsToCoinsDeps();
  let creditCalls = 0;
  let staleServed = false;
  return {
    ...real,
    now: () => NOW,
    isEnabled: () => options.enabled ?? true,
    readPearlBalance: async (token) => {
      const snapshot = await real.readPearlBalance(token);
      // Снимок, прочитанный ДО параллельной траты: баланс уже меньше.
      if (options.staleBalanceOnce !== undefined && !staleServed && snapshot.status === 'ok') {
        staleServed = true;
        return { ...snapshot, balance: options.staleBalanceOnce };
      }
      return snapshot;
    },
    debitPearls: async (input) => {
      const result = await real.debitPearls(input);
      // Крах ПОСЛЕ списания, но ДО отметки 'debited' в журнале миграции.
      if (options.crashAfterDebit) throw new Error('simulated_crash_after_debit');
      return result;
    },
    enqueueCoins: async (input) => {
      const index = creditCalls;
      creditCalls += 1;
      if (options.switchAccountAtCreditOp === index) {
        beginAccountGeneration('owner-other');
        mockOwner = 'owner-other';
      }
      await real.enqueueCoins(input);
      if (options.crashAtCreditOp === index) throw new Error('simulated_crash_after_wallet_write');
    },
    syncCoins: async () => { if (options.offline) throw new Error('network_offline'); },
    sendReport: async (payload) => {
      if (options.offline) throw new Error('network_offline');
      options.reports?.push(payload);
    },
  };
}

function giftDeps(): GiftsToCoinsDeps {
  return {
    now: () => NOW,
    isEnabled: () => true,
    readDailyJourneyPending: async () => [],
    applyPlus: async () => true,
    enqueueCoins: async ({ token, requestId, giftId }) => {
      await enqueueLevelSpinStarGrant({
        token, requestId, lane: 'base', giftId, promotionEligibility: 'excluded_compensation',
      }, { syncNow: false });
    },
    syncCoins: async () => {},
    acknowledgePaidSpin: async () => {},
    cancelExpiringPush: async () => {},
    sendReport: async () => {},
  };
}

function wal(owner = 'owner-real'): PearlsToCoinsWal {
  return JSON.parse(storage[pearlsToCoinsWalKey(owner)] ?? 'null') as PearlsToCoinsWal;
}

function outbox(owner = 'owner-real'): { requestId: string; amount: number; promotionEligibility?: string }[] {
  return JSON.parse(storage[levelSpinStarGrantOutboxKey(owner)] ?? '[]');
}

function pearlCoinsInWallet(owner = 'owner-real'): number {
  return outbox(owner).filter((op) => op.requestId.startsWith('p2c1_')).reduce((sum, op) => sum + op.amount, 0);
}

function ledgerBalance(owner = 'owner-real'): number {
  return (JSON.parse(storage[clientShardLedgerStateStorageKey(owner)] ?? '{"balance":null}') as { balance: number }).balance;
}

function debitOps(owner = 'owner-real'): number {
  const prefix = `${CLIENT_SHARD_OPERATION_PREFIX}${encodeURIComponent(owner)}:`;
  return Object.keys(storage).filter((key) => key.startsWith(prefix)).length;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
  mockOwner = 'owner-real';
  __pearlsToCoinsTestHooks.resetScheduler();
  __giftsToCoinsTestHooks.resetScheduler();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  wireStorage();
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as {
    readPhoneStateStarCreditState: jest.Mock; commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
  };
  bridge.readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);
  const snapshot = jest.requireMock('../app/app_snapshot_store') as {
    getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock;
  };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { ...visibleProgress } }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: typeof visibleProgress }) => {
    const patch = updater({ progress: { ...visibleProgress } });
    if (patch.progress) visibleProgress = { ...visibleProgress, ...patch.progress };
  });
  __resetAccountGenerationForTests();
  beginAccountGeneration('owner-real');
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('формула: ×10, целые кратны 10, ноль и мусор = 0', () => {
  expect(pearlsToCoins(1)).toBe(10);
  expect(pearlsToCoins(37)).toBe(370);
  expect(pearlsToCoins(0)).toBe(0);
  expect(pearlsToCoins(-5)).toBe(0);
  expect(pearlsToCoins(1.5)).toBe(0);
});

test('полный путь: жемчуг в 0, монеты ×10 в кошельке, квитанция и история сохранены', async () => {
  storage.shards_balance = '37';
  const reports: PearlsToCoinsReportPayload[] = [];
  await expect(runPearlsToCoinsMigration({ trigger: 'test', deps: deps({ reports }) })).resolves.toBe('done');
  expect(storage.shards_balance).toBe('0');
  expect(ledgerBalance()).toBe(0);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(370);
  expect(outbox().every((op) => op.promotionEligibility === 'excluded_compensation')).toBe(true);
  const current = wal();
  expect(current.phase).toBe('done');
  expect(current.history).toEqual([expect.objectContaining({
    run: 1, outcome: 'done', pearls: 37, totalCoins: 370, operationId: current.operationId, finishedAtMs: NOW,
  })]);
  const receipt = JSON.parse(storage[pearlsToCoinsReceiptKey('owner-real', current.hash)] ?? 'null') as Record<string, unknown>;
  expect(receipt).toEqual(expect.objectContaining({ pearls: 37, rate: 10, totalCoins: 370, operationId: current.operationId }));
  expect(reports).toEqual([expect.objectContaining({ run: 1, pearls: 37, totalCoins: 370, lifetimePearls: 37, lifetimeCoins: 370 })]);
  expect(current.report.status).toBe('sent');
});

test('двойной запуск: второй прогон ничего не списывает и не начисляет', async () => {
  storage.shards_balance = '120';
  await expect(runPearlsToCoinsMigration({ trigger: 'first', deps: deps() })).resolves.toBe('done');
  const opsAfterFirst = debitOps();
  await expect(runPearlsToCoinsMigration({ trigger: 'second', deps: deps() })).resolves.toBe('already_done');
  expect(debitOps()).toBe(opsAfterFirst);
  expect(pearlCoinsInWallet()).toBe(1_200);
  expect(ledgerBalance()).toBe(0);
});

test('параллельный вызов того же процесса отбивается как busy', async () => {
  storage.shards_balance = '5';
  const [first, second] = await Promise.all([
    runPearlsToCoinsMigration({ trigger: 'a', deps: deps() }),
    runPearlsToCoinsMigration({ trigger: 'b', deps: deps() }),
  ]);
  expect([first, second].sort()).toEqual(['busy', 'done']);
  expect(pearlCoinsInWallet()).toBe(50);
});

test('офлайн: монеты сразу в outbox кошелька, отчёт ждёт сети', async () => {
  storage.shards_balance = '44';
  await expect(runPearlsToCoinsMigration({ trigger: 'offline', deps: deps({ offline: true }) })).resolves.toBe('done');
  expect(pearlCoinsInWallet()).toBe(440);
  expect(wal().report).toEqual(expect.objectContaining({ status: 'pending', attempts: 1 }));
  const reports: PearlsToCoinsReportPayload[] = [];
  await expect(runPearlsToCoinsMigration({ trigger: 'online', deps: deps({ reports }) })).resolves.toBe('already_done');
  expect(reports).toHaveLength(1);
  expect(wal().report.status).toBe('sent');
  expect(pearlCoinsInWallet()).toBe(440);
});

test('крах после списания до отметки: повтор не списывает второй раз и доводит монеты', async () => {
  storage.shards_balance = '80';
  await expect(runPearlsToCoinsMigration({ trigger: 'crash', deps: deps({ crashAfterDebit: true }) }))
    .resolves.toBe('debit_failed');
  expect(wal().phase).toBe('planned');
  expect(ledgerBalance()).toBe(0);
  expect(pearlCoinsInWallet()).toBe(0);
  // Флаг выключили между крахом и повтором — начатый прогон всё равно доводится.
  await expect(runPearlsToCoinsMigration({ trigger: 'resume', deps: deps({ enabled: false }) })).resolves.toBe('done');
  expect(ledgerBalance()).toBe(0);
  expect(debitOps()).toBe(1);
  expect(pearlCoinsInWallet()).toBe(800);
});

test('крах после записи в кошелёк: повтор схлопывается по requestId', async () => {
  // 1234 × 10 = 12 340 → 2000×6 + 250 + 50 + 20 + 20 (10 операций).
  storage.shards_balance = '1234';
  await expect(runPearlsToCoinsMigration({ trigger: 'crash', deps: deps({ crashAtCreditOp: 2 }) }))
    .resolves.toBe('credit_failed');
  expect(wal()).toEqual(expect.objectContaining({ phase: 'debited', creditedOps: 2 }));
  await expect(runPearlsToCoinsMigration({ trigger: 'resume', deps: deps() })).resolves.toBe('done');
  expect(pearlCoinsInWallet()).toBe(12_340);
  const ids = outbox().map((op) => op.requestId);
  expect(new Set(ids).size).toBe(ids.length);
});

test('жемчуг потрачен между чтением и списанием: ничего лишнего, перепланирование на факт', async () => {
  storage.shards_balance = '30';
  // Снимок «видел 50», а на деле 30 → списание 50 = insufficient → новый план на 30.
  await expect(runPearlsToCoinsMigration({ trigger: 'race', deps: deps({ staleBalanceOnce: 50 }) })).resolves.toBe('done');
  expect(ledgerBalance()).toBe(0);
  expect(pearlCoinsInWallet()).toBe(300);
  expect(wal().history.map((entry) => [entry.outcome, entry.pearls])).toEqual([['aborted', 50], ['done', 30]]);
  expect(wal().run).toBe(2);
});

test('смена аккаунта посреди зачисления: пауза, чужой аккаунт не тронут, возврат доводит', async () => {
  storage.shards_balance = '321';
  await expect(runPearlsToCoinsMigration({ trigger: 'switch', deps: deps({ switchAccountAtCreditOp: 1 }) }))
    .resolves.toBe('account_changed');
  expect(wal()).toEqual(expect.objectContaining({ phase: 'debited', creditedOps: 1 }));
  expect(storage[pearlsToCoinsWalKey('owner-other')]).toBeUndefined();
  expect(storage[levelSpinStarGrantOutboxKey('owner-other')]).toBeUndefined();
  // На другом аккаунте жемчуга нет — прогон ничего не пишет.
  storage.shards_balance = '0';
  await expect(runPearlsToCoinsMigration({ trigger: 'other', deps: deps() })).resolves.toBe('nothing_to_migrate');
  expect(storage[pearlsToCoinsWalKey('owner-other')]).toBeUndefined();
  mockOwner = 'owner-real';
  beginAccountGeneration('owner-real');
  await expect(runPearlsToCoinsMigration({ trigger: 'back', deps: deps() })).resolves.toBe('done');
  expect(pearlCoinsInWallet()).toBe(3_210);
  expect(ledgerBalance()).toBe(0);
});

test('параллельно с миграцией подарков: обе проходят, кошелёк получает обе суммы без потерь', async () => {
  storage.shards_balance = '25';
  const credits = Array.from({ length: 7 }, (_, index) => ({
    id: `local_spin_v1_${String(index + 2).padStart(3, '0')}`, level: index + 2,
  }));
  storage['local_level_spin_state_v1:owner-real'] = JSON.stringify({
    owner: 'owner-real', credits,
    issuedLevels: credits.map((credit) => credit.level),
    issuedCreditIds: credits.map((credit) => credit.id),
    activeReceipt: null, closedRequestIds: [], lessonSpinMisses: 0,
  });
  const [gifts, pearls] = await Promise.all([
    runGiftsToCoinsMigration({ trigger: 'parallel', deps: giftDeps() }),
    runPearlsToCoinsMigration({ trigger: 'parallel', deps: deps() }),
  ]);
  expect([gifts, pearls]).toEqual(['done', 'done']);
  // 7 спинов × 130 = 910 и 25 жемчуга × 10 = 250.
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(1_160);
  const ids = outbox().map((op) => op.requestId);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ledgerBalance()).toBe(0);
});

test('выключатель: новый план не начинается, жемчуг цел', async () => {
  storage.shards_balance = '60';
  await expect(runPearlsToCoinsMigration({ trigger: 'off', deps: deps({ enabled: false }) })).resolves.toBe('flag_off');
  expect(storage.shards_balance).toBe('60');
  expect(storage[pearlsToCoinsWalKey('owner-real')]).toBeUndefined();
});

test('новый жемчуг после миграции — второй прогон с другими ключами, история копится', async () => {
  storage.shards_balance = '10';
  await expect(runPearlsToCoinsMigration({ trigger: 'first', deps: deps() })).resolves.toBe('done');
  const firstOp = wal().operationId;
  const { commitShardCreditOperation } = await import('../app/shards_system');
  await expect(commitShardCreditOperation({
    amount: 10, reason: 'referral_spin_pearls', operationId: 'test_new_pearls_0001',
    grant: { kind: 'ordinary_personal_reward', subjectId: 'test' },
  })).resolves.toEqual(expect.objectContaining({ status: 'applied' }));
  const reports: PearlsToCoinsReportPayload[] = [];
  await expect(runPearlsToCoinsMigration({ trigger: 'second', deps: deps({ reports }) })).resolves.toBe('done');
  expect(wal().operationId).not.toBe(firstOp);
  expect(pearlCoinsInWallet()).toBe(200);
  expect(reports[0]).toEqual(expect.objectContaining({ run: 2, pearls: 10, lifetimePearls: 20, lifetimeCoins: 200 }));
});

test('два устройства с одинаковым журналом получают одинаковые ключи (дубль схлопнется)', async () => {
  storage.shards_balance = '77';
  const seed = { ...storage };
  await runPearlsToCoinsMigration({ trigger: 'device1', deps: deps() });
  const device1 = { op: wal().operationId, ids: outbox().map((op) => op.requestId) };
  Object.keys(storage).forEach((key) => delete storage[key]);
  Object.assign(storage, seed);
  await runPearlsToCoinsMigration({ trigger: 'device2', deps: deps() });
  expect(wal().operationId).toBe(device1.op);
  expect(outbox().map((op) => op.requestId)).toEqual(device1.ids);
});

test('ноль и долг: ничего не пишется', async () => {
  await expect(runPearlsToCoinsMigration({ trigger: 'zero', deps: deps() })).resolves.toBe('nothing_to_migrate');
  expect(storage[pearlsToCoinsWalKey('owner-real')]).toBeUndefined();
  expect(__pearlsToCoinsTestHooks.parseLedgerSnapshot(JSON.stringify({
    schemaVersion: 'client-shard-ledger-state.v1', ownerStableId: 'o', balance: -40, revision: 3, headOperationId: 'x_op_0001',
  }), null, 'o')).toEqual({ status: 'ok', balance: -40, anchor: 'r3:x_op_0001' });
});

test('битый журнал миграции не перезапускается с нуля', async () => {
  storage.shards_balance = '15';
  storage[pearlsToCoinsWalKey('owner-real')] = '{broken';
  await expect(runPearlsToCoinsMigration({ trigger: 'corrupt', deps: deps() })).resolves.toBe('wal_corrupt');
  expect(storage.shards_balance).toBe('15');
  expect(pearlCoinsInWallet()).toBe(0);
});
