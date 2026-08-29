import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { useSessionAttempts } from '../hooks/useSessionAttempts';

const mockCoordinator = {
  commitSessionAttemptRecovery: jest.fn(),
  hydrateSessionAttemptsState: jest.fn(),
  persistSessionAttemptsState: jest.fn(),
  recoverPreparedSessionAttemptRecoveries: jest.fn(),
};

jest.mock('../app/session_attempts/session_attempt_recovery', () => ({
  commitSessionAttemptRecovery: (...args: unknown[]) => mockCoordinator.commitSessionAttemptRecovery(...args),
  hydrateSessionAttemptsState: (...args: unknown[]) => mockCoordinator.hydrateSessionAttemptsState(...args),
  persistSessionAttemptsState: (...args: unknown[]) => mockCoordinator.persistSessionAttemptsState(...args),
  recoverPreparedSessionAttemptRecoveries: (...args: unknown[]) => mockCoordinator.recoverPreparedSessionAttemptRecoveries(...args),
}));
jest.mock('../app/session_attempts/session_attempt_restore_inventory', () => ({
  readAttemptRestoreGiftCount: jest.fn().mockResolvedValue(2),
}));
jest.mock('../app/level_spin_star_grants', () => ({
  readUnifiedLevelSpinStars: jest.fn().mockResolvedValue({ balance: 80, earnedTotal: 0 }),
}));

afterEach(async () => { await cleanup(); });

beforeEach(() => {
  jest.clearAllMocks();
  beginAccountGeneration('account-a');
  mockCoordinator.hydrateSessionAttemptsState.mockResolvedValue(null);
  mockCoordinator.persistSessionAttemptsState.mockResolvedValue(undefined);
  mockCoordinator.recoverPreparedSessionAttemptRecoveries.mockResolvedValue({ recovered: 0, pending: 0 });
});

test('registerVerdict returns exhaustion immediately, deduplicates callbacks, and drives loss sequence', async () => {
  const token = captureAccountGeneration();
  const hook = await renderHook(() => useSessionAttempts({
    token,
    sessionId: 'lesson-1',
    initialQuestionId: 'question-1',
    autoHydrate: false,
  }));

  let effect = 'none';
  await act(() => { effect = hook.result.current.registerVerdict({ answerAttemptId: 'a1', verdict: 'pedagogical_wrong' }); });
  expect(effect).toBe('attempt_consumed');
  expect(hook.result.current).toMatchObject({ state: { remainingAttempts: 2 }, lossSequence: 1 });

  await act(() => { effect = hook.result.current.registerVerdict({ answerAttemptId: 'a1', verdict: 'pedagogical_wrong' }); });
  expect(effect).toBe('none');
  expect(hook.result.current).toMatchObject({ state: { remainingAttempts: 2 }, lossSequence: 1 });

  await act(() => { hook.result.current.registerVerdict({ answerAttemptId: 'a2', verdict: 'pedagogical_wrong' }); });
  await act(() => { effect = hook.result.current.registerVerdict({ answerAttemptId: 'a3', verdict: 'pedagogical_wrong' }); });
  expect(effect).toBe('attempts_exhausted');
  expect(hook.result.current).toMatchObject({
    state: { remainingAttempts: 0, phase: 'awaiting_recovery' },
    lossSequence: 3,
  });
});

test('session-rune forfeiture restores the current question for every user without a durable recovery', async () => {
  const token = captureAccountGeneration();
  const hook = await renderHook(() => useSessionAttempts({
    token,
    sessionId: 'premium-forfeit-1',
    initialQuestionId: 'question-1',
    autoHydrate: false,
  }));

  await act(() => { hook.result.current.registerVerdict({ answerAttemptId: 'a1', verdict: 'pedagogical_wrong' }); });
  await act(() => { hook.result.current.registerVerdict({ answerAttemptId: 'a2', verdict: 'pedagogical_wrong' }); });
  await act(() => { hook.result.current.registerVerdict({ answerAttemptId: 'a3', verdict: 'pedagogical_wrong' }); });

  await act(() => { hook.result.current.restoreAfterSessionRuneForfeit(); });
  expect(hook.result.current.state).toMatchObject({
    remainingAttempts: 3,
    phase: 'active',
    questionId: 'question-1',
    recoveryOrdinal: 1,
  });
  expect(mockCoordinator.commitSessionAttemptRecovery).not.toHaveBeenCalled();
  expect(mockCoordinator.persistSessionAttemptsState).toHaveBeenCalled();
});

