declare const global: typeof globalThis & {
  __DEV__?: boolean;
};

type PrefetchModule = typeof import('../app/eas_update_prefetch');

function loadPrefetchModule(): PrefetchModule {
  jest.resetModules();
  return require('../app/eas_update_prefetch') as PrefetchModule;
}

function makeUpdatesModule(isAvailable: boolean) {
  return {
    isEnabled: true,
    checkForUpdateAsync: jest.fn(async () => ({
      isAvailable,
      isRollBackToEmbedded: false,
    })),
    fetchUpdateAsync: jest.fn(async () => ({
      isNew: true,
      isRollBackToEmbedded: false,
    })),
  };
}

beforeEach(() => {
  global.__DEV__ = false;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('prefetchEasUpdateAfterStartup', () => {
  it('downloads an available EAS update without reloading immediately', async () => {
    const { prefetchEasUpdateAfterStartup } = loadPrefetchModule();
    const updates = makeUpdatesModule(true);

    await expect(prefetchEasUpdateAfterStartup(updates)).resolves.toBe(true);

    expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('does not download when no update is available', async () => {
    const { prefetchEasUpdateAfterStartup } = loadPrefetchModule();
    const updates = makeUpdatesModule(false);

    await expect(prefetchEasUpdateAfterStartup(updates)).resolves.toBe(false);

    expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('runs only once per app process', async () => {
    const { prefetchEasUpdateAfterStartup } = loadPrefetchModule();
    const updates = makeUpdatesModule(true);

    await prefetchEasUpdateAfterStartup(updates);
    await prefetchEasUpdateAfterStartup(updates);

    expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('skips prefetching in development', async () => {
    global.__DEV__ = true;
    const { prefetchEasUpdateAfterStartup } = loadPrefetchModule();
    const updates = makeUpdatesModule(true);

    await expect(prefetchEasUpdateAfterStartup(updates)).resolves.toBe(false);

    expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });
});
