import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGet = jest.fn(async () => ({ exists: true, data: () => ({ bools: {} }) }));
const mockFirestoreFactory = jest.fn(() => ({
  collection: () => ({
    doc: () => ({
      get: mockGet,
    }),
  }),
}));
let mockRuntimeAppActive = true;
const mockRuntimeAppStateListeners = new Set<() => void>();

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => mockFirestoreFactory(),
}));
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));
jest.mock('../app/runtime_app_state_store', () => ({
  runtimeAppStateStore: {
    getSnapshot: () => mockRuntimeAppActive,
    subscribe: (listener: () => void) => {
      mockRuntimeAppStateListeners.add(listener);
      return () => mockRuntimeAppStateListeners.delete(listener);
    },
  },
}));

// Imports intentionally follow the hoisted native-module mocks above.
// eslint-disable-next-line import/first
import {
  __resetInteractiveNetworkQuietForTests,
  beginInteractiveNetworkQuiet,
  interactiveNetworkQuietSnapshot,
  releaseInteractiveNetworkQuiet,
  waitForInteractiveNetworkQuiet,
} from '../app/interactive_network_quiet';
// eslint-disable-next-line import/first
import {
  loadRemoteConfig,
  subscribeRemoteConfig,
} from '../app/remote_config_client';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const setRuntimeAppActive = (active: boolean): void => {
  mockRuntimeAppActive = active;
  mockRuntimeAppStateListeners.forEach((listener) => listener());
};

beforeEach(async () => {
  __resetInteractiveNetworkQuietForTests();
  mockGet.mockClear();
  mockFirestoreFactory.mockClear();
  mockGet.mockResolvedValue({ exists: true, data: () => ({ bools: {} }) });
  setRuntimeAppActive(true);
  await AsyncStorage.clear();
  jest.mocked(AsyncStorage.setItem).mockClear();
});

test('live Remote Config polling is absent for the whole interactive quiet epoch', async () => {
  const subscription = subscribeRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  const quiet = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(quiet);
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  expect(mockGet).toHaveBeenCalledTimes(1);

  releaseInteractiveNetworkQuiet(quiet);
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(2);
  subscription.remove();
});

