import {
  ARENA_SETTLE_PROBE_MAX_DELAY_MS,
  createArenaSettleProbeOrchestrator,
} from '../modules/arena/settle_probe';

describe('Arena durable settle probe orchestrator', () => {
  it('survives screen unmount and dispatches exactly once for the captured owner', async () => {
    const timers: Array<() => void> = [];
    let current = true;
    const dispatch = jest.fn(async () => undefined);
    const orchestrator = createArenaSettleProbeOrchestrator({
      setTimer: (listener) => { timers.push(listener); return listener; },
      clearTimer: jest.fn(),
    });

    orchestrator.schedule({
      ownerKey: 'A:1', matchId: 'm1', dueAtMs: 2_000, wallNowMs: 1_000,
      isOwnerCurrent: () => current,
      subscribeOwner: () => ({ remove: jest.fn() }),
      dispatch,
    });
    // No component lifetime callback exists: navigating away does not cancel it.
    timers[0]!();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(dispatch).toHaveBeenCalledTimes(1);
    timers[0]!();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(dispatch).toHaveBeenCalledTimes(1);
    current = false;
  });

  it('cancels before dispatch on account switch', async () => {
    const timers: Array<() => void> = [];
    let ownerListener = () => {};
    let current = true;
    const dispatch = jest.fn(async () => undefined);
    const clearTimer = jest.fn();
    const orchestrator = createArenaSettleProbeOrchestrator({
      setTimer: (listener) => { timers.push(listener); return listener; },
      clearTimer,
    });
    orchestrator.schedule({
      ownerKey: 'A:1', matchId: 'm1', dueAtMs: 2_000, wallNowMs: 1_000,
      isOwnerCurrent: () => current,
      subscribeOwner: (listener) => { ownerListener = listener; return { remove: jest.fn() }; },
      dispatch,
    });

    current = false;
    ownerListener();
    timers[0]!();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(clearTimer).toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('deduplicates a match and caps corrupt hour-long deadlines', () => {
    const delays: number[] = [];
    const orchestrator = createArenaSettleProbeOrchestrator({
      setTimer: (listener, delay) => { delays.push(delay); return listener; },
      clearTimer: jest.fn(),
    });
    const input = {
      ownerKey: 'A:1', matchId: 'm1', dueAtMs: 3_601_000, wallNowMs: 1_000,
      isOwnerCurrent: () => true,
      subscribeOwner: () => ({ remove: jest.fn() }),
      dispatch: async () => undefined,
    };
    orchestrator.schedule(input);
    orchestrator.schedule(input);
    expect(delays).toEqual([ARENA_SETTLE_PROBE_MAX_DELAY_MS]);
  });
});
