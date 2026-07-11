import { createRuntimeAppStateStore } from '../app/runtime_app_state_store';

function createHarness(initial: 'active' | 'background' | 'inactive' = 'active') {
  let current = initial;
  let listener: ((state: 'active' | 'background' | 'inactive') => void) | null = null;
  let subscriptions = 0;
  let removals = 0;

  return {
    deps: {
      current: () => current,
      subscribe: (next: (state: 'active' | 'background' | 'inactive') => void) => {
        subscriptions += 1;
        listener = next;
        return () => {
          removals += 1;
          listener = null;
        };
      },
    },
    emit(next: 'active' | 'background' | 'inactive') {
      current = next;
      listener?.(next);
    },
    subscriptions: () => subscriptions,
    removals: () => removals,
  };
}

describe('runtime AppState store', () => {
  it('shares one native subscription and removes it after the final consumer', () => {
    const harness = createHarness();
    const store = createRuntimeAppStateStore(harness.deps);
    const first = jest.fn();
    const second = jest.fn();

    const offFirst = store.subscribe(first);
    const offSecond = store.subscribe(second);
    expect(harness.subscriptions()).toBe(1);
    expect(store.getSnapshot()).toBe(true);

    harness.emit('background');
    expect(store.getSnapshot()).toBe(false);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    offFirst();
    expect(harness.removals()).toBe(0);
    offSecond();
    expect(harness.removals()).toBe(1);
  });

  it('notifies only when active state actually changes', () => {
    const harness = createHarness('inactive');
    const store = createRuntimeAppStateStore(harness.deps);
    const listener = jest.fn();
    const off = store.subscribe(listener);

    harness.emit('background');
    expect(listener).not.toHaveBeenCalled();
    harness.emit('active');
    expect(listener).toHaveBeenCalledTimes(1);
    harness.emit('active');
    expect(listener).toHaveBeenCalledTimes(1);

    off();
  });
});
