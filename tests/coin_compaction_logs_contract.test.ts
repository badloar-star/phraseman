// зачем (координатор 05.10, диагноз +5000): уплотнение трат удаляет старые траты, не внося их в serverBalance, и видимый
// баланс растёт на их сумму. Этот шаг — ТОЛЬКО лог [COIN-COMPACTION]. Сторож закрепляет, что баланс после восстановления
// тот же, что до правки (утечка ещё не починена — решение владельца), и что лог показывает суммы до/после.
// Когда владелец выберет починку, ожидаемый баланс здесь меняется вместе с ней — осознанно.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'node:crypto';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  levelSpinStarProjectionKey,
  prepareRuneSpend,
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
const OWNER = 'account-a';

function exactGrant(index: number) {
  const requestId = `request${String(index).padStart(12, '0')}`;
  const operationId = `level_spin:${requestId}.base`;
  const partial = { ownerStableId: OWNER, requestId, lane: 'base' as const, giftId: 'stars_10' as const, amount: 10 as const };
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId: partial.ownerStableId, requestId, lane: partial.lane,
    deliveryToken: null, giftId: partial.giftId, amount: partial.amount, reason: 'level_spin_star_reward',
  })).digest('hex');
  return {
    schemaVersion: 'client-level-spin-star-operation.v1', operationId, ...partial,
    reason: 'level_spin_star_reward', createdAtMs: 1_800_000_000_000 + index, requestFingerprint,
    grant: { kind: 'star_credit', subjectId: operationId, payload: { requestId, lane: 'base', giftId: 'stars_10', amount: 10 } },
  };
}

async function spend(operationId: string, price: number, createdAtMs: number): Promise<number> {
  const token = captureAccountGeneration();
  const prepared = await prepareRuneSpend({ token, operationId, kind: 'coin_rank', subjectId: operationId, price, createdAtMs });
  if (!prepared.ok) throw new Error(`spend_denied:${operationId}`);
  await AsyncStorage.multiSet(prepared.durableWrites.map(([k, v]) => [k, v] as [string, string]));
  return prepared.balanceAfter;
}

function compactionLines(): string[] {
  return (console.warn as jest.Mock).mock.calls
    .filter(([first]) => first === '[COIN-COMPACTION] spends_removed')
    .map(([, payload]) => String(payload));
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration(OWNER);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
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
  (jest.requireMock('../app/phone_state_economy_bridge') as { readPhoneStateStarCreditState: jest.Mock })
    .readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  const snapshot = jest.requireMock('../app/app_snapshot_store') as { getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { stars: 0, starsEarnedTotal: 0 } }));
  snapshot.patchAppSnapshot.mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('two spends with a server basis: balance after recovery is unchanged by the logging step, and the log shows the sums', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  // У сервера есть база (serverSeq > 0) — условие, при котором уплотнение трат включается.
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 100, serverSeq: 1 });

  expect(await spend('coin_rank:to_1', 10, 1_800_000_100_000)).toBe(100);
  expect(await spend('coin_rank:to_2', 20, 1_800_000_200_000)).toBe(80);

  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  // Поведение ДО правки: старая трата (−10) удалена уплотнением, serverBalance не тронут — баланс 90, не 80.
  expect(visible.balance).toBe(90);

  const lines = compactionLines();
  expect(lines.length).toBeGreaterThanOrEqual(1);
  const payload = JSON.parse(lines[0]) as Record<string, unknown>;
  expect(payload).toMatchObject({
    serverSeq: 1,
    removedCount: 1,
    removedSum: -10,
    removed: [{ id: 'coin_rank:to_1', kind: 'coin_rank', runeDelta: -10 }],
    keptOperationId: 'coin_rank:to_2',
    serverBalanceBefore: 100,
    serverBalanceAfter: 100,
    visibleBefore: 80,
    visibleAfter: 90,
  });
  expect(lines[0]).not.toContain(OWNER);
});

test('a single spend is never removed and the block logs why it skipped', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 100, serverSeq: 1 });
  await spend('coin_rank:to_1', 10, 1_800_000_100_000);

  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(visible.balance).toBe(100);
  expect(compactionLines()).toHaveLength(0);
  const skip = (console.log as jest.Mock).mock.calls.find(([first]) => first === '[COIN-COMPACTION] skip');
  expect(skip).toBeDefined();
  expect(JSON.parse(String(skip?.[1]))).toMatchObject({ reason: 'only_newest_spend', serverSeq: 1, spends: 1 });
});
