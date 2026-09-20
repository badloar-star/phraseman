import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import {
  practiceRuneEarningsStorageKey,
  practiceRuneSettledOnceStorageKey,
} from '../app/practice_rune_earnings';
import { usePracticeRunes } from '../hooks/usePracticeRunes';

const settlement = {
  clearPracticeRuneSettlementPending: jest.fn(),
  flushStalePracticeRuneSettlements: jest.fn(),
  markPracticeRuneSettlementPending: jest.fn(),
  readCommittedPracticeRuneCompletionOrdinal: jest.fn(),
  readCommittedPracticeRuneSettlementEarnings: jest.fn(),
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
  readCommittedPracticeRuneCompletionOrdinal: (...args: unknown[]) => (
    settlement.readCommittedPracticeRuneCompletionOrdinal(...args)
  ),
  readCommittedPracticeRuneSettlementEarnings: (...args: unknown[]) => (
    settlement.readCommittedPracticeRuneSettlementEarnings(...args)
  ),
  settlePracticeRuneEarningsToServer: (...args: unknown[]) => settlement.settlePracticeRuneEarningsToServer(...args),
}));

const storage: Record<string, string> = {};
let nowMs = Date.UTC(2026, 8, 21, 12, 0, 0); // Monday: ordinary rune amounts.

beforeEach(() => {
  jest.clearAllMocks();
  nowMs = Date.UTC(2026, 8, 21, 12, 0, 0);
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
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
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockResolvedValue(0);
  settlement.readCommittedPracticeRuneSettlementEarnings.mockResolvedValue(null);
  settlement.settlePracticeRuneEarningsToServer.mockResolvedValue({ locallyCommitted: true, settled: false });
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('Sunday practice displays and animates doubled runes while keeping the base accumulator immutable', async () => {
  nowMs = Date.UTC(2026, 8, 20, 12, 0, 0); // Sunday UTC.
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'lesson', sessionKey: 'sunday-visible-runes', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));

  await act(() => { expect(hook.result.current.onCorrectAnswer('cell-1', 1)).toBe(6); });
  expect(hook.result.current.runes).toBe(6);

  await act(async () => { await hook.result.current.settle(); });
  expect(settlement.markPracticeRuneSettlementPending).toHaveBeenCalledWith(
    expect.objectContaining({
      earnings: expect.objectContaining({ pendingRunes: 3 }),
    }),
  );
  expect(settlement.settlePracticeRuneEarningsToServer).toHaveBeenCalledWith(
    expect.objectContaining({ pendingRunes: 3 }),
    expect.any(Number),
    undefined,
  );
});

test('re-projects a mounted practice counter at every Sunday promotion boundary', async () => {
  jest.useFakeTimers();
  const monday = Date.UTC(2026, 8, 21, 12, 0, 0);
  const sunday = Date.UTC(2026, 8, 27, 0, 0, 0);
  const followingMonday = Date.UTC(2026, 8, 28, 0, 0, 0);
  nowMs = monday;
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'lesson', sessionKey: 'sunday-boundary-runes', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { expect(hook.result.current.onCorrectAnswer('cell-1', 1)).toBe(3); });
  expect(hook.result.current.runes).toBe(3);

  nowMs = sunday;
  await act(async () => { jest.advanceTimersByTime(sunday - monday); });
  expect(hook.result.current.runes).toBe(6);

  nowMs = followingMonday;
  await act(async () => { jest.advanceTimersByTime(followingMonday - sunday); });
  expect(hook.result.current.runes).toBe(3);
});

