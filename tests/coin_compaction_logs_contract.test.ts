// зачем (координатор 05.10, диагноз +5000; вариант (в)): уплотнение трат снимало старые траты, не внося их никуда, и
// видимый баланс рос на их сумму. Теперь сумма снятых трат живёт в compactedSpendTotal: баланс после уплотнения тот же,
// что до него; новая серверная база (seq ≠ 0) её не стирает; повторное уплотнение не вычитает дважды; у другого
// аккаунта поля нет.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { paidLevelSpinEnvelopeKey } from '../app/level_spin_local_contract';
import { paidLevelSpinRuneFingerprint } from '../modules/phone-state/domains/economy';
import {
  applyCoinReconcileReceiptV1,
  levelSpinStarProjectionKey,
  mergeLevelSpinServerStars,
  peekStoredLevelSpinStarsForBoot,
  prepareRuneSpend,
  readUnifiedLevelSpinStars,
  syncPendingLevelSpinStarGrants,
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

function projectionOf(owner: string): Record<string, unknown> {
  return JSON.parse(storage[levelSpinStarProjectionKey(owner)]) as Record<string, unknown>;
}

// База 100 у сервера (serverSeq 1) + неподтверждённое начисление +10 = 110; траты 10 и 20 → честный баланс 80.
async function twoSpendsWithServerBasis(): Promise<void> {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  // У сервера есть база (serverSeq > 0) — условие, при котором уплотнение трат включается.
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 100, serverSeq: 1 });
  expect(await spend('coin_rank:to_1', 10, 1_800_000_100_000)).toBe(100);
  expect(await spend('coin_rank:to_2', 20, 1_800_000_200_000)).toBe(80);
}

