import { resolveAppTier } from './app_tier_resolver';

describe('Jarvis app tier resolver — one count feeds every department, no triple-charge', () => {
  test('classifies the tier from a successful active-user count', async () => {
    const fetchActiveUserCount = jest.fn(async () => ({ state: 'ready' as const, count: 6_000, observedAtMs: 10_000 }));
    const tier = await resolveAppTier(fetchActiveUserCount);
    expect(tier).toBe('scale');
    expect(fetchActiveUserCount).toHaveBeenCalledTimes(1);
  });

  test('zero active users classifies as seed, not an error', async () => {
    const fetchActiveUserCount = jest.fn(async () => ({ state: 'empty' as const, count: 0, observedAtMs: 10_000 }));
    expect(await resolveAppTier(fetchActiveUserCount)).toBe('seed');
  });

  test('a failed count fails closed to seed — the most cautious tier, never invents scale', async () => {
    const fetchActiveUserCount = jest.fn(async () => ({ state: 'error' as const, count: null, observedAtMs: 10_000 }));
    expect(await resolveAppTier(fetchActiveUserCount)).toBe('seed');
  });

  test('a throwing fetcher fails closed to seed instead of aborting the whole snapshot', async () => {
    const fetchActiveUserCount = jest.fn(async () => { throw new Error('unavailable'); });
    expect(await resolveAppTier(fetchActiveUserCount)).toBe('seed');
  });
});
