import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  creditAttemptRestoreGiftFromSpin,
  readAttemptRestoreGiftCount,
} from '../app/session_attempts/session_attempt_restore_inventory';
import {
  commitSessionAttemptRecovery,
  hydrateSessionAttemptsState,
  recoverPreparedSessionAttemptRecoveries,
  sessionAttemptRecoveryPreparedKey,
  sessionAttemptRecoveryReceiptKey,
} from '../app/session_attempts/session_attempt_recovery';
import {
  createSessionAttemptsState,
  reduceSessionAttempts,
  type SessionAttemptsStateV1,
} from '../app/session_attempts/session_attempts_domain';
import {
  readUnifiedLevelSpinStars,
  recoverAndHydrateLevelSpinStarGrants,
} from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn().mockResolvedValue(false),
  readPhoneStateStarCreditState: jest.fn().mockResolvedValue({ credits: [], acknowledgements: [] }),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({
  getAppSnapshot: jest.fn(() => ({ progress: { stars: 100, starsEarnedTotal: 7 } })),
  patchAppSnapshot: jest.fn(),
}));

const storage: Record<string, string> = {};

function exhaustedState(sessionId = 'lesson-1'): SessionAttemptsStateV1 {
  let state = createSessionAttemptsState({ sessionId, questionId: 'question-3' });
  for (let index = 1; index <= 3; index += 1) {
    state = reduceSessionAttempts(state, {
      type: 'verdict',
      answerAttemptId: `answer-${index}`,
      verdict: 'pedagogical_wrong',
    }).state;
  }
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
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
});

test('rune recovery commits one debit and one three-attempt receipt, then replays idempotently', async () => {
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  const state = exhaustedState();

  const first = await commitSessionAttemptRecovery({ source: 'runes', token, sessionState: state });
  expect(first).toMatchObject({
    duplicate: false,
    source: 'runes',
    attemptsState: { remainingAttempts: 3, phase: 'active', recoveryOrdinal: 1 },
  });
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 75, earnedTotal: 7 });
  expect(storage[sessionAttemptRecoveryReceiptKey('account-a', first.receiptId)]).toBeDefined();

  await expect(commitSessionAttemptRecovery({ source: 'runes', token, sessionState: state }))
    .resolves.toMatchObject({ duplicate: true, receiptId: first.receiptId });
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 75, earnedTotal: 7 });
});

test('gift recovery consumes exactly one permanent gift and grants attempts once', async () => {
  const token = captureAccountGeneration();
  await creditAttemptRestoreGiftFromSpin({
    token, spinRequestId: 'spinrequestrecovery001', lane: 'base', createdAtMs: 10,
  });
  await expect(readAttemptRestoreGiftCount(token)).resolves.toBe(1);

  const state = exhaustedState('dictionary-1');
  const first = await commitSessionAttemptRecovery({ source: 'gift', token, sessionState: state });
  expect(first).toMatchObject({ duplicate: false, source: 'gift', attemptsState: { remainingAttempts: 3 } });
  await expect(readAttemptRestoreGiftCount(token)).resolves.toBe(0);
  await expect(commitSessionAttemptRecovery({ source: 'gift', token, sessionState: state }))
    .resolves.toMatchObject({ duplicate: true, receiptId: first.receiptId });
  await expect(readAttemptRestoreGiftCount(token)).resolves.toBe(0);
});

test('failed atomic commit leaves no debit or attempts receipt and prepared recovery converges on retry', async () => {
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  const state = exhaustedState('blitz-1');
  let failFinalCommit = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    const isFinal = pairs.some(([key]) => key.includes('session_attempt_recovery_receipt_v1:'));
    if (isFinal && failFinalCommit) {
      failFinalCommit = false;
      throw new Error('injected_multi_set_failure');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });

  await expect(commitSessionAttemptRecovery({ source: 'runes', token, sessionState: state }))
    .rejects.toThrow('injected_multi_set_failure');
  expect(Object.keys(storage).some((key) => key.includes('session_attempt_recovery_receipt_v1:'))).toBe(false);
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 100, earnedTotal: 7 });
  expect(storage[sessionAttemptRecoveryPreparedKey('account-a', 'blitz-1', 1)]).toBeDefined();

  await expect(recoverPreparedSessionAttemptRecoveries(token)).resolves.toMatchObject({ recovered: 1 });
  const hydrated = await hydrateSessionAttemptsState(token, 'blitz-1');
  expect(hydrated).toMatchObject({ remainingAttempts: 3, phase: 'active', recoveryOrdinal: 1 });
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 75, earnedTotal: 7 });
});

test('cleanup failure after durable commit cannot charge twice', async () => {
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  const state = exhaustedState('voice-1');
  let failCleanup = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key.includes('session_attempt_recovery_prepared_v1:') && failCleanup) {
      failCleanup = false;
      throw new Error('injected_cleanup_failure');
    }
    delete storage[key];
  });

  const first = await commitSessionAttemptRecovery({ source: 'runes', token, sessionState: state });
  expect(first.duplicate).toBe(false);
  expect(storage[sessionAttemptRecoveryPreparedKey('account-a', 'voice-1', 1)]).toBeDefined();
  await expect(commitSessionAttemptRecovery({ source: 'runes', token, sessionState: state }))
    .resolves.toMatchObject({ duplicate: true, receiptId: first.receiptId });
  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 75, earnedTotal: 7 });
});

test('stale account generation cannot restore or spend another account resource', async () => {
  const token = captureAccountGeneration();
  beginAccountGeneration('account-b');
  await expect(commitSessionAttemptRecovery({
    source: 'runes', token, sessionState: exhaustedState('lesson-stale'),
  })).rejects.toThrow('session_attempt_recovery_identity_changed');
  expect(Object.keys(storage).some((key) => key.includes('session_attempt_recovery_receipt_v1:'))).toBe(false);
});
