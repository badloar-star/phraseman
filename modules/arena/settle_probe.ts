/** Server duel window; malformed far-future deadlines must not defer for hours. */
export const ARENA_SETTLE_PROBE_MAX_DELAY_MS = 20 * 60_000;

type Subscription = Readonly<{ remove(): void }>;

export type ArenaSettleProbeInput = Readonly<{
  ownerKey: string;
  matchId: string;
  dueAtMs: number;
  wallNowMs: number;
  isOwnerCurrent(): boolean;
  subscribeOwner(listener: () => void): Subscription;
  dispatch(): Promise<void>;
}>;

export function createArenaSettleProbeOrchestrator(deps: Readonly<{
  setTimer(listener: () => void, delayMs: number): unknown;
  clearTimer(timer: unknown): void;
}>) {
  const scheduled = new Map<string, Readonly<{
    timer: unknown;
    subscription: Subscription;
  }>>();

  const cancel = (key: string): void => {
    const current = scheduled.get(key);
    if (!current) return;
    scheduled.delete(key);
    deps.clearTimer(current.timer);
    current.subscription.remove();
  };

  return {
    schedule(input: ArenaSettleProbeInput): boolean {
      const ownerKey = input.ownerKey.trim();
      const matchId = input.matchId.trim();
      if (!ownerKey || !matchId || !input.isOwnerCurrent()) return false;
      const key = `${ownerKey}:${matchId}`;
      if (scheduled.has(key)) return false;

      const delayMs = Math.min(
        ARENA_SETTLE_PROBE_MAX_DELAY_MS,
        Math.max(0, Math.trunc(input.dueAtMs - input.wallNowMs)),
      );
      const timer = deps.setTimer(() => {
        const current = scheduled.get(key);
        if (!current) return;
        scheduled.delete(key);
        current.subscription.remove();
        if (!input.isOwnerCurrent()) return;
        void input.dispatch().catch(() => {});
      }, delayMs);
      const placeholder: Subscription = { remove: () => {} };
      scheduled.set(key, { timer, subscription: placeholder });
      const subscription = input.subscribeOwner(() => {
        if (!input.isOwnerCurrent()) cancel(key);
      });
      if (!scheduled.has(key)) {
        subscription.remove();
        return false;
      }
      scheduled.set(key, { timer, subscription });
      if (!input.isOwnerCurrent()) {
        cancel(key);
        return false;
      }
      return true;
    },
    cancel,
  };
}
