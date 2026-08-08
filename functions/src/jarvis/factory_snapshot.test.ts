import { buildFactorySnapshot } from './factory_snapshot';

describe('Jarvis factory snapshot freshness', () => {
  test('does not invent request time when the source fetch fails', async () => {
    const snapshot = await buildFactorySnapshot({
      fetchFactory: async () => { throw new Error('unavailable'); },
      trigger: 'scheduled',
      nowMs: 1_000,
    });

    expect(snapshot.decisions[0].evidence[0]).toMatchObject({
      state: 'error',
      observedAtMs: 0,
      trustworthy: false,
    });
  });
});
