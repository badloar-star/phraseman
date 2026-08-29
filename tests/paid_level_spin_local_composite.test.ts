import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  acknowledgeLocalLevelSpin,
  claimLocalLevelSpinWithRunes,
  LOCAL_LEVEL_SPIN_STATE_KEY,
  paidLevelSpinOutboxKey,
  recoverLocalLevelSpin,
  releaseUndeliveredLocalLevelSpin,
} from '../app/local_level_spins';
import {
  levelSpinStarProjectionKey,
  readUnifiedLevelSpinStars,
  sessionAttemptRuneOperationStorageKey,
} from '../app/level_spin_star_grants';
import { LEVEL_SPIN_PENDING_REVEAL_KEY } from '../app/level_up_storage_keys';
import { parsePaidLevelSpinRuneOperation } from '../modules/phone-state/domains/economy';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async () => 'a'.repeat(64)),
  randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
}));
jest.mock('../app/theme_gift_pool', () => ({ listExhaustedSpinRewardIds: jest.fn(async () => []) }));
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn().mockResolvedValue(false),
  readPhoneStateStarCreditState: jest.fn().mockResolvedValue({ credits: [], acknowledgements: [] }),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const OWNER = 'account-a';
const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:${OWNER}`;
const storage: Record<string, string> = {};
let visibleProgress = { stars: 900, starsEarnedTotal: 7 };

function emptySpinState() {
  return {
    owner: OWNER,
    credits: [],
    issuedLevels: [],
    issuedCreditIds: [],
    activeReceipt: null,
    closedRequestIds: [],
  };
}

function operationRows() {
  return Object.entries(storage)
    .filter(([key]) => key.startsWith(`level_spin_star_operation_v1:${OWNER}:`))
    .map(([, raw]) => parsePaidLevelSpinRuneOperation(JSON.parse(raw)))
    .filter((value) => value !== null);
}

function paidEnvelopeKey(requestId: string): string {
  return `paid_level_spin_envelope_v1:${encodeURIComponent(OWNER)}:${requestId}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  storage[stateKey] = JSON.stringify(emptySpinState());
  visibleProgress = { stars: 900, starsEarnedTotal: 7 };
  beginAccountGeneration(OWNER);
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
  const snapshot = jest.requireMock('../app/app_snapshot_store') as {
    getAppSnapshot: jest.Mock;
    patchAppSnapshot: jest.Mock;
  };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { ...visibleProgress } }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: typeof visibleProgress }) => {
    const patch = updater({ progress: { ...visibleProgress } });
    if (patch.progress) visibleProgress = { ...visibleProgress, ...patch.progress };
  });
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
    readPhoneStateStarCreditState: jest.Mock;
  };
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(false);
  bridge.readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  const pool = jest.requireMock('../app/theme_gift_pool') as { listExhaustedSpinRewardIds: jest.Mock };
  pool.listExhaustedSpinRewardIds.mockResolvedValue([]);
});

test('commits one authoritative envelope before writing rebuildable projections', async () => {
  const multiSet = AsyncStorage.multiSet as jest.Mock;
  const setItem = AsyncStorage.setItem as jest.Mock;
  const receipt = await claimLocalLevelSpinWithRunes();

  expect(receipt).toMatchObject({ paymentKind: 'runes', runePrice: 300, level: 0, balanceAfter: 0 });
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  const envelope = JSON.parse(storage[paidEnvelopeKey(receipt.requestId)]!);
  expect(envelope).toMatchObject({
    schemaVersion: 'paid-level-spin-envelope.v1',
    ownerStableId: OWNER,
    requestId: receipt.requestId,
    operation: {
      operationId: receipt.runeOperationId,
      giftId: receipt.baseGiftId,
      catalogVersion: receipt.catalogVersion,
      balanceBefore: 900,
      balanceAfter: 600,
    },
    receipt,
  });
  const [operation] = operationRows();
  expect(operation).toMatchObject({ giftId: receipt.baseGiftId, balanceBefore: 900, balanceAfter: 600 });
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
  expect(JSON.parse(storage[stateKey]!)).toMatchObject({ credits: [], activeReceipt: receipt });
  expect(JSON.parse(storage[paidLevelSpinOutboxKey(OWNER)]!)).toEqual([operation]);
  expect(JSON.parse(storage[LEVEL_SPIN_PENDING_REVEAL_KEY]!)).toEqual({ owner: OWNER, receipt });
  const derivedCall = multiSet.mock.calls.find(([pairs]) => {
    const keys = new Set((pairs as [string, string][]).map(([key]) => key));
    return keys.has(sessionAttemptRuneOperationStorageKey(OWNER, receipt.runeOperationId))
      && keys.has(levelSpinStarProjectionKey(OWNER))
      && keys.has(stateKey)
      && keys.has(paidLevelSpinOutboxKey(OWNER))
      && keys.has(LEVEL_SPIN_PENDING_REVEAL_KEY);
  });
  expect(derivedCall).toBeTruthy();
  const envelopeCallIndex = setItem.mock.calls.findIndex(([key]) => key === paidEnvelopeKey(receipt.requestId));
  expect(envelopeCallIndex).toBeGreaterThanOrEqual(0);
  expect(setItem.mock.invocationCallOrder[envelopeCallIndex])
    .toBeLessThan(multiSet.mock.invocationCallOrder[multiSet.mock.calls.indexOf(derivedCall)]!);
});