test('lesson hook forwards the upcoming correct streak to normal and DEV awards', async () => {
  const normal = await renderHook(() => usePracticeRunes({
    activity: 'lesson', sessionKey: 'lesson-streak-hook', completionOrdinal: 1,
  }));
  await waitFor(() => expect(normal.result.current.hydrating).toBe(false));
  const normalAward = normal.result.current.onCorrectAnswer as (
    itemId: string,
    correctStreak?: number,
  ) => number;
  await act(() => {
    for (let streak = 1; streak < 10; streak += 1) {
      expect(normalAward(`cell-${streak}`, streak)).toBe(3);
    }
  });
  await act(() => { expect(normalAward('cell-10', 10)).toBe(4); });
  expect(normal.result.current.runes).toBe(31);
  await normal.unmount();

  const dev = await renderHook(() => usePracticeRunes({
    activity: 'lesson',
    sessionKey: 'lesson-streak-hook-dev',
    completionOrdinal: 1,
    devFakeStartRunes: 20,
  }));
  const devAward = dev.result.current.onCorrectAnswer as (
    itemId: string,
    correctStreak?: number,
  ) => number;
  await act(() => {
    for (let streak = 1; streak < 10; streak += 1) {
      expect(devAward(`cell-${streak}`, streak)).toBe(3);
    }
  });
  await act(() => { expect(devAward('cell-10', 10)).toBe(4); });
  expect(dev.result.current.runes).toBe(51);
});

test('next portion preserves pending runes until a local commit succeeds', async () => {
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'irregular_verbs', sessionKey: 'portion-guard', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { hook.result.current.onCorrectAnswer('eat'); });
  await act(() => { expect(hook.result.current.startNewCompletionIfSettled()).toBe(false); });
  expect(hook.result.current.runes).toBe(3);
  settlement.settlePracticeRuneEarningsToServer.mockResolvedValueOnce({ locallyCommitted: false, settled: false });
  await act(async () => { await hook.result.current.settle(); });
  await act(() => { expect(hook.result.current.startNewCompletionIfSettled()).toBe(false); });
  expect(hook.result.current.runes).toBe(3);
  await act(async () => { await hook.result.current.settle(); });
  await act(() => { expect(hook.result.current.startNewCompletionIfSettled()).toBe(true); });
  expect(hook.result.current.runes).toBe(0);
  await act(() => { expect(hook.result.current.onCorrectAnswer('go')).toBe(1); });
});

test('next portion waits while settlement is in flight', async () => {
  let finish!: (value: { locallyCommitted: boolean; settled: boolean }) => void;
  settlement.settlePracticeRuneEarningsToServer.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'irregular_verbs', sessionKey: 'portion-in-flight', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { hook.result.current.onCorrectAnswer('eat'); });
  let pending!: Promise<void>;
  await act(async () => {
    pending = hook.result.current.settle();
    await waitFor(() => expect(finish).toBeDefined());
    expect(hook.result.current.startNewCompletionIfSettled()).toBe(false);
    finish({ locallyCommitted: true, settled: false });
    await pending;
  });
  await act(() => { expect(hook.result.current.startNewCompletionIfSettled()).toBe(true); });
});

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

test('ordinal recovery read failure does not wedge hydration', async () => {
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockRejectedValueOnce(
    new Error('simulated-storage-read-failure'),
  );
  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-recovery-read-failure',
    completionOrdinal: 1,
  }));

  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { expect(hook.result.current.onCorrectAnswer('card-1')).toBe(3); });
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

test('restart after local commit but before settled marker preserves both completions', async () => {
  let durableOrdinal = 0;
  const committed: { completionOrdinal: number; amount: number }[] = [];
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockImplementation(async () => durableOrdinal);
  settlement.settlePracticeRuneEarningsToServer.mockImplementation(async (
    current: { pendingRunes: number },
    completionOrdinal: number,
  ) => {
    if (!committed.some((entry) => entry.completionOrdinal === completionOrdinal)) {
      committed.push({ completionOrdinal, amount: current.pendingRunes });
      durableOrdinal = Math.max(durableOrdinal, completionOrdinal);
    }
    return { locallyCommitted: true, settled: false };
  });

  const first = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-local-commit-crash',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(first.result.current.hydrating).toBe(false));
  await act(() => { expect(first.result.current.onCorrectAnswer('card-1')).toBe(3); });
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (pairs: [string, string][]) => {
    const [settledEarnings] = pairs;
    storage[settledEarnings[0]] = settledEarnings[1];
    throw new Error('simulated-kill-before-settled-once');
  });
  await act(async () => {
    await expect(first.result.current.settle()).rejects.toThrow('simulated-kill-before-settled-once');
  });
  await first.unmount();

  const restarted = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-local-commit-crash',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(restarted.result.current.hydrating).toBe(false));
  await act(() => { expect(restarted.result.current.onCorrectAnswer('card-1')).toBe(1); });
  await act(async () => { await restarted.result.current.settle(); });

  expect(committed).toEqual([
    { completionOrdinal: 1, amount: 3 },
    { completionOrdinal: 2, amount: 1 },
  ]);
});

