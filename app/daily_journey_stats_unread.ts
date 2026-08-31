/**
 * Owns the Statistics-only unread projection lifecycle. Keeping this controller
 * independent from level/spin inventory state prevents Daily Journey refreshes
 * from ever overwriting the legacy pending-gift badge.
 */
export function createDailyJourneyStatsUnreadController<Token>(dependencies: Readonly<{
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  readProjection: (token: Token) => Promise<Readonly<{ unreadCount: number; pendingCount?: number }>>;
  displayUnreadCount: (count: number) => void;
  displayPendingCount?: (count: number) => void;
  startHop: () => void;
  stopHop: () => void;
  shouldReduceMotion: () => boolean;
  reportError: (stage: 'projection', error: unknown) => void;
}>) {
  let active = false;
  let disposed = false;
  let request = 0;
  let hopping = false;
  let displayedToken: Token | null = null;

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
    // A projection belongs to one owner/generation. Clear it before awaiting a
    // new read, so a failed read for the next account cannot leave old data on
    // screen while this tab was blurred.
    if (displayedToken !== null && !dependencies.isTokenCurrent(displayedToken)) {
      displayedToken = null;
      dependencies.displayUnreadCount(0);
      dependencies.displayPendingCount?.(0);
      stopHop(true);
    }
    try {
      const projection = await dependencies.readProjection(token);
      if (disposed || !active || currentRequest !== request || !dependencies.isTokenCurrent(token)) return;
      displayedToken = token;
      dependencies.displayPendingCount?.(Math.max(0, Math.floor(projection.pendingCount ?? 0) || 0));
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
      stopHop(true);
    },
    reload,
    resetForAccount: async () => {
      if (disposed) return;
      request += 1;
      displayedToken = null;
      stopHop();
      dependencies.displayUnreadCount(0);
      dependencies.displayPendingCount?.(0);
      if (active) await reload();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      active = false;
      request += 1;
      displayedToken = null;
      stopHop(true);
    },
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
