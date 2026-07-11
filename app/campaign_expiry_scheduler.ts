export const CAMPAIGN_EXPIRY_MAX_DELAY_MS = 24 * 60 * 60 * 1000;

export type CampaignExpirySchedulerDeps = {
  now(): number;
  setTimeout(listener: () => void, delayMs: number): unknown;
  clearTimeout(id: unknown): void;
};

export function createCampaignExpiryScheduler(deps: CampaignExpirySchedulerDeps) {
  let active = true;
  let untilMs = 0;
  let timer: unknown | null = null;
  let onExpire: (() => void) | null = null;
  let expired = false;

  const clear = () => {
    if (timer !== null) deps.clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    clear();
    if (!active || untilMs <= 0 || expired) return;
    const remaining = untilMs - deps.now();
    if (remaining <= 0) {
      expired = true;
      onExpire?.();
      return;
    }
    timer = deps.setTimeout(schedule, Math.min(remaining, CAMPAIGN_EXPIRY_MAX_DELAY_MS));
  };

  return {
    setUntil(nextUntilMs: number | null, listener: () => void) {
      untilMs = nextUntilMs ?? 0;
      onExpire = listener;
      expired = false;
      schedule();
    },
    setActive(nextActive: boolean) {
      active = nextActive;
      schedule();
    },
    dispose() {
      clear();
      onExpire = null;
    },
  };
}