test('two spends with a server basis: compaction keeps the balance (80, not 90) and the log shows equal before/after', async () => {
  await twoSpendsWithServerBasis();

  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  // До варианта (в) было 90: трата −10 снималась уплотнением и монеты «возвращались».
  expect(visible.balance).toBe(80);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
  expect(storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent('coin_rank:to_1')}`]).toBeUndefined();

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
    compactedSpendTotalBefore: 0,
    compactedSpendTotalAfter: -10,
    visibleBefore: 80,
    visibleAfter: 80,
  });
  expect(lines[0]).not.toContain(OWNER);
});

test('a newer server basis (seq ≠ 0 replaces serverBalance) does not erase the compacted spend total', async () => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);

  // Начисление +10 сервер уже учёл (квитанция): база 110, overlay начисления снят. Видимый баланс прежний — 80.
  // Без этого слияние снапшота намеренно не принимает новую базу (неподтверждённая материализация).
  const grant = exactGrant(1);
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({
    ...JSON.parse(storage[key]), serverBalance: 110, acknowledged: { [grant.operationId]: grant.requestFingerprint },
  });
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);

  // Сервер присылает новую базу 200 (seq 2): начисления он знает, локальных трат — нет.
  await mergeLevelSpinServerStars(captureAccountGeneration(), { stars: 200, starsSeq: 2 });
  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(projectionOf(OWNER).serverBalance).toBe(200);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
  // 200 − 10 (свёрнутая трата) − 20 (свежая трата). До варианта (в) было бы 180: трата −10 пропала бы.
  expect(visible.balance).toBe(170);
});

test('repeated recoveries do not subtract a compacted spend twice; the next compaction adds only the new one', async () => {
  await twoSpendsWithServerBasis();
  for (let pass = 0; pass < 3; pass += 1) {
    expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  }
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);

  expect(await spend('coin_rank:to_3', 30, 1_800_000_300_000)).toBe(50);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(50);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(50);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-30);
});

test('another account starts without a compacted spend total — nothing leaks between accounts', async () => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);

  beginAccountGeneration('account-b');
  const other = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(other.balance).toBe(0);
  // зачем (владелец 21.10, №1 A2): пустая проекция нового аккаунта на диск не пишется — у B нет ни ключа, ни свёрнутых трат A
  expect(storage[levelSpinStarProjectionKey('account-b')]).toBeUndefined();

  beginAccountGeneration(OWNER);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
});

// C1 (opus-ревью 05.10): конверт неоткрытого платного спина (paid_level_spin_envelope_v1) — второй durable-источник
// той же траты. В 2.0 его никто не удаляет, поэтому уплотнять такую трату нельзя: она вернулась бы из конверта на
// следующем проходе и вычлась бы снова (−300 за каждый проход, пока кошелёк не сломается).
async function writePaidSpinEnvelope(requestId: string, createdAtMs: number, balanceBefore: number): Promise<Record<string, unknown>> {
  const operationId = `paid_level_spin:${requestId}`;
  const payload = {
    operationId, ownerStableId: OWNER, accountGeneration: captureAccountGeneration().generation, requestId,
    giftId: 'stars_10', catalogVersion: 7, runeDelta: -300 as const, price: 300 as const,
    balanceBefore, balanceAfter: balanceBefore - 300, reason: 'paid_level_spin' as const, createdAtMs,
  };
  const operation = {
    schemaVersion: 'client-paid-level-spin-rune-operation.v1', ...payload,
    requestFingerprint: await paidLevelSpinRuneFingerprint(payload),
  };
  const receipt = {
    ok: true, stableUid: OWNER, requestId, baseGiftId: 'stars_10', premiumGiftId: null, createdAtMs,
    expiresAtMs: createdAtMs + 259_200_000, balanceAfter: balanceBefore - 300, status: 'awaiting_ack',
    deliveries: { base: { state: 'unclaimed' } }, catalogVersion: 7, localOnly: true, schemaVersion: 3,
    paymentKind: 'runes', runeOperationId: operationId, runePrice: 300, creditId: operationId, level: 0, kind: 'standard',
  };
  storage[paidLevelSpinEnvelopeKey(OWNER, requestId)] = JSON.stringify({
    schemaVersion: 'paid-level-spin-envelope.v1', ownerStableId: OWNER, requestId, operation, receipt,
  });
  return operation;
}

function refundLines(): Record<string, unknown>[] {
  return (console.warn as jest.Mock).mock.calls
    .filter(([first]) => first === '[COIN-COMPACTION] envelope_refunded')
    .map(([, payload]) => JSON.parse(String(payload)) as Record<string, unknown>);
}

// Конверт, трата которого УЖЕ лежит в проекции на диске (человек видел её списанной — например, она была самой свежей
// тратой и старое уплотнение её не снимало), удерживается: без двойного вычета и без уплотнения в сумму.
test('C1: an envelope spend already in the on-disk projection is held — 3 recoveries keep the balance and the total', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  // 1000 + 10 (начисление) − 300 (конверт) = 710 до свежей траты.
  const envelopeOperation = await writePaidSpinEnvelope('paidrequest00000001', 1_800_000_050_000, 1010);
  const disk = JSON.parse(storage[key]) as { operations: unknown[] };
  storage[key] = JSON.stringify({
    ...disk, serverBalance: 1000, serverSeq: 1, operations: [...disk.operations, envelopeOperation],
  });
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(710);
  expect(refundLines()).toHaveLength(0);
  expect(await spend('coin_rank:to_1', 10, 1_800_000_100_000)).toBe(700);

  for (let pass = 0; pass < 3; pass += 1) {
    expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(700);
  }
  expect(projectionOf(OWNER)).not.toHaveProperty('compactedSpendTotal');
  expect(storage[paidLevelSpinEnvelopeKey(OWNER, 'paidrequest00000001')]).toBeDefined();
});

// N1 (повторное ревью, вариант (а)): после старого уплотнения траты зависшего конверта нет в проекции на диске —
// человек видел эти монеты и мог потратить. Конверт считается возвращённым: баланс не падает, кошелёк жив.
test('N1: a stuck paid-spin envelope absent from the on-disk projection is refunded — balance 200 stays, wallet alive', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 200, serverSeq: 1 });
  await writePaidSpinEnvelope('paidrequest00000002', 1_800_000_050_000, 510);
  // 200 + 10 (начисление); удержание −300 дало бы −90 → level_spin_star_balance_invalid.
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(210);
  expect(await spend('coin_rank:to_1', 10, 1_800_000_100_000)).toBe(200);
  for (let pass = 0; pass < 3; pass += 1) {
    expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(200);
  }
  const projection = projectionOf(OWNER) as { operations: { operationId: string }[] };
  expect(projection.operations.map((operation) => operation.operationId)).not.toContain('paid_level_spin:paidrequest00000002');
  expect(projection).not.toHaveProperty('compactedSpendTotal');
  const lines = refundLines();
  expect(lines.length).toBeGreaterThanOrEqual(1);
  expect(lines[0]).toMatchObject({
    count: 1, sum: -300, refunded: [{ id: 'paid_level_spin:paidrequest00000002', runeDelta: -300 }], serverSeq: 1,
  });
  expect(JSON.stringify(lines[0])).not.toContain(OWNER);
});

// v3.1 (1): проекции на диске нет совсем (первый запуск 2.0, восстановление копии на новый телефон) — трата зависшего
// конверта тоже возвращается. Это осознанное поведение варианта (а), а не случайность.
test('v3.1: with no projection on disk at all, a stuck envelope spend is refunded (deliberate)', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await writePaidSpinEnvelope('paidrequest00000003', 1_800_000_050_000, 310);
  expect(storage[levelSpinStarProjectionKey(OWNER)]).toBeUndefined();

  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(10);
  const projection = projectionOf(OWNER) as { operations: { operationId: string }[] };
  expect(projection.operations.map((operation) => operation.operationId)).not.toContain('paid_level_spin:paidrequest00000003');
  expect(refundLines().some((line) => JSON.stringify(line).includes('paidrequest00000003'))).toBe(true);
});

// v3.1 (2): обратная граница — у траты конверта ЕСТЬ свой operationStorageKey, а в проекции записи нет. Это не
// «зависший конверт без следа»: трата учтена своим ключом и вычитается.
test('v3.1: an envelope spend that also has its own operation key is deducted even if the projection lacks it', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 1000, serverSeq: 1 });
  const operation = await writePaidSpinEnvelope('paidrequest00000004', 1_800_000_050_000, 1010);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(String(operation.operationId))}`] = JSON.stringify(operation);

  // 1000 + 10 − 300.
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(710);
  expect(refundLines().some((line) => JSON.stringify(line).includes('paidrequest00000004'))).toBe(false);
});

