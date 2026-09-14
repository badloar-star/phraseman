import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'node:crypto';
import { practiceRuneSettledOnceStorageKey } from '../app/practice_rune_earnings';
import {
  clearPracticeRuneSettlementPending,
  flushStalePracticeRuneSettlements,
  markPracticeRuneSettlementPending,
  readCommittedPracticeRuneCompletionOrdinal,
  readCommittedPracticeRuneSettlementEarnings,
  settlePracticeRuneEarningsToServer,
} from '../app/practice_rune_settlement';

const events: string[] = [];
const ledger = {
  commitPracticeRuneGrantLocally: jest.fn(),
  acknowledgePracticeRuneGrantLocally: jest.fn(),
};
const callable = jest.fn();
let storage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) => (
    jest.requireActual<typeof import('node:crypto')>('node:crypto')
      .createHash('sha256').update(value).digest('hex')
  ),
}));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn().mockResolvedValue('account-a') }));
jest.mock('../app/account_generation', () => ({
  waitForActiveAccountGeneration: jest.fn().mockResolvedValue({
    generation: 1, stableId: 'account-a', phase: 'active',
  }),
}));
jest.mock('../app/level_spin_star_grants', () => ({
  commitPracticeRuneGrantLocally: (...args: unknown[]) => ledger.commitPracticeRuneGrantLocally(...args),
  acknowledgePracticeRuneGrantLocally: (...args: unknown[]) => ledger.acknowledgePracticeRuneGrantLocally(...args),
  practiceRuneOperationStorageKey: (owner: string, operationId: string) => `operation:${owner}:${operationId}`,
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/app_snapshot_store', () => ({
  getAppSnapshot: jest.fn(() => ({ progress: { stars: 12, starsEarnedTotal: 12 } })),
}));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => callable),
}));

const earnings = Object.freeze({
  schemaVersion: 'practice-rune-earnings.v1' as const,
  activity: 'flashcards_blitz' as const,
  sessionKey: 'attempt1',
  awardPerItem: 3,
  creditedItemIds: Object.freeze(['card-1', 'card-2', 'card-3']),
  pendingRunes: 9,
});

