import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markPracticeRuneSettlementPending,
  settlePracticeRuneEarningsToServer,
} from '../app/practice_rune_settlement';

const events: string[] = [];
const ledger = {
  commitPracticeRuneGrantLocally: jest.fn(),
  acknowledgePracticeRuneGrantLocally: jest.fn(),
};
const callable = jest.fn();

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
  const storage: Record<string, string> = {};
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
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
