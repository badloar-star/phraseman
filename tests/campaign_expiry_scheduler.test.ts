import { CAMPAIGN_EXPIRY_MAX_DELAY_MS, createCampaignExpiryScheduler } from '../app/campaign_expiry_scheduler';

describe('campaign expiry scheduler', () => {
  it('chunks distant expiries and fires exactly once', () => {
    let now = 1_000;
    let pending: { listener: () => void; delay: number } | null = null;
    const expire = jest.fn();
    const scheduler = createCampaignExpiryScheduler({
      now: () => now,
      setTimeout: (listener, delay) => { pending = { listener, delay }; return listener; },
      clearTimeout: () => { pending = null; },
    });
    const until = now + CAMPAIGN_EXPIRY_MAX_DELAY_MS * 30;
    scheduler.setUntil(until, expire);
    expect((pending as { delay: number } | null)?.delay).toBe(CAMPAIGN_EXPIRY_MAX_DELAY_MS);
    now = until + 1;
    (pending as { listener: () => void } | null)?.listener();
    expect(expire).toHaveBeenCalledTimes(1);
    expect(pending).toBeNull();
  });

  it('cancels in background and recomputes on foreground/config replacement', () => {
    let now = 5_000;
    let pending: { listener: () => void; delay: number } | null = null;
    const first = jest.fn();
    const second = jest.fn();
    const scheduler = createCampaignExpiryScheduler({
      now: () => now,
      setTimeout: (listener, delay) => { pending = { listener, delay }; return listener; },
      clearTimeout: () => { pending = null; },
    });
    scheduler.setUntil(now + 10_000, first);
    scheduler.setActive(false);
    expect(pending).toBeNull();
    scheduler.setUntil(now + 20_000, second);
    now += 21_000;
    scheduler.setActive(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    scheduler.setActive(true);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
