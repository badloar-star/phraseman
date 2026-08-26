import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import { replayOrdinaryEconomy } from '../modules/phone-state/domains/economy';

import {
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  levelSpinStarProjectionKey,
  mergeLevelSpinServerStars,
  prepareSessionAttemptRuneRecovery,
  readUnifiedLevelSpinStars,
  recoverAndHydrateLevelSpinStarGrants,
  sessionAttemptRuneOperationStorageKey,
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

function bridgeMocks() {
  return jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
    readPhoneStateStarCreditState: jest.Mock;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 100, starsEarnedTotal: 7 };
  beginAccountGeneration('account-a');
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
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  bridgeMocks().commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(false);
  const snapshot = jest.requireMock('../app/app_snapshot_store') as {
    getAppSnapshot: jest.Mock;
    patchAppSnapshot: jest.Mock;
  };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { ...visibleProgress } }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: typeof visibleProgress }) => {
    const patch = updater({ progress: { ...visibleProgress } });
    if (patch.progress) visibleProgress = { ...visibleProgress, ...patch.progress };
  });
});

async function prepareOne() {
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  return prepareSessionAttemptRuneRecovery({
    token,
    sessionId: 'lesson-session-1',
    questionId: 'question-1',
    recoveryOrdinal: 1,
    createdAtMs: 100,
  });
}

test('prepare returns one closed -25 / +3 receipt without committing a standalone debit', async () => {
  const prepared = await prepareOne();
  expect(prepared).toMatchObject({
    duplicate: false,
    balanceBefore: 100,
    balanceAfter: 75,
    operation: {
      schemaVersion: 'client-session-attempt-recovery-rune-operation.v1',
      runeDelta: -25,
      attemptsGranted: 3,
      reason: 'restore_all_session_attempts',
      balanceBefore: 100,
      balanceAfter: 75,
    },
  });
  expect(Object.keys(storage).some((key) => key.includes('session_attempt_recovery'))).toBe(false);

  const phoneStateOperation = {
    operationId: prepared.operation.operationId,
    delta: 0,
    grant: {
      kind: 'session_attempt_recovery_rune_debit',
      entitlementId: prepared.operation.operationId,
      exactResult: prepared.operation,
    },
  };
  expect(replayOrdinaryEconomy([phoneStateOperation], 123).balance).toBe(123);
  expect(() => replayOrdinaryEconomy([{ ...phoneStateOperation, delta: -25 }], 123))
    .toThrow('phone_state_economy_composite_invalid');

  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'level_spin_star_grants.ts'), 'utf8');
  expect(source).not.toMatch(/export\s+(?:async\s+)?function\s+spendRunes/);
});

test('insufficient balance fails before any recovery operation is durable', async () => {
  visibleProgress = { stars: 24, starsEarnedTotal: 7 };
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  await expect(prepareSessionAttemptRuneRecovery({
    token, sessionId: 'lesson-session-2', questionId: 'question-2', recoveryOrdinal: 1,
  })).rejects.toThrow('session_attempt_runes_insufficient');
  expect(Object.keys(storage).some((key) => key.includes('session_attempt_recovery'))).toBe(false);
});

test('durable operation replays the same receipt and rejects operation-id reuse', async () => {
  const first = await prepareOne();
  const token = captureAccountGeneration();
  const ownerStableId = 'account-a';
  storage[sessionAttemptRuneOperationStorageKey(ownerStableId, first.operation.operationId)] = JSON.stringify(first.operation);
  storage[levelSpinStarProjectionKey(ownerStableId)] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v3',
    ownerStableId,
    operations: [first.operation],
    acknowledged: {},
    serverBalance: 100,
    serverEarnedTotal: 7,
    serverSeq: 0,
  });

  await expect(prepareSessionAttemptRuneRecovery({
    token, sessionId: 'lesson-session-1', questionId: 'question-1', recoveryOrdinal: 1, createdAtMs: 999,
  })).resolves.toMatchObject({ duplicate: true, operation: first.operation, balanceBefore: 100, balanceAfter: 75 });
  await expect(prepareSessionAttemptRuneRecovery({
    token, sessionId: 'lesson-session-1', questionId: 'different-question', recoveryOrdinal: 1,
  })).rejects.toThrow('level_spin_star_request_conflict');
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 75, earnedTotal: 7 });
});

test('a newer server snapshot cannot erase the durable local recovery debit', async () => {
  const first = await prepareOne();
  const token = captureAccountGeneration();
  storage[sessionAttemptRuneOperationStorageKey('account-a', first.operation.operationId)] = JSON.stringify(first.operation);
  storage[levelSpinStarProjectionKey('account-a')] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v3', ownerStableId: 'account-a',
    operations: [first.operation], acknowledged: {}, serverBalance: 100, serverEarnedTotal: 7, serverSeq: 0,
  });
  await expect(mergeLevelSpinServerStars(token, { stars: 120, starsEarnedTotal: 8, starsSeq: 1 }))
    .resolves.toEqual({ balance: 95, earnedTotal: 8 });
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 95, earnedTotal: 8 });
});

test('account generation change blocks stale preparation', async () => {
  const token = captureAccountGeneration();
  beginAccountGeneration('account-b');
  await expect(prepareSessionAttemptRuneRecovery({
    token, sessionId: 'lesson-session-3', questionId: 'question-3', recoveryOrdinal: 1,
  })).rejects.toThrow('level_spin_star_identity_changed');
});
