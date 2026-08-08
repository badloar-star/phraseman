import { MISTAKE_LOCK_TTL_MS } from './mistake_explain_cache';

describe('mistake explanation generation lease', () => {
  it('outlives the full callable timeout so a live retry cannot be reclaimed', () => {
    expect(MISTAKE_LOCK_TTL_MS).toBeGreaterThan(120_000);
  });
});
