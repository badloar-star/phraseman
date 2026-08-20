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
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
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