// v3.1 (3): конверт лежит вечно, решение принимается на каждом проходе — строка envelope_refunded одна за запуск.
test('v3.1: envelope_refunded is printed once per launch, not on every recovery', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 200, serverSeq: 1 });
  await writePaidSpinEnvelope('paidrequest00000005', 1_800_000_050_000, 510);
  for (let pass = 0; pass < 4; pass += 1) {
    expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(210);
  }
  expect(refundLines().filter((line) => JSON.stringify(line).includes('paidrequest00000005'))).toHaveLength(1);
});

// L3-хвост (повторное ревью): трата из списка подготовленных удерживается на ЭТОМ проходе, а на следующем (когда она
// уже переписана в operationStorageKey и список очищен) уплотняется в сумму ровно один раз.
test('a spend held from the prepared list is folded on the next pass exactly once', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 100, serverSeq: 1 });
  expect(await spend('coin_rank:to_2', 20, 1_800_000_200_000)).toBe(90);
  // Более старая трата лежит ТОЛЬКО в списке подготовленных (ни ключа, ни записи в проекции).
  const prepared = await prepareRuneSpend({
    token: captureAccountGeneration(), operationId: 'coin_rank:to_1', kind: 'coin_rank', subjectId: 'rank_1',
    price: 10, createdAtMs: 1_800_000_100_000,
  });
  if (!prepared.ok) throw new Error('prepare_denied');
  const [, operationJson] = prepared.durableWrites[0];
  storage[`level_spin_star_prepared_v1:${encodeURIComponent(OWNER)}`] = JSON.stringify([JSON.parse(operationJson)]);

  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  expect(projectionOf(OWNER)).not.toHaveProperty('compactedSpendTotal');
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
});

