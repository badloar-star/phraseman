import {
  cancelScheduledAnimatedStateUpdates,
  scheduleAnimatedStateUpdate,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from '../components/animationScheduling';

describe('scheduleAnimatedStateUpdate', () => {
  let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame | undefined;
  let originalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
  });

  afterEach(() => {
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
    }
    jest.useRealTimers();
  });

  it('does not run state updates synchronously from animation callbacks', () => {
    const update = jest.fn();

    scheduleAnimatedStateUpdate(update);

    expect(update).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('cancels a queued state update before it runs', () => {
    const update = jest.fn();

    const scheduled = scheduleAnimatedStateUpdate(update);
    scheduled.cancel();
    jest.runOnlyPendingTimers();

    expect(update).not.toHaveBeenCalled();
  });

  it('tracks and removes queued animation state updates after they run', () => {
    const update = jest.fn();
    const pendingRef: { current: ScheduledAnimatedStateUpdate[] } = { current: [] };

    scheduleTrackedAnimatedStateUpdate(pendingRef, update);

    expect(update).not.toHaveBeenCalled();
    expect(pendingRef.current).toHaveLength(1);

    jest.runOnlyPendingTimers();

    expect(update).toHaveBeenCalledTimes(1);
    expect(pendingRef.current).toHaveLength(0);
  });

  it('cancels all tracked animation state updates', () => {
    const first = jest.fn();
    const second = jest.fn();
    const pendingRef: { current: ScheduledAnimatedStateUpdate[] } = { current: [] };

    scheduleTrackedAnimatedStateUpdate(pendingRef, first);
    scheduleTrackedAnimatedStateUpdate(pendingRef, second);
    cancelScheduledAnimatedStateUpdates(pendingRef);
    jest.runOnlyPendingTimers();

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(pendingRef.current).toHaveLength(0);
  });
});
