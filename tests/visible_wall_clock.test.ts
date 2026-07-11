import { createVisibleWallClock } from '../app/visible_wall_clock';

function createHarness(initialNow = 10_000) {
  let now = initialNow;
  let intervalListener: (() => void) | null = null;
  let intervalStarts = 0;
  let intervalClears = 0;
  return {
    deps: {
      now: () => now,
      setInterval: (listener: () => void, delayMs: number) => {
        expect(delayMs).toBe(1000);
        intervalStarts += 1;
        intervalListener = listener;
        return intervalStarts;
      },
      clearInterval: (_id: unknown) => {
        intervalClears += 1;
        intervalListener = null;
      },
    },
    advanceTo(next: number) { now = next; },
    tick() { intervalListener?.(); },
    starts: () => intervalStarts,
    clears: () => intervalClears,
  };
}

describe('visible wall clock', () => {
  it('shares one interval and emits real wall time immediately', () => {
    const harness = createHarness();
    const clock = createVisibleWallClock(harness.deps);
    const first = jest.fn();
    const second = jest.fn();

    const offFirst = clock.subscribe(first);
    const offSecond = clock.subscribe(second);
    expect(harness.starts()).toBe(1);
    expect(first).toHaveBeenLastCalledWith(10_000);
    expect(second).toHaveBeenLastCalledWith(10_000);

    harness.advanceTo(47_000);
    harness.tick();
    expect(first).toHaveBeenLastCalledWith(47_000);
    expect(second).toHaveBeenLastCalledWith(47_000);

    offFirst();
    expect(harness.clears()).toBe(0);
    offSecond();
    expect(harness.clears()).toBe(1);
  });

  it('starts a fresh interval after all consumers leave', () => {
    const harness = createHarness();
    const clock = createVisibleWallClock(harness.deps);
    clock.subscribe(jest.fn())();
    clock.subscribe(jest.fn())();
    expect(harness.starts()).toBe(2);
    expect(harness.clears()).toBe(2);
  });
});