beforeEach(() => {
  jest.clearAllMocks();
  events.length = 0;
  ledger.commitPracticeRuneGrantLocally.mockImplementation(async () => { events.push('local'); });
  ledger.acknowledgePracticeRuneGrantLocally.mockImplementation(async () => { events.push('ack'); });
  storage = {};
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => delete storage[key]);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('durably commits before network and keeps local credit when both attempts fail', async () => {
  callable.mockImplementation(async () => {
    events.push('network');
    throw new Error('offline');
  });

  await expect(settlePracticeRuneEarningsToServer(earnings, 1)).resolves.toEqual({
    locallyCommitted: true,
    settled: false,
  });
  expect(events).toEqual(['local', 'network', 'network']);
  expect(ledger.commitPracticeRuneGrantLocally).toHaveBeenCalledTimes(1);
  expect(ledger.acknowledgePracticeRuneGrantLocally).not.toHaveBeenCalled();
});

test('replaces the local overlay only after an exact server acknowledgement', async () => {
  callable.mockImplementation(async ({ operation }: { operation: { operationId: string; requestFingerprint: string } }) => {
    events.push('network');
    return { data: {
      materialized: true,
      operationId: operation.operationId,
      requestFingerprint: operation.requestFingerprint,
      replayed: false,
      starsBalance: 21,
      starsEarnedTotal: 21,
      starsSeq: 3,
    } };
  });

  await expect(settlePracticeRuneEarningsToServer(earnings, 1)).resolves.toEqual({
    locallyCommitted: true,
    settled: true,
  });
  expect(events).toEqual(['local', 'network', 'ack']);
  expect(ledger.acknowledgePracticeRuneGrantLocally).toHaveBeenCalledTimes(1);
});

test('pending retry reuses one exact createdAt and fingerprint', async () => {
  const input = { ownerStableId: 'account-a', earnings, completionOrdinal: 1 } as const;
  const first = await markPracticeRuneSettlementPending(input);
  const replay = await markPracticeRuneSettlementPending(input);
  expect(replay).toEqual(first);
  expect(first.createdAtMs).toBeGreaterThan(0);
  expect(first.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
});

test('keeps full pending evidence after background acknowledgement for foreground close', async () => {
  const input = { ownerStableId: 'account-a', earnings, completionOrdinal: 1 } as const;
  const first = await markPracticeRuneSettlementPending(input);
  const operation = first.sealedOperation!;
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  storage[`operation:account-a:${operation.operationId}`] = JSON.stringify(operation);
  await expect(readCommittedPracticeRuneSettlementEarnings({
    ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, completionOrdinal: 1,
  })).resolves.toEqual(earnings);
  callable.mockResolvedValue({ data: {
    materialized: true,
    operationId: operation.operationId,
    requestFingerprint: operation.requestFingerprint,
    replayed: false,
    starsBalance: 21,
    starsEarnedTotal: 21,
    starsSeq: 3,
  } });

  await expect(flushStalePracticeRuneSettlements('account-a')).resolves.toEqual({
    synced: 1,
    pending: 0,
  });
  expect(JSON.parse(storage[pendingKey]!).operation).toEqual(operation);
  await expect(markPracticeRuneSettlementPending(input)).resolves.toEqual(first);
  expect(JSON.parse(storage[pendingKey]!).operation).toEqual(operation);
  await clearPracticeRuneSettlementPending({
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
  });
  expect(storage[pendingKey]).toBeUndefined();
});

test('keeps a markerless equal-amount completion conflict fail-closed', async () => {
  const input = { ownerStableId: 'account-a', earnings, completionOrdinal: 1 } as const;
  const first = await markPracticeRuneSettlementPending(input);
  const operation = first.sealedOperation!;
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  storage[`operation:account-a:${operation.operationId}`] = JSON.stringify(operation);
  delete storage[pendingKey];
  const differentItems = Object.freeze({
    ...earnings,
    creditedItemIds: Object.freeze(['other-1', 'other-2', 'other-3']),
  });

  await expect(readCommittedPracticeRuneSettlementEarnings({
    ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, completionOrdinal: 1,
  })).resolves.toBeNull();

  await expect(markPracticeRuneSettlementPending({
    ownerStableId: 'account-a', earnings: differentItems, completionOrdinal: 1,
  })).rejects.toThrow('level_spin_star_request_conflict');
  expect(storage[pendingKey]).toBeUndefined();
});

test('background acknowledgement clears a marker after foreground already closed it', async () => {
  const input = { ownerStableId: 'account-a', earnings, completionOrdinal: 1 } as const;
  const intent = await markPracticeRuneSettlementPending(input);
  const operation = intent.sealedOperation!;
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  storage[practiceRuneSettledOnceStorageKey({
    ownerStableId: 'account-a', activity: earnings.activity, sessionKey: earnings.sessionKey,
  })] = '1';
  callable.mockResolvedValue({ data: {
    materialized: true,
    operationId: operation.operationId,
    requestFingerprint: operation.requestFingerprint,
    replayed: true,
    starsBalance: 21,
    starsEarnedTotal: 21,
    starsSeq: 3,
  } });

  await expect(flushStalePracticeRuneSettlements('account-a')).resolves.toEqual({
    synced: 1,
    pending: 0,
  });
  expect(storage[pendingKey]).toBeUndefined();
});

test('ordinal recovery reads only the one legal next operation key', async () => {
  const operationId = 'practice_rune:flashcards_blitz_attempt1_2';
  const createdAtMs = Date.parse('2026-09-02T12:00:00.000Z');
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, completionOrdinal: 2, amount: 9,
    reason: 'practice_session_reward', createdAtMs,
  })).digest('hex');
  storage[`operation:account-a:${operationId}`] = JSON.stringify({
    schemaVersion: 'client-practice-rune-operation.v1', operationId,
    ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, completionOrdinal: 2, amount: 9,
    reason: 'practice_session_reward', createdAtMs, requestFingerprint,
  });
  await expect(readCommittedPracticeRuneCompletionOrdinal({
    ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, settledOrdinal: 1, requestedOrdinal: 1,
  })).resolves.toBe(2);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(`operation:account-a:${operationId}`);
  expect(AsyncStorage.getAllKeys).not.toHaveBeenCalled();
});