test('restart splits answers added after a committed receipt into the next completion', async () => {
  const earningsKey = practiceRuneEarningsStorageKey({
    ownerStableId: 'account-a', activity: 'flashcards_blitz', sessionKey: 'attempt-split',
  });
  storage[earningsKey] = JSON.stringify({
    schemaVersion: 'practice-rune-accumulator.v2',
    completionOrdinal: 1,
    earnings: {
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'flashcards_blitz',
      sessionKey: 'attempt-split',
      awardPerItem: 3,
      creditedItemIds: ['card-1', 'card-2'],
      pendingRunes: 6,
    },
  });
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockResolvedValue(1);
  settlement.readCommittedPracticeRuneSettlementEarnings.mockResolvedValue({
    schemaVersion: 'practice-rune-earnings.v1',
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-split',
    awardPerItem: 3,
    creditedItemIds: ['card-1'],
    pendingRunes: 3,
  });

  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz', sessionKey: 'attempt-split', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));

  expect(hook.result.current.runes).toBe(3);
  await act(() => { expect(hook.result.current.onCorrectAnswer('card-3')).toBe(3); });
  await act(async () => { await hook.result.current.settle(); });
  expect(settlement.markPracticeRuneSettlementPending).toHaveBeenCalledWith(
    expect.objectContaining({
      completionOrdinal: 2,
      earnings: expect.objectContaining({
        awardPerItem: 3,
        creditedItemIds: ['card-2', 'card-3'],
        pendingRunes: 6,
      }),
    }),
  );
});

