import fs from 'fs';
import path from 'path';

const markerListeners: {
  next: (snapshot: { exists: boolean }) => void;
  error: (error: unknown) => void;
}[] = [];
const observedPaths: string[] = [];
let authUser: { uid: string; isAnonymous: boolean; reload: jest.Mock<Promise<void>, []> } | null;

jest.mock('@react-native-firebase/auth', () => {
  const factory = () => ({
    get currentUser() { return authUser; },
    onAuthStateChanged: (listener: (user: typeof authUser) => void) => {
      listener(authUser);
      return jest.fn();
    },
  });
  factory.default = factory;
  return factory;
});

jest.mock('@react-native-firebase/firestore', () => {
  const factory = () => ({
    collection: (collection: string) => ({
      doc: (id: string) => ({
        onSnapshot: (
          next: (snapshot: { exists: boolean }) => void,
          error: (error: unknown) => void,
        ) => {
          observedPaths.push(`${collection}/${id}`);
          markerListeners.push({ next, error });
          return jest.fn();
        },
      }),
    }),
  });
  factory.default = factory;
  return factory;
});

describe('remote account deletion monitor', () => {
  beforeEach(() => {
    markerListeners.length = 0;
    observedPaths.length = 0;
    authUser = {
      uid: 'provider-uid-1',
      isAnonymous: false,
      reload: jest.fn(async () => {}),
    };
    jest.resetModules();
  });

  it('uses module paths that Metro can resolve statically', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app', 'remote_account_deletion_monitor.ts'),
      'utf8',
    );

    expect(source).not.toContain('require(name)');
    expect(source).toContain("require('@react-native-firebase/auth')");
    expect(source).toContain("require('@react-native-firebase/firestore')");
  });

  it('subscribes to the current provider uid marker and reports deletion once after awaited success', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startRemoteAccountDeletionMonitor } = require('../app/remote_account_deletion_monitor');
    const onDeleted = jest.fn(async () => true);

    const stop = startRemoteAccountDeletionMonitor(onDeleted);
    expect(observedPaths).toEqual(['account_deletion_auth_markers/provider-uid-1']);

    markerListeners[0].next({ exists: true });
    markerListeners[0].next({ exists: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(onDeleted).toHaveBeenCalledTimes(1);
    stop();
  });

  it('confirms a missing remote auth user when the marker listener loses authorization', async () => {
    const missingUserError = Object.assign(new Error('user missing'), { code: 'auth/user-not-found' });
    authUser!.reload.mockRejectedValueOnce(missingUserError);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startRemoteAccountDeletionMonitor } = require('../app/remote_account_deletion_monitor');
    const onDeleted = jest.fn(async () => true);

    startRemoteAccountDeletionMonitor(onDeleted);
    markerListeners[0].error(Object.assign(new Error('denied'), { code: 'firestore/permission-denied' }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(authUser!.reload).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('does not permanently report a uid when handling fails and retries while it remains active', async () => {
    jest.useFakeTimers();
    const { startRemoteAccountDeletionMonitor } = require('../app/remote_account_deletion_monitor');
    const onDeleted = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const stop = startRemoteAccountDeletionMonitor(onDeleted);
    markerListeners[0].next({ exists: true });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    expect(onDeleted).toHaveBeenCalledTimes(2);
    stop();
    jest.useRealTimers();
  });
});