test('one-shot Remote Config load is deferred while a session is quiet', async () => {
  const quiet = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(quiet);
  await loadRemoteConfig();
  expect(mockGet).not.toHaveBeenCalled();

  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
  await loadRemoteConfig();
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test('quiet waits for an already-started native Remote Config read to settle', async () => {
  let resolveRead!: (value: { exists: boolean; data: () => { bools: object } }) => void;
  const read = new Promise<{ exists: boolean; data: () => { bools: object } }>((resolve) => {
    resolveRead = resolve;
  });
  mockGet.mockReturnValueOnce(read);
  const loading = loadRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  const quiet = beginInteractiveNetworkQuiet();
  let ready = false;
  const waiting = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
  await Promise.resolve();
  expect(ready).toBe(false);

  resolveRead({ exists: true, data: () => ({ bools: {} }) });
  await loading;
  await waiting;
  expect(ready).toBe(true);
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});

test('multiple subscribers share one refresh and removal during quiet prevents restart', async () => {
  const first = subscribeRemoteConfig();
  const second = subscribeRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  const quiet = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(quiet);
  first.remove();
  second.remove();
  releaseInteractiveNetworkQuiet(quiet);
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test('hostile Remote Config accessors are never executed', async () => {
  let getterRuns = 0;
  const hostile = {} as Record<string, unknown>;
  Object.defineProperty(hostile, 'numbers', {
    enumerable: true,
    get: () => {
      getterRuns += 1;
      return { lesson_limit: 999 };
    },
  });
  hostile.bools = {};
  mockGet.mockResolvedValueOnce({
    exists: true,
    data: () => hostile as { bools: Record<string, unknown> },
  });
  await loadRemoteConfig();
  expect(getterRuns).toBe(0);
});

test('reserved prototype keys cannot smuggle inherited Remote Config sections', async () => {
  let getterRuns = 0;
  const inherited = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(inherited, 'numbers', {
    enumerable: true,
    get: () => {
      getterRuns += 1;
      return { lesson_limit: 999 };
    },
  });
  const hostile = { bools: {} } as Record<string, unknown>;
  Object.defineProperty(hostile, '__proto__', {
    enumerable: true,
    value: inherited,
  });
  mockGet.mockResolvedValueOnce({
    exists: true,
    data: () => hostile as { bools: Record<string, unknown> },
  });
  await loadRemoteConfig();
  expect(getterRuns).toBe(0);
});

test('preserves only the allowlisted friends-together numeric arrays in the local cache', async () => {
  mockGet.mockResolvedValueOnce({
    exists: true,
    data: () => ({
      bools: { friends_together_enabled: true },
      numbers: {
        friends_level_thresholds: [0, 4, 12, 40, 120],
        friends_chest_tiers: [7000, 14000, 21000],
        arbitrary_array: [1, 2, 3],
      },
    }),
  });
  await loadRemoteConfig();
  const cached = JSON.parse(String(await AsyncStorage.getItem('remote_config_cache_v1')));
  expect(cached.numbers.friends_level_thresholds).toEqual([0, 4, 12, 40, 120]);
  expect(cached.numbers.friends_chest_tiers).toEqual([7000, 14000, 21000]);
  expect(cached.numbers.arbitrary_array).toBeUndefined();
});

test('rejects an oversized persisted cache before JSON parsing it', async () => {
  const oversized = `{"texts":{"value":"${'x'.repeat(70 * 1024)}"}}`;
  const multibyteOversized = `{"texts":{"value":"${'😀'.repeat(20 * 1024)}"}}`;
  await AsyncStorage.setItem('remote_config_cache_v1', oversized);
  let parse = jest.spyOn(JSON, 'parse');
  try {
    await loadRemoteConfig();
    expect(parse.mock.calls.some(([value]) => value === oversized)).toBe(false);
  } finally {
    parse.mockRestore();
  }
  await AsyncStorage.setItem('remote_config_cache_v1', multibyteOversized);
  parse = jest.spyOn(JSON, 'parse');
  try {
    await loadRemoteConfig();
    expect(parse.mock.calls.some(([value]) => value === multibyteOversized)).toBe(false);
  } finally {
    parse.mockRestore();
  }
});

test('startup load and live subscriber share one native read and one cached apply', async () => {
  let resolveRead!: (value: { exists: boolean; data: () => { bools: object } }) => void;
  mockGet.mockReturnValueOnce(new Promise((resolve) => { resolveRead = resolve; }));
  const loading = loadRemoteConfig();
  const subscription = subscribeRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  resolveRead({ exists: true, data: () => ({ bools: { shared_startup: true } }) });
  await loading;
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  subscription.remove();
});

test('slow startup cache and live subscriber still share one native read and apply', async () => {
  let resolveCache!: (value: string | null) => void;
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise((resolve) => {
    resolveCache = resolve;
  }));
  const loading = loadRemoteConfig();
  const subscription = subscribeRemoteConfig();
  await settle();
  expect(mockGet).not.toHaveBeenCalled();

  resolveCache(null);
  await loading;
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  subscription.remove();
});

test('foregrounding during an in-flight stale read schedules a current-generation continuation', async () => {
  let resolveRead!: (value: { exists: boolean; data: () => { bools: object } }) => void;
  mockGet.mockReturnValueOnce(new Promise((resolve) => { resolveRead = resolve; }));
  const subscription = subscribeRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  setRuntimeAppActive(false);
  setRuntimeAppActive(true);
  resolveRead({ exists: true, data: () => ({ bools: {} }) });
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(2);
  subscription.remove();
});

test('remove and resubscribe during an in-flight read cannot strand polling', async () => {
  let resolveRead!: (value: { exists: boolean; data: () => { bools: object } }) => void;
  mockGet.mockReturnValueOnce(new Promise((resolve) => { resolveRead = resolve; }));
  const first = subscribeRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  first.remove();
  const second = subscribeRemoteConfig();
  resolveRead({ exists: true, data: () => ({ bools: {} }) });
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(2);
  second.remove();
});

test('releasing quiet before an in-flight read settles cannot strand polling', async () => {
  let resolveRead!: (value: { exists: boolean; data: () => { bools: object } }) => void;
  mockGet.mockReturnValueOnce(new Promise((resolve) => { resolveRead = resolve; }));
  const subscription = subscribeRemoteConfig();
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(1);

  const quiet = beginInteractiveNetworkQuiet();
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
  resolveRead({ exists: true, data: () => ({ bools: {} }) });
  await settle();
  expect(mockGet).toHaveBeenCalledTimes(2);
  subscription.remove();
});
