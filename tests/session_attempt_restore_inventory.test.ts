import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  attemptRestoreGiftProjectionKey,
  creditAttemptRestoreGiftFromSpin,
  prepareAttemptRestoreGiftConsume,
  readAttemptRestoreGiftCount,
  replayAttemptRestoreGiftOperations,
  syncPendingAttemptRestoreGiftOperations,
} from '../app/session_attempts/session_attempt_restore_inventory';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
}));

const storage: Record<string, string> = {};

function bridgeCommit(): jest.Mock {
  return (jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
  }).commitPhoneStateNonMonetaryEconomyGrant;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  bridgeCommit().mockResolvedValue(false);
});

test('the same Spin occurrence credits exactly once while distinct occurrences stack', async () => {
  const token = captureAccountGeneration();
  const first = { token, spinRequestId: 'spinrequest000001', lane: 'base' as const, createdAtMs: 100 };

  await expect(creditAttemptRestoreGiftFromSpin(first)).resolves.toEqual({ duplicate: false, count: 1 });
  await expect(creditAttemptRestoreGiftFromSpin({ ...first, createdAtMs: 999 })).resolves.toEqual({ duplicate: true, count: 1 });
  await expect(creditAttemptRestoreGiftFromSpin({
    token, spinRequestId: 'spinrequest000002', lane: 'premium', createdAtMs: 200,
  })).resolves.toEqual({ duplicate: false, count: 2 });

  expect(await readAttemptRestoreGiftCount(token)).toBe(2);
  const serialized = Object.values(storage).join('\n');
  expect(serialized).not.toContain('expiresAtMs');
});

test('gift availability does not decay after 365 days', async () => {
  const token = captureAccountGeneration();
  await creditAttemptRestoreGiftFromSpin({
    token, spinRequestId: 'spinrequest000003', lane: 'base', createdAtMs: 1_000,
  });
  const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000 + 365 * 24 * 60 * 60 * 1_000);
  await expect(readAttemptRestoreGiftCount(token)).resolves.toBe(1);
  nowSpy.mockRestore();
});

test('prepared consumes reserve one gift, replay idempotently, and cannot go negative', async () => {
  const token = captureAccountGeneration();
  await creditAttemptRestoreGiftFromSpin({ token, spinRequestId: 'spinrequest000004', lane: 'base' });
  await creditAttemptRestoreGiftFromSpin({ token, spinRequestId: 'spinrequest000005', lane: 'base' });

  const first = await prepareAttemptRestoreGiftConsume({
    token, sessionId: 'lesson-session-1', questionId: 'question-1', recoveryOrdinal: 1,
  });
  const replayed = await prepareAttemptRestoreGiftConsume({
    token, sessionId: 'lesson-session-1', questionId: 'question-1', recoveryOrdinal: 1,
  });
  expect(replayed).toEqual(first);
  const second = await prepareAttemptRestoreGiftConsume({
    token, sessionId: 'lesson-session-1', questionId: 'question-1', recoveryOrdinal: 2,
  });
  await expect(prepareAttemptRestoreGiftConsume({
    token, sessionId: 'lesson-session-1', questionId: 'question-1', recoveryOrdinal: 3,
  })).rejects.toThrow('attempt_restore_gift_unavailable');

  const projection = JSON.parse(storage[attemptRestoreGiftProjectionKey('account-a')]);
  expect(replayAttemptRestoreGiftOperations([...projection.operations, first, first]).count).toBe(1);
  expect(replayAttemptRestoreGiftOperations([...projection.operations, first, second]).count).toBe(0);
});

test('same operation id with a different fingerprint fails closed', async () => {
  const token = captureAccountGeneration();
  await creditAttemptRestoreGiftFromSpin({ token, spinRequestId: 'spinrequest000006', lane: 'base' });
  const projection = JSON.parse(storage[attemptRestoreGiftProjectionKey('account-a')]);
  const original = projection.operations[0];
  expect(() => replayAttemptRestoreGiftOperations([
    original,
    { ...original, requestFingerprint: 'b'.repeat(64) },
  ])).toThrow('attempt_restore_operation_id_conflict');
  expect(() => replayAttemptRestoreGiftOperations([
    original,
    { ...original, operationId: 'attempt_restore_credit:spinrequest000099.base', spinRequestId: 'spinrequest000099', ownerStableId: 'account-b' },
  ])).toThrow('attempt_restore_owner_conflict');
});

test('owner-scoped storage never leaks inventory across account generations', async () => {
  const tokenA = captureAccountGeneration();
  await creditAttemptRestoreGiftFromSpin({ token: tokenA, spinRequestId: 'spinrequest000007', lane: 'base' });

  beginAccountGeneration('account-b');
  const tokenB = captureAccountGeneration();
  expect(await readAttemptRestoreGiftCount(tokenB)).toBe(0);
  await creditAttemptRestoreGiftFromSpin({ token: tokenB, spinRequestId: 'spinrequest000008', lane: 'base' });
  expect(await readAttemptRestoreGiftCount(tokenB)).toBe(1);

  beginAccountGeneration('account-a');
  expect(await readAttemptRestoreGiftCount(captureAccountGeneration())).toBe(1);
  await expect(readAttemptRestoreGiftCount(tokenA)).rejects.toThrow('attempt_restore_identity_changed');
});

test('malformed and oversized projections are preserved and rejected', async () => {
  const token = captureAccountGeneration();
  const key = attemptRestoreGiftProjectionKey('account-a');
  storage[key] = '{"schemaVersion":"wrong"}';
  await expect(readAttemptRestoreGiftCount(token)).rejects.toThrow('attempt_restore_projection_corrupt');
  expect(storage[key]).toBe('{"schemaVersion":"wrong"}');

  storage[key] = JSON.stringify({
    schemaVersion: 'client-attempt-restore-gift-projection.v1',
    ownerStableId: 'account-a',
    operations: new Array(4097).fill(null),
    synced: {},
  });
  await expect(readAttemptRestoreGiftCount(token)).rejects.toThrow('attempt_restore_projection_corrupt');
});

test('pending credits sync as exact zero-delta Phone State grants', async () => {
  const token = captureAccountGeneration();
  await creditAttemptRestoreGiftFromSpin({ token, spinRequestId: 'spinrequest000009', lane: 'base' });
  bridgeCommit().mockResolvedValue(true);
  await expect(syncPendingAttemptRestoreGiftOperations(token)).resolves.toEqual(expect.objectContaining({ pending: 0 }));
  expect(bridgeCommit()).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'attempt_restore_inventory_credit',
    expectedOwnerStableId: 'account-a',
    expectedAccountGeneration: token.generation,
  }));
});