test('restart preserves a lesson streak bonus earned after a committed prefix', async () => {
  const creditedItemIds = Array.from({ length: 11 }, (_, index) => `cell-${index + 1}`);
  const earningsKey = practiceRuneEarningsStorageKey({
    ownerStableId: 'account-a', activity: 'lesson', sessionKey: 'lesson-streak-split',
  });
  storage[earningsKey] = JSON.stringify({
    schemaVersion: 'practice-rune-accumulator.v2',
    completionOrdinal: 1,
    earnings: {
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'lesson',
      sessionKey: 'lesson-streak-split',
      awardPerItem: 3,
      creditedItemIds,
      pendingRunes: 35,
    },
  });
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockResolvedValue(1);
  settlement.readCommittedPracticeRuneSettlementEarnings.mockResolvedValue({
    schemaVersion: 'practice-rune-earnings.v1',
    activity: 'lesson',
    sessionKey: 'lesson-streak-split',
    awardPerItem: 3,
    creditedItemIds: creditedItemIds.slice(0, 10),
    pendingRunes: 31,
  });

  const hook = await renderHook(() => usePracticeRunes({
    activity: 'lesson', sessionKey: 'lesson-streak-split', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));

  expect(hook.result.current.runes).toBe(4);
  expect(JSON.parse(storage[earningsKey])).toEqual(expect.objectContaining({
    completionOrdinal: 2,
    earnings: expect.objectContaining({
      creditedItemIds,
      pendingRunes: 4,
    }),
  }));
  await act(async () => { await hook.result.current.settle(); });
  expect(settlement.markPracticeRuneSettlementPending).toHaveBeenCalledWith(
    expect.objectContaining({
      completionOrdinal: 2,
      earnings: expect.objectContaining({ creditedItemIds, pendingRunes: 4 }),
    }),
  );
});

test('restart preserves the earned suffix after a forfeited prefix was committed', async () => {
  const earningsKey = practiceRuneEarningsStorageKey({
    ownerStableId: 'account-a', activity: 'flashcards_blitz', sessionKey: 'attempt-forfeit-split',
  });
  storage[earningsKey] = JSON.stringify({
    schemaVersion: 'practice-rune-accumulator.v2',
    completionOrdinal: 1,
    earnings: {
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'flashcards_blitz',
      sessionKey: 'attempt-forfeit-split',
      awardPerItem: 3,
      creditedItemIds: ['card-a', 'card-b', 'card-c', 'card-d'],
      pendingRunes: 6,
    },
  });
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockResolvedValue(1);
  settlement.readCommittedPracticeRuneSettlementEarnings.mockResolvedValue({
    schemaVersion: 'practice-rune-earnings.v1',
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-forfeit-split',
    awardPerItem: 3,
    creditedItemIds: ['card-a', 'card-b', 'card-c'],
    pendingRunes: 3,
  });

  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz', sessionKey: 'attempt-forfeit-split', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));

  expect(hook.result.current.runes).toBe(3);
  await act(async () => { await hook.result.current.settle(); });
  expect(settlement.markPracticeRuneSettlementPending).toHaveBeenCalledWith(
    expect.objectContaining({
      completionOrdinal: 2,
      earnings: expect.objectContaining({
        awardPerItem: 3,
        creditedItemIds: ['card-d'],
        pendingRunes: 3,
      }),
    }),
  );
});

test('new earnings after a partial close keep their next ordinal across another restart', async () => {
  let durableOrdinal = 0;
  const committed: { completionOrdinal: number; amount: number }[] = [];
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockImplementation(async () => durableOrdinal);
  settlement.settlePracticeRuneEarningsToServer.mockImplementation(async (
    current: { pendingRunes: number },
    completionOrdinal: number,
  ) => {
    if (!committed.some((entry) => entry.completionOrdinal === completionOrdinal)) {
      committed.push({ completionOrdinal, amount: current.pendingRunes });
      durableOrdinal = Math.max(durableOrdinal, completionOrdinal);
    }
    return { locallyCommitted: true, settled: false };
  });

  const first = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz', sessionKey: 'attempt-bound-ordinal', completionOrdinal: 1,
  }));
  await waitFor(() => expect(first.result.current.hydrating).toBe(false));
  await act(() => { expect(first.result.current.onCorrectAnswer('card-1')).toBe(3); });
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (pairs: [string, string][]) => {
    storage[pairs[0][0]] = pairs[0][1];
    throw new Error('simulated-partial-close');
  });
  await act(async () => {
    await expect(first.result.current.settle()).rejects.toThrow('simulated-partial-close');
  });
  await first.unmount();

  const second = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz', sessionKey: 'attempt-bound-ordinal', completionOrdinal: 1,
  }));
  await waitFor(() => expect(second.result.current.hydrating).toBe(false));
  await act(() => { expect(second.result.current.onCorrectAnswer('card-2')).toBe(1); });
  await second.unmount();

  const third = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz', sessionKey: 'attempt-bound-ordinal', completionOrdinal: 1,
  }));
  await waitFor(() => expect(third.result.current.hydrating).toBe(false));
  expect(third.result.current.runes).toBe(1);
  await act(async () => { await third.result.current.settle(); });

  expect(settlement.settlePracticeRuneEarningsToServer.mock.calls.map((call) => call[1]))
    .toEqual([1, 2]);
  expect(committed).toEqual([
    { completionOrdinal: 1, amount: 3 },
    { completionOrdinal: 2, amount: 1 },
  ]);
});

test('a finished v2 accumulator repairs a high-water mark beyond the one-step journal probe', async () => {
  const earningsKey = practiceRuneEarningsStorageKey({
    ownerStableId: 'account-a',
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-high-water',
  });
  storage[earningsKey] = JSON.stringify({
    schemaVersion: 'practice-rune-accumulator.v2',
    completionOrdinal: 2,
    earnings: {
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'flashcards_blitz',
      sessionKey: 'attempt-high-water',
      awardPerItem: 1,
      creditedItemIds: ['card-1'],
      pendingRunes: 0,
    },
  });
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockResolvedValue(1);

  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz', sessionKey: 'attempt-high-water', completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { expect(hook.result.current.onCorrectAnswer('card-2')).toBe(1); });
  await act(async () => { await hook.result.current.settle(); });

  expect(settlement.markPracticeRuneSettlementPending).toHaveBeenCalledWith(
    expect.objectContaining({ completionOrdinal: 3 }),
  );
});

