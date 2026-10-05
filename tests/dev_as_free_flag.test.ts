import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetDevAsFreeForTests,
  applyDevAsFreeToLessonAccess,
  isDevAsFreeActive,
  loadDevAsFreeFlag,
  setDevAsFreeFlag,
} from '../app/dev_as_free_flag';

// зачем (координатор 05.10, learn-1): dev-флаг «вести себя как Free» для доступа к урокам. Условия: в релизной сборке
// (__DEV__=false) флаг физически не работает — ключ не читается и не пишется; влияет ТОЛЬКО на isPremium и devMode.
const globalWithDev = globalThis as { __DEV__?: boolean };
const KEY = 'dev_as_free_lessons_v1';
const originalDev = globalWithDev.__DEV__;

function keyCalls(mock: jest.Mock | jest.SpyInstance): unknown[][] {
  return (mock.mock.calls as unknown[][]).filter(([key]) => key === KEY);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetDevAsFreeForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  globalWithDev.__DEV__ = originalDev;
  jest.restoreAllMocks();
});

describe('release build (__DEV__=false)', () => {
  it('ignores the flag and never reads or writes the storage key', async () => {
    globalWithDev.__DEV__ = false;
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    getItem.mockClear();
    setItem.mockClear();
    await loadDevAsFreeFlag();
    await expect(setDevAsFreeFlag(true)).resolves.toBe(false);
    expect(isDevAsFreeActive()).toBe(false);
    const input = { lessonId: 4, unlocked: false, isPremium: true, devMode: true, noLimits: false };
    expect(applyDevAsFreeToLessonAccess(input, 'test')).toBe(input);
    expect(keyCalls(getItem)).toHaveLength(0);
    expect(keyCalls(setItem)).toHaveLength(0);
  });
});

describe('dev build (__DEV__=true)', () => {
  it('is off by default: access input is unchanged', async () => {
    globalWithDev.__DEV__ = true;
    await loadDevAsFreeFlag();
    const input = { lessonId: 4, unlocked: false, isPremium: true, devMode: true, noLimits: false };
    expect(isDevAsFreeActive()).toBe(false);
    expect(applyDevAsFreeToLessonAccess(input, 'test')).toBe(input);
  });

  it('when enabled, replaces ONLY isPremium and devMode and logs [DEV-AS-FREE] applied', async () => {
    globalWithDev.__DEV__ = true;
    await setDevAsFreeFlag(true);
    const input = { lessonId: 4, unlocked: true, purchased: false, isPremium: true, devMode: true, noLimits: false, legacyFreeLessonCap: 8 };
    expect(applyDevAsFreeToLessonAccess(input, 'test')).toEqual({ ...input, isPremium: false, devMode: false });
    expect((console.warn as jest.Mock).mock.calls.some(([first]) => first === '[DEV-AS-FREE] applied')).toBe(true);
  });

  it('persists across a restart and turns off again', async () => {
    globalWithDev.__DEV__ = true;
    await setDevAsFreeFlag(true);
    __resetDevAsFreeForTests();
    await loadDevAsFreeFlag();
    expect(isDevAsFreeActive()).toBe(true);
    await setDevAsFreeFlag(false);
    __resetDevAsFreeForTests();
    await loadDevAsFreeFlag();
    expect(isDevAsFreeActive()).toBe(false);
  });

  it('a late load does not overwrite a toggle made while it was in flight', async () => {
    globalWithDev.__DEV__ = true;
    const loading = loadDevAsFreeFlag();
    await setDevAsFreeFlag(true);
    await loading;
    expect(isDevAsFreeActive()).toBe(true);
  });
});
