/**
 * Owns the Statistics-only unread projection lifecycle. Keeping this controller
 * independent from level/spin inventory state prevents Daily Journey refreshes
 * from ever overwriting the legacy pending-gift badge.
 */
export function createDailyJourneyStatsUnreadController<Token>(dependencies: Readonly<{
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  readProjection: (token: Token) => Promise<Readonly<{ unreadCount: number }>>;
  displayUnreadCount: (count: number) => void;
  startHop: () => void;
  stopHop: () => void;
  shouldReduceMotion: () => boolean;
  reportError: (stage: 'projection', error: unknown) => void;
}>) {
  let active = false;
  let disposed = false;
  let request = 0;
  let hopping = false;

  const stopHop = (force = false) => {
    if (force || hopping) dependencies.stopHop();
    hopping = false;
  };

  const applyUnreadCount = (count: number) => {
    const unreadCount = Math.max(0, Math.floor(count) || 0);
    dependencies.displayUnreadCount(unreadCount);
    if (unreadCount > 0 && !dependencies.shouldReduceMotion()) {
      if (!hopping) {
        dependencies.startHop();
        hopping = true;
      }
      return;
    }
    stopHop(true);
  };

  const reload = async () => {
    if (!active || disposed) return;
    const currentRequest = ++request;
    const token = dependencies.captureToken();
    try {
      const projection = await dependencies.readProjection(token);
      if (disposed || !active || currentRequest !== request || !dependencies.isTokenCurrent(token)) return;
      applyUnreadCount(projection.unreadCount);
    } catch (error) {
      if (!disposed && active && currentRequest === request && dependencies.isTokenCurrent(token)) {
        dependencies.reportError('projection', error);
      }
    }
  };

  return Object.freeze({
    activate: async () => {
      if (disposed) return;
      active = true;
      await reload();
    },
    deactivate: () => {
      active = false;
      request += 1;
      stopHop();
    },
    reload,
    resetForAccount: async () => {
      if (disposed) return;
      request += 1;
      stopHop();
      dependencies.displayUnreadCount(0);
      if (active) await reload();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      active = false;
      request += 1;
      stopHop();
    },
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
