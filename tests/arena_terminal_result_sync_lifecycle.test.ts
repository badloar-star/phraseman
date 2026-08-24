import React, { useEffect, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react-native';

import type { ArenaMatch, ArenaMatchReward } from '../modules/arena/contract';
import {
  arenaQuickResultInitialState,
  arenaQuickResultReduce,
  arenaQuickResultTerminalSyncVersion,
} from '../modules/arena/quick_result_state';
import { useArenaTerminalResultSync } from '../hooks/use_arena_terminal_result_sync';

type SyncResponse = Readonly<{
  version: number;
  state: string;
  match: ArenaMatch;
  viewerSeat: 'a';
  viewerReward: ArenaMatchReward;
}>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => { resolve = next; reject = fail; });
  return { promise, resolve, reject };
}

const publicReward: ArenaMatchReward = { starsEarned: 0, xpEarned: 14 };
const privateReward: ArenaMatchReward = {
  ...publicReward,
  xpBreakdown: {
    schemaVersion: 'arena-xp-breakdown.v1', baseXp: 10,
    correctBonusXp: 2, outcomeBonusXp: 2, totalXp: 14,
  },
};

function match(state: 'task_active' | 'settled', version: number): ArenaMatch {
  return {
    matchId: 'm1', mode: 'quick', opponentKind: 'human', acceptedBy: ['a', 'b'],
    players: [], currentTaskIndex: 4, submittedBy: [], scores: { a: 5, b: 2 },
    stateStartedAtMs: 1, stateDeadlineAtMs: 2, state, version,
    terminal: state === 'settled',
    ...(state === 'settled' ? { result: { winnerUid: 'a', rewards: { a: publicReward } } } : {}),
  } as ArenaMatch;
}

function strictWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return React.createElement(React.StrictMode, null, children);
}

afterEach(async () => {
  await cleanup();
});