test('an occupied ordinal conflict does not move unproven earnings to a new ordinal', async () => {
  let durableOrdinal = 0;
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockImplementation(async () => durableOrdinal);
  settlement.markPracticeRuneSettlementPending
    .mockImplementationOnce(async ({ completionOrdinal }: { completionOrdinal: number }) => {
      expect(completionOrdinal).toBe(1);
      durableOrdinal = 1;
      throw new Error('level_spin_star_request_conflict');
    })
    .mockRejectedValueOnce(new Error('level_spin_star_request_conflict'));

  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-conflict-reallocate',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { expect(hook.result.current.onCorrectAnswer('card-1')).toBe(3); });
  await act(async () => {
    await expect(hook.result.current.settle()).rejects.toThrow('level_spin_star_request_conflict');
  });
  await act(async () => {
    await expect(hook.result.current.settle()).rejects.toThrow('level_spin_star_request_conflict');
  });

  expect(settlement.markPracticeRuneSettlementPending.mock.calls.map(([request]) => (
    request.completionOrdinal
  ))).toEqual([1, 1]);
});

test('a locally rejected occupied operation keeps its original ordinal', async () => {
  let durableOrdinal = 0;
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockImplementation(async () => durableOrdinal);
  settlement.settlePracticeRuneEarningsToServer
    .mockImplementationOnce(async () => {
      durableOrdinal = 1;
      return { locallyCommitted: false, settled: false };
    })
    .mockResolvedValueOnce({ locallyCommitted: false, settled: false });

  const hook = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-local-conflict-reallocate',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
  await act(() => { expect(hook.result.current.onCorrectAnswer('card-1')).toBe(3); });
  await act(async () => { await hook.result.current.settle(); });
  await act(async () => { await hook.result.current.settle(); });

  expect(settlement.markPracticeRuneSettlementPending.mock.calls.map(([request]) => (
    request.completionOrdinal
  ))).toEqual([1, 1]);
});

test('restart before either close write replays the already committed completion', async () => {
  let durableOrdinal = 0;
  const committed: { completionOrdinal: number; amount: number }[] = [];
  settlement.readCommittedPracticeRuneCompletionOrdinal.mockImplementation(async () => durableOrdinal);
  settlement.settlePracticeRuneEarningsToServer.mockImplementation(async (
    current: { pendingRunes: number },
    completionOrdinal: number,
  ) => {
    if (!committed.some((entry) => entry.completionOrdinal === completionOrdinal)) {
      committed.push({ completionOrdinal, amount: current.pendingRunes });
      durableOrdinal = Math.max(durableOrdinal, completionOrdinal);
    }
    return { locallyCommitted: true, settled: false };
  });

  const first = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-before-close-writes',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(first.result.current.hydrating).toBe(false));
  await act(() => { expect(first.result.current.onCorrectAnswer('card-1')).toBe(3); });
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(
    new Error('simulated-kill-before-close-writes'),
  );
  await act(async () => {
    await expect(first.result.current.settle()).rejects.toThrow('simulated-kill-before-close-writes');
  });
  await first.unmount();

  const restarted = await renderHook(() => usePracticeRunes({
    activity: 'flashcards_blitz',
    sessionKey: 'attempt-before-close-writes',
    completionOrdinal: 1,
  }));
  await waitFor(() => expect(restarted.result.current.hydrating).toBe(false));
  expect(restarted.result.current.runes).toBe(3);
  await act(async () => { await restarted.result.current.settle(); });

  expect(settlement.settlePracticeRuneEarningsToServer.mock.calls.map((call) => call[1]))
    .toEqual([1, 1]);
  expect(committed).toEqual([{ completionOrdinal: 1, amount: 3 }]);
});