test('insufficient runes leaves no paid operation, receipt, outbox or reveal', async () => {
  visibleProgress = { stars: 299, starsEarnedTotal: 7 };
  await expect(claimLocalLevelSpinWithRunes()).rejects.toThrow('paid_level_spin_runes_insufficient');
  expect(operationRows()).toEqual([]);
  expect(storage[paidLevelSpinOutboxKey(OWNER)]).toBeUndefined();
  expect(storage[LEVEL_SPIN_PENDING_REVEAL_KEY]).toBeUndefined();
  expect(JSON.parse(storage[stateKey]!)).toEqual(emptySpinState());
});

test('retry and restart recovery return the same paid receipt without a second debit', async () => {
  const first = await claimLocalLevelSpinWithRunes();
  await expect(claimLocalLevelSpinWithRunes()).resolves.toEqual(first);
  await expect(recoverLocalLevelSpin()).resolves.toEqual(first);
  expect(operationRows()).toHaveLength(1);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
});

test('paid receipt cannot be released into a free-spin credit', async () => {
  const receipt = await claimLocalLevelSpinWithRunes();
  await expect(releaseUndeliveredLocalLevelSpin(receipt.requestId)).resolves.toBe(false);
  expect(JSON.parse(storage[stateKey]!)).toMatchObject({ credits: [], activeReceipt: receipt });
  expect(operationRows()).toHaveLength(1);
});

test('authoritative envelope write failure exposes no debit or reward', async () => {
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key.startsWith(`paid_level_spin_envelope_v1:${encodeURIComponent(OWNER)}:`)) {
      throw new Error('envelope write failed');
    }
    storage[key] = value;
  });

  await expect(claimLocalLevelSpinWithRunes()).rejects.toThrow('envelope write failed');
  expect(operationRows()).toEqual([]);
  expect(storage[paidLevelSpinOutboxKey(OWNER)]).toBeUndefined();
  expect(storage[LEVEL_SPIN_PENDING_REVEAL_KEY]).toBeUndefined();
  expect(visibleProgress.stars).toBe(900);
});

test('per-entry derived write tear recovers exact receipt and debit from the envelope', async () => {
  let toreDerivedWrite = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    const envelopeExists = Object.keys(storage).some((key) => key.startsWith('paid_level_spin_envelope_v1:'));
    if (envelopeExists && !toreDerivedWrite) {
      toreDerivedWrite = true;
      const first = pairs[0];
      if (first) storage[first[0]] = first[1];
      throw new Error('derived multiSet tore after one row');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });

  const receipt = await claimLocalLevelSpinWithRunes();
  expect(toreDerivedWrite).toBe(true);
  const envelopeRaw = storage[paidEnvelopeKey(receipt.requestId)];
  expect(envelopeRaw).toBeTruthy();

  for (const key of Object.keys(storage)) {
    if (key !== paidEnvelopeKey(receipt.requestId) && key !== stateKey) delete storage[key];
  }
  storage[stateKey] = JSON.stringify(emptySpinState());

  await expect(recoverLocalLevelSpin()).resolves.toEqual(receipt);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
  expect(JSON.parse(storage[stateKey]!)).toMatchObject({ credits: [], activeReceipt: receipt });
});

test('mutable paid receipt without its authoritative envelope grants nothing', async () => {
  const receipt = await claimLocalLevelSpinWithRunes();
  delete storage[paidEnvelopeKey(receipt.requestId)];

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
});