describe('Arena terminal private-sync hook lifecycle', () => {
  it('accepts the deferred private response after its own marker render and dispatches once in StrictMode', async () => {
    const terminalResponse = deferred<SyncResponse>();
    const request = jest.fn(() => terminalResponse.promise);

    const hook = await renderHook(() => {
      const [state, setState] = useState(() => arenaQuickResultInitialState('m1', 'a', true));
      useEffect(() => {
        let next = arenaQuickResultReduce(
          arenaQuickResultInitialState('m1', 'a', true),
          { type: 'sync', matchId: 'm1', version: 4, match: match('task_active', 4), viewerSeat: 'a' },
        );
        next = arenaQuickResultReduce(next, { type: 'live', matchId: 'm1', match: match('settled', 5) });
        setState(next);
      }, []);
      useArenaTerminalResultSync({
        active: true,
        matchId: 'm1',
        accountKey: 'A:1',
        terminalSyncVersion: arenaQuickResultTerminalSyncVersion(state),
        request,
        onRequested: (version) => setState((previous) => arenaQuickResultReduce(previous, {
          type: 'terminal_sync_requested', matchId: 'm1', version,
        })),
        onResolved: (response) => setState((previous) => arenaQuickResultReduce(previous, {
          type: 'sync', matchId: 'm1', ...response,
        })),
      });
      return state;
    }, { wrapper: strictWrapper });

    await act(async () => { await Promise.resolve(); });
    expect(request).toHaveBeenCalledTimes(1);
    expect(hook.result.current.presentation).toBeNull();

    await act(async () => {
      terminalResponse.resolve({
        version: 6, state: 'settled', match: match('settled', 6),
        viewerSeat: 'a', viewerReward: privateReward,
      });
      await terminalResponse.promise;
      await Promise.resolve();
    });
    expect(hook.result.current.presentation?.reward.xpBreakdown).toEqual(privateReward.xpBreakdown);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('discards a deferred response after unmount', async () => {
    const pending = deferred<string>();
    const accepted = jest.fn();
    const hook = await renderHook(() => useArenaTerminalResultSync({
      active: true, matchId: 'm1', accountKey: 'A:1', terminalSyncVersion: 5,
      request: () => pending.promise, onRequested: jest.fn(), onResolved: accepted,
    }));
    await act(async () => { await Promise.resolve(); });
    await hook.unmount();
    await act(async () => { pending.resolve('late'); await pending.promise; });
    expect(accepted).not.toHaveBeenCalled();
  });

  it('accepts an already-dispatched response while inactive without foreground recovery', async () => {
    const pending = deferred<string>();
    const request = jest.fn(() => pending.promise);
    const accepted = jest.fn();
    type Props = Readonly<{ active: boolean }>;
    const hook = await renderHook((props: Props) => useArenaTerminalResultSync({
      active: props.active,
      matchId: 'm1',
      accountKey: 'A:1',
      terminalSyncVersion: 5,
      request,
      onRequested: jest.fn(),
      onResolved: accepted,
    }), { initialProps: { active: true }, wrapper: strictWrapper });
    await act(async () => { await Promise.resolve(); });
    expect(request).toHaveBeenCalledTimes(1);

    await hook.rerender({ active: false });
    await act(async () => { pending.resolve('private'); await pending.promise; });

    expect(accepted).toHaveBeenCalledTimes(1);
    expect(accepted).toHaveBeenCalledWith('private');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('re-arms the same terminal version after one transient request failure', async () => {
    jest.useFakeTimers();
    const accepted = jest.fn();
    const request = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('private');
    try {
      await renderHook(() => useArenaTerminalResultSync({
        active: true,
        matchId: 'm1',
        accountKey: 'A:1',
        terminalSyncVersion: 5,
        request,
        onRequested: jest.fn(),
        onResolved: accepted,
      }));
      await act(async () => { await Promise.resolve(); });
      expect(request).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(800);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(request).toHaveBeenCalledTimes(2);
      expect(accepted).toHaveBeenCalledWith('private');
    } finally {
      jest.useRealTimers();
    }
  });

  it('re-arms an exhausted retry burst when the same scope returns to foreground', async () => {
    jest.useFakeTimers();
    const accepted = jest.fn();
    const onRequested = jest.fn();
    const request = jest.fn()
      .mockRejectedValueOnce(new Error('offline-1'))
      .mockRejectedValueOnce(new Error('offline-2'))
      .mockRejectedValueOnce(new Error('offline-3'))
      .mockRejectedValueOnce(new Error('offline-4'))
      .mockResolvedValueOnce('recovered');
    type Props = Readonly<{ active: boolean; version: number | null }>;
    try {
      const hook = await renderHook((props: Props) => useArenaTerminalResultSync({
        active: props.active,
        matchId: 'm1',
        accountKey: 'A:1',
        terminalSyncVersion: props.version,
        request,
        onRequested,
        onResolved: accepted,
      }), { initialProps: { active: true, version: 5 } });
      await act(async () => { await Promise.resolve(); });
      await hook.rerender({ active: true, version: null });
      for (const delay of [750, 1_500, 3_000]) {
        await act(async () => {
          jest.advanceTimersByTime(delay);
          await Promise.resolve();
          await Promise.resolve();
        });
      }
      expect(request).toHaveBeenCalledTimes(4);
      expect(accepted).not.toHaveBeenCalled();

      await hook.rerender({ active: false, version: null });
      await hook.rerender({ active: true, version: null });
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });

      expect(request).toHaveBeenCalledTimes(5);
      expect(accepted).toHaveBeenCalledWith('recovered');
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries a synchronous request throw on the same bounded cadence', async () => {
    jest.useFakeTimers();
    const accepted = jest.fn();
    const request = jest.fn()
      .mockImplementationOnce(() => { throw new Error('sync-preflight'); })
      .mockResolvedValueOnce('private');
    try {
      await renderHook(() => useArenaTerminalResultSync({
        active: true,
        matchId: 'm1',
        accountKey: 'A:1',
        terminalSyncVersion: 5,
        request,
        onRequested: jest.fn(),
        onResolved: accepted,
      }));
      await act(async () => {
        jest.advanceTimersByTime(750);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(request).toHaveBeenCalledTimes(2);
      expect(accepted).toHaveBeenCalledWith('private');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not let an exhausted old-account rejection erase the new-account retry', async () => {
    jest.useFakeTimers();
    const oldFourth = deferred<string>();
    const newFirst = deferred<string>();
    const accepted = jest.fn();
    const oldRequest = jest.fn()
      .mockRejectedValueOnce(new Error('old-1'))
      .mockRejectedValueOnce(new Error('old-2'))
      .mockRejectedValueOnce(new Error('old-3'))
      .mockImplementationOnce(() => oldFourth.promise);
    const newRequest = jest.fn()
      .mockImplementationOnce(() => newFirst.promise)
      .mockResolvedValueOnce('new-private');
    type Props = Readonly<{ accountKey: string; version: number | null }>;
    try {
      const hook = await renderHook((props: Props) => useArenaTerminalResultSync({
        active: true,
        matchId: 'm1',
        accountKey: props.accountKey,
        terminalSyncVersion: props.version,
        request: props.accountKey === 'A:1' ? oldRequest : newRequest,
        onRequested: jest.fn(),
        onResolved: accepted,
      }), { initialProps: { accountKey: 'A:1', version: 5 } });
      await act(async () => { await Promise.resolve(); });
      await hook.rerender({ accountKey: 'A:1', version: null });
      for (const delay of [750, 1_500, 3_000]) {
        await act(async () => {
          jest.advanceTimersByTime(delay);
          await Promise.resolve();
          await Promise.resolve();
        });
      }
      expect(oldRequest).toHaveBeenCalledTimes(4);

      await hook.rerender({ accountKey: 'B:2', version: 5 });
      await act(async () => { await Promise.resolve(); });
      await hook.rerender({ accountKey: 'B:2', version: null });
      expect(newRequest).toHaveBeenCalledTimes(1);

      await act(async () => {
        oldFourth.reject(new Error('late-old'));
        newFirst.reject(new Error('new-offline'));
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(750);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(oldRequest).toHaveBeenCalledTimes(4);
      expect(newRequest).toHaveBeenCalledTimes(2);
      expect(accepted).toHaveBeenCalledWith('new-private');
      expect(accepted).not.toHaveBeenCalledWith('late-old');
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['match', { matchId: 'm2', accountKey: 'A:1' }],
    ['account', { matchId: 'm1', accountKey: 'B:2' }],
  ])('discards a deferred response after %s scope changes', async (_label, replacement) => {
    const pending = deferred<string>();
    const accepted = jest.fn();
    type Props = Readonly<{ matchId: string; accountKey: string; version: number | null }>;
    const hook = await renderHook((props: Props) => useArenaTerminalResultSync({
      active: true,
      matchId: props.matchId,
      accountKey: props.accountKey,
      terminalSyncVersion: props.version,
      request: () => pending.promise,
      onRequested: jest.fn(),
      onResolved: accepted,
    }), { initialProps: { matchId: 'm1', accountKey: 'A:1', version: 5 } });
    await act(async () => { await Promise.resolve(); });
    await hook.rerender({ ...replacement, version: null });
    await act(async () => { pending.resolve('stale'); await pending.promise; });
    expect(accepted).not.toHaveBeenCalled();
  });
});