test('ordinal recovery probes settled plus one before a larger requested ordinal', async () => {
  const operationId = 'practice_rune:flashcards_blitz_attempt1_1';
  const createdAtMs = Date.parse('2026-09-02T12:00:00.000Z');
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, completionOrdinal: 1, amount: 9,
    reason: 'practice_session_reward', createdAtMs,
  })).digest('hex');
  storage[`operation:account-a:${operationId}`] = JSON.stringify({
    schemaVersion: 'client-practice-rune-operation.v1', operationId,
    ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, completionOrdinal: 1, amount: 9,
    reason: 'practice_session_reward', createdAtMs, requestFingerprint,
  });

  await expect(readCommittedPracticeRuneCompletionOrdinal({
    ownerStableId: 'account-a', activity: earnings.activity,
    sessionKey: earnings.sessionKey, settledOrdinal: 0, requestedOrdinal: 5,
  })).resolves.toBe(1);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(`operation:account-a:${operationId}`);
});

test('seals the doubled Sunday amount before local commit and fingerprint', async () => {
  const sunday = Date.parse('2026-09-06T12:00:00.000Z');
  jest.spyOn(Date, 'now').mockReturnValue(sunday);
  callable.mockRejectedValue(new Error('offline'));

  const durableIntent = await markPracticeRuneSettlementPending({
    ownerStableId: 'account-a', earnings, completionOrdinal: 1,
  });
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  expect(JSON.parse(storage[pendingKey]!)).toEqual(expect.objectContaining({
    operation: expect.objectContaining({
      amount: 18,
      createdAtMs: sunday,
      requestFingerprint: durableIntent.requestFingerprint,
    }),
  }));
  await settlePracticeRuneEarningsToServer(earnings, 1, durableIntent);

  expect(ledger.commitPracticeRuneGrantLocally).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ amount: 18, createdAtMs: sunday, requestFingerprint: durableIntent.requestFingerprint }),
  );
});

test('upgrades a marker-only v1 Sunday intent by sealing and replaying its exact legacy amount', async () => {
  const sunday = Date.parse('2026-09-06T12:00:00.000Z');
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  const legacyFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
    amount: 9,
    reason: 'practice_session_reward',
    createdAtMs: sunday,
  })).digest('hex');
  const legacyMarker = JSON.stringify({
    earnings,
    completionOrdinal: 1,
    createdAtMs: sunday,
    requestFingerprint: legacyFingerprint,
  });
  storage[pendingKey] = legacyMarker;
  callable.mockRejectedValue(new Error('offline'));

  const durableIntent = await markPracticeRuneSettlementPending({
    ownerStableId: 'account-a', earnings, completionOrdinal: 1,
  });
  expect(durableIntent.sealedOperation).toEqual(expect.objectContaining({
    amount: 9,
    createdAtMs: sunday,
    requestFingerprint: legacyFingerprint,
  }));
  expect(JSON.parse(storage[pendingKey]!).operation).toEqual(durableIntent.sealedOperation);

  await settlePracticeRuneEarningsToServer(earnings, 1, durableIntent);
  expect(ledger.commitPracticeRuneGrantLocally).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ amount: 9, requestFingerprint: legacyFingerprint }),
  );
});

test('keeps an unknown marker-only v1 fingerprint fail-closed', async () => {
  const createdAtMs = Date.parse('2026-09-06T12:00:00.000Z');
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  const unknownFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
    amount: 8,
    reason: 'practice_session_reward',
    createdAtMs,
  })).digest('hex');
  const marker = JSON.stringify({
    earnings,
    completionOrdinal: 1,
    createdAtMs,
    requestFingerprint: unknownFingerprint,
  });
  storage[pendingKey] = marker;

  await expect(markPracticeRuneSettlementPending({
    ownerStableId: 'account-a', earnings, completionOrdinal: 1,
  })).rejects.toThrow('level_spin_star_request_conflict');
  expect(storage[pendingKey]).toBe(marker);
  expect(ledger.commitPracticeRuneGrantLocally).not.toHaveBeenCalled();
});

