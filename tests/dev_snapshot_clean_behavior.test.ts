// зачем (координатор 11.10): LogBox отключается только в dev при EXPO_PUBLIC_SNAPSHOT_CLEAN=1 и ни в каком другом случае.
const ignoreAllLogs = jest.fn();
jest.mock('react-native', () => ({ LogBox: { ignoreAllLogs: (value: boolean) => ignoreAllLogs(value) } }));
// зачем (координатор 12.10): в режиме чистых кадров Fast Refresh выключен; вне режима — возвращается, только если выключали мы.
const mockSetHot = jest.fn();
jest.mock('react-native/Libraries/NativeModules/specs/NativeDevSettings', () => ({
  __esModule: true,
  default: { setHotLoadingEnabled: (value: boolean) => mockSetHot(value) },
}));
const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => { mockStorage.set(key, value); },
    removeItem: async (key: string) => { mockStorage.delete(key); },
  },
}));
const MARK = 'dev_snapshot_clean_fast_refresh_off_v1';
const flush = () => new Promise((resolve) => setImmediate(resolve));

const g = globalThis as { __DEV__?: boolean };
const original = { dev: g.__DEV__, flag: process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN };

function load(): boolean {
  let applied = false;
  jest.isolateModules(() => {
    applied = require('../app/dev_snapshot_clean').applyDevSnapshotClean();
  });
  return applied;
}

beforeEach(() => {
  ignoreAllLogs.mockClear();
  mockSetHot.mockClear();
  mockStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  g.__DEV__ = original.dev;
  if (original.flag === undefined) delete process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN;
  else process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN = original.flag;
  jest.restoreAllMocks();
});

test('dev + flag=1 turns LogBox off', () => {
  g.__DEV__ = true;
  process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN = '1';
  expect(load()).toBe(true);
  expect(ignoreAllLogs).toHaveBeenCalledWith(true);
});

test.each([
  ['dev, no flag', true, undefined],
  ['dev, flag=0', true, '0'],
  ['release, flag=1', false, '1'],
  ['release, no flag', false, undefined],
])('%s keeps LogBox as is', (_name, dev, flag) => {
  g.__DEV__ = dev;
  if (flag === undefined) delete process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN;
  else process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN = flag;
  expect(load()).toBe(false);
  expect(ignoreAllLogs).not.toHaveBeenCalled();
});

test('snapshot-clean turns Fast Refresh off and leaves a mark', async () => {
  g.__DEV__ = true;
  process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN = '1';
  expect(load()).toBe(true);
  await flush();
  expect(mockSetHot).toHaveBeenCalledWith(false);
  expect(mockStorage.get(MARK)).toBe('1');
});

test('plain dev restores Fast Refresh only after a snapshot-clean run', async () => {
  g.__DEV__ = true;
  delete process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN;
  load();
  await flush();
  expect(mockSetHot).not.toHaveBeenCalled();

  mockStorage.set(MARK, '1');
  load();
  await flush();
  expect(mockSetHot).toHaveBeenCalledWith(true);
  expect(mockStorage.has(MARK)).toBe(false);
});

test('release never touches Fast Refresh', async () => {
  g.__DEV__ = false;
  process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN = '1';
  mockStorage.set(MARK, '1');
  load();
  await flush();
  expect(mockSetHot).not.toHaveBeenCalled();
});
