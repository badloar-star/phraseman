/**
 * D51: миграция «Подарки → монеты» поверх НАСТОЯЩЕГО рунного кошелька.
 *
 * Проверяет то, что фейк не докажет: офлайн-зачисление ложится в outbox
 * кошелька, баланс виден сразу, а крах между операциями и повторный запуск не
 * дают ни одной лишней руны (кошелёк схлопывает тот же requestId).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
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

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};
let visibleProgress: { stars: number; starsEarnedTotal: number };

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

function deps(options: { crashAtOp?: number } = {}): GiftsToCoinsDeps {
  let calls = 0;
  return {
    now: () => Date.parse('2026-09-24T12:00:00.000Z'),
    isEnabled: () => true,
    readDailyJourneyPending: async () => [],
    applyPlus: async () => true,
    enqueueCoins: async ({ token, requestId, giftId }) => {
      const index = calls;
      calls += 1;
      await enqueueLevelSpinStarGrant({
        token, requestId, lane: 'base', giftId, promotionEligibility: 'excluded_compensation',
      }, { syncNow: false });
      // Крах ПОСЛЕ записи в кошелёк, но ДО отметки в журнале миграции —
      // худший случай: повтор отправит тот же requestId ещё раз.
      if (options.crashAtOp === index) throw new Error('simulated_crash_after_wallet_write');
    },
    syncCoins: async () => {},
    acknowledgePaidSpin: async () => {},
    cancelExpiringPush: async () => {},
    sendReport: async () => {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
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
  beginAccountGeneration('owner-real');
});

afterEach(() => {
  jest.restoreAllMocks();
});

function seedSpins(count: number): void {
  const credits = Array.from({ length: count }, (_, index) => ({
    id: `local_spin_v1_${String(index + 2).padStart(3, '0')}`, level: index + 2,
  }));
  storage['local_level_spin_state_v1:owner-real'] = JSON.stringify({
    owner: 'owner-real', credits,
    issuedLevels: credits.map((credit) => credit.level),
    issuedCreditIds: credits.map((credit) => credit.id),
    activeReceipt: null, closedRequestIds: [], lessonSpinMisses: 0,
  });
}

test('офлайн: монеты сразу в балансе и в outbox кошелька, без сети', async () => {
  // 7 спинов × 130 = 910 → stars_500 + 250 + 100 + 50 + 10 (5 операций).
  seedSpins(7);
  await expect(runGiftsToCoinsMigration({ trigger: 'offline', deps: deps() })).resolves.toBe('done');
  const token = captureAccountGeneration();
  expect((await readUnifiedLevelSpinStars(token)).balance).toBe(910);
  const outbox = JSON.parse(storage[levelSpinStarGrantOutboxKey('owner-real')] ?? '[]') as {
    requestId: string; promotionEligibility?: string; amount: number;
  }[];
  expect(outbox).toHaveLength(5);
  expect(outbox.every((operation) => operation.requestId.startsWith('g2c1_'))).toBe(true);
  expect(outbox.every((operation) => operation.promotionEligibility === 'excluded_compensation')).toBe(true);
});

test('регресс: вторая выдача после операции с promotionEligibility не считается битой', async () => {
  // До 2026-09-24 hasValidFingerprint проверял отпечаток БЕЗ promotionEligibility,
  // и любая вторая выдача рун падала с level_spin_star_operation_corrupt.
  const token = captureAccountGeneration();
  await enqueueLevelSpinStarGrant({
    token, requestId: 'dailyjourney_regress_0001', lane: 'base', giftId: 'stars_250', promotionEligibility: 'gameplay',
  }, { syncNow: false });
  await expect(enqueueLevelSpinStarGrant({
    token, requestId: 'dailyjourney_regress_0002', lane: 'base', giftId: 'stars_50', promotionEligibility: 'excluded_compensation',
  }, { syncNow: false })).resolves.toBeUndefined();
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('owner-real')] ?? '[]')).toHaveLength(2);
});

test('крах после записи в кошелёк + повтор + третий запуск = ровно одна выплата', async () => {
  seedSpins(7);
  await expect(runGiftsToCoinsMigration({ trigger: 'crash', deps: deps({ crashAtOp: 2 }) }))
    .resolves.toBe('credit_failed');
  await expect(runGiftsToCoinsMigration({ trigger: 'resume', deps: deps() })).resolves.toBe('done');
  await expect(runGiftsToCoinsMigration({ trigger: 'again', deps: deps() })).resolves.toBe('already_done');
  const token = captureAccountGeneration();
  expect((await readUnifiedLevelSpinStars(token)).balance).toBe(910);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('owner-real')] ?? '[]')).toHaveLength(5);
});
