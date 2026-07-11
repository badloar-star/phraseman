import { AppState } from 'react-native';

type Listener = (now: number) => void;
type IntervalId = unknown;

export type EnergyClockDeps = {
  getAppState(): string;
  subscribeAppState(listener: (state: string) => void): () => void;
  now(): number;
  setInterval(listener: () => void): IntervalId;
  clearInterval(id: IntervalId): void;
};

export function createEnergyCountdownClock(deps: EnergyClockDeps) {
  const listeners = new Set<Listener>();
  let interval: IntervalId | null = null;
  let removeAppState: (() => void) | null = null;
  let active = deps.getAppState() === 'active';

  const stopInterval = () => {
    if (interval === null) return;
    deps.clearInterval(interval);
    interval = null;
  };
  const emit = () => {
    const now = deps.now();
    listeners.forEach(listener => listener(now));
  };
  const reconcile = () => {
    if (active && listeners.size > 0 && interval === null) {
      emit();
      interval = deps.setInterval(emit);
    } else if ((!active || listeners.size === 0) && interval !== null) {
      stopInterval();
    }
  };
  const attachAppState = () => {
    if (removeAppState || listeners.size === 0) return;
    active = deps.getAppState() === 'active';
    removeAppState = deps.subscribeAppState((state) => {
      active = state === 'active';
      reconcile();
    });
  };
  const detachAppState = () => {
    if (listeners.size > 0 || !removeAppState) return;
    removeAppState();
    removeAppState = null;
  };

  return {
    subscribe(listener: Listener): () => void {
      const wasRunning = interval !== null;
      listeners.add(listener);
      attachAppState();
      if (active && wasRunning) listener(deps.now());
      reconcile();
      return () => {
        listeners.delete(listener);
        reconcile();
        detachAppState();
      };
    },
    debug() {
      return {
        subscribers: listeners.size,
        intervals: interval === null ? 0 : 1,
        appStateListeners: removeAppState ? 1 : 0,
      };
    },
  };
}

export const energyCountdownClock = createEnergyCountdownClock({
  getAppState: () => AppState.currentState,
  subscribeAppState: (listener) => {
    const sub = AppState.addEventListener('change', listener);
    return () => sub.remove();
  },
  now: () => Date.now(),
  setInterval: (listener) => globalThis.setInterval(listener, 1000),
  clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>),
});