test('hydrate restores the blocking zero-attempt state and resource choices after remount', async () => {
  const token = captureAccountGeneration();
  mockCoordinator.hydrateSessionAttemptsState.mockResolvedValue({
    schemaVersion: 'session-attempts-state.v1',
    sessionId: 'blitz-1',
    questionId: 'q7',
    maxAttempts: 3,
    remainingAttempts: 0,
    phase: 'awaiting_recovery',
    recoveryOrdinal: 0,
    processedAnswerAttemptIds: ['a1', 'a2', 'a3'],
    recoveryReceiptIds: [],
  });
  const hook = await renderHook(() => useSessionAttempts({
    token,
    sessionId: 'blitz-1',
    initialQuestionId: 'q1',
  }));

  await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
  expect(hook.result.current).toMatchObject({
    state: { remainingAttempts: 0, phase: 'awaiting_recovery', questionId: 'q7' },
    giftCount: 2,
    runeBalance: 80,
  });
});

test('successful gift recovery restores the same question and exposes busy state safely', async () => {
  const token = captureAccountGeneration();
  const restoredState = {
    schemaVersion: 'session-attempts-state.v1' as const,
    sessionId: 'voice-1', questionId: 'voice-q', maxAttempts: 3 as const,
    remainingAttempts: 3 as const, phase: 'active' as const, recoveryOrdinal: 1,
    processedAnswerAttemptIds: ['a1', 'a2', 'a3'], recoveryReceiptIds: ['receipt-1'],
  };
  mockCoordinator.commitSessionAttemptRecovery.mockResolvedValue({
    duplicate: false, source: 'gift', attemptsState: restoredState, receiptId: 'receipt-1',
  });
  mockCoordinator.hydrateSessionAttemptsState.mockResolvedValue({ ...restoredState, remainingAttempts: 0, phase: 'awaiting_recovery' });
  const hook = await renderHook(() => useSessionAttempts({
    token, sessionId: 'voice-1', initialQuestionId: 'voice-q',
  }));
  await waitFor(() => expect(hook.result.current.hydrated).toBe(true));

  await act(async () => { await hook.result.current.recoverWithGift(); });
  expect(mockCoordinator.commitSessionAttemptRecovery).toHaveBeenCalledWith(expect.objectContaining({ source: 'gift' }));
  expect(hook.result.current).toMatchObject({
    state: { remainingAttempts: 3, phase: 'active', questionId: 'voice-q' },
    recoveryBusy: false,
    recoveryError: null,
  });
});

test('two recovery taps in the same frame commit only one durable operation', async () => {
  const token = captureAccountGeneration();
  let releaseCommit!: () => void;
  const commitPending = new Promise<void>((resolve) => { releaseCommit = resolve; });
  const restoredState = {
    schemaVersion: 'session-attempts-state.v1' as const,
    sessionId: 'double-tap-1', questionId: 'same-question', maxAttempts: 3 as const,
    remainingAttempts: 3 as const, phase: 'active' as const, recoveryOrdinal: 1,
    processedAnswerAttemptIds: ['a1', 'a2', 'a3'], recoveryReceiptIds: ['receipt-double-tap'],
  };
  mockCoordinator.commitSessionAttemptRecovery.mockImplementation(async () => {
    await commitPending;
    return {
      duplicate: false,
      source: 'gift',
      attemptsState: restoredState,
      receiptId: 'receipt-double-tap',
    };
  });

  const hook = await renderHook(() => useSessionAttempts({
    token,
    sessionId: 'double-tap-1',
    initialQuestionId: 'same-question',
    autoHydrate: false,
  }));

  let first!: Promise<void>;
  let second!: Promise<void>;
  await act(() => {
    first = hook.result.current.recoverWithGift();
    second = hook.result.current.recoverWithGift();
  });
  expect(mockCoordinator.commitSessionAttemptRecovery).toHaveBeenCalledTimes(1);

  releaseCommit();
  await act(async () => { await Promise.all([first, second]); });
});
