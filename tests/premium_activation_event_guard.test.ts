import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('account-a');
});

test('a deferred premium activation from account A becomes stale after account B activates', async () => {
  const read = deferred<[string, string | null][]>();
  (AsyncStorage.multiGet as jest.Mock).mockReturnValueOnce(read.promise);
  const {
    capturePremiumActivationEventGuard,
    readPremiumActivationDisposition,
  } = await import('../app/premium_activation_event_guard');
  let disposed = false;
  let eventEpoch = 1;
  const guard = capturePremiumActivationEventGuard(
    eventEpoch,
    () => eventEpoch,
    () => disposed,
  );

  const result = readPremiumActivationDisposition(guard, false);
  beginAccountGeneration('account-b');
  read.resolve([
    ['tester_no_premium', null],
    ['tester_no_limits', null],
  ]);

  await expect(result).resolves.toBe('stale');
});

test('cleanup and a newer event invalidate an older activation guard', async () => {
  (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
    ['tester_no_premium', null],
    ['tester_no_limits', null],
  ]);
  const {
    capturePremiumActivationEventGuard,
    readPremiumActivationDisposition,
  } = await import('../app/premium_activation_event_guard');
  let disposed = false;
  let eventEpoch = 4;
  const oldGuard = capturePremiumActivationEventGuard(
    eventEpoch,
    () => eventEpoch,
    () => disposed,
  );
  eventEpoch += 1;

  await expect(readPremiumActivationDisposition(oldGuard, false)).resolves.toBe('stale');

  const cleanupGuard = capturePremiumActivationEventGuard(
    eventEpoch,
    () => eventEpoch,
    () => disposed,
  );
  disposed = true;
  await expect(readPremiumActivationDisposition(cleanupGuard, false)).resolves.toBe('stale');
});

test('store activation ignores and clears a legacy tester_no_premium flag', async () => {
  (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
    ['tester_no_premium', 'true'],
    ['tester_no_limits', null],
  ]);
  const {
    capturePremiumActivationEventGuard,
    readPremiumActivationDisposition,
  } = await import('../app/premium_activation_event_guard');
  const guard = capturePremiumActivationEventGuard(1, () => 1, () => false);

  await expect(readPremiumActivationDisposition(guard, true)).resolves.toBe('activate');
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('tester_no_premium');
});