// H2 (opus-ревью): сбой между multiRemove записи траты и записью проекции. На диске остаётся прежняя проекция — с
// записью траты и прежней суммой, — следующий проход переносит трату ровно один раз: 80 и −10, а не −20.
test('H2: a crash between multiRemove and the projection write folds the spend exactly once on the next pass', async () => {
  await twoSpendsWithServerBasis();
  const key = levelSpinStarProjectionKey(OWNER);
  const realMultiSet = (AsyncStorage.multiSet as jest.Mock).getMockImplementation();
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (pairs: [string, string][]) => {
    if (pairs.some(([k]) => k === key)) throw new Error('simulated_crash_after_multi_remove');
    return realMultiSet?.(pairs);
  });
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration())).rejects.toThrow('simulated_crash_after_multi_remove');
  expect(storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent('coin_rank:to_1')}`]).toBeUndefined();
  expect(projectionOf(OWNER)).not.toHaveProperty('compactedSpendTotal');

  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
});

test('after compaction a purchase sees the real balance: 90 is refused, 80 leaves exactly 0', async () => {
  await twoSpendsWithServerBasis();
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
  const token = captureAccountGeneration();
  const denied = await prepareRuneSpend({ token, operationId: 'coin_rank:to_3', kind: 'coin_rank', subjectId: 'rank_3', price: 90 });
  expect(denied).toEqual({ ok: false, reason: 'insufficient_runes' });
  expect(await spend('coin_rank:to_3', 80, 1_800_000_300_000)).toBe(0);
});

test('the boot peek shows the compacted balance (80, not 90)', async () => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(await peekStoredLevelSpinStarsForBoot(captureAccountGeneration())).toMatchObject({ balance: 80 });
});

test('a coinReconcileV1 receipt after compaction keeps the compacted total', async () => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as { commitPhoneStateNonMonetaryEconomyGrant: jest.Mock };
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);
  const grant = exactGrant(1);
  // Сервер провёл начисление +10 сверкой: база 110 (seq 2).
  const result = await applyCoinReconcileReceiptV1(captureAccountGeneration(), {
    raisedBy: 0, operationIds: [grant.operationId], starsBalance: 110, starsEarnedTotal: 10, starsSeq: 2,
  });
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
  expect(result.balance).toBe(80);
});

test('a sync acknowledgement of a grant after compaction keeps the compacted total', async () => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as { commitPhoneStateNonMonetaryEconomyGrant: jest.Mock };
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);
  const grant = exactGrant(1);
  const functions = jest.requireMock('../app/community_packs/functionsClient') as { callLevelSpinStarComposite: jest.Mock };
  functions.callLevelSpinStarComposite.mockResolvedValue({
    materialized: true, operationId: grant.operationId, requestFingerprint: grant.requestFingerprint,
    starsBalance: 110, starsEarnedTotal: 10, starsSeq: 2,
  });
  await syncPendingLevelSpinStarGrants(captureAccountGeneration());
  expect(projectionOf(OWNER).compactedSpendTotal).toBe(-10);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(80);
});

// Пути квитанций практики, синка, сверки и слияния снимка пишут проекцию через withUnconfirmedLift(Object.freeze({…}))
// — поле переживает их, только если каждый такой объект строится из прежней проекции (spread), а не собирается заново.
test('every projection rewrite through withUnconfirmedLift spreads the previous projection (field survives all paths)', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'level_spin_star_grants.ts'), 'utf8').replace(/\r\n/g, '\n');
  const sites = [...source.matchAll(/withUnconfirmedLift\(Object\.freeze\(\{\s*\n?\s*([^\n]*)/g)].map((match) => match[1].trim());
  expect(sites.length).toBeGreaterThanOrEqual(4);
  for (const firstLine of sites) expect(firstLine).toMatch(/^\.\.\.(current|projection|currentProjection)\b/);
});

// M4 (opus-ревью): пока compactedSpendTotal существует, никто не передаёт settledSpendOperationIds — иначе свёрнутая
// трата, «погашенная» сервером, вычлась бы дважды. Включать это можно только вместе с вариантом (б) и пересчётом суммы.
test('M4: no caller passes settledSpendOperationIds while compactedSpendTotal exists', () => {
  const root = join(__dirname, '..');
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('level_spin_star_grants.ts')
        && readFileSync(abs, 'utf8').includes('settledSpendOperationIds')) offenders.push(abs);
    }
  };
  for (const dir of ['app', 'components', 'hooks', 'modules']) walk(join(root, dir));
  expect(offenders).toEqual([]);
});

test('a corrupt (positive) compacted spend total is rejected, not turned into free coins', async () => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), compactedSpendTotal: 500 });
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration())).rejects.toThrow('level_spin_star_projection_corrupt');
});

test.each([[-10.5], ['-10'], [null]])('a non-integer compacted spend total (%p) is rejected as corrupt', async (bad) => {
  await twoSpendsWithServerBasis();
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), compactedSpendTotal: bad });
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration())).rejects.toThrow('level_spin_star_projection_corrupt');
});

test('a single spend is never removed, no total is written, and the block logs why it skipped', async () => {
  const grant = exactGrant(1);
  storage[`level_spin_star_operation_v1:${OWNER}:${encodeURIComponent(grant.operationId)}`] = JSON.stringify(grant);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  const key = levelSpinStarProjectionKey(OWNER);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), serverBalance: 100, serverSeq: 1 });
  await spend('coin_rank:to_1', 10, 1_800_000_100_000);

  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(visible.balance).toBe(100);
  expect(projectionOf(OWNER)).not.toHaveProperty('compactedSpendTotal');
  expect(compactionLines()).toHaveLength(0);
  const skip = (console.log as jest.Mock).mock.calls.find(([first]) => first === '[COIN-COMPACTION] skip');
  expect(skip).toBeDefined();
  expect(JSON.parse(String(skip?.[1]))).toMatchObject({ reason: 'only_newest_spend', serverSeq: 1, spends: 1 });
});
