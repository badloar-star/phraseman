const mockReadCache = jest.fn();
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: () => mockReadCache() }));
jest.mock('../app/events', () => ({ onAppEvent: jest.fn() }));

describe('sound V2 default and remote kill switch', () => {
  it.each([
    [null, true],
    [JSON.stringify({ bools: { sound_v2: false } }), false],
    [JSON.stringify({ bools: { sound_v2: true } }), true],
    [JSON.stringify({ bools: {} }), true],
    ['broken', true],
  ])('cache %s resolves to %s', async (raw, expected) => {
    mockReadCache.mockResolvedValue(raw);
    await jest.isolateModulesAsync(async () => {
      const flag = await import('../modules/sound_v2/sound_v2_flag');
      await flag.primeSoundV2Flag();
      expect(flag.isSoundV2Enabled()).toBe(expected);
      expect(flag.isSoundV2FlagHydrated()).toBe(true);
    });
  });
});