test('forged derived receipt is replaced from the immutable envelope', async () => {
  const receipt = await claimLocalLevelSpinWithRunes();
  const forged = { ...receipt, baseGiftId: receipt.baseGiftId === 'xp_250' ? 'xp_500' : 'xp_250' };
  storage[stateKey] = JSON.stringify({ ...emptySpinState(), activeReceipt: forged });
  storage[LEVEL_SPIN_PENDING_REVEAL_KEY] = JSON.stringify({ owner: OWNER, receipt: forged });

  await expect(recoverLocalLevelSpin()).resolves.toEqual(receipt);
});

test('parallel paid-button taps return one receipt and charge once', async () => {
  const [first, second] = await Promise.all([
    claimLocalLevelSpinWithRunes(),
    claimLocalLevelSpinWithRunes(),
  ]);
  expect(second).toEqual(first);
  expect(Object.keys(storage).filter((key) => key.startsWith('paid_level_spin_envelope_v1:')))
    .toHaveLength(1);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
});

test('paid spin leaves an existing free-spin credit untouched', async () => {
  storage[stateKey] = JSON.stringify({
    ...emptySpinState(),
    credits: [{ id: 'local_spin_v1_002', level: 2 }],
    issuedLevels: [2],
    issuedCreditIds: ['local_spin_v1_002'],
  });

  const receipt = await claimLocalLevelSpinWithRunes();
  expect(receipt).toMatchObject({ paymentKind: 'runes', balanceAfter: 1 });
  expect(JSON.parse(storage[stateKey]!).credits).toEqual([
    { id: 'local_spin_v1_002', level: 2 },
  ]);
});

test('ack materializes the immutable debit before retiring its envelope', async () => {
  const receipt = await claimLocalLevelSpinWithRunes();
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  const operationKey = sessionAttemptRuneOperationStorageKey(OWNER, receipt.runeOperationId);
  delete storage[operationKey];
  delete storage[levelSpinStarProjectionKey(OWNER)];

  await acknowledgeLocalLevelSpin(receipt.requestId);

  expect(parsePaidLevelSpinRuneOperation(JSON.parse(storage[operationKey]!)))
    .toMatchObject({ operationId: receipt.runeOperationId, giftId: receipt.baseGiftId });
  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeUndefined();
  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
});

test('offline paid ACK retries the durable outbox once and clears it only after confirmed sync', async () => {
  const runtime = require('../app/local_level_spins') as {
    syncPendingPaidLevelSpinRunePurchasesForCurrentAccount?: () => Promise<void>;
  };
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
  };
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(false);

  const receipt = await claimLocalLevelSpinWithRunes();
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  const outboxKey = paidLevelSpinOutboxKey(OWNER);
  const [queuedOperation] = JSON.parse(storage[outboxKey]!);

  await acknowledgeLocalLevelSpin(receipt.requestId);

  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeUndefined();
  expect(JSON.parse(storage[outboxKey]!)).toEqual([queuedOperation]);
  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
  expect(typeof runtime.syncPendingPaidLevelSpinRunePurchasesForCurrentAccount).toBe('function');

  await runtime.syncPendingPaidLevelSpinRunePurchasesForCurrentAccount!();
  expect(JSON.parse(storage[outboxKey]!)).toEqual([queuedOperation]);

  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockClear();
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);
  await runtime.syncPendingPaidLevelSpinRunePurchasesForCurrentAccount!();

  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledTimes(1);
  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledWith(
    expect.objectContaining({ operationId: receipt.runeOperationId }),
  );
  expect(JSON.parse(storage[outboxKey]!)).toEqual([]);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
  await expect(recoverLocalLevelSpin()).resolves.toBeNull();

  await runtime.syncPendingPaidLevelSpinRunePurchasesForCurrentAccount!();
  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledTimes(1);
});

test('ACK rebuilds a torn missing outbox before retiring the paid envelope', async () => {
  const runtime = require('../app/local_level_spins') as {
    syncPendingPaidLevelSpinRunePurchasesForCurrentAccount: () => Promise<void>;
  };
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
  };
  let toreDerivedWrite = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    const envelopeExists = Object.keys(storage).some((key) => key.startsWith('paid_level_spin_envelope_v1:'));
    if (envelopeExists && !toreDerivedWrite) {
      toreDerivedWrite = true;
      const statePair = pairs.find(([key]) => key === stateKey);
      if (statePair) storage[statePair[0]] = statePair[1];
      throw new Error('derived multiSet tore after state only');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(false);

  const receipt = await claimLocalLevelSpinWithRunes();
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const outboxKey = paidLevelSpinOutboxKey(OWNER);
  expect(toreDerivedWrite).toBe(true);
  expect(storage[outboxKey]).toBeUndefined();
  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeTruthy();

  await acknowledgeLocalLevelSpin(receipt.requestId);

  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeUndefined();
  expect(storage[outboxKey]).toBeDefined();
  expect(JSON.parse(storage[outboxKey]!)).toEqual([
    expect.objectContaining({ operationId: receipt.runeOperationId, giftId: receipt.baseGiftId }),
  ]);
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockClear();
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);

  await runtime.syncPendingPaidLevelSpinRunePurchasesForCurrentAccount();

  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledTimes(1);
  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledWith(
    expect.objectContaining({ operationId: receipt.runeOperationId }),
  );
  expect(JSON.parse(storage[outboxKey]!)).toEqual([]);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
});

