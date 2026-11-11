/**
 * PM-075: повышение ранга монеты поверх НАСТОЯЩЕГО рунного кошелька.
 *
 * Денежные гарантии: двойной тап / параллельный вызов / ретрай списывают цену ровно
 * один раз; сбой записи не оставляет ни траты без ранга, ни ранга без траты; нехватка
 * и смена аккаунта ничего не трогают.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, captureAccountGeneration, type AccountGenerationToken } from '../app/account_generation';
import { COIN_RANK_TABLE } from '../app/coin_rank_table_v1';
import { __resetCoinRankCacheForTests, coinRankStateKey, peekCoinRank } from '../app/coin_rank_state_v1';
import { upgradeCoinRank } from '../app/coin_rank_upgrade_v1';
import { enqueueLevelSpinStarGrant, prepareRuneSpend, readUnifiedLevelSpinStars } from '../app/level_spin_star_grants';

const mockSyncPublicProfileSnapshot = jest.fn<Promise<void>, [Record<string, unknown>, unknown]>(async () => undefined);
const mockRecordCoinRankStory = jest.fn<Promise<unknown>, [number, number, AccountGenerationToken]>(async () => ({}));

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));
jest.mock('../app/public_profile_snapshot', () => ({
  syncPublicProfileSnapshot: (input: Record<string, unknown>, token: unknown) => mockSyncPublicProfileSnapshot(input, token),
}));
jest.mock('../modules/story_events/story_event_sources', () => ({
  recordCoinRankStory: (toRank: number, paidPrice: number, token: AccountGenerationToken) => mockRecordCoinRankStory(toRank, paidPrice, token),
}));

const OWNER = 'owner-rank';
const storage: Record<string, string> = {};
let visibleProgress: { stars: number; starsEarnedTotal: number };
let failNextMultiSet = false;
let beforeNextMultiSet: (() => void | Promise<void>) | null = null;

function wireStorage(): void {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    const beforeWrite = beforeNextMultiSet;
    beforeNextMultiSet = null;
    if (beforeWrite) await beforeWrite();
    if (failNextMultiSet) {
      failNextMultiSet = false;
      throw new Error('simulated_disk_failure');
    }
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

async function seedCoins(giftIds: string[]): Promise<void> {
  const token = captureAccountGeneration();
  for (const [index, giftId] of giftIds.entries()) {
    await enqueueLevelSpinStarGrant({
      token, requestId: `coin_rank_seed_${String(index).padStart(4, '0')}`, lane: 'base', giftId, promotionEligibility: 'excluded_compensation',
    }, { syncNow: false });
  }
}

// Трата позже зачислений: кошелёк восстанавливает базис, сортируя операции по времени;
// в тесте всё происходит в одну миллисекунду, и без сдвига трата «обгоняла» зачисления.
function later(): number {
  return Date.now() + 60_000;
}

async function balance(): Promise<number> {
  return (await readUnifiedLevelSpinStars(captureAccountGeneration())).balance;
}

function storedRank(): number {
  const raw = storage[coinRankStateKey(OWNER)];
  return raw ? (JSON.parse(raw) as { rank: number }).rank : 0;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
  failNextMultiSet = false;
  beforeNextMultiSet = null;
  __resetCoinRankCacheForTests();
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
  beginAccountGeneration(OWNER);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('таблица: 20 рангов, ранг 1 стоит 1 000, затем +100, итог 36 100', () => {
  expect(COIN_RANK_TABLE).toHaveLength(20);
  expect(COIN_RANK_TABLE[1].priceToReach).toBe(1000);
  expect(COIN_RANK_TABLE[2].priceToReach).toBe(1100);
  expect(COIN_RANK_TABLE[19].priceToReach).toBe(2800);
  expect(COIN_RANK_TABLE[19].totalSpent).toBe(36100);
  expect(COIN_RANK_TABLE[19].levelTitle).toBe('Титан');
});

test('двойной вызов с тем же рангом списывает цену ровно один раз', async () => {
  await seedCoins(['stars_1000', 'stars_1000']);
  expect(await balance()).toBe(2000);
  const token = captureAccountGeneration();

  const first = await upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() });
  const second = await upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() });

  expect(first).toMatchObject({ ok: true, status: 'upgraded', fromRank: 0, toRank: 1, price: 1000, balanceAfter: 1000 });
  expect(second).toMatchObject({ ok: true, status: 'already_applied', toRank: 1 });
  expect(await balance()).toBe(1000);
  expect(storedRank()).toBe(1);
  expect(peekCoinRank(OWNER)).toBe(1);
});

test('параллельные тапы: один повышает, второй видит уже применённое', async () => {
  await seedCoins(['stars_1000', 'stars_1000', 'stars_1000']);
  const token = captureAccountGeneration();
  const results = await Promise.all([
    upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() }),
    upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() }),
  ]);
  expect(results.filter((r) => r.ok && r.status === 'upgraded')).toHaveLength(1);
  expect(results.filter((r) => r.ok && r.status === 'already_applied')).toHaveLength(1);
  expect(await balance()).toBe(2000);
  expect(storedRank()).toBe(1);
});

test('нехватка монет: ни списания, ни ранга', async () => {
  await seedCoins(['stars_500']);
  const result = await upgradeCoinRank({ token: captureAccountGeneration(), expectedFromRank: 0, nowMs: later() });
  expect(result).toMatchObject({ ok: false, reason: 'insufficient_coins', price: 1000 });
  expect(await balance()).toBe(500);
  expect(storedRank()).toBe(0);
});

test('сбой записи: ничего не списано и не поднято, повтор проходит один раз', async () => {
  await seedCoins(['stars_1000']);
  const token = captureAccountGeneration();
  failNextMultiSet = true;
  await expect(upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() })).resolves.toMatchObject({ ok: false, reason: 'failed' });
  expect(await balance()).toBe(1000);
  expect(storedRank()).toBe(0);

  await expect(upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() })).resolves.toMatchObject({ ok: true, status: 'upgraded' });
  expect(await balance()).toBe(0);
  expect(storedRank()).toBe(1);
});

test('успешное повышение запускает best-effort публичную проекцию и не зависит от её сбоя', async () => {
  await seedCoins(['stars_1000']);
  const token = captureAccountGeneration();
  mockSyncPublicProfileSnapshot.mockRejectedValueOnce(new Error('projection_offline'));

  await expect(upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() }))
    .resolves.toMatchObject({ ok: true, status: 'upgraded', toRank: 1 });

  expect(storedRank()).toBe(1);
  expect(mockSyncPublicProfileSnapshot).toHaveBeenCalledWith(
    { reason: 'display_change' },
    token,
  );
});

test('смена аккаунта: токен старого владельца ничего не списывает', async () => {
  await seedCoins(['stars_1000']);
  const stale = captureAccountGeneration();
  beginAccountGeneration('someone-else');
  await expect(upgradeCoinRank({ token: stale, expectedFromRank: 0, nowMs: later() })).resolves.toMatchObject({ ok: false, reason: 'identity_changed' });
  beginAccountGeneration(OWNER);
  expect(await balance()).toBe(1000);
  expect(storedRank()).toBe(0);
});

test('старая трата на ранг 2 за 2 000 без записи ранга: ретрай не списывает второй раз и сохраняет фактическую цену', async () => {
  await seedCoins(['stars_1000', 'stars_1000', 'stars_1000', 'stars_1000']);
  const token = captureAccountGeneration();
  await expect(upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() }))
    .resolves.toMatchObject({ ok: true, status: 'upgraded', toRank: 1, price: 1000 });

  const legacySpend = await prepareRuneSpend({
    token,
    operationId: 'coin_rank:to_2',
    kind: 'coin_rank',
    subjectId: 'rank_2',
    price: 2000,
    createdAtMs: later(),
  });
  expect(legacySpend.ok).toBe(true);
  if (!legacySpend.ok) throw new Error('legacy spend setup failed');
  await AsyncStorage.multiSet(legacySpend.durableWrites.map(([key, value]) => [key, value]));
  expect(await balance()).toBe(1000);

  await expect(upgradeCoinRank({ token, expectedFromRank: 1, nowMs: later() }))
    .resolves.toMatchObject({ ok: true, status: 'upgraded', toRank: 2, price: 2000, balanceAfter: 1000, recovered: true });
  expect(await balance()).toBe(1000);
  expect(storedRank()).toBe(2);
  const persisted = JSON.parse(storage[coinRankStateKey(OWNER)]) as { upgrades: Array<{ toRank: number; price: number }> };
  expect(persisted.upgrades.find((entry) => entry.toRank === 2)?.price).toBe(2000);
  expect(mockRecordCoinRankStory).toHaveBeenLastCalledWith(2, 2000, token);
});

test('существующая операция с тем же id, но чужим kind: ранг не выдаётся и второго списания нет', async () => {
  await seedCoins(['stars_1000', 'stars_1000', 'stars_1000', 'stars_1000']);
  const token = captureAccountGeneration();
  await upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() });
  const mismatchedSpend = await prepareRuneSpend({
    token,
    operationId: 'coin_rank:to_2',
    kind: 'profile_card_pro',
    subjectId: 'rank_2',
    price: 2000,
    createdAtMs: later(),
  });
  expect(mismatchedSpend.ok).toBe(true);
  if (!mismatchedSpend.ok) throw new Error('mismatch setup failed');
  await AsyncStorage.multiSet(mismatchedSpend.durableWrites.map(([key, value]) => [key, value]));
  const balanceBeforeRetry = await balance();

  await expect(upgradeCoinRank({ token, expectedFromRank: 1, nowMs: later() }))
    .resolves.toMatchObject({ ok: false, reason: 'failed' });
  expect(await balance()).toBe(balanceBeforeRetry);
  expect(storedRank()).toBe(1);
});

test('существующая операция с тем же id и kind, но чужим subject: ранг не выдаётся и второго списания нет', async () => {
  await seedCoins(['stars_1000', 'stars_1000', 'stars_1000', 'stars_1000']);
  const token = captureAccountGeneration();
  await upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() });
  const mismatchedSpend = await prepareRuneSpend({
    token,
    operationId: 'coin_rank:to_2',
    kind: 'coin_rank',
    subjectId: 'rank_3',
    price: 2000,
    createdAtMs: later(),
  });
  expect(mismatchedSpend.ok).toBe(true);
  if (!mismatchedSpend.ok) throw new Error('subject mismatch setup failed');
  await AsyncStorage.multiSet(mismatchedSpend.durableWrites.map(([key, value]) => [key, value]));
  const balanceBeforeRetry = await balance();
  mockRecordCoinRankStory.mockClear();

  await expect(upgradeCoinRank({ token, expectedFromRank: 1, nowMs: later() }))
    .resolves.toMatchObject({ ok: false, reason: 'failed' });
  expect(await balance()).toBe(balanceBeforeRetry);
  expect(storedRank()).toBe(1);
  expect(mockRecordCoinRankStory).not.toHaveBeenCalled();
});

test('смена аккаунта во время проверки старой квитанции: старый ранг не дописывается и история не создаётся', async () => {
  await seedCoins(['stars_1000', 'stars_1000', 'stars_1000', 'stars_1000']);
  const token = captureAccountGeneration();
  await upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() });
  const legacySpend = await prepareRuneSpend({
    token,
    operationId: 'coin_rank:to_2',
    kind: 'coin_rank',
    subjectId: 'rank_2',
    price: 2000,
    createdAtMs: later(),
  });
  if (!legacySpend.ok) throw new Error('legacy spend setup failed');
  await AsyncStorage.multiSet(legacySpend.durableWrites.map(([key, value]) => [key, value]));
  const balanceBeforeRetry = await balance();
  mockRecordCoinRankStory.mockClear();

  const economy = jest.requireActual('../modules/phone-state/domains/economy') as typeof import('../modules/phone-state/domains/economy');
  const validateFingerprint = economy.hasValidRuneSpendFingerprint;
  jest.spyOn(economy, 'hasValidRuneSpendFingerprint').mockImplementationOnce(async (operation) => {
    beginAccountGeneration('someone-else');
    return validateFingerprint(operation);
  });

  await expect(upgradeCoinRank({ token, expectedFromRank: 1, nowMs: later() }))
    .resolves.toMatchObject({ ok: false, reason: 'identity_changed' });
  expect(mockRecordCoinRankStory).not.toHaveBeenCalled();
  beginAccountGeneration(OWNER);
  expect(await balance()).toBe(balanceBeforeRetry);
  expect(storedRank()).toBe(1);
});

test('смена аккаунта во время durable multiSet: A получает уже оплаченный composite, B не получает публикацию, историю или success', async () => {
  await seedCoins(['stars_1000']);
  const token = captureAccountGeneration();
  mockRecordCoinRankStory.mockClear();
  beforeNextMultiSet = () => { beginAccountGeneration('someone-else'); };

  await expect(upgradeCoinRank({ token, expectedFromRank: 0, nowMs: later() }))
    .resolves.toMatchObject({ ok: false, reason: 'identity_changed' });
  expect(mockRecordCoinRankStory).not.toHaveBeenCalled();

  beginAccountGeneration(OWNER);
  expect(await balance()).toBe(0);
  expect(storedRank()).toBe(1);
  await expect(upgradeCoinRank({ token: captureAccountGeneration(), expectedFromRank: 0, nowMs: later() }))
    .resolves.toMatchObject({ ok: true, status: 'already_applied', toRank: 1 });
});
