import { createEnergyCountdownClock } from '../components/energy_countdown_clock';

describe('energy countdown shared clock', () => {
  it('shares one interval and one AppState listener across subscribers', () => {
    const harness = makeHarness('active');
    const clock = createEnergyCountdownClock(harness.deps);
    const a = jest.fn();
    const b = jest.fn();
    const offA = clock.subscribe(a);
    expect(a).toHaveBeenCalledTimes(1);
    const offB = clock.subscribe(b);
    expect(clock.debug()).toEqual({ subscribers: 2, intervals: 1, appStateListeners: 1 });
    expect(a).toHaveBeenCalledWith(1_000);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledWith(1_000);
    expect(b).toHaveBeenCalledTimes(1);
    offA(); offB();
    expect(clock.debug()).toEqual({ subscribers: 0, intervals: 0, appStateListeners: 0 });
  });

  it('stops in background and emits immediately on resume', () => {
    const harness = makeHarness('background');
    const clock = createEnergyCountdownClock(harness.deps);
    const listener = jest.fn();
    const off = clock.subscribe(listener);
    expect(clock.debug().intervals).toBe(0);
    harness.emit('active');
    expect(listener).toHaveBeenLastCalledWith(1_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(clock.debug().intervals).toBe(1);
    harness.emit('background');
    expect(clock.debug().intervals).toBe(0);
    off();
  });

  it('emits exactly once after all listeners unsubscribe and a new one subscribes', () => {
    const harness = makeHarness('active');
    const clock = createEnergyCountdownClock(harness.deps);
    const first = jest.fn();
    clock.subscribe(first)();
    const next = jest.fn();
    const off = clock.subscribe(next);
    expect(first).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(clock.debug()).toEqual({ subscribers: 1, intervals: 1, appStateListeners: 1 });
    off();
  });
});

function makeHarness(initial: 'active' | 'background') {
  let state = initial;
  let appListener: ((state: string) => void) | null = null;
  const intervals = new Set<() => void>();
  return {
    deps: {
      getAppState: () => state,
      subscribeAppState: (listener: (next: string) => void) => {
        appListener = listener;
        return () => { appListener = null; };
      },
      now: () => 1_000,
      setInterval: (listener: () => void) => { intervals.add(listener); return listener; },
      clearInterval: (id: () => void) => { intervals.delete(id); },
    },
    emit(next: 'active' | 'background') { state = next; appListener?.(next); },
  };
}
