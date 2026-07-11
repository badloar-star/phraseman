import { useEffect, useRef } from 'react';
import {
  createArenaMatchmakingControlClock,
  type ArenaControlClockDeps,
} from '../app/arena_matchmaking_control_clock';
import { runtimeAppStateStore } from '../app/runtime_app_state_store';

type ArenaControlCallbacks = Pick<
  ArenaControlClockDeps,
  | 'readAuthoritativeState'
  | 'onMatch'
  | 'onExpand'
  | 'onBotFallback'
  | 'onTimeout'
  | 'onStop'
>;

type UseArenaMatchmakingControlClockOptions = ArenaControlCallbacks & {
  enabled: boolean;
};

export function useArenaMatchmakingControlClock(
  deps: UseArenaMatchmakingControlClockOptions,
) {
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const clockRef = useRef<ReturnType<typeof createArenaMatchmakingControlClock> | null>(null);

  if (!clockRef.current) {
    clockRef.current = createArenaMatchmakingControlClock({
      now: () => Date.now(),
      setTimeout: (listener, delayMs) => setTimeout(listener, delayMs),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      readAuthoritativeState: (userId) => depsRef.current.readAuthoritativeState(userId),
      onMatch: (sessionId, generation) => depsRef.current.onMatch(sessionId, generation),
      onExpand: (generation) => depsRef.current.onExpand(generation),
      onBotFallback: (generation) => depsRef.current.onBotFallback(generation),
      onTimeout: (generation) => depsRef.current.onTimeout(generation),
      onStop: (generation) => depsRef.current.onStop(generation),
    });
  }

  const clock = clockRef.current;
  useEffect(() => {
    if (!deps.enabled) {
      clock.cancel();
      void clock.setAppActive(false);
      return undefined;
    }
    void clock.setAppActive(runtimeAppStateStore.getSnapshot());
    const unsubscribe = runtimeAppStateStore.subscribe(() => {
      void clock.setAppActive(runtimeAppStateStore.getSnapshot());
    });
    return () => {
      unsubscribe();
      void clock.setAppActive(false);
      clock.cancel();
    };
  }, [clock, deps.enabled]);

  return clock;
}
