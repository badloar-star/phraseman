/**
 * Рекорды игр: рекорд виден сразу, только улучшается, переживает перезапуск, не теряется при сбое записи
 * и не достаётся другому владельцу (перенос макетов Elevate, блок «Рекорды игр»).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __gameRecordsTestHooks as hooks, formatGameRecord, isBetterGameResult, noteGameResult, parseGameRecordsState,
  peekGameRecords, recordGameResult, refreshGameRecords, subscribeGameRecords,
} from '../modules/games/game_records';

let owner: string | null = 'owner-a';

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  owner = 'owner-a';
  hooks.setDeps({ ownerStableId: async () => owner });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('первый результат — рекорд: виден в памяти сразу и лежит на диске', async () => {
  const seen: (number | undefined)[] = [];
  subscribeGameRecords((s) => { if (s) seen.push(s.best.blitz); });
  const r = await recordGameResult('blitz', 26);
  expect(r).toEqual({ improved: true, best: 26, saved: true });
  expect(peekGameRecords()?.best.blitz).toBe(26);
  expect(seen[seen.length - 1]).toBe(26);
  const raw = await AsyncStorage.getItem('game_records_v1:owner-a');
  expect(JSON.parse(raw as string)).toEqual({ v: 1, best: { blitz: 26 } });
});

it('рекорд только улучшается: худший результат запись не меняет и на диск не идёт', async () => {
  await recordGameResult('blitz', 26);
  const setItem = jest.spyOn(AsyncStorage, 'setItem');
  setItem.mockClear(); // заглушка диска общая на файл и помнит прежние вызовы — считаем только записи после первого рекорда
  expect(await recordGameResult('blitz', 20)).toEqual({ improved: false, best: 26, saved: true });
  expect(await recordGameResult('blitz', 26)).toEqual({ improved: false, best: 26, saved: true });
  expect(setItem).not.toHaveBeenCalled();
  expect(await recordGameResult('blitz', 31)).toEqual({ improved: true, best: 31, saved: true });
  expect(peekGameRecords()?.best.blitz).toBe(31);
});

it('«Смахни»: лучше тот, кто быстрее — меньше секунд на ответ', async () => {
  await recordGameResult('swipe', 1.4);
  expect((await recordGameResult('swipe', 2.1)).improved).toBe(false);
  expect(await recordGameResult('swipe', 0.8)).toEqual({ improved: true, best: 0.8, saved: true });
  expect(isBetterGameResult('swipe', 0.7, 0.8)).toBe(true);
  expect(isBetterGameResult('flow', 1.7, 1.9)).toBe(false);
});

it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])('негодный результат %p рекордом не становится', async (value) => {
  expect(await recordGameResult('flow', value)).toEqual({ improved: false, best: null, saved: true });
  expect(peekGameRecords()?.best.flow).toBeUndefined();
});

it('рекорды переживают перезапуск', async () => {
  await recordGameResult('flow', 1.9);
  await recordGameResult('odd_word', 14);
  hooks.reset();
  hooks.setDeps({ ownerStableId: async () => owner });
  expect(peekGameRecords()).toBeNull();
  const state = await refreshGameRecords();
  expect(state.best).toEqual({ flow: 1.9, odd_word: 14 });
});

it('сбой записи не теряет рекорд: он держится в памяти и дописывается при следующем событии', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
  expect(await recordGameResult('blitz', 26)).toEqual({ improved: true, best: 26, saved: false });
  expect(peekGameRecords()?.best.blitz).toBe(26);
  expect(warn.mock.calls.some((call) => String(call[0]).startsWith('[GAME-RECORDS] persist:failed'))).toBe(true);
  expect(await AsyncStorage.getItem('game_records_v1:owner-a')).toBeNull();
  // следующий результат не рекорд, но несохранённый рекорд дописывается
  expect(await recordGameResult('blitz', 10)).toEqual({ improved: false, best: 26, saved: true });
  expect(JSON.parse((await AsyncStorage.getItem('game_records_v1:owner-a')) as string).best.blitz).toBe(26);
});

it('noteGameResult никогда не бросает, даже если хранилище падает', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  // отказ — по одному разу: заглушка диска общая на файл, постоянный отказ утёк бы в соседние проверки
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage down'));
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage down'));
  expect(() => noteGameResult('blitz', 26)).not.toThrow();
  // рекорд остался в памяти; следующая догрузка дописывает его на диск
  await refreshGameRecords();
  expect(peekGameRecords()?.best.blitz).toBe(26);
  expect(JSON.parse((await AsyncStorage.getItem('game_records_v1:owner-a')) as string).best.blitz).toBe(26);
});

it('у другого владельца свои рекорды; гость пишет в свой ключ', async () => {
  await recordGameResult('blitz', 26);
  owner = 'owner-b';
  expect((await refreshGameRecords()).best).toEqual({});
  await recordGameResult('blitz', 5);
  owner = null;
  await recordGameResult('blitz', 9);
  expect(JSON.parse((await AsyncStorage.getItem('game_records_v1:owner-a')) as string).best.blitz).toBe(26);
  expect(JSON.parse((await AsyncStorage.getItem('game_records_v1:owner-b')) as string).best.blitz).toBe(5);
  expect(JSON.parse((await AsyncStorage.getItem('game_records_v1:anon')) as string).best.blitz).toBe(9);
});

it('два результата подряд не затирают друг друга', async () => {
  const [a, b] = await Promise.all([recordGameResult('blitz', 12), recordGameResult('flow', 1.5)]);
  expect(a.improved && b.improved).toBe(true);
  expect(JSON.parse((await AsyncStorage.getItem('game_records_v1:owner-a')) as string).best).toEqual({ blitz: 12, flow: 1.5 });
});

it('разбор диска: мусор и неизвестные игры отбрасываются', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  expect(parseGameRecordsState(null, 'o').best).toEqual({});
  expect(parseGameRecordsState('{oops', 'o').best).toEqual({});
  expect(parseGameRecordsState('[1,2]', 'o').best).toEqual({});
  const raw = JSON.stringify({ v: 1, best: { blitz: 26, flow: '1.9', odd_word: -2, swipe: 0.8, chess: 99 } });
  expect(parseGameRecordsState(raw, 'o').best).toEqual({ blitz: 26, swipe: 0.8 });
});

it('число показывается как в макете', () => {
  expect(formatGameRecord('blitz', 26)).toBe('26');
  expect(formatGameRecord('flow', 1.9)).toBe('×1,9');
  expect(formatGameRecord('odd_word', 14)).toBe('14');
  expect(formatGameRecord('swipe', 0.8)).toBe('0,8 с');
  expect(formatGameRecord('swipe', 0.84)).toBe('0,8 с');
});