test('retries a Sunday intent on Monday with the original doubled bytes', async () => {
  const sunday = Date.parse('2026-09-06T23:59:00.000Z');
  const monday = Date.parse('2026-09-07T00:01:00.000Z');
  jest.spyOn(Date, 'now').mockReturnValue(sunday);
  const durableIntent = await markPracticeRuneSettlementPending({
    ownerStableId: 'account-a', earnings, completionOrdinal: 1,
  });
  jest.spyOn(Date, 'now').mockReturnValue(monday);
  callable.mockRejectedValue(new Error('offline'));

  await settlePracticeRuneEarningsToServer(earnings, 1, durableIntent);

  expect(ledger.commitPracticeRuneGrantLocally).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ amount: 18, createdAtMs: sunday, requestFingerprint: durableIntent.requestFingerprint }),
  );
});

test('does not replay an occupied ordinal for different completion bytes', async () => {
  const operationId = 'practice_rune:flashcards_blitz_attempt1_1';
  const createdAtMs = Date.parse('2026-09-02T12:00:00.000Z');
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
    amount: 9,
    reason: 'practice_session_reward',
    createdAtMs,
  })).digest('hex');
  storage[`operation:account-a:${operationId}`] = JSON.stringify({
    schemaVersion: 'client-practice-rune-operation.v1',
    operationId,
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
    amount: 9,
    reason: 'practice_session_reward',
    createdAtMs,
    requestFingerprint,
  });
  ledger.commitPracticeRuneGrantLocally.mockImplementation(async (
    _token: unknown,
    operation: { requestFingerprint: string },
  ) => {
    if (operation.requestFingerprint !== requestFingerprint) {
      throw new Error('level_spin_star_request_conflict');
    }
  });
  const differentCompletion = Object.freeze({
    ...earnings,
    creditedItemIds: Object.freeze(['card-4']),
    pendingRunes: 3,
  });

  await expect(settlePracticeRuneEarningsToServer(differentCompletion, 1)).resolves.toEqual({
    locallyCommitted: false,
    settled: false,
  });
  expect(ledger.commitPracticeRuneGrantLocally).not.toHaveBeenCalled();
});

test('flushes a pre-feature Sunday receipt on Monday without rebuilding its stable opId', async () => {
  const sunday = Date.parse('2026-09-06T12:00:00.000Z');
  const monday = Date.parse('2026-09-07T10:00:00.000Z');
  const operationId = 'practice_rune:flashcards_blitz_attempt1_1';
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
    amount: 9,
    reason: 'practice_session_reward',
    createdAtMs: sunday,
  })).digest('hex');
  const legacyOperation = {
    schemaVersion: 'client-practice-rune-operation.v1',
    operationId,
    ownerStableId: 'account-a',
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal: 1,
    amount: 9,
    reason: 'practice_session_reward',
    createdAtMs: sunday,
    requestFingerprint,
  };
  const pendingKey = 'practice_rune_pending_settlement_v1:account-a:flashcards_blitz:attempt1:1';
  storage[`operation:account-a:${operationId}`] = JSON.stringify(legacyOperation);
  storage[pendingKey] = JSON.stringify({
    earnings,
    completionOrdinal: 1,
    createdAtMs: sunday,
    requestFingerprint,
  });
  jest.spyOn(Date, 'now').mockReturnValue(monday);
  callable.mockImplementation(async ({ operation }: { operation: typeof legacyOperation }) => ({
    data: {
      materialized: true,
      operationId: operation.operationId,
      requestFingerprint: operation.requestFingerprint,
      replayed: true,
      starsBalance: 9,
      starsEarnedTotal: 9,
      starsSeq: 1,
    },
  }));

  await expect(flushStalePracticeRuneSettlements('account-a')).resolves.toEqual({
    synced: 1,
    pending: 0,
  });
  expect(callable).toHaveBeenCalledWith({ operation: legacyOperation });
  expect(ledger.commitPracticeRuneGrantLocally).toHaveBeenCalledWith(
    expect.anything(),
    legacyOperation,
  );
  expect(JSON.parse(storage[pendingKey]!).operation).toEqual(legacyOperation);
});
