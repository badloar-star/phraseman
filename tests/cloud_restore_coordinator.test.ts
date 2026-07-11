import { createBootCloudRestoreCoordinator } from '../app/cloud_restore_coordinator';

describe('boot cloud restore coordinator', () => {
  it.each([
    ['restored', true, true, true],
    ['restored', false, true, false],
    ['not_found', true, false, true],
    ['not_found', false, false, false],
    ['failed', true, false, false],
    ['failed', false, false, false],
  ] as const)(
    '%s with local=%s emits=%s syncs=%s',
    async (status, hasLocalAccountData, shouldEmit, shouldSync) => {
      const onHydrated = jest.fn();
      const coordinator = createBootCloudRestoreCoordinator({
        restore: async () => status,
        hasLocalAccountData: async () => hasLocalAccountData,
        onHydrated,
      });

      await expect(coordinator.run()).resolves.toEqual({
        status,
        hasLocalAccountData,
        shouldSync,
      });
      expect(onHydrated).toHaveBeenCalledTimes(shouldEmit ? 1 : 0);
    },
  );

  it('shares one restore and emits hydration once across concurrent callers', async () => {
    let resolveRestore!: (value: 'restored') => void;
    const pending = new Promise<'restored'>((resolve) => { resolveRestore = resolve; });
    const restore = jest.fn(() => pending);
    const onHydrated = jest.fn();
    const coordinator = createBootCloudRestoreCoordinator({
      restore,
      hasLocalAccountData: async () => true,
      onHydrated,
    });

    const first = coordinator.run();
    const second = coordinator.run();
    resolveRestore('restored');

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'restored', hasLocalAccountData: true, shouldSync: true },
      { status: 'restored', hasLocalAccountData: true, shouldSync: true },
    ]);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(onHydrated).toHaveBeenCalledTimes(1);
  });

  it('converts thrown restore failures to a fail-closed result', async () => {
    const coordinator = createBootCloudRestoreCoordinator({
      restore: async () => { throw new Error('network'); },
      hasLocalAccountData: async () => true,
      onHydrated: jest.fn(),
    });

    await expect(coordinator.run()).resolves.toEqual({
      status: 'failed',
      hasLocalAccountData: true,
      shouldSync: false,
    });
  });
});
