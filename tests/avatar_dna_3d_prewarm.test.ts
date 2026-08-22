import { createAvatar3DPrewarm } from '../modules/avatar-dna-3d/prewarm';

describe('Avatar DNA 3D prewarm', () => {
  it('does not permit selection before local assets and shaders are ready', async () => {
    const loadLocalAssets = jest.fn(async () => undefined);
    const warmScene = jest.fn(async () => undefined);
    const prewarm = createAvatar3DPrewarm({ loadLocalAssets, warmScene });

    expect(prewarm.isReady()).toBe(false);
    await prewarm.ready();
    expect(loadLocalAssets).toHaveBeenCalledTimes(1);
    expect(warmScene).toHaveBeenCalledTimes(1);
    expect(prewarm.isReady()).toBe(true);
  });

  it('rejects a network-capable dependency', () => {
    expect(() => createAvatar3DPrewarm({
      loadLocalAssets: async () => undefined,
      warmScene: async () => undefined,
      fetch: global.fetch,
    })).toThrow('avatar_3d_network_forbidden');
  });
});
