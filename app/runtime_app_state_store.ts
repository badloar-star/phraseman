import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type RuntimeAppStateDeps = {
  current(): AppStateStatus;
  subscribe(listener: (state: AppStateStatus) => void): () => void;
};

export function createRuntimeAppStateStore(deps: RuntimeAppStateDeps) {
  const listeners = new Set<() => void>();
  let active = deps.current() === 'active';
  let removeNative: (() => void) | null = null;

  const ensureNativeSubscription = () => {
    if (removeNative) return;
    removeNative = deps.subscribe((state) => {
      const next = state === 'active';
      if (next === active) return;
      active = next;
      listeners.forEach((listener) => listener());
    });
  };

  return {
    getSnapshot: () => active,
    subscribe(listener: () => void) {
      active = deps.current() === 'active';
      listeners.add(listener);
      ensureNativeSubscription();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          removeNative?.();
          removeNative = null;
        }
      };
    },
  };
}

export const runtimeAppStateStore = createRuntimeAppStateStore({
  current: () => AppState.currentState,
  subscribe: (listener) => {
    const subscription = AppState.addEventListener('change', listener);
    return () => subscription.remove();
  },
});

export function useAppRuntimeActive(): boolean {
  return useSyncExternalStore(
    runtimeAppStateStore.subscribe,
    runtimeAppStateStore.getSnapshot,
    runtimeAppStateStore.getSnapshot,
  );
}
