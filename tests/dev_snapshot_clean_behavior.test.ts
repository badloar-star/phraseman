// зачем (координатор 11.10): LogBox отключается только в dev при EXPO_PUBLIC_SNAPSHOT_CLEAN=1 и ни в каком другом случае.
const ignoreAllLogs = jest.fn();
jest.mock('react-native', () => ({ LogBox: { ignoreAllLogs: (value: boolean) => ignoreAllLogs(value) } }));

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
