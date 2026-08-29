import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import { practiceRuneSettledOnceStorageKey } from '../app/practice_rune_earnings';
import { usePracticeRunes } from '../hooks/usePracticeRunes';

const settlement = {
  clearPracticeRuneSettlementPending: jest.fn(),
  flushStalePracticeRuneSettlements: jest.fn(),
  markPracticeRuneSettlementPending: jest.fn(),
  settlePracticeRuneEarningsToServer: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn().mockResolvedValue('account-a') }));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../app/practice_rune_settlement', () => ({
  clearPracticeRuneSettlementPending: (...args: unknown[]) => settlement.clearPracticeRuneSettlementPending(...args),
  flushStalePracticeRuneSettlements: (...args: unknown[]) => settlement.flushStalePracticeRuneSettlements(...args),
  markPracticeRuneSettlementPending: (...args: unknown[]) => settlement.markPracticeRuneSettlementPending(...args),
  settlePracticeRuneEarningsToServer: (...args: unknown[]) => settlement.settlePracticeRuneEarningsToServer(...args),
}));

const storage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  settlement.markPracticeRuneSettlementPending.mockResolvedValue(undefined);
  settlement.clearPracticeRuneSettlementPending.mockResolvedValue(undefined);
  settlement.flushStalePracticeRuneSettlements.mockResolvedValue({ synced: 0, pending: 0 });
  settlement.settlePracticeRuneEarningsToServer.mockResolvedValue({ locallyCommitted: true, settled: false });
});

afterEach(async () => { await cleanup(); });

test('completion keeps the earned rune amount visible when cloud sync is unavailable', async () => {
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt1',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));

  await act(() => {
    expect(hook.result.current.onCorrectAnswer('card-1')).toBe(3);
  });
  expect(hook.result.current.runes).toBe(3);

  await act(async () => {
    await hook.result.current.settle();
  });
  expect(hook.result.current.runes).toBe(3);
  expect(settlement.settlePracticeRuneEarningsToServer).toHaveBeenCalledTimes(1);
});

test('a Blitz rerun with a new session key starts a fresh accumulator without remounting', async () => {
  type Props = Readonly<{ sessionKey: string }>;
  const hook = await renderHook(
    ({ sessionKey }: Props) => usePracticeRunes({
      activity: 'flashcards_blitz',
      sessionKey,
      completionOrdinal: 1,
    }),
    { initialProps: { sessionKey: 'attempt-1' } },
  );
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));

  await act(() => {
    expect(hook.result.current.onCorrectAnswer('same-card')).toBe(3);
  });
  expect(hook.result.current.runes).toBe(3);

  await hook.rerender({ sessionKey: 'attempt-2' });
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  expect(hook.result.current.runes).toBe(0);

  await act(() => {
    expect(hook.result.current.onCorrectAnswer('same-card')).toBe(3);
  });
  expect(hook.result.current.runes).toBe(3);
});

test('concurrent completion effects settle one idempotent operation only once', async () => {
  const finishSettlements: ((value: { locallyCommitted: true; settled: false }) => void)[] = [];
  settlement.settlePracticeRuneEarningsToServer.mockImplementation(() => new Promise((resolve) => {
    finishSettlements.push(resolve);
  }));
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-concurrent',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { hook.result.current.onCorrectAnswer('card-1'); });

  let first: Promise<void>;
  let second: Promise<void>;
  await act(async () => {
    first = hook.result.current.settle();
    second = hook.result.current.settle();
    await waitFor(() => expect(finishSettlements.length).toBeGreaterThan(0));
    finishSettlements.forEach((finish) => finish({ locallyCommitted: true, settled: false }));
    await Promise.all([first!, second!]);
  });
  expect(settlement.settlePracticeRuneEarningsToServer).toHaveBeenCalledTimes(1);
});

test('an older settle cannot erase runes earned after pressing Repeat', async () => {
  let finishFirst!: (value: { locallyCommitted: true; settled: false }) => void;
  settlement.settlePracticeRuneEarningsToServer
    .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
    .mockResolvedValueOnce({ locallyCommitted: true, settled: false });
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'vocabulary',
    sessionKey: 'lesson_progress_v2::fr::1',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { expect(hook.result.current.onCorrectAnswer('same-card')).toBe(3); });

  let firstSettle!: Promise<void>;
  await act(async () => {
    firstSettle = hook.result.current.settle();
    await waitFor(() => expect(settlement.settlePracticeRuneEarningsToServer).toHaveBeenCalledTimes(1));
  });
  await act(() => {
    hook.result.current.startNewCompletion();
    expect(hook.result.current.onCorrectAnswer('same-card')).toBe(1);
  });
  expect(hook.result.current.runes).toBe(1);

  await act(async () => { await hook.result.current.settle(); });
  const settledOnceKey = practiceRuneSettledOnceStorageKey({
    ownerStableId: 'account-a',
    activity: 'vocabulary',
    sessionKey: 'lesson_progress_v2::fr::1',
  });
  expect(storage[settledOnceKey]).toBe('2');

  await act(async () => {
    finishFirst({ locallyCommitted: true, settled: false });
    await firstSettle;
  });
  expect(hook.result.current.runes).toBe(1);
  expect(storage[settledOnceKey]).toBe('2');

  const ordinals = settlement.markPracticeRuneSettlementPending.mock.calls
    .map(([request]) => request.completionOrdinal);
  expect(ordinals).toEqual([1, 2]);
});

test('failed composite close retries the same completion ordinal instead of minting the next one', async () => {
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-crash-window',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { hook.result.current.onCorrectAnswer('card-1'); });
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (pairs: [string, string][]) => {
    const [firstKey, firstValue] = pairs[0];
    storage[firstKey] = firstValue;
    throw new Error('simulated-kill-after-first-write');
  });

  await act(async () => {
    await expect(hook.result.current.settle()).rejects.toThrow('simulated-kill-after-first-write');
  });
  await act(async () => { await hook.result.current.settle(); });

  expect(settlement.settlePracticeRuneEarningsToServer).toHaveBeenCalledTimes(2);
  expect(settlement.settlePracticeRuneEarningsToServer.mock.calls.map((call) => call[1]))
    .toEqual([1, 1]);
});