test('ACK keeps the paid envelope and receipt recoverable when outbox persistence fails', async () => {
  const receipt = await claimLocalLevelSpinWithRunes();
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const outboxKey = paidLevelSpinOutboxKey(OWNER);
  delete storage[outboxKey];
  const originalSetItem = AsyncStorage.setItem as jest.Mock;
  originalSetItem.mockImplementation(async (key: string, value: string) => {
    if (key === outboxKey) throw new Error('outbox write failed');
    storage[key] = value;
  });

  await expect(acknowledgeLocalLevelSpin(receipt.requestId)).rejects.toThrow('outbox write failed');

  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeTruthy();
  expect(JSON.parse(storage[stateKey]!)).toMatchObject({ activeReceipt: receipt });
  await expect(recoverLocalLevelSpin()).resolves.toEqual(receipt);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });

  originalSetItem.mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  await acknowledgeLocalLevelSpin(receipt.requestId);
  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeUndefined();
  expect(JSON.parse(storage[outboxKey]!)).toEqual([
    expect.objectContaining({ operationId: receipt.runeOperationId, giftId: receipt.baseGiftId }),
  ]);
});

test('ACK rejects a corrupt paid outbox without retiring the envelope', async () => {
  const receipt = await claimLocalLevelSpinWithRunes();
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  await new Promise<void>((resolve) => setImmediate(resolve));
  const outboxKey = paidLevelSpinOutboxKey(OWNER);
  const [queuedOperation] = JSON.parse(storage[outboxKey]!);
  storage[outboxKey] = JSON.stringify([{
    ...queuedOperation,
    balanceAfter: queuedOperation.balanceAfter + 1,
  }]);

  await expect(acknowledgeLocalLevelSpin(receipt.requestId))
    .rejects.toThrow('paid_level_spin_outbox_corrupt');

  expect(storage[paidEnvelopeKey(receipt.requestId)]).toBeTruthy();
  expect(JSON.parse(storage[stateKey]!)).toMatchObject({ activeReceipt: receipt });
  await expect(recoverLocalLevelSpin()).resolves.toEqual(receipt);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
});

test('paid outbox fails closed when it no longer matches the immutable ACK authority', async () => {
  const runtime = require('../app/local_level_spins') as {
    syncPendingPaidLevelSpinRunePurchasesForCurrentAccount: () => Promise<void>;
  };
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
  };
  const receipt = await claimLocalLevelSpinWithRunes();
  if (receipt.schemaVersion !== 3) throw new Error('expected paid receipt');
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledTimes(1);
  await acknowledgeLocalLevelSpin(receipt.requestId);
  const outboxKey = paidLevelSpinOutboxKey(OWNER);
  const [queuedOperation] = JSON.parse(storage[outboxKey]!);
  storage[outboxKey] = JSON.stringify([{ ...queuedOperation, balanceAfter: queuedOperation.balanceAfter + 1 }]);
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockClear();
  bridge.commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);

  await expect(runtime.syncPendingPaidLevelSpinRunePurchasesForCurrentAccount())
    .rejects.toThrow('paid_level_spin_outbox_corrupt');

  expect(bridge.commitPhoneStateNonMonetaryEconomyGrant).not.toHaveBeenCalled();
  expect(JSON.parse(storage[outboxKey]!)).toHaveLength(1);
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .resolves.toEqual({ balance: 600, earnedTotal: 7 });
  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
});

test('account generation change fails closed before a paid operation write', async () => {
  const pool = jest.requireMock('../app/theme_gift_pool') as { listExhaustedSpinRewardIds: jest.Mock };
  pool.listExhaustedSpinRewardIds.mockImplementationOnce(async () => {
    beginAccountGeneration('account-b');
    return [];
  });

  await expect(claimLocalLevelSpinWithRunes()).rejects.toThrow('local_spin_identity_changed');
  expect(operationRows()).toEqual([]);
  expect(storage[paidLevelSpinOutboxKey(OWNER)]).toBeUndefined();
});
