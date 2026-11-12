/**
 * Уровень «Блица» на устройстве (макет «Уровни игры · на примере „Блица“»): засчитывается по итогу захода, переживает
 * перезапуск, не теряется при сбое записи и не достаётся другому владельцу.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __blitzLevelTestHooks as hooks, parseBlitzLevelState, peekBlitzLevel, recordBlitzRun, refreshBlitzLevel, subscribeBlitzLevel,
} from '../modules/games/blitz_level_store';

let owner: string | null = 'owner-a';

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  owner = 'owner-a';
  hooks.setDeps({ ownerStableId: async () => owner });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('три хороших захода подряд поднимают уровень: сдвиг виден в ответе, уровень — в памяти и на диске', async () => {
  const seen: number[] = [];
  subscribeBlitzLevel((s) => { if (s) seen.push(s.levels.level); });
  expect((await recordBlitzRun(9, 10)).moved).toBe(0);
  expect((await recordBlitzRun(8, 10)).moved).toBe(0);
  const third = await recordBlitzRun(10, 10);
  expect(third).toEqual({ verdict: 'good', before: { level: 0, good: 2, weak: 0 }, after: { level: 1, good: 0, weak: 0 }, moved: 1, saved: true });
  expect(peekBlitzLevel()?.levels).toEqual({ level: 1, good: 0, weak: 0 });
  expect(seen[seen.length - 1]).toBe(1);
  expect(JSON.parse((await AsyncStorage.getItem('blitz_level_v1:owner-a')) as string)).toEqual({ v: 1, levels: { level: 1, good: 0, weak: 0 } });
});

it('два слабых захода подряд опускают уровень', async () => {
  await AsyncStorage.setItem('blitz_level_v1:owner-a', JSON.stringify({ v: 1, levels: { level: 3, good: 1, weak: 0 } }));
  expect((await recordBlitzRun(5, 10)).after).toEqual({ level: 3, good: 0, weak: 1 });
  const second = await recordBlitzRun(3, 12);
  expect([second.verdict, second.moved, second.after.level]).toEqual(['weak', -1, 2]);
});

it('заход меньше чем из 8 ответов не засчитывается и уровень не трогает', async () => {
  await recordBlitzRun(9, 10);
  const setItem = jest.spyOn(AsyncStorage, 'setItem');
  setItem.mockClear();
  const short = await recordBlitzRun(7, 7);
  expect([short.verdict, short.moved]).toEqual(['skip', 0]);
  expect(short.after).toEqual({ level: 0, good: 1, weak: 0 });
  expect(setItem).not.toHaveBeenCalled();
  expect((await recordBlitzRun(-1, 10)).verdict).toBe('skip');
  expect((await recordBlitzRun(11, 10)).verdict).toBe('skip');
});

it('уровень переживает перезапуск: после сброса памяти читается с диска', async () => {
  for (let i = 0; i < 3; i += 1) await recordBlitzRun(10, 10);
  hooks.reset();
  hooks.setDeps({ ownerStableId: async () => owner });
  expect(peekBlitzLevel()).toBeNull();
  expect((await refreshBlitzLevel()).levels.level).toBe(1);
});

it('сбой записи не теряет уровень: он в памяти и дописывается следующим событием', async () => {
  const setItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
  const first = await recordBlitzRun(10, 10);
  expect(first.saved).toBe(false);
  expect(peekBlitzLevel()?.levels.good).toBe(1);
  setItem.mockClear();
  expect((await refreshBlitzLevel()).levels.good).toBe(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(JSON.parse((await AsyncStorage.getItem('blitz_level_v1:owner-a')) as string).levels.good).toBe(1);
});

it('другой владелец не видит чужой уровень', async () => {
  for (let i = 0; i < 3; i += 1) await recordBlitzRun(10, 10);
  owner = 'owner-b';
  const other = await recordBlitzRun(10, 10);
  expect(other.before).toEqual({ level: 0, good: 0, weak: 0 });
  expect(await AsyncStorage.getItem('blitz_level_v1:owner-b')).not.toBeNull();
  owner = null;
  expect((await refreshBlitzLevel()).ownerKey).toBe('anon');
});

it('битые данные на диске — первая ступень, значения за краями обрезаются', () => {
  expect(parseBlitzLevelState('{', 'x').levels).toEqual({ level: 0, good: 0, weak: 0 });
  expect(parseBlitzLevelState('[1]', 'x').levels).toEqual({ level: 0, good: 0, weak: 0 });
  expect(parseBlitzLevelState(JSON.stringify({ levels: { level: 40, good: 9, weak: -2 } }), 'x').levels).toEqual({ level: 4, good: 2, weak: 0 });
  expect(parseBlitzLevelState(null, 'x').levels).toEqual({ level: 0, good: 0, weak: 0 });
});
