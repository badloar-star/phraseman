export type VisibleWallClockDeps = {
  now(): number;
  setInterval(listener: () => void, delayMs: number): unknown;
  clearInterval(id: unknown): void;
};

export function createVisibleWallClock(deps: VisibleWallClockDeps) {
  const listeners = new Set<(now: number) => void>();
  let interval: unknown | null = null;

  const emit = () => {
    const now = deps.now();
    listeners.forEach((listener) => listener(now));
  };

  return {
    subscribe(listener: (now: number) => void) {
      listeners.add(listener);
      listener(deps.now());
      if (interval === null) interval = deps.setInterval(emit, 1000);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && interval !== null) {
          deps.clearInterval(interval);
          interval = null;
        }
      };
    },
  };
}

export const visibleWallClock = createVisibleWallClock({
  now: () => Date.now(),
  setInterval: (listener, delayMs) => setInterval(listener, delayMs),
  clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
});
